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

echo "==> 0/5 Asegurando memoria swap (colchón para el build)"
if [ ! -f /swapfile ] && ! swapon --show | grep -q .; then
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "    swap de 2G activada"
else
  echo "    ya hay swap, se respeta"
fi

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

echo "==> 3/6 Generando .env con secretos aleatorios"
if [ ! -f .env ]; then
  cp .env.example .env
  AUTH_SECRET="$(openssl rand -base64 32)"
  WEBHOOK_SECRET="$(openssl rand -hex 16)"
  TRACCAR_SVC_PASSWORD="$(openssl rand -hex 16)"
  sed -i "s|^AUTH_SECRET=.*|AUTH_SECRET=\"${AUTH_SECRET}\"|" .env
  sed -i "s|^TRACCAR_WEBHOOK_SECRET=.*|TRACCAR_WEBHOOK_SECRET=\"${WEBHOOK_SECRET}\"|" .env
  sed -i "s|^SEED_PASSWORD=.*|SEED_PASSWORD=\"${SEED_PASSWORD}\"|" .env
  sed -i "s|^TRACCAR_USER=.*|TRACCAR_USER=\"flotas-api@flotas.local\"|" .env
  sed -i "s|^TRACCAR_PASSWORD=.*|TRACCAR_PASSWORD=\"${TRACCAR_SVC_PASSWORD}\"|" .env
  # el header del webhook en traccar.xml debe coincidir con el secreto generado
  sed -i "s|X-Traccar-Secret: [^<]*|X-Traccar-Secret: ${WEBHOOK_SECRET}|" docker/traccar/traccar.xml
  echo "    .env creado (AUTH_SECRET, webhook y cuenta de servicio Traccar aleatorios; SEED_PASSWORD=${SEED_PASSWORD})"
else
  echo "    .env ya existía, se respeta"
fi

echo "==> 4/6 Levantando la plataforma (build + migraciones + seed)"
docker compose up -d --build

# Traccar 6 no trae usuario admin por defecto: la primera visita a :8082
# registra al admin humano. La app necesita su PROPIA cuenta de servicio para
# la API; se crea acá directo en la base de Traccar (idempotente).
echo "==> 5/6 Creando cuenta de servicio de la app en Traccar"
TRACCAR_SVC_USER="$(grep '^TRACCAR_USER=' .env | cut -d= -f2- | tr -d '\"')"
TRACCAR_SVC_PASS="$(grep '^TRACCAR_PASSWORD=' .env | cut -d= -f2- | tr -d '\"')"
if command -v python3 >/dev/null 2>&1; then
  for i in $(seq 1 30); do
    docker compose exec -T traccar-db psql -U traccar -d traccar -c "SELECT 1 FROM tc_users LIMIT 1" >/dev/null 2>&1 && break
    sleep 2
  done
  read -r SVC_SALT SVC_HASH <<< "$(python3 - "$TRACCAR_SVC_PASS" <<'PYEOF'
import os, sys, hashlib
salt = os.urandom(24)
print(salt.hex(), hashlib.pbkdf2_hmac("sha1", sys.argv[1].encode(), salt, 1000, 24).hex())
PYEOF
)"
  docker compose exec -T traccar-db psql -U traccar -d traccar -c "
    INSERT INTO tc_users (id, name, email, hashedpassword, salt, administrator)
    SELECT COALESCE(MAX(id),0)+1, 'Servicio Flotas', '${TRACCAR_SVC_USER}', '${SVC_HASH}', '${SVC_SALT}', true
    FROM tc_users
    WHERE NOT EXISTS (SELECT 1 FROM tc_users WHERE email = '${TRACCAR_SVC_USER}');" >/dev/null \
    && echo "    cuenta de servicio lista: ${TRACCAR_SVC_USER}" \
    || echo "    ADVERTENCIA: no se pudo crear la cuenta de servicio; creala a mano en Traccar con esas credenciales"
else
  echo "    ADVERTENCIA: falta python3; creá en Traccar el usuario ${TRACCAR_SVC_USER} (admin) con la password de TRACCAR_PASSWORD en .env"
fi

if [ "$OPEN_FIREWALL" = "1" ] && command -v ufw >/dev/null 2>&1; then
  echo "==> 6/6 Abriendo puertos en ufw (3000 web, 8082 Traccar, 5055 GPS celular)"
  ufw allow 3000/tcp || true
  ufw allow 8082/tcp || true
  ufw allow 5055/tcp || true
else
  echo "==> 6/6 Recordá abrir en el firewall/security-group: 3000 (web), 8082 (Traccar), 5055 (GPS celular)"
fi

IP="$(curl -fsS https://api.ipify.org 2>/dev/null || echo TU_IP)"
cat <<EOF

============================================================
  Flotas desplegado.
  Web:      http://${IP}:3000
  Traccar:  http://${IP}:8082   (registrá tu admin en la primera visita;
            la app ya usa su propia cuenta de servicio para la API)
  Usuario:  admin@flotas.local
  Password: ${SEED_PASSWORD}
  Estado:   docker compose ps
  Logs:     docker compose logs -f app
============================================================
EOF
