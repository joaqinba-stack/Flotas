# Cómo trabajar en este repositorio

Instalación, desarrollo local y despliegue inicial están en el [README](README.md).
Este archivo es el acuerdo de trabajo: qué se toca, en qué orden y qué verificar.

## Dónde se edita

**El repo de trabajo es la copia local. El VPS solo lee.**

- Local: `C:/Users/joaqi/Documents/Flotas` (Windows).
- VPS: `137.184.136.202:/opt/flotas`, alcanzable con `ssh vps` desde WSL (alias en `~/.ssh/config`).

Nunca editar ni commitear en el servidor. Ya pasó: cuatro commits escritos directo
en el VPS dejaron la copia local cuatro atrás sin que nadie se enterara, y eso solo
se descubre cuando un `git pull` choca.

Si alguna vez hay que mirar archivos del servidor, `flotas cd` monta `/opt/flotas`
por SSHFS — pero es para un vistazo, no para trabajar: con 168 ms de RTT, recorrer
el árbol del proyecto tarda minutos y cualquier búsqueda recursiva se arrastra.

## El ciclo

1. Editar local.
2. `npm run typecheck`, `npm run lint`, `npm test`.
3. Verificar en el navegador contra el server local.
4. `git commit` en `main` — el VPS tira de `main`, no usar ramas para el flujo normal.
5. `flotas deploy` desde WSL.

`flotas` es una función bash definida en `~/.flotas.sh` (WSL, cargada desde `.bashrc`).
Subcomandos: `deploy [-y]`, `status`, `ps`, `logs [servicio]`, `ssh`, `cd`, `down`.

`flotas deploy` hace push a GitHub, `git pull --ff-only` en el VPS y
`docker compose up -d --build`. Aborta si la rama no es `main` o si hay cambios sin
commitear, y pide confirmación salvo con `-y`. Usa el git de Windows a propósito: el
de WSL tiene otro `autocrlf` y ve todos los archivos como modificados, y además no
tiene las credenciales de GitHub.

## Antes de desplegar

El usuario pide explícitamente que no se pierdan los datos del VPS. El protocolo:

- Confirmar que no hay cambios de esquema: `git status --porcelain prisma/`. Si hay
  migraciones nuevas, decirlo con todas las letras antes de seguir.
- Respaldar las **dos** bases a `/root/backups/` y verificar la integridad:

  ```bash
  ssh vps 'cd /opt/flotas && docker compose exec -T app-db pg_dump -U flotas -d flotas | gzip > /root/backups/flotas-$(date +%F-%H%M).sql.gz'
  ```

- Anotar los conteos de `Driver`, `Vehicle`, `PositionSnapshot`, `User` y `Alert`
  antes del deploy y compararlos después. Es la única prueba real de que no se
  perdió nada.

**Nunca correr `npm run db:seed:demo` en el VPS.** Arranca con un `deleteMany()` en
cascada sobre casi todas las tablas: borraría los datos reales. El `docker-compose`
corre `db:seed`, que es un solo `upsert` del admin y es inocuo.

El build corre en el VPS y la máquina tiene 1,9 GB de RAM con Traccar reservando 1 GB
fijo de heap, así que compila apoyándose en swap: entre 5 y 12 minutos. No es un
cuelgue. Docker mantiene la imagen anterior sirviendo hasta que la nueva está lista,
así que la caída real son los segundos del reemplazo de contenedores.

## Después de desplegar, verificar

Lo que funciona en `next dev` puede fallar en producción. Caso real de este repo:
`public/` no estaba entre los `COPY` del Dockerfile, así que el logo daba 404 servido
por `next start` aunque en desarrollo andaba perfecto — porque `next dev` sirve
`public/` desde el disco. Se descubrió por verificar después del deploy, no antes.

Chequear siempre: la web responde 200, las rutas nuevas existen, los assets nuevos
cargan, y los conteos de datos siguen donde estaban.

## Convenciones del producto

Es un despliegue paraguayo (CONATEL):

- **Cédula**, no "DNI". RUC, no CUIT. Teléfonos `+595`. Mapas centrados en Asunción.
- Zona horaria de visualización: `America/Asuncion`, y el servidor del VPS corre en
  UTC. Usar siempre los helpers de [lib/format.ts](lib/format.ts): `fmtDateTime`,
  `fmtDateTimeSeconds`, `fmtNumber`, `dayInputValue`.
- **Nunca `toLocaleString` sin `timeZone`**: renderiza en la zona del navegador de
  quien mire, no en la del despliegue.
- Las fechas y horas que el usuario escribe en filtros se interpretan en hora de
  Paraguay con `inputToUtc`. Sin eso, "desde las 08:00" filtra desde las 05:00.
- Comentarios y mensajes de commit en español, explicando el **por qué** de la
  decisión, no lo que ya se ve en el código.

## Pendientes conocidos

- `/opt/flotas/.git/config` en el VPS tiene el PAT de GitHub en texto plano.
- Las alertas emitidas antes del arreglo de zona horaria conservan un ISO en UTC
  dentro del texto del mensaje; reescribirlas sería una migración de datos aparte.
- Queda un conductor de prueba `FANTASMA 1` en la base del VPS.
- Las posiciones crecen unas 3.300 por día. A ese ritmo, en un mes se toca el tope de
  100.000 del histórico y cada deploy pesa más. Hay que decidir entre purgar
  posiciones viejas con una tarea programada o agrandar el droplet.
