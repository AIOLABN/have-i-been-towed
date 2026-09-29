# Deploying HaveIBeenTowed

The website runs on **Cloudflare Workers** with **D1** (database) and **R2** (file storage). The free `*.workers.dev` address has no third-party branding, and you can attach your own domain later. The Python video worker runs separately (see `worker/README.md`).

Requirements: a free Cloudflare account (R2 needs a payment method on file, but the free allowance is generous), Node 22.13+, and pnpm.

This configuration uses shared demo credentials. Read the [authentication limitations](README.md#authentication-limitations) and [privacy requirements](README.md#privacy--responsible-use) before using real operator or vehicle data.

## 1. One-time setup

~~~sh
pnpm install
pnpm wrangler login
pnpm wrangler d1 create haveibeentowed-db
pnpm wrangler r2 bucket create haveibeentowed-media
~~~

Copy the `database_id` printed by the first command into `wrangler.jsonc`. Set your approved operator emails in `wrangler.jsonc` under `vars.OPERATOR_EMAILS` (comma-separated).

## 2. Secrets

~~~sh
pnpm wrangler secret put OPERATOR_PASSWORD   # 8+ characters, shared by approved operators
pnpm wrangler secret put SESSION_SECRET      # 16+ random characters, e.g. from: openssl rand -hex 32
pnpm wrangler secret put LOOKUP_SALT         # any random string
~~~

Sign-in stays disabled until `OPERATOR_PASSWORD` and `SESSION_SECRET` are set.

## 3. Create tables and deploy

~~~sh
pnpm db:migrate:remote
pnpm deploy
~~~

Wrangler prints your live address, like `https://haveibeentowed.<your-subdomain>.workers.dev`.

## 4. Connect the video worker

Open **Detection studio**, sign in at `/login`, generate a connection key, and run the command shown. The Python worker only makes outbound HTTPS requests, so a home computer, a Docker host, or a small VPS all work.

## Custom domain

In the Cloudflare dashboard, open the Worker, then Settings, Domains & Routes, and add a custom domain you control.

## Updating

Run `pnpm deploy` again. Run `pnpm db:migrate:remote` first if you added a migration.
