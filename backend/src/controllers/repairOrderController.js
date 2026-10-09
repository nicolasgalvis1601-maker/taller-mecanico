const RepairOrder = require('../models/RepairOrder');
const Vehicle = require('../models/Vehicle');
const Mechanic = require('../models/Mechanic');
const Service = require('../models/Service');
const Part = require('../models/Part');
const AppError = require('../utils/AppError');
const { pick, assertObjectId, assertHasFields } = require('../utils/helpers');

const { ORDER_STATUSES, ACTIVE_STATUSES, CLOSED_STATUSES } = RepairOrder;

/* ------------------------------------------------------------------ */
/* Utilidades internas                                                */
/* ------------------------------------------------------------------ */

/** Carga todas las relaciones de una orden (o consulta de órdenes). */
const populateOrder = (query) =>
  query
    .populate({
      path: 'vehicle',
      select: 'plate brand model year clientId',
      // El campo del propietario en Vehicle se llama "clientId" (antes se usaba "cliente")
      populate: { path: 'clientId', select: 'fullName documentId phone email' },
    })
    .populate('mechanic', 'fullName phone specialty')
    .populate('services.service', 'name description')
    .populate('parts.part', 'name brand');

const findOrderOr404 = async (orderId) => {
  assertObjectId(orderId, 'orderId');
  const order = await RepairOrder.findById(orderId);
  if (!order) throw new AppError('Orden de reparación no encontrada', 404);
  return order;
};

/**
 * Valida y normaliza una lista de ítems [{ service|part: id, quantity }].
 * Agrupa los repetidos sumando cantidades.
 */
const normalizeItems = (items, key) => {
  if (items === undefined || items === null) return [];
  if (!Array.isArray(items)) throw new AppError(`"${key}s" debe ser una lista`, 400);

  const grouped = new Map();
  items.forEach((item, index) => {
    const id = item?.[key] ?? item?.[`${key}Id`];
    const quantity = item?.quantity === undefined ? 1 : Number(item.quantity);

    if (!id) throw new AppError(`Falta el campo "${key}" en la posición ${index} de "${key}s"`, 400);
    assertObjectId(id, `${key}s[${index}].${key}`);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new AppError(`La cantidad en "${key}s[${index}]" debe ser un entero mayor o igual a 1`, 400);
    }

    const keyId = String(id);
    grouped.set(keyId, (grouped.get(keyId) || 0) + quantity);
  });

  return [...grouped.entries()].map(([id, quantity]) => ({ id, quantity }));
};

/**
 * Busca en el catálogo los servicios/repuestos solicitados.
 * El precio SIEMPRE se toma de la base de datos, nunca del cliente.
 */
const loadCatalogItems = async (Model, items, label) => {
  if (items.length === 0) return new Map();
  const docs = await Model.find({ _id: { $in: items.map((i) => i.id) } });
  const byId = new Map(docs.map((d) => [String(d._id), d]));

  const missing = items.filter((i) => !byId.has(i.id)).map((i) => i.id);
  if (missing.length > 0) {
    throw new AppError(`${label} no encontrado(s): ${missing.join(', ')}`, 404);
  }
  return byId;
};

const buildServiceLines = async (items) => {
  const catalog = await loadCatalogItems(Service, items, 'Servicio(s)');
  return items.map((i) => ({ service: i.id, quantity: i.quantity, price: catalog.get(i.id).price }));
};

const buildPartLines = async (items) => {
  const catalog = await loadCatalogItems(Part, items, 'Repuesto(s)');

  // Verificación previa de stock para dar un mensaje claro
  const insufficient = items
    .filter((i) => catalog.get(i.id).stock < i.quantity)
    .map((i) => {
      const part = catalog.get(i.id);
      return `${part.name} (disponible: ${part.stock}, solicitado: ${i.quantity})`;
    });
  if (insufficient.length > 0) {
    throw new AppError(`Stock insuficiente para: ${insufficient.join('; ')}`, 400);
  }

  return items.map((i) => ({ part: i.id, quantity: i.quantity, price: catalog.get(i.id).price }));
};

/** Devuelve unidades al inventario (se usa para deshacer cambios). */
const releaseStock = async (lines) => {
  await Promise.all(
    lines.map((l) => Part.updateOne({ _id: l.part }, { $inc: { stock: l.quantity } }))
  );
};

/**
 * Descuenta stock de forma atómica (solo si hay suficiente).
 * Si algún repuesto falla, se devuelve lo ya descontado y se lanza error.
 */
