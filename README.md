# Kinflow

An offline-first family PWA to manage shopping lists, recipes, menu planning, and a product catalog with prices per supermarket.

## Features

- **Shopping Lists** — Create multiple lists with different types (shopping, tasks, packing, wishes, media), drag & drop, colors, categories, and offline mode.
- **Product Catalog** — Register products with category, unit, and prices per supermarket. Search and select when adding items to a list.
- **Recipes** — Create recipes with ingredients and instructions.
- **Menu Planner** — Organize meals by day of the week and export ingredients directly to a shopping list.
- **Family** — Share everything with your household using an invitation code. Real-time updates via SSE.
- **Offline-first PWA** — Works offline. Changes automatically sync when you come back online (Dexie + IndexedDB).

## Tech Stack

| Layer | Technology |
|------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4 |
| Backend | Express 5, TypeScript, Prisma, SQLite |
| Offline | Dexie (IndexedDB), Service Worker (Workbox) |
| Auth | JWT + bcryptjs |
| Deployment | Docker multi-stage build |

## Structure

```
├── backend/
│   ├── src/
│   │   ├── routes/       # REST API (auth, lists, recipes, meals, products, supermarkets)
│   │   ├── middleware/   # JWT Authentication
│   │   ├── events/       # Server-Sent Events (real-time)
│   │   └── index.ts      # Express Server
│   └── prisma/
│       └── schema.prisma # Data models
├── frontend/
│   ├── src/
│   │   ├── pages/        # Dashboard, Lists, ListDetail, Products, Recipes, MealPlanner, Family
│   │   ├── components/   # Layout, BottomSheet, Modal, EditListSheet, AuthShell
│   │   └── lib/          # Store (React context), DB (Dexie), API, auth, types
│   └── vite.config.ts
├── docker-compose.yml
└── Dockerfile
```

## Local Development

### Requirements

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

The server starts at `http://localhost:4000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts at `http://localhost:5173` with a proxy configured to `:4000`.

## Deployment with Docker

```bash
# Create .env file
echo 'JWT_SECRET=your_secret_key' > .env

# Spin up containers
docker compose up -d --build

# Verify
curl http://localhost:4000/api/health
```

The app becomes accessible at `http://your-ip:4000`. Data is persistent via the Docker volume `familywall-data`.

## License

This project is licensed under the **MIT** License. See the `LICENSE` file for further details.
