# Tests de integración (scoping con base de datos real)

Verifican el requisito crítico del pliego (PLAN §6): que un `DRIVER` o
`SUPPLIER` no pueda acceder a datos fuera de su alcance a través de la capa
`lib/data`, y que un `SUPERVISOR` solo vea su subárbol del organigrama. A
diferencia de los tests unitarios (puros, sin DB), estos golpean Prisma contra
una base **dedicada** y luego la limpian.

## Correr

```bash
# 1. Crear la base de test (una sola vez)
docker exec -i flotas-app-db-1 psql -U flotas -d flotas -c "CREATE DATABASE flotas_test;"

# 2. Aplicar migraciones a la base de test
DATABASE_URL="postgresql://flotas:flotas@localhost:5432/flotas_test" npx prisma migrate deploy

# 3. Correr
npm run test:integration
```

La URL de la base de test se toma de `TEST_DATABASE_URL` (default
`postgresql://flotas:flotas@localhost:5432/flotas_test`). **Nunca** usan la
base de `.env`: `npm test` (unitario) los excluye a propósito para no depender
de una DB ni tocar datos reales.