const reserveStock = async (lines) => {
  const reserved = [];
  for (const line of lines) {
    const updated = await Part.findOneAndUpdate(
      { _id: line.part, stock: { $gte: line.quantity } },
      { $inc: { stock: -line.quantity } },
      { returnDocument: 'after' }
    );
    if (!updated) {
      await releaseStock(reserved);
      throw new AppError(`Stock insuficiente para el repuesto ${line.part}`, 400);
    }
    reserved.push(line);
  }
};

/** Suma ítems nuevos a los existentes de la orden (misma referencia y precio → suma cantidad). */
const mergeLines = (existing, newLines, key) => {
  newLines.forEach((line) => {
    const match = existing.find((e) => String(e[key]) === String(line[key]) && e.price === line.price);
    if (match) match.quantity += line.quantity;
    else existing.push(line);
  });
};

/** Obtiene el _id del vehículo a partir de "vehicle" (id) o "plate" (placa). */
const resolveVehicleId = async ({ vehicle, plate }) => {
  if (vehicle) {
    assertObjectId(vehicle, 'vehicle');
    if (!(await Vehicle.exists({ _id: vehicle }))) throw new AppError('El vehículo no existe', 404);
    return vehicle;
  }
  if (plate) {
    const found = await Vehicle.findOne({ plate: String(plate).trim().toUpperCase() }).select('_id');
    if (!found) throw new AppError('No existe un vehículo con esa placa', 404);
    return found._id;
  }
  throw new AppError('Debes indicar el vehículo ("vehicle" con su ID o "plate" con la placa)', 400);
};

const assertMechanicExists = async (mechanic) => {
  if (!mechanic) throw new AppError('El mecánico es obligatorio ("mechanic")', 400);
  assertObjectId(mechanic, 'mechanic');
  if (!(await Mechanic.exists({ _id: mechanic }))) throw new AppError('El mecánico no existe', 404);
};

/* ------------------------------------------------------------------ */
/* Controladores                                                      */
/* ------------------------------------------------------------------ */

// POST /api/orders — Crear orden de ingreso al taller
// Body: { vehicle | plate, mechanic, problem, diagnosis?, notes?,
//         services?: [{ service, quantity }], parts?: [{ part, quantity }] }
exports.createOrder = async (req, res) => {
  const { mechanic, problem, diagnosis, notes } = req.body;

  const vehicleId = await resolveVehicleId(req.body);
  await assertMechanicExists(mechanic);

  const serviceLines = await buildServiceLines(normalizeItems(req.body.services, 'service'));
  const partLines = await buildPartLines(normalizeItems(req.body.parts, 'part'));

  // Si el vehículo ya tiene una orden abierta, no se crea otra
  const openOrder = await RepairOrder.findOne({
    vehicle: vehicleId,
    status: { $in: ACTIVE_STATUSES },
  }).select('_id status');
  if (openOrder) {
    throw new AppError(
      `El vehículo ya tiene una orden activa (${openOrder._id}, estado ${openOrder.status})`,
      409
    );
  }

  const order = new RepairOrder({
    vehicle: vehicleId,
    mechanic,
    problem,
    diagnosis,
    notes,
    services: serviceLines,
    parts: partLines,
  });
  order.calculateTotal();

  // Se valida ANTES de tocar el inventario
  await order.validate();

  await reserveStock(partLines);
  try {
    await order.save();
  } catch (error) {
    await releaseStock(partLines);
    throw error;
  }

  const populated = await populateOrder(RepairOrder.findById(order._id));
  res.status(201).json(populated);
};

// GET /api/orders?status=EN_REPARACION — Todas las órdenes (filtro opcional por estado)
exports.getOrders = async (req, res) => {
  const filter = {};
  if (req.query.status) {
    const status = String(req.query.status).toUpperCase();
    if (!ORDER_STATUSES.includes(status)) {
      throw new AppError(`Estado inválido. Valores permitidos: ${ORDER_STATUSES.join(', ')}`, 400);
    }
    filter.status = status;
  }

  const orders = await populateOrder(RepairOrder.find(filter)).sort({ entryDate: -1 });
  res.status(200).json(orders);
};

// GET /api/orders/active — Órdenes de vehículos que siguen en el taller
exports.getActiveOrders = async (req, res) => {
  const orders = await populateOrder(
    RepairOrder.find({ status: { $in: ACTIVE_STATUSES } })
  ).sort({ entryDate: 1 });
  res.status(200).json(orders);
};

// GET /api/orders/:orderId
exports.getOrderById = async (req, res) => {
  const order = await findOrderOr404(req.params.orderId);
  res.status(200).json(await populateOrder(RepairOrder.findById(order._id)));
};

