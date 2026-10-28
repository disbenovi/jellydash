# Upstream overrides

Upstream repo (developed-by-will/jellydash) gitignores its entire `app/db/`
directory. The app imports four helper modules from it, so the Docker build
fails without them. These files are reconstructed from the import call sites
in upstream code:

- `app/db/packages.ts` — roles.json, per-role library files (`id->name` lines),
  ordered-views.json, default-role seeding, Jellyfin user policy builder.
- `app/db/ratings.ts` — ratings.json CRUD (getRatings/saveRatings, Rating type).
- `app/db/webhookSecret.ts` — webhook-secret.json (getOrCreateWebhookSecret /
  isValidWebhookSecret, 32-byte hex secret).
- `app/db/watchlistSettings.ts` — watchlist-settings.json + uploaded playlist
  images under app/db/images/ (image getters return data URLs; the UI renders
  them with plain `<img>` so no serving route is needed).

If upstream ever un-ignores `app/db`, replace these with the real sources:
the CI assemble step copies this `overrides/` tree over the upstream checkout,
so upstream files win on conflict (tar overwrites).

## npm security pins

`npm-security-overrides.json` + `apply-npm-overrides.cjs` are applied inside the
Docker `deps` stage before `npm install`. Upstream's dependency tree ships
vulnerable versions (`next@16.3.0` 5 critical RCE advisories, `sharp@0.35.3`
libheif/librsvg, `nanoid`/`source-map-js` via postcss, `postcss-selector-parser`
via tailwind, `picomatch@2.3.1` ReDoS). The Dockerfile COPYs both files and runs:

    node apply-npm-overrides.cjs npm-security-overrides.json package.json
    npm install --include=dev --legacy-peer-deps

The script pins packages that upstream declares directly by rewriting that
dependency (npm rejects an `overrides` entry conflicting with a direct dep with
`EOVERRIDE`), and forces the rest through `pkg.overrides`. `npm ci` is no longer
usable: overrides make the upstream lockfile stale.

`picomatch` is version-scoped (`picomatch@^2.3.1` -> 2.3.2) so the separate
`picomatch@4.0.5` in the tree (already patched) stays put.

Verified 2026-10-27: 196 prod packages, OSV querybatch returns 0 vulnerabilities;
image runs on node 22.23.4 with next 16.4.3 and behaves identically to the
previous image on `/` and the `/api/*` routes.
