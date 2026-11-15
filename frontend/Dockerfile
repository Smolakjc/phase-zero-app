FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/frontend/node_modules ./frontend/node_modules
COPY . .
RUN npm run build --workspace=frontend

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 phasezero \
  && adduser --system --uid 1001 phasezero
COPY --from=builder --chown=phasezero:phasezero /app/frontend/.next/standalone ./
COPY --from=builder --chown=phasezero:phasezero /app/frontend/.next/static ./frontend/.next/static
USER phasezero
EXPOSE 3000
CMD ["node", "frontend/server.js"]
