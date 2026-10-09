# Revisión del proyecto: Taller Mecánico (backend + frontend)

## Cómo ejecutarlo

```bash
# Terminal 1: backend (puerto 8000)
cd backend
npm install
npm run dev

# Terminal 2: frontend (http://localhost:5173)
cd frontend
npm install
npm run dev
```

El frontend lee la URL del backend de `frontend/.env` → `VITE_API_URL=http://localhost:8000/api`.
En la barra superior, el indicador **"API en línea"** confirma que la conexión funciona (consulta `GET /api/health`).

## Requisitos verificados

| Requisito | Estado | Dónde |
|---|---|---|
| Quasar (framework) configurado | ✅ | `vite.config.js` (plugin `@quasar/vite-plugin` + variables Sass), `src/main.js` (plugins Notify, Dialog, Loading, LoadingBar; idioma español) |
| Vue Router configurado | ✅ | `src/routes/routes.js`: historial hash, layout con rutas hijas, rutas con parámetros (`/ordenes/:id`, `/vehiculos/:plate/historial`), página 404 y título por ruta |
| Pinia configurado | ✅ | `src/main.js` (`createPinia()`), 7 stores en `src/stores/` |
| pinia-plugin-persistedstate configurado | ✅ | `src/main.js` (`pinia.use(piniaPluginPersistedstate)`) y opción `persist` en cada store; los datos quedan en `localStorage` (claves: app, clients, vehicles, mechanics, services, parts, orders) |
| Axios conectando frontend y backend | ✅ | `src/services/api.js`: instancia con `baseURL` desde `.env`, `timeout`, interceptores de carga y de errores del backend |

## Pruebas realizadas

**Backend** (`npm test`): 6 pruebas de integración, todas pasan. Cubren clientes, catálogo, vehículos, órdenes, stock, estados, historial y errores 400/404/409.

**Frontend conectado al backend real**: prueba completa en el navegador (Chromium), 26 pasos, todos correctos:
- CRUD de clientes (incluye búsqueda en el servidor y el error 409 por documento duplicado)
- Mecánicos, servicios y repuestos (incluye ajuste de stock y el bloqueo por stock insuficiente)
- Vehículos e historial técnico por placa
- Orden completa: crear con servicio + repuesto → avanzar estados → agregar y quitar ítems → editar diagnóstico → finalizar → entregar
- Reglas de negocio mostradas al usuario (no eliminar un vehículo con órdenes, no crear dos órdenes activas)
- Persistencia: el modo oscuro y los listados se conservan tras recargar la página
- Ruta inexistente (404) e ID de orden inválido
- Vista móvil
- Sin errores ni advertencias de Vue en la consola

## Correcciones aplicadas

1. **Backend: `npm test` fallaba.** El script apuntaba a `tests/api.test.js`, que no existía. Se creó con `node:test` y `fetch` nativo, sin dependencias nuevas. Usa una base `*_test` y se niega a borrar una base cuyo nombre no contenga "test".
2. **Backend: README con el puerto equivocado** (decía 3000; el `.env` usa 8000).
3. **Frontend: claves duplicadas en Vue** en la tabla de ítems de la orden y en el historial. Pasaba cuando un mismo servicio o repuesto quedaba en dos líneas porque su precio cambió entre una adición y otra.
4. **Frontend: el formulario de nueva orden** permitía enviar cantidades 0 o vacías y solo el backend las rechazaba. Ahora se validan antes de enviar, con un máximo según el stock disponible.
5. **Frontend: "Nueva orden para este vehículo"** preseleccionaba un vehículo que ya tenía una orden activa, y el backend devolvía 409. Ahora avisa y no lo preselecciona.
6. **Frontend: orden del código en `OrderFormDialog.vue`.** El `watch` usaba variables declaradas más abajo; se reordenó.

## Recomendaciones (no se cambiaron)

- **Seguridad:** `backend/.env` contiene el usuario y la contraseña reales de MongoDB Atlas. Está en `.gitignore`, así que no se sube a Git, pero sí viene dentro del .zip. Si compartes el zip, cambia la contraseña en Atlas.
- La URI de Atlas no indica el nombre de la base (`...mongodb.net/`), así que los datos se guardan en la base `test`. Si quieres un nombre propio, usa `...mongodb.net/taller_mecanico`.
- `npm audit` del backend reporta 3 alertas en `nodemon`. Es una dependencia de desarrollo, así que no afecta a la API en ejecución.
