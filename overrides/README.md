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