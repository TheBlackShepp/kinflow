# Kinflow

App familiar PWA offline-first para gestionar listas de compras, recetas, planificación de menús y un catálogo de productos con precios por supermercado.

## Funcionalidades

- **Listas de compras** — Crear múltiples listas con tipos (compra, tareas, equipaje, deseos, media), drag & drop, colores, categorías y modo offline
- **Catálogo de productos** — Registrar productos con categoría, unidad y precios por supermercado. Buscar y seleccionar al añadir artículos a una lista
- **Recetas** — Crear recetas con ingredientes e instrucciones
- **Planificador de menús** — Organizar comidas por día de la semana y exportar ingredientes directamente a una lista de la compra
- **Familia** — Compartir todo con tu hogar mediante código de invitación. Tiempo real vía SSE
- **PWA offline-first** — Funciona sin conexión. Los cambios se sincronizan automáticamente cuando vuelves a estar online (Dexie + IndexedDB)

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4 |
| Backend | Express 5, TypeScript, Prisma, SQLite |
| Offline | Dexie (IndexedDB), Service Worker (Workbox) |
| Auth | JWT + bcryptjs |
| Despliegue | Docker multi-stage build |

## Estructura

```
├── backend/
│   ├── src/
│   │   ├── routes/       # API REST (auth, lists, recipes, meals, products, supermarkets)
│   │   ├── middleware/    # Autenticación JWT
│   │   ├── events/       # Server-Sent Events (tiempo real)
│   │   └── index.ts      # Servidor Express
│   └── prisma/
│       └── schema.prisma # Modelos de datos
├── frontend/
│   ├── src/
│   │   ├── pages/        # Dashboard, Lists, ListDetail, Products, Recipes, MealPlanner, Family
│   │   ├── components/   # Layout, BottomSheet, Modal, EditListSheet, AuthShell
│   │   └── lib/          # Store (React context), DB (Dexie), API, auth, tipos
│   └── vite.config.ts
├── docker-compose.yml
└── Dockerfile
```

## Desarrollo local

### Requisitos

- Node.js 20+
- npm

### Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```

El servidor arranca en `http://localhost:4000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend arranca en `http://localhost:5173` con proxy a `:4000`.

## Despliegue con Docker

```bash
# Crear archivo .env
echo 'JWT_SECRET=tu_clave_secreta' > .env

# Levantar
docker compose up -d --build

# Verificar
curl http://localhost:4000/api/health
```

La app queda accesible en `http://tu-ip:4000`. Los datos se guardan en el volumen Docker `familywall-data`.

## Licencia

This project is licensed under the **MIT** Licence. See the `LICENSE` file for further details.
