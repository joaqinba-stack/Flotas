# Imagen multi-stage para la app Next.js (y el worker, cambiando el comando).
# Se conserva node_modules completo en la imagen final para que la MISMA imagen
# sirva la app (next start) y ejecute el worker (tsx) y las migraciones (prisma).

# --- deps: instala dependencias (con dev, para poder compilar y correr tsx) ---
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# --- builder: genera Prisma Client y compila Next ---
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
# Placeholders de build: `next build` no consulta la base (las páginas son dinámicas),
# pero necesita que estas variables existan al importar módulos. En runtime se usan las reales.
ENV AUTH_SECRET="build-time-placeholder"
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN npm run build

# --- runner: imagen final ---
# Trae node_modules completo + código fuente. Así la MISMA imagen sirve para:
#   - la app:    `node server.js` (usando el output standalone), y
#   - el worker: `npm run worker` (tsx sobre el código fuente),
#   - migrar:    `npx prisma migrate deploy && npm run db:seed`.
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/app ./app
COPY --from=builder /app/components ./components
COPY --from=builder /app/types ./types
COPY --from=builder /app/middleware.ts ./middleware.ts

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Comando por defecto: servir la app. El servicio worker lo sobreescribe en compose.
CMD ["npm", "run", "start"]
