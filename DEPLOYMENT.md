# Deploying CORTEXA to Railway (or any container host)

## What changed to fix the image build

The build was failing because Railway's automatic builder (Nixpacks) guessed a
Node version too old for this stack. **Vite 6 and Tailwind CSS v4 require
Node 20+**, and on Node 18 the image build dies with the generic
"Failed to build an image" error. The project now ships its own build
definition so nothing is guessed:

| File            | Purpose                                                            |
| --------------- | ------------------------------------------------------------------ |
| `Dockerfile`    | Multi-stage build pinned to `node:20-alpine`; Railway auto-detects it and skips Nixpacks entirely. |
| `server.js`     | Zero-dependency production server. Binds `0.0.0.0:$PORT`, serves `dist/`, SPA fallback, real security headers (CSP, HSTS, nosniff), immutable caching for hashed assets. |
| `nixpacks.toml` | Fallback if the Dockerfile is ever ignored: pins Node 20 and sets the start command. |
| `.dockerignore` | Keeps `node_modules`, `dist`, `.git` and `.env` out of the image context. |

## Deploy steps

1. Push this project to the GitHub repository connected to your Railway service.
2. In Railway → your service → **Settings**:
   - Builder: **Dockerfile** (should auto-detect; set manually if it says Nixpacks).
   - You do **not** need to set a Build Command, Start Command, or Port — the
     Dockerfile and `server.js` define them (`CMD node server.js`, `$PORT`).
3. Trigger a **Deploy**. The build log should show `npm install`, then
   `npm run build` (`vite build`), finishing with `✓ built in ~4s`.
4. Railway assigns a public URL. Open it and sign in with
   `admin@cortexa.demo` / `cortexa` (demo tenant) or create a new organisation.

## If the build still fails

Open **Deployments → Build logs** and look for the first `ERR!`/`error` line:

- **`npm ERR! network`** — the build lost registry access; simply redeploy.
- **`vite: not found`** — the install phase was skipped; confirm the Builder is
  Dockerfile and redeploy (the Dockerfile installs before building).
- **`JavaScript heap out of memory`** — add env var
  `NODE_OPTIONS=--max-old-space-size=1024` in Railway → Variables, redeploy.
- Anything else — the log line above the failure names the exact package or
  file; the build here completes locally in ~4 seconds, so a failure is
  environmental, not application code.

## Runtime notes

- The app persists each organisation's register in the browser's local storage
  (multi-tenant, permission-checked). No external database is required for the
  demo build; the `.env.example` documents PostgreSQL / object-storage /
  SMTP wiring for a full backend deployment.
- Health checks: any `GET /` returns `200` with the application shell.
