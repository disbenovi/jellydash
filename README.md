# jellydash (Docker packaging)

Docker image + CI for [developed-by-will/jellydash](https://github.com/developed-by-will/jellydash), a Next.js Jellyfin management dashboard.

This repo does not fork the app. It holds the `Dockerfile` and a GitHub Actions workflow that:

1. Checks the upstream repo every 6 hours (and on demand via `workflow_dispatch`)
2. If a new upstream commit exists, checks out upstream source, builds the image, pushes to GHCR, and records the upstream SHA in the `UPSTREAM_SHA` repo variable so the next run is a no-op until upstream changes again

## Image

```
ghcr.io/disbenovi/jellydash:latest
```

## Environment variables

Set as repo **Variables** (Settings → Secrets and variables → Actions → Variables) to override build-time NEXT_PUBLIC defaults:

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_IMAGE_PROTOCOL` | `https` | Protocol for Jellyfin image URLs |
| `NEXT_PUBLIC_IMAGE_HOSTNAME` | `jellyfin.local` | Hostname served for Jellyfin images |
| `NEXT_PUBLIC_ALLOWED_DEV_ORIGIN` | `http://localhost:4000` | Allowed dev origin |

Runtime config goes in the container env (`.env` next to compose file). See upstream README.

## Compose

```yaml
services:
  jellydash:
    image: ghcr.io/disbenovi/jellydash:latest
    container_name: jellydash
    restart: unless-stopped
    ports:
      - "4000:4000"
    env_file: jellydash.env
    volumes:
      - ./db:/app/app/db
```

`app/db/` holds all state (roles, ratings, watchlist settings). Mount it to persist across image updates.