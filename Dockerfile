# ── Stage 1: Build frontend ──
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --frozen-lockfile 2>/dev/null || npm install
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Build backend ──
FROM node:20-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --frozen-lockfile 2>/dev/null || npm install
COPY backend/ ./
RUN npx prisma generate
RUN npm run build

# ── Stage 3: Production ──
FROM node:20-alpine AS production
RUN apk add --no-cache openssl

WORKDIR /app

COPY backend/package.json backend/package-lock.json* ./backend/
RUN cd backend && npm install --omit=dev --frozen-lockfile 2>/dev/null || npm install --omit=dev
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY --from=backend-build /app/backend/node_modules/.prisma ./backend/node_modules/.prisma
COPY --from=backend-build /app/backend/node_modules/@prisma ./backend/node_modules/@prisma
COPY --from=backend-build /app/backend/node_modules/better-sqlite3 ./backend/node_modules/better-sqlite3
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

RUN mkdir -p /app/data

ENV DATABASE_URL="file:/app/data/kinflow.db"
ENV PORT=4000
ENV NODE_ENV=production

EXPOSE 4000

CMD ["node", "backend/dist/index.js"]
