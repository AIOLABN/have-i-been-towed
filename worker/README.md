# HaveIBeenTowed video worker

The website and database are hosted. This worker runs the original Python/FastALPR analysis on your computer or a Docker server. It makes outbound HTTPS requests; no port, public IP, or tunnel is needed. Keep it running to process new uploads.

## Connect with Docker

1. Install Docker Desktop (or Docker Engine on a server).
2. Unzip this folder, open a terminal here, and build:

```sh
docker build -t haveibeentowed-worker .
```

The build installs the computer-vision packages and downloads the two original ALPR models. It needs internet access to the model hosts and package registries. Allow several minutes on the first build.

3. Open **Detection studio → Connect worker** on your HaveIBeenTowed website. Sign in as an approved operator. Select **Generate connection key** and copy the provided run command.
4. Run that command. The website shows **Worker connected** after its heartbeat arrives.
5. Upload a short video (under 20 MB and five minutes). Candidates appear in **Evidence → My records**. Confirm plate, state and destination, then explicitly publish.

Generating a new connection key invalidates the previous key. Keys expire after 90 days. Never commit your key or paste it into a public issue.

For continuous operation on a Docker host, use the generated command with `-d --restart unless-stopped --name tow-worker` in place of `--rm`. The host must remain powered on. A website deployment alone does not start this Python service.

## Run with Python

Requires Python 3.11 and system OpenCV runtime libraries. Set `TOW_SITE_URL` to the HTTPS origin and `TOW_WORKER_TOKEN` to the generated key, then:

```sh
python -m pip install -r requirements.txt
python worker.py
```

PowerShell example (replace the values locally):

```powershell
$env:TOW_SITE_URL = "https://YOUR-SITE"
$env:TOW_WORKER_TOKEN = "YOUR-PRIVATE-KEY"
python worker.py
```

Worker routes are protected by the generated worker key, separate from operator sign-in.

## Processing behavior

- Up to five uploads can wait per operator, each at most 20 MB.
- The worker claims a 15-minute lease and runs inference with a 12-minute timeout.
- A heartbeat keeps worker status accurate while inference runs.
- Interrupted leases can be reclaimed; after three attempts a job fails visibly.
- Ambiguous competing tracks produce no accepted plate.
- Accepted snapshots become private candidates. Human review is required before lookup can return them.
- Raw uploaded footage is deleted after successful completion; transient deletion failures stay recorded and are retried on worker claims and heartbeats. Snapshots remain as evidence.
- Failed and queued footage stays in private storage for diagnosis. It does not imply a successful analysis.

The model configuration and thresholds are retained from the supplied project. OCR confidence is not the probability of a tow. Source timestamps in the hosted records represent submission time; camera capture time is not available in the original upload flow.