// PATCH /api/orders/:orderId — Editar datos generales (diagnóstico, notas, mecánico, problema)
exports.updateOrder = async (req, res) => {
  const data = pick(req.body, ['problem', 'diagnosis', 'notes', 'mechanic']);
  assertHasFields(data);

  const order = await findOrderOr404(req.params.orderId);
  if (order.status === 'ENTREGADO') {
    throw new AppError('No se puede modificar una orden que ya fue entregada', 400);
  }
  if (data.mechanic) await assertMechanicExists(data.mechanic);

  order.set(data);
  await order.save();
  res.status(200).json(await populateOrder(RepairOrder.findById(order._id)));
};

// PATCH /api/orders/:orderId/status — Cambiar el estado de la orden
// Estados: RECIBIDO, DIAGNOSTICO, EN_REPARACION, ESPERANDO_REPUESTOS, FINALIZADO, ENTREGADO
// Body: { status, diagnosis?, notes? }
exports.updateOrderStatus = async (req, res) => {
  const status = req.body?.status ? String(req.body.status).toUpperCase().trim() : '';
  if (!ORDER_STATUSES.includes(status)) {
    throw new AppError(`Estado inválido. Valores permitidos: ${ORDER_STATUSES.join(', ')}`, 400);
  }

  const order = await findOrderOr404(req.params.orderId);

  if (order.status === 'ENTREGADO') {
    throw new AppError('La orden ya fue entregada y no puede cambiar de estado', 400);
  }
  if (status === 'ENTREGADO' && order.status !== 'FINALIZADO') {
    throw new AppError('Solo se puede entregar un vehículo cuya orden esté FINALIZADO', 400);
  }

  order.status = status;
  if (req.body.diagnosis !== undefined) order.diagnosis = req.body.diagnosis;
  if (req.body.notes !== undefined) order.notes = req.body.notes;

  // La fecha de salida se registra al entregar el vehículo
  order.exitDate = status === 'ENTREGADO' ? new Date() : undefined;

  await order.save();
  res.status(200).json(await populateOrder(RepairOrder.findById(order._id)));
};

// POST /api/orders/:orderId/items — Agregar servicios y/o repuestos a una orden
// Body: { services?: [{ service, quantity }], parts?: [{ part, quantity }] }
//   (también se acepta un solo ítem: { service, quantity } o { part, quantity })
exports.addItemToOrder = async (req, res) => {
  const body = req.body || {};
  const servicesInput = body.services ?? (body.service ? [{ service: body.service, quantity: body.quantity }] : []);
  const partsInput = body.parts ?? (body.part ? [{ part: body.part, quantity: body.quantity }] : []);

  const serviceItems = normalizeItems(servicesInput, 'service');
  const partItems = normalizeItems(partsInput, 'part');
  if (serviceItems.length === 0 && partItems.length === 0) {
    throw new AppError('Debes enviar al menos un servicio o un repuesto', 400);
  }

  const order = await findOrderOr404(req.params.orderId);
  if (CLOSED_STATUSES.includes(order.status)) {
    throw new AppError(`No se pueden agregar ítems a una orden en estado ${order.status}`, 400);
  }

  const serviceLines = await buildServiceLines(serviceItems);
  const partLines = await buildPartLines(partItems);

  mergeLines(order.services, serviceLines, 'service');
  mergeLines(order.parts, partLines, 'part');
  order.calculateTotal();

  await reserveStock(partLines);
  try {
    await order.save();
  } catch (error) {
    await releaseStock(partLines);
    throw error;
  }

  res.status(200).json(await populateOrder(RepairOrder.findById(order._id)));
};

// DELETE /api/orders/:orderId/items/:type/:itemId — Quitar un servicio o repuesto
// :type = "services" | "parts". Si es un repuesto, las unidades vuelven al inventario.
exports.removeItemFromOrder = async (req, res) => {
  const { orderId, type, itemId } = req.params;
  if (!['services', 'parts'].includes(type)) {
    throw new AppError('El tipo debe ser "services" o "parts"', 400);
  }
  assertObjectId(itemId, 'itemId');

  const order = await findOrderOr404(orderId);
  if (CLOSED_STATUSES.includes(order.status)) {
    throw new AppError(`No se pueden quitar ítems de una orden en estado ${order.status}`, 400);
  }

  const key = type === 'services' ? 'service' : 'part';
  const removed = order[type].filter((line) => String(line[key]) === itemId);
  if (removed.length === 0) throw new AppError('Ese ítem no está en la orden', 404);

  order[type] = order[type].filter((line) => String(line[key]) !== itemId);
  order.calculateTotal();
  await order.save();

  if (type === 'parts') {
    await releaseStock(removed.map((l) => ({ part: l.part, quantity: l.quantity })));
  }

  res.status(200).json(await populateOrder(RepairOrder.findById(order._id)));
};
