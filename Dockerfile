# Node is pinned by digest so a rebuild months from now is the same bytes, the
# way every other deployable image in the portfolio is. All three stages share
# one ARG: a builder on a different Node than the runner is how you get a build
# that works in CI and fails on the box.
#
# node:26.7.0-alpine — the current Node release line. The digest is the
# multi-arch OCI index (linux/amd64 for the VPS, linux/arm64 for a dev Mac).
# Next 16.1.1 requires node >=20.9.0.
#
# Re-pin with:
#   docker pull node:26-alpine
#   docker inspect --format='{{index .RepoDigests 0}}' node:26-alpine
ARG NODE_IMAGE=node:26.7.0-alpine@sha256:aadf416b2cdce311a8811ba3f0608a61b77dbf997500e2eafe781b51f6a0b019

# Stage 1: Install dependencies
FROM ${NODE_IMAGE} AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build the app
FROM ${NODE_IMAGE} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Runner
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production
# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
