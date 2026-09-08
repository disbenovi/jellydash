# jellydash (Docker packaging)

Docker image + CI for [developed-by-will/jellydash](https://github.com/developed-by-will/jellydash), a Next.js Jellyfin management dashboard.

This repo does not fork the app. It holds the `Dockerfile` and a GitHub Actions workflow that:

1. Checks the upstream repo every 6 hours (and on demand via `workflow_dispatch`)
2. If a new upstream commit exists, checks out upstream source, builds the image, pushes to GHCR, and records the upstream SHA in the `UPSTREAM_SHA` repo variable so the next run is a no-op until upstream changes again

## Image

```
ghcr.io/disbenovi/jellydash:latest
```

Tags: `latest` (current upstream master) and `sha-<short>` (the commit that triggered the build).

## Environment variables

### Build-time (CI repo Variables)

Set as repo **Variables** (Settings → Secrets and variables → Actions → Variables) to override build-time `NEXT_PUBLIC` defaults. These are baked into the client bundle at build time — changing them triggers a rebuild on the next CI run:

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_IMAGE_PROTOCOL` | `https` | Protocol for Jellyfin image URLs |
| `NEXT_PUBLIC_IMAGE_HOSTNAME` | `jellyfin.local` | Hostname served for Jellyfin images |
| `NEXT_PUBLIC_ALLOWED_DEV_ORIGIN` | `http://localhost:4000` | Allowed dev origin |

### Runtime (container env)

Put these in `jellydash.env` next to your compose file:

| Variable | Required | Example |
|---|---|---|
| `SERVER_URL` | yes | `http://172.27.0.1:8096` |
| `NEXTAUTH_URL` | yes | `http://navi-desktop:4001` |
| `NEXTAUTH_SECRET` | yes | `openssl rand -hex 32` |
| `JELLYFIN_ADMIN_API_KEY` | yes | Jellyfin admin API key |
| `WEBHOOK_SECRET` | recommended | `openssl rand -hex 16` |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | recommended | `openssl rand -hex 32` |
| `REQUEST_LOGS` | no | `true` |
| `DEBUG_JELLYFIN_ENDPOINT` | no | — |

Notes:

- `NEXT_PUBLIC_IMAGE_PROTOCOL` / `NEXT_PUBLIC_IMAGE_HOSTNAME` are also read at **runtime** by `next.config.mjs` and the container will crash on boot without valid values. When overriding at runtime (e.g. `NEXT_PUBLIC_IMAGE_PROTOCOL=http`, `NEXT_PUBLIC_IMAGE_HOSTNAME=172.27.0.1`), set the same values as CI Variables so the baked-in build matches.
- `NEXTAUTH_URL` must match the URL users visit in the browser. Use the **hostname** form (`http://host:port`), not `localhost`, if accessed from other machines.
- `SERVER_URL` is called from *inside* the container. `localhost` resolves to the container itself — use the Docker bridge gateway (`172.27.0.1`), the Jellyfin container IP, or a shared Docker network.

## Compose

```yaml
services:
  jellydash:
    image: ghcr.io/disbenovi/jellydash:latest
    container_name: jellydash
    restart: unless-stopped
    ports:
      - "4001:4000"
    env_file: jellydash.env
    volumes:
      - ./db:/app/app/db
```

`app/db/` holds all state (roles, ratings, watchlist settings). Mount it to persist across image updates.

## Permissions inside the container

The app runs as user `nextjs` (uid 1001). If the mounted `./db` directory is owned by root, the app cannot write state files and API routes fail. Fix with:

```
sudo chown -R 1001:1001 ./db
```

## Updates

The image tracks upstream `master` automatically. To update a running deployment:

```
docker compose pull && docker compose up -d
```

## Troubleshooting

- **Container exits at boot** with `Fatal next config errors: images.remotePatterns...` → runtime env `NEXT_PUBLIC_IMAGE_*` missing or invalid.
- **API routes return 500 and logs show `EACCES`/`EROFS` on `app/db`** → volume owned by root, see *Permissions* above.
- **Login fails against Jellyfin** → check `SERVER_URL` is reachable *from inside the container* (`docker exec jellydash wget -qO- $SERVER_URL/System/Info/Public`).

## License & provenance

- Upstream app: [developed-by-will/jellydash](https://github.com/developed-by-will/jellydash), MIT licensed.
- This packaging repo is also MIT licensed (see [LICENSE](./LICENSE)).

## AI disclosure

The `Dockerfile`, CI workflow, and documentation in this repo were written with the assistance of AI (Claude / GLM). The upstream application code is not modified except for four small TypeScript helper modules under [`overrides/app/db/`](./overrides/app/db/) — see that directory's README for why they exist and how to replace them with upstream versions if they ever become available. Everything here is provided as-is, without warranty; review before production use.