# HaveIBeenTowed

**BAY HACKS — AI Track Winner**

A computer-vision prototype that helps drivers find reviewed towing records using their license plate and registration state.

![Sample camera evidence](public/media/tow-frame.jpg)

[Quick start](#run-locally) · [How it works](#how-the-signal-travels) · [Worker setup](worker/README.md) · [Deployment](DEPLOY.md)

Connected tow-event evidence and vehicle lookup prototype. Camera footage becomes a plate candidate, an operator checks the frame, and only a reviewed record can appear in a public lookup.

## Run locally

Requires Node 22.13+ for the web application and Python 3.11+ for the video worker.

~~~sh
pnpm install
pnpm dev
~~~

Open the URL printed by Vinext. To serve the production bundle locally:

~~~sh
pnpm build
pnpm start
~~~

Before first run, copy `.dev.vars.example` to `.dev.vars`, set your operator email and password, then apply the local migrations with `pnpm db:migrate:local`. The local D1/R2 preview state is disposable and lives under `.wrangler/`. Production uses the D1 database and R2 bucket declared in `wrangler.jsonc`; see [`DEPLOY.md`](DEPLOY.md).

## What works

**Public lookup**, at `/`, accepts an exact license plate and registration state. It returns only a published match. A missing result is intentionally inconclusive: this prototype is not connected to every towing company, city, or police database.

**Detection studio**, at `/detection`, is the operator workspace. It includes the recorded sample journey, a private upload queue, worker connection instructions, and processing status. Uploads are limited to five waiting jobs and 20 MB per video.

**The evidence room**, at `/evaluation`, keeps the sample record separate from an operator's live records. An operator can inspect the frame, verify the plate and state, confirm the supplied destination, then publish or reject the candidate. Pending evidence is not returned by public lookup.

The API is served by the same application. `GET /api/status` reports database readiness and, for an approved operator, whether that operator's worker has sent a recent heartbeat.

## How the signal travels

1. An authorized operator uploads a short camera clip with a registration state, camera or truck ID, and tow destination.
2. The Python worker claims the queued job and runs the supplied FastALPR pipeline with plate detection, OCR, relative-motion tracking, and multi-frame voting.
3. The worker returns up to five candidates and supporting snapshots. Candidates are stored as private evidence with `pending` review status.
4. A person checks the full plate, registration state, frame, and destination. Publication is an explicit action.
5. The public lookup matches the exact normalized plate and state against published records only.

OCR confidence describes the plate read. It is not the probability that a vehicle was towed. Ambiguous tracks are rejected rather than promoted by a stronger label.

## Demo and data boundaries

The sample experience uses the original `tow_test.mp4` project footage and its saved evidence. The sample plate (`9WKR761`, California) is marked as a historical demo and is never mixed into live lookup results.

This is an independent prototype, not a municipal or tow-company registry. It does not establish that a vehicle is currently impounded, guarantee that every tow is represented, or replace posted-property instructions and local non-emergency services. Confirm pickup details with the operator that supplied the destination.

Raw uploaded footage is deleted after successful processing. A deletion failure is recorded and retried on later worker heartbeats or claims. Review snapshots remain as evidence; queued and failed footage stays private for diagnosis. Upload only footage that you are authorized to process.

## Worker

The browser and API are hosted, but computer-vision processing runs in a separate Python process. It makes outbound HTTPS requests to the Site; it does not need an inbound port, public IP, or tunnel.

See [`worker/README.md`](worker/README.md) for Docker and Python instructions. The short version is:

~~~sh
cd worker
docker build -t haveibeentowed-worker .
~~~

Then open **Detection studio → Connect worker**, sign in as an approved operator, generate a connection key, and run the command shown there. Keys are shown once, expire after 90 days, and generating a new key revokes the previous one. A Site deployment does not start the worker automatically.

The worker uses a 15-minute job lease and a 12-minute inference timeout. Interrupted jobs can be reclaimed; after three attempts a job is marked failed. Keep the worker host powered on while jobs are queued.

## Configuration

Locally these live in `.dev.vars` (see `.dev.vars.example`); in production they are Cloudflare Worker variables and secrets (see `DEPLOY.md`):

~~~sh
OPERATOR_EMAILS=operator@example.com
OPERATOR_PASSWORD=a-long-shared-password
SESSION_SECRET=a-long-random-string
LOOKUP_SALT=use-a-local-random-value
~~~

`OPERATOR_EMAILS` is a comma-separated allowlist and `OPERATOR_PASSWORD` is the shared operator password. Operators sign in at `/login`; a signed, HttpOnly session cookie (keyed by `SESSION_SECRET`) lasts seven days and is re-checked against the allowlist on every request. Sign-in is rate limited. The allowlist gates uploads, worker-key generation, and evidence review; it is not a general role system. Anonymous visitors can use the public lookup, subject to a per-IP rate limit when Cloudflare provides the request IP.

## Repository layout

~~~text
app/                 Vinext pages, API route, and client workspace
lib/                 API handlers, validation, access checks, and types
db/                  D1 access and schema declarations
drizzle/             D1 migrations
worker/              Python/FastALPR worker and Docker image
public/media/        Clearly marked sample footage and evidence
tests/               Node, D1/R2 integration, and Python worker tests
wrangler.jsonc       Worker entry, D1/R2 bindings, and variables
edge/                Cloudflare Worker entry point
lib/auth.ts          Operator sign-in and signed session cookies
~~~

## Validation

Run the focused checks before publishing a change:

~~~sh
pnpm build
pnpm test
python3 -m compileall -q worker
~~~

The integration suite exercises the real D1/R2 emulation, including owner scoping, stale leases, idempotent completion, private evidence, exact plate-and-state lookup, and durable raw-footage cleanup:

~~~sh
node tests/api.integration.mjs
~~~

The thresholds, model configuration, and demo data are retained from the supplied project. They are engineering settings for this prototype, not validated towing, legal, or safety determinations.

## Deployment

The web application is a Vinext (Next-compatible) app that runs as a Cloudflare Worker with D1 and R2 bindings. `pnpm deploy` builds and publishes it to a free `*.workers.dev` address, and a custom domain can be attached in the Cloudflare dashboard. Step-by-step instructions are in [`DEPLOY.md`](DEPLOY.md). The Python worker remains a separately managed process and must be connected with its short-lived worker key after deployment.

## Project background

Originally built as a team project for BAY HACKS, where it won the AI track. This fork is maintained by Adham Matar and contains the updated application and computer-vision worker. The original project history is preserved in Git.
