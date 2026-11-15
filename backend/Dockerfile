FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build --workspace=backend
RUN test -f backend/.env.production || : > backend/.env.production

FROM node:22-alpine AS production-dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --omit=dev --workspace=backend --workspace=packages/shared \
  && npm cache clean --force

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8000
RUN addgroup --system --gid 1001 phasezero \
  && adduser --system --uid 1001 phasezero
COPY --from=production-dependencies --chown=phasezero:phasezero /app/node_modules ./node_modules
COPY --from=production-dependencies --chown=phasezero:phasezero /app/package.json ./package.json
COPY --from=production-dependencies --chown=phasezero:phasezero /app/backend/package.json ./backend/package.json
COPY --from=production-dependencies --chown=phasezero:phasezero /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder --chown=phasezero:phasezero /app/backend/src ./backend/src
COPY --from=builder --chown=phasezero:phasezero /app/backend/.env.production ./backend/.env.production
COPY --from=builder --chown=phasezero:phasezero /app/packages/shared/src ./packages/shared/src
USER phasezero
EXPOSE 8000
CMD ["node", "--env-file=backend/.env.production", "--import=tsx", "backend/src/server.ts"]
