# syntax=docker/dockerfile:1

# Base image is pinned (not floating node:22-alpine) so every stage ships the
# same audited Node runtime. 22.23.4 is the first 22.x release that fixes
# CVE-2026-111497. Bump this tag deliberately when a newer patch lands.
FROM node:22.23.4-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
# Security overrides (see overrides/npm-security-overrides.json): the upstream
# dependency tree ships vulnerable next@16.3.0 (5 critical RCE/HIGH advisories),
# sharp@0.35.3 (libheif/librsvg), and postcss's nanoid/source-map-js plus
# tailwind's postcss-selector-parser. npm overrides pin patched versions at
# every tree level, which makes the lockfile stale -> use `npm install` here
# instead of `npm ci` (install still writes the same resolved tree).
COPY overrides/npm-security-overrides.json overrides/apply-npm-overrides.cjs ./
RUN node apply-npm-overrides.cjs npm-security-overrides.json package.json \
 && npm install --include=dev --legacy-peer-deps

FROM node:22.23.4-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
ARG NEXT_PUBLIC_IMAGE_PROTOCOL=https
ARG NEXT_PUBLIC_IMAGE_HOSTNAME=jellyfin.local
ARG NEXT_PUBLIC_ALLOWED_DEV_ORIGIN=http://localhost:4000
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_IMAGE_PROTOCOL=$NEXT_PUBLIC_IMAGE_PROTOCOL \
    NEXT_PUBLIC_IMAGE_HOSTNAME=$NEXT_PUBLIC_IMAGE_HOSTNAME \
    NEXT_PUBLIC_ALLOWED_DEV_ORIGIN=$NEXT_PUBLIC_ALLOWED_DEV_ORIGIN \
    # placeholders so module-load-time validation in app/api/auth/authoptions.ts
    # doesn't abort `next build` (route handlers are evaluated for page data
    # collection). Runtime overrides below in the runner stage.
    NEXTAUTH_SECRET=build-time-placeholder \
    NEXTAUTH_URL=http://localhost:4000 \
    SERVER_URL=http://localhost:8096 \
    JELLYFIN_ADMIN_API_KEY=build-time-placeholder \
    NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=build-time-placeholder
RUN npm run build

FROM node:22.23.4-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=4000 \
    HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/next.config.mjs ./next.config.mjs
COPY --from=builder --chown=nextjs:nodejs /app/middleware.ts ./middleware.ts
USER nextjs
EXPOSE 4000
CMD ["npm", "run", "start"]