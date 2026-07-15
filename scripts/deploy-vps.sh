#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Arranque de la demo de Flotas en un VPS Ubuntu/Debian limpio.
# Instala Docker, clona el repo, genera .env con secretos aleatorios y levanta
# toda la plataforma (app + worker + Postgres + Traccar) con docker compose.
#
# Uso (como root o con sudo):
#   REPO_URL="https://<TOKEN>@github.com/joaqinba-stack/flotas.git" \
#   SEED_PASSWORD="una-clave-para-la-demo" \
#   bash deploy-vps.sh
#
# Variables opcionales:
#   BRANCH           rama a desplegar (default: claude/github-software-demo-readiness-3yh982)
#   APP_DIR          carpeta destino (default: /opt/flotas)
#   OPEN_FIREWALL    "1" para abrir 3000/8082/5055 con ufw (default: 1)
# ---------------------------------------------------------------------------
set -euo pipefail

REPO_URL="${REPO_URL:?Definí REPO_URL con tu token, ej: https://<TOKEN>@github.com/joaqinba-stack/flotas.git}"
BRANCH="${BRANCH:-claude/github-software-demo-readiness-3yh982}"
APP_DIR="${APP_DIR:-/opt/flotas}"
SEED_PASSWORD="${SEED_PASSWORD:-flotas123}"
OPEN_FIREWALL="${OPEN_FIREWALL:-1}"

echo "==> 1/5 Instalando Docker (si falta)"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
docker compose version >/dev/null 2>&1 || { echo "Falta el plugin docker compose v2"; exit 1; }

echo "==> 2/5 Clonando el repositorio en $APP_DIR"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch origin "$BRANCH" && git -C "$APP_DIR" checkout "$BRANCH" && git -C "$APP_DIR" pull origin "$BRANCH"
else
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

echo "==> 3/5 Generando .env con secretos aleatorios"
if [ ! -f .env ]; then
  cp .env.example .env
  AUTH_SECRET="$(openssl rand -base64 32)"
  WEBHOOK_SECRET="$(openssl rand -hex 16)"
  sed -i "s|^AUTH_SECRET=.*|AUTH_SECRET=\"${AUTH_SECRET}\"|" .env
  sed -i "s|^TRACCAR_WEBHOOK_SECRET=.*|TRACCAR_WEBHOOK_SECRET=\"${WEBHOOK_SECRET}\"|" .env
  sed -i "s|^SEED_PASSWORD=.*|SEED_PASSWORD=\"${SEED_PASSWORD}\"|" .env
  # el header del webhook en traccar.xml debe coincidir con el secreto generado
  sed -i "s|X-Traccar-Secret: .*|X-Traccar-Secret: ${WEBHOOK_SECRET}|" docker/traccar/traccar.xml
  echo "    .env creado (AUTH_SECRET y webhook secret aleatorios; SEED_PASSWORD=${SEED_PASSWORD})"
else
  echo "    .env ya existía, se respeta"
fi

echo "==> 4/5 Levantando la plataforma (build + migraciones + seed)"
docker compose up -d --build

if [ "$OPEN_FIREWALL" = "1" ] && command -v ufw >/dev/null 2>&1; then
  echo "==> 5/5 Abriendo puertos en ufw (3000 web, 8082 Traccar, 5055 GPS celular)"
  ufw allow 3000/tcp || true
  ufw allow 8082/tcp || true
  ufw allow 5055/tcp || true
else
  echo "==> 5/5 Recordá abrir en el firewall/security-group: 3000 (web), 8082 (Traccar), 5055 (GPS celular)"
fi

IP="$(curl -fsS https://api.ipify.org 2>/dev/null || echo TU_IP)"
cat <<EOF

============================================================
  Flotas desplegado.
  Web:      http://${IP}:3000
  Traccar:  http://${IP}:8082   (admin/admin — cambiar)
  Usuarios: admin@flotas.local · supervisor@ · chofer@ · proveedor@ · mesa@flotas.local
  Password: ${SEED_PASSWORD}
  Estado:   docker compose ps
  Logs:     docker compose logs -f app
============================================================
EOF
