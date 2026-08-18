# Cama-Pro en desarrollo

Plataforma web para gestionar un grupo de camareros que se ofrecen a restaurantes y casas de eventos.

## Arquitectura

Monorepo (npm workspaces) con monolito modular + Clean Architecture + DDD tactico.

```
cama-pro/
├── apps/
│   ├── api/        # Backend Node + TypeScript + Express + Prisma
│   └── web/        # Frontend React + Vite + TypeScript + Tailwind
├── packages/
│   └── shared-types/   # Zod schemas y tipos compartidos
└── docker-compose.yml  # Postgres local
```

### Bounded contexts (modulos)
- `identity` — usuarios, login, roles
- `staff` — camareros, aprobacion
- `bookings` — servicios y asignaciones

## Primeros pasos

```bash
# 1. Copiar variables de entorno
cp .env.example .env

# 2. Levantar Postgres
npm run db:up

# 3. Instalar dependencias
npm install

# 4. Migrar BD
npm run db:migrate

# 5. Arrancar (api + web en paralelo)
npm run dev
```

- API:  http://localhost:3001
- Web:  http://localhost:5173

## Scripts utiles

| Comando | Que hace |
|---|---|
| `npm run dev` | Arranca api y web en paralelo |
| `npm run dev:api` | Solo backend |
| `npm run dev:web` | Solo frontend |
| `npm run db:up` | Levanta Postgres en Docker |
| `npm run db:down` | Apaga Postgres |
| `npm run db:migrate` | Aplica migraciones Prisma |
| `npm run db:studio` | Abre Prisma Studio |
| `npm test` | Tests en todos los paquetes |
