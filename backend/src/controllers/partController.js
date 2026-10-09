// Ojo con las mayúsculas: el archivo es "Part.js" (antes se importaba "part.js",
// que en Windows funciona pero en Linux falla).
const Part = require('../models/Part');
const RepairOrder = require('../models/RepairOrder');
const AppError = require('../utils/AppError');
const { pick, assertObjectId, assertHasFields, updateOptions } = require('../utils/helpers');

const PART_FIELDS = ['name', 'brand', 'price', 'stock'];

const findPartOr404 = async (id) => {
  assertObjectId(id);
  const part = await Part.findById(id);
  if (!part) throw new AppError('Repuesto no encontrado', 404);
  return part;
};

// POST /api/parts
exports.createPart = async (req, res) => {
  const part = await Part.create(pick(req.body, PART_FIELDS));
  res.status(201).json(part);
};

// GET /api/parts?lowStock=5 — Lista de repuestos (opcional: solo los de stock bajo)
exports.getParts = async (req, res) => {
  const filter = {};
  if (req.query.lowStock !== undefined) {
    const threshold = Number(req.query.lowStock);
    if (!Number.isFinite(threshold)) throw new AppError('El parámetro lowStock debe ser un número', 400);
    filter.stock = { $lte: threshold };
  }

  const parts = await Part.find(filter).sort({ name: 1 });
  res.status(200).json(parts);
};

// GET /api/parts/:id
exports.getPartById = async (req, res) => {
  const part = await findPartOr404(req.params.id);
  res.status(200).json(part);
};

// PUT /api/parts/:id
exports.updatePart = async (req, res) => {
  const data = pick(req.body, PART_FIELDS);
  assertHasFields(data);
  await findPartOr404(req.params.id);

  const part = await Part.findByIdAndUpdate(req.params.id, data, updateOptions);
  res.status(200).json(part);
};

// PATCH /api/parts/:id/stock — Sumar o restar unidades al inventario
// Body: { "quantity": 10 } para ingresar, { "quantity": -2 } para descontar
exports.adjustStock = async (req, res) => {
  const quantity = Number(req.body?.quantity);
  if (!Number.isInteger(quantity) || quantity === 0) {
    throw new AppError('Envía "quantity" como un número entero distinto de 0', 400);
  }

  const part = await findPartOr404(req.params.id);

  // Actualización atómica: solo se aplica si el stock no queda negativo
  const updated = await Part.findOneAndUpdate(
    { _id: part._id, stock: { $gte: quantity < 0 ? -quantity : 0 } },
    { $inc: { stock: quantity } },
    { returnDocument: 'after' }
  );

  if (!updated) {
    throw new AppError(`Stock insuficiente. Disponible: ${part.stock}`, 400);
  }

  res.status(200).json(updated);
};

// DELETE /api/parts/:id — Solo si ninguna orden lo usa
exports.deletePart = async (req, res) => {
  const part = await findPartOr404(req.params.id);

  const usedIn = await RepairOrder.countDocuments({ 'parts.part': part._id });
  if (usedIn > 0) {
    throw new AppError(`No se puede eliminar: el repuesto está incluido en ${usedIn} orden(es)`, 409);
  }

  await part.deleteOne();
  res.status(200).json({ message: 'Repuesto eliminado exitosamente' });
};
