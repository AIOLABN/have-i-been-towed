#!/usr/bin/env python3
"""HaveIBeenTowed polling worker. No inbound port or tunnel is required."""
import json
import os
import pathlib
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent
MAX_DOWNLOAD = 20 * 1024 * 1024


def configuration():
    site = os.environ.get('TOW_SITE_URL', '').rstrip('/')
    token = os.environ.get('TOW_WORKER_TOKEN', '')
    parsed = urllib.parse.urlparse(site)
    if (parsed.scheme != 'https' and not (parsed.scheme == 'http' and parsed.hostname in ('localhost', '127.0.0.1'))) or not parsed.netloc or parsed.path or parsed.query or parsed.fragment or parsed.username:
        raise ValueError('TOW_SITE_URL must be the HTTPS website origin, without a path.')
    if len(token) != 64 or any(c not in '0123456789abcdef' for c in token):
        raise ValueError('Generate a worker key in Detection studio and set TOW_WORKER_TOKEN.')
    return site, token


class Client:
    def __init__(self, site, token):
        self.site = site
        self.headers = {'Authorization': 'Bearer ' + token, 'User-Agent': 'HaveIBeenTowed-Worker/2'}

    def post(self, endpoint, body=None):
        payload = json.dumps(body or {}).encode()
        request = urllib.request.Request(self.site + '/api/worker/' + endpoint, data=payload, headers={**self.headers, 'Content-Type': 'application/json'}, method='POST')
        with urllib.request.urlopen(request, timeout=120) as response:
            return json.load(response)

    def download(self, job, destination):
        path = '/api/worker/media/' + urllib.parse.quote(job['id'], safe='')
        request = urllib.request.Request(self.site + path, headers={**self.headers, 'X-Job-Lease': job['lease_id']})
        with urllib.request.urlopen(request, timeout=120) as response, open(destination, 'wb') as output:
            total = 0
            while True:
                chunk = response.read(128 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX_DOWNLOAD:
                    raise ValueError('Downloaded video exceeds 20 MB.')
                output.write(chunk)


def analyze(video_path, output_path):
    # A child process limits the effect of a malformed video or stalled inference.
    result = subprocess.run([sys.executable, str(ROOT / 'analyze.py'), str(video_path), str(output_path)], cwd=ROOT, capture_output=True, timeout=12 * 60)
    if result.returncode:
        raise RuntimeError('The analyzer could not process this video. Check worker logs or try another clip.')
    return json.loads(output_path.read_text())


def heartbeat(client, stop):
    while not stop.wait(30):
        try:
            client.post('heartbeat')
        except (OSError, ValueError):
            pass


def main():
    site, token = configuration()
    client = Client(site, token)
    stop = threading.Event()
    threading.Thread(target=heartbeat, args=(client, stop), daemon=True).start()
    print('Worker connecting. Leave this process running to analyze new uploads.', flush=True)
    try:
        while True:
            try:
                job = client.post('claim').get('job')
                if not job:
                    time.sleep(5)
                    continue
                print('Analyzing job ' + job['id'], flush=True)
                with tempfile.TemporaryDirectory(prefix='tow-') as temp:
                    video_path = pathlib.Path(temp) / ('footage' + pathlib.Path(job['source_filename']).suffix)
                    output_path = pathlib.Path(temp) / 'result.json'
                    try:
                        client.download(job, video_path)
                        result = analyze(video_path, output_path)
                    except (OSError, ValueError, RuntimeError, subprocess.TimeoutExpired) as error:
                        client.post('fail', {'job_id': job['id'], 'lease_id': job['lease_id'], 'error': str(error)[:300] or 'Analysis failed.'})
                        print('Analysis failed; the website has been updated.', flush=True)
                        continue
                    payload = {'job_id': job['id'], 'lease_id': job['lease_id'], **result}
                    for attempt in range(3):
                        try:
                            client.post('complete', payload)
                            print('Evidence saved for human review.', flush=True)
                            break
                        except urllib.error.HTTPError as error:
                            if error.code in (413, 422):
                                client.post('fail', {'job_id': job['id'], 'lease_id': job['lease_id'], 'error': 'The analyzer result did not meet the server validation rules.'})
                                print('Result rejected; job marked failed for review.', flush=True)
                                break
                            if error.code < 500:
                                raise
                            if attempt == 2:
                                raise
                            time.sleep(2 ** attempt)
                        except OSError:
                            if attempt == 2:
                                raise
                            time.sleep(2 ** attempt)
            except urllib.error.HTTPError as error:
                if error.code in (401, 403):
                    raise RuntimeError('Worker authentication failed. Generate a new key or check site access.') from None
                print('Server returned HTTP ' + str(error.code) + '; reconnecting.', flush=True)
                time.sleep(10)
            except (OSError, ValueError):
                print('Connection interrupted; reconnecting.', flush=True)
                time.sleep(10)
    finally:
        stop.set()


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\nWorker stopped.')
    except (ValueError, RuntimeError) as error:
        sys.exit(str(error))
