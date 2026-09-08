# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci --include=dev --legacy-peer-deps

FROM node:22-alpine AS builder
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

FROM node:22-alpine AS runner
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