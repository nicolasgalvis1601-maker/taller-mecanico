const Mechanic = require('../models/Mechanic');
const RepairOrder = require('../models/RepairOrder');
const AppError = require('../utils/AppError');
const { pick, assertObjectId, assertHasFields, updateOptions } = require('../utils/helpers');

const { ACTIVE_STATUSES } = RepairOrder;
const MECHANIC_FIELDS = ['fullName', 'phone', 'specialty'];

const findMechanicOr404 = async (id) => {
  assertObjectId(id);
  const mechanic = await Mechanic.findById(id);
  if (!mechanic) throw new AppError('Mecánico no encontrado', 404);
  return mechanic;
};

// POST /api/mechanics
exports.createMechanic = async (req, res) => {
  const mechanic = await Mechanic.create(pick(req.body, MECHANIC_FIELDS));
  res.status(201).json(mechanic);
};

// GET /api/mechanics
exports.getMechanics = async (req, res) => {
  const mechanics = await Mechanic.find().sort({ fullName: 1 });
  res.status(200).json(mechanics);
};

// GET /api/mechanics/:id
exports.getMechanicById = async (req, res) => {
  const mechanic = await findMechanicOr404(req.params.id);
  res.status(200).json(mechanic);
};

// GET /api/mechanics/:id/orders — Órdenes activas asignadas al mecánico
exports.getMechanicOrders = async (req, res) => {
  const mechanic = await findMechanicOr404(req.params.id);
  const orders = await RepairOrder.find({ mechanic: mechanic._id, status: { $in: ACTIVE_STATUSES } })
    .populate('vehicle', 'plate brand model year')
    .sort({ entryDate: 1 });
  res.status(200).json({ mechanic, totalOrders: orders.length, orders });
};

// PUT /api/mechanics/:id
exports.updateMechanic = async (req, res) => {
  const data = pick(req.body, MECHANIC_FIELDS);
  assertHasFields(data);
  await findMechanicOr404(req.params.id);

  const mechanic = await Mechanic.findByIdAndUpdate(req.params.id, data, updateOptions);
  res.status(200).json(mechanic);
};

// DELETE /api/mechanics/:id — Solo si no tiene órdenes asignadas
exports.deleteMechanic = async (req, res) => {
  const mechanic = await findMechanicOr404(req.params.id);

  const ordersCount = await RepairOrder.countDocuments({ mechanic: mechanic._id });
  if (ordersCount > 0) {
    throw new AppError(
      `No se puede eliminar: el mecánico tiene ${ordersCount} orden(es) de reparación asociadas`,
      409
    );
  }

  await mechanic.deleteOne();
  res.status(200).json({ message: 'Mecánico eliminado exitosamente' });
};
