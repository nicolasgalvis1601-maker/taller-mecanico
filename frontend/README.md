# Taller Mecánico Pro — Frontend

Frontend en **Vue 3 + Vite** con **Quasar**, **Vue Router**, **Pinia** + **pinia-plugin-persistedstate** y **Axios**, conectado al backend Express/MongoDB (carpeta `backend`).

## Puesta en marcha

```bash
# 1. Backend (en la carpeta backend)
npm install
npm run dev            # queda en http://localhost:8000  (PORT del .env del backend)

# 2. Frontend (en esta carpeta)
npm install
npm run dev            # abre http://localhost:5173
```

La URL del backend se configura en `.env`:

```
VITE_API_URL=http://localhost:8000/api
```

Si cambias el `PORT` del backend, cambia también esta variable y reinicia `npm run dev`.
En la barra superior el indicador **“API en línea / sin conexión”** consulta `GET /api/health`.

## Librerías y dónde se configuran

| Librería | Archivo | Qué se configura |
|---|---|---|
| Quasar | `vite.config.js`, `src/main.js`, `src/quasar-variables.sass` | Plugin de Vite, plugins `Notify`, `Dialog`, `Loading`, `LoadingBar`, idioma español, colores de marca |
| Vue Router | `src/routes/routes.js` | `createWebHashHistory`, layout con rutas hijas, rutas con parámetros (`/ordenes/:id`, `/vehiculos/:plate/historial`), 404 y título por ruta |
| Pinia | `src/main.js`, `src/stores/*.js` | `createPinia()`, un store por recurso (estilo *setup store*) |
| pinia-plugin-persistedstate | `src/main.js` y opción `persist` de cada store | `pinia.use(piniaPluginPersistedstate)`; cada store guarda en `localStorage` solo lo necesario (`persist: { pick: [...] }`) |
| Axios | `src/services/api.js` | Instancia con `baseURL` desde `.env`, `timeout`, interceptores (barra de carga y mensajes de error del backend) |

## Estructura

```
src/
├── main.js                 → registra Quasar, Pinia (+ persistencia) y Router
├── App.vue                 → <router-view /> y modo oscuro
├── quasar-variables.sass   → colores de Quasar
├── css/app.css             → estilos globales
├── routes/routes.js        → rutas de la aplicación
├── services/api.js         → instancia de Axios conectada al backend
├── stores/                 → Pinia: app, clients, vehicles, mechanics, services, parts, orders
├── layouts/MainLayout.vue  → q-layout con barra superior y menú lateral
├── views/                  → páginas (Inicio, Órdenes, Detalle de orden, Clientes, Vehículos,
│                             Historial, Mecánicos, Servicios, Repuestos, 404)
├── components/             → PageHeader, StatusChip, PlateTag, OrderFormDialog
└── utils/                  → constantes de estados, formatos, notificaciones y reglas de validación
```

## Qué se puede hacer

- **Inicio**: indicadores, tablero de órdenes activas por estado, repuestos con stock bajo y búsqueda de historial por placa.
- **Órdenes**: listado con filtro por estado (se recuerda), creación con vehículo, mecánico, servicios y repuestos (bloquea vehículos con una orden activa y repuestos sin stock).
- **Detalle de orden**: avanzar o cambiar el estado, agregar/quitar servicios y repuestos (el stock se actualiza), editar problema, diagnóstico, notas y mecánico, entregar el vehículo.
- **Clientes**: CRUD por documento, búsqueda en el servidor (`?search=`) y vehículos de cada cliente.
- **Vehículos**: CRUD por placa e historial técnico completo (`/vehicles/:plate/history`).
- **Mecánicos**, **Servicios** y **Repuestos**: CRUD; en repuestos, ajuste de inventario (`PATCH /parts/:id/stock`) y filtro de stock bajo (`?lowStock=`).

Los errores que devuelve el backend (`{ error, details }`) se muestran como notificaciones de Quasar.

## Qué guarda la persistencia (localStorage)

| Store | Se guarda |
|---|---|
| `app` | modo oscuro, menú abierto/cerrado, umbral de stock bajo |
| `clients`, `vehicles`, `mechanics`, `services`, `parts` | último listado cargado (se muestra al instante y se refresca desde la API) |
| `orders` | órdenes, órdenes activas y el filtro de estado elegido |
