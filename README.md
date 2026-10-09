# Taller Mecánico Pro

Sistema web para gestionar un taller mecánico: clientes, vehículos, mecánicos, servicios, repuestos y órdenes de reparación, con historial técnico por placa.

| Parte | Tecnologías | Carpeta |
|---|---|---|
| Backend (API REST) | Node.js, Express 5, MongoDB (Mongoose 9) | `backend/` |
| Frontend | Vue 3, Vite, Quasar, Vue Router, Pinia, Axios | `frontend/` |

## Estructura

```
taller-mecanico/
├── backend/        → API: server.js, src/ (models, controllers, routes, middlewares, config, utils), tests/
├── frontend/       → Aplicación web: src/ (views, components, layouts, stores, services, routes, utils)
├── .gitignore      → evita subir node_modules, .env y dist
├── .node-version   → versión de Node que usa Render (22)
└── README.md
```

## Ejecutar en tu computador

Requisitos: **Node.js 20.19 o superior** (recomendado 22) e internet (la base de datos está en MongoDB Atlas).

**Terminal 1, backend** (arráncalo primero):

```bash
cd backend
npm install
npm run dev
```

Debe mostrar `MongoDB conectado exitosamente` y `Escuchando en el puerto 8000`.
Comprueba en el navegador: http://localhost:8000/api/health

**Terminal 2, frontend:**

```bash
cd frontend
npm install
npm run dev
```

Abre http://localhost:5173. En la barra superior debe decir **"API en línea"**.

### Archivos `.env`

- `backend/.env` tiene `PORT`, `MONGODB_URI` (con la contraseña de Atlas) y `NODE_ENV`. Si no existe, cópialo de `backend/.env.example` y pon tu URI.
- `frontend/.env` tiene `VITE_API_URL=http://localhost:8000/api`. Si no existe, el frontend usa esa misma dirección por defecto.
- Los dos están en `.gitignore`: **no se suben a GitHub**.

### Cargar datos de prueba (cientos de registros)

```bash
cd backend
npm run seed:check   # solo genera y valida los datos, no toca la base
npm run seed         # BORRA los datos actuales y carga los de prueba
```

Carga 100 mecánicos, 105 servicios, 200 repuestos, 300 clientes, 400 vehículos y 600 órdenes
(70 activas y 530 entregadas), respetando las reglas del sistema. Como la base está en MongoDB Atlas,
los datos aparecen también en la versión publicada en Render.

### Pruebas del backend

```bash
cd backend
npm test
```

Usan una base aparte (`TEST_MONGODB_URI`, debe contener "test" en el nombre) y la borran al empezar.

## Subir a GitHub

```bash
git init
git add .
git status      # revisa que NO aparezcan .env ni node_modules
git commit -m "Proyecto taller mecánico: backend y frontend"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/taller-mecanico.git
git push -u origin main
```

## Publicar en Render

Antes: en MongoDB Atlas → **Network Access** → **Allow access from anywhere** (`0.0.0.0/0`).

**1. Backend → New → Web Service**

| Campo | Valor |
|---|---|
| Root Directory | `backend` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance Type | Free |
| Variables | `MONGODB_URI` = tu URI de Atlas · `NODE_ENV` = `production` · `NODE_VERSION` = `22` (no pongas `PORT`) |

Prueba: `https://TU-BACKEND.onrender.com/api/health`

**2. Frontend → New → Static Site**

| Campo | Valor |
|---|---|
| Root Directory | `frontend` |
| Build Command | `npm install && npm run build` |
| Publish Directory | `dist` |
| Variables | `VITE_API_URL` = `https://TU-BACKEND.onrender.com/api` · `NODE_VERSION` = `22` |

No se necesitan reglas de redirección: el router usa rutas con `#`.

**Notas**
- El backend gratuito se duerme tras 15 minutos sin uso y tarda cerca de 1 minuto en despertar. Antes de presentar, abre `/api/health`.
- Si cambias `VITE_API_URL`, vuelve a publicar el frontend (**Manual Deploy**), porque esa dirección se fija al compilar.
- Cada `git push` vuelve a publicar automáticamente.
