# API Taller Mecánico

API REST (Node.js + Express 5 + MongoDB/Mongoose 9) para gestionar clientes, vehículos, mecánicos, servicios, repuestos y órdenes de reparación.

## Puesta en marcha

```bash
npm install
cp .env.example .env      # en Windows: copy .env.example .env  (si no tienes ya el .env)
npm run dev               # desarrollo (se reinicia al guardar)
npm start                 # producción
npm test                  # pruebas automáticas (necesita MongoDB encendido)
```

Requisitos: Node 18 o superior y MongoDB corriendo en la URL de `MONGODB_URI`.

> `npm test` usa la base `taller_mecanico_test` (variable `TEST_MONGODB_URI`) y **la borra** en cada ejecución. Tu base real `taller_mecanico` no se toca.

## Estructura

```
server.js                 → conecta a MongoDB y arranca el servidor
src/app.js                → configuración de Express y registro de rutas
src/config/db.js          → conexión a MongoDB
src/models/               → esquemas de Mongoose
src/controllers/          → lógica de cada recurso
src/routes/               → definición de endpoints
src/middlewares/          → manejo de errores y 404
src/utils/                → AppError y funciones de apoyo
tests/api.test.js         → pruebas de integración
```

## Endpoints

Base: `http://localhost:8000/api` (puerto definido en `PORT` del `.env`; si no existe, se usa 3000)

### Clientes `/clients`
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/clients` | Crear `{ documentId, fullName, phone, email? }` |
| GET | `/clients?search=texto` | Listar (búsqueda opcional por nombre, documento, correo o teléfono) |
| GET | `/clients/:documentId` | Consultar por documento |
| GET | `/clients/:documentId/vehicles` | Vehículos del cliente |
| PUT | `/clients/:documentId` | Actualizar |
| DELETE | `/clients/:documentId` | Eliminar (solo si no tiene vehículos) |

### Vehículos `/vehicles`
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/vehicles` | Crear `{ plate, brand, model, year, clientId }` |
| GET | `/vehicles` | Listar con propietario |
| GET | `/vehicles/:plate` | Consultar por placa |
| GET | `/vehicles/:plate/history` | **Historial técnico completo** (órdenes, mecánico, servicios, repuestos, total gastado) |
| PUT | `/vehicles/:plate` | Actualizar |
| DELETE | `/vehicles/:plate` | Eliminar (solo si no tiene órdenes) |

### Mecánicos `/mechanics`
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/mechanics` | Crear `{ fullName, phone, specialty }` |
| GET | `/mechanics` | Listar |
| GET | `/mechanics/:id` | Consultar |
| GET | `/mechanics/:id/orders` | Órdenes activas asignadas |
| PUT | `/mechanics/:id` | Actualizar |
| DELETE | `/mechanics/:id` | Eliminar (solo si no tiene órdenes) |

### Servicios `/services`
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/services` | Crear `{ name, description?, price }` |
| GET | `/services` | Listar |
| GET / PUT / DELETE | `/services/:id` | Consultar / actualizar / eliminar (si no está en órdenes) |

### Repuestos `/parts`
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/parts` | Crear `{ name, brand?, price, stock }` |
| GET | `/parts?lowStock=5` | Listar (opcional: solo los que tienen stock ≤ 5) |
| GET / PUT / DELETE | `/parts/:id` | Consultar / actualizar / eliminar (si no está en órdenes) |
| PATCH | `/parts/:id/stock` | Sumar o restar inventario `{ quantity: 10 }` o `{ quantity: -2 }` |

### Órdenes de reparación `/orders`
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/orders` | Crear orden (ver ejemplo abajo) |
| GET | `/orders?status=EN_REPARACION` | Listar todas (filtro opcional por estado) |
| GET | `/orders/active` | Vehículos que siguen en el taller (todo menos `ENTREGADO`) |
| GET | `/orders/:orderId` | Consultar una orden |
| PATCH | `/orders/:orderId` | Editar `problem`, `diagnosis`, `notes` o `mechanic` |
| PATCH | `/orders/:orderId/status` | Cambiar estado `{ status, diagnosis?, notes? }` |
| POST | `/orders/:orderId/items` | Agregar `{ services: [...], parts: [...] }` o un solo ítem `{ part, quantity }` |
| DELETE | `/orders/:orderId/items/:type/:itemId` | Quitar ítem (`:type` = `services` o `parts`) |

Ejemplo para crear una orden:

```json
{
  "vehicle": "<id del vehículo>",
  "mechanic": "<id del mecánico>",
  "problem": "Ruido en el motor",
  "services": [{ "service": "<id del servicio>", "quantity": 1 }],
  "parts": [{ "part": "<id del repuesto>", "quantity": 2 }]
}
```

En lugar de `vehicle` se puede enviar `"plate": "ABC123"`.

**Reglas de negocio de las órdenes**
- Los precios se toman siempre del catálogo (servicios y repuestos); el precio enviado por el cliente se ignora. El total se calcula en el servidor.
- Al agregar repuestos se descuenta el stock; si no alcanza, la orden no se modifica y el inventario queda igual. Al quitar un repuesto, el stock se devuelve.
- Un vehículo no puede tener dos órdenes activas al mismo tiempo.
- Estados: `RECIBIDO → DIAGNOSTICO → EN_REPARACION → ESPERANDO_REPUESTOS → FINALIZADO → ENTREGADO`.
- Solo se puede pasar a `ENTREGADO` desde `FINALIZADO`; al entregar se registra `exitDate`.
- En `FINALIZADO` o `ENTREGADO` ya no se pueden agregar ni quitar ítems; una orden `ENTREGADO` no se puede modificar.

## Respuestas de error

Todas las respuestas de error tienen la forma `{ "error": "mensaje", "details"?: [...] }`:

| Código | Cuándo |
|---|---|
| 400 | Datos inválidos, ID con formato incorrecto, JSON mal formado, stock insuficiente |
| 404 | Recurso o ruta no encontrada |
| 409 | Duplicado (documento, placa) o eliminación bloqueada por registros relacionados |
| 500 | Error inesperado del servidor |
