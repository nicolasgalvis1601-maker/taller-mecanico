/**
 * Pruebas de integración de la API (node:test + fetch nativo, sin dependencias extra).
 *
 *   npm test
 *
 * Usa la base indicada en TEST_MONGODB_URI (por defecto
 * mongodb://127.0.0.1:27017/taller_mecanico_test) y la BORRA al empezar.
 * Por seguridad, el nombre de la base debe contener "test".
 */
require('dotenv').config({ quiet: true });

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');

const TEST_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/taller_mecanico_test';

let server;
let base;

/** Hace una petición a la API y devuelve { status, body }. */
const call = async (method, path, body) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};

before(async () => {
  await connectDB(TEST_URI);
  const dbName = mongoose.connection.name;
  if (!/test/i.test(dbName)) {
    throw new Error(`La base de pruebas "${dbName}" no contiene "test"; se cancela para no borrar datos reales`);
  }
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));

  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await disconnectDB();
});

// Datos compartidos entre pruebas (se ejecutan en orden)
const ids = {};

test('GET /health responde OK', async () => {
  const { status, body } = await call('GET', '/health');
  assert.equal(status, 200);
  assert.equal(body.status, 'OK');
});

test('Clientes: crear, duplicado (409), buscar, actualizar', async () => {
  let r = await call('POST', '/clients', { documentId: '123', fullName: 'Ana Ruiz', phone: '3001234567' });
  assert.equal(r.status, 201);
  ids.client = r.body.client._id;

  r = await call('POST', '/clients', { documentId: '123', fullName: 'Otra', phone: '3000000000' });
  assert.equal(r.status, 409);

  r = await call('POST', '/clients', { documentId: '999', fullName: 'Al', phone: 'abc' });
  assert.equal(r.status, 400);
  assert.ok(Array.isArray(r.body.details));

  r = await call('GET', '/clients?search=ana');
  assert.equal(r.status, 200);
  assert.equal(r.body.length, 1);

  r = await call('PUT', '/clients/123', { fullName: 'Ana María Ruiz' });
  assert.equal(r.status, 200);
  assert.equal(r.body.client.fullName, 'Ana María Ruiz');
});

test('Catálogo: mecánico, servicio y repuesto', async () => {
  let r = await call('POST', '/mechanics', { fullName: 'Juan Pérez', phone: '3110000000', specialty: 'Motor' });
  assert.equal(r.status, 201);
  ids.mechanic = r.body._id;

  r = await call('POST', '/services', { name: 'Cambio de aceite', price: 50000 });
  assert.equal(r.status, 201);
  ids.service = r.body._id;

  r = await call('POST', '/parts', { name: 'Filtro', price: 20000, stock: 5 });
  assert.equal(r.status, 201);
  ids.part = r.body._id;

  r = await call('PATCH', `/parts/${ids.part}/stock`, { quantity: -10 });
  assert.equal(r.status, 400, 'no debe permitir stock negativo');

  r = await call('GET', '/mechanics/123');
  assert.equal(r.status, 400, 'ID mal formado → 400');
});

test('Vehículos: crear (placa en mayúsculas) y no duplicar', async () => {
  let r = await call('POST', '/vehicles', { plate: 'xyz789', brand: 'Kia', model: 'Rio', year: 2020, clientId: ids.client });
  assert.equal(r.status, 201);
  assert.equal(r.body.vehicle.plate, 'XYZ789');

  r = await call('POST', '/vehicles', { plate: 'XYZ789', brand: 'Kia', model: 'Rio', year: 2020, clientId: ids.client });
  assert.equal(r.status, 409);

  r = await call('DELETE', '/clients/123');
  assert.equal(r.status, 409, 'no se elimina un cliente con vehículos');
});

test('Órdenes: crear, total, stock, estados e historial', async () => {
  let r = await call('POST', '/orders', {
    plate: 'XYZ789',
    mechanic: ids.mechanic,
    problem: 'Ruido en el motor',
    services: [{ service: ids.service, quantity: 1 }],
    parts: [{ part: ids.part, quantity: 2 }],
  });
  assert.equal(r.status, 201);
  ids.order = r.body._id;
  assert.equal(r.body.total, 50000 + 2 * 20000);

  r = await call('GET', `/parts/${ids.part}`);
  assert.equal(r.body.stock, 3, 'el stock se descuenta al crear la orden');

  r = await call('POST', '/orders', { plate: 'XYZ789', mechanic: ids.mechanic, problem: 'Otra' });
  assert.equal(r.status, 409, 'un vehículo no puede tener dos órdenes activas');

  r = await call('DELETE', `/orders/${ids.order}/items/parts/${ids.part}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.total, 50000);
  r = await call('GET', `/parts/${ids.part}`);
  assert.equal(r.body.stock, 5, 'el stock vuelve al quitar el repuesto');

  r = await call('PATCH', `/orders/${ids.order}/status`, { status: 'ENTREGADO' });
  assert.equal(r.status, 400, 'solo se entrega desde FINALIZADO');

  r = await call('PATCH', `/orders/${ids.order}/status`, { status: 'FINALIZADO' });
  assert.equal(r.status, 200);
  r = await call('POST', `/orders/${ids.order}/items`, { part: ids.part, quantity: 1 });
  assert.equal(r.status, 400, 'no se agregan ítems a una orden finalizada');

  r = await call('PATCH', `/orders/${ids.order}/status`, { status: 'ENTREGADO' });
  assert.equal(r.status, 200);
  assert.ok(r.body.exitDate, 'se registra la fecha de salida');

  r = await call('GET', '/vehicles/xyz789/history');
  assert.equal(r.status, 200);
  assert.equal(r.body.totalRepairs, 1);
  assert.equal(r.body.totalSpent, 50000);
});

test('Ruta inexistente → 404', async () => {
  const r = await call('GET', '/no-existe');
  assert.equal(r.status, 404);
});
