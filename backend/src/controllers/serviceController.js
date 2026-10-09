const Service = require('../models/Service');
const RepairOrder = require('../models/RepairOrder');
const AppError = require('../utils/AppError');
const { pick, assertObjectId, assertHasFields, updateOptions } = require('../utils/helpers');

const SERVICE_FIELDS = ['name', 'description', 'price'];

const findServiceOr404 = async (id) => {
  assertObjectId(id);
  const service = await Service.findById(id);
  if (!service) throw new AppError('Servicio no encontrado', 404);
  return service;
};

// POST /api/services
exports.createService = async (req, res) => {
  const service = await Service.create(pick(req.body, SERVICE_FIELDS));
  res.status(201).json(service);
};

// GET /api/services
exports.getServices = async (req, res) => {
  const services = await Service.find().sort({ name: 1 });
  res.status(200).json(services);
};

// GET /api/services/:id
exports.getServiceById = async (req, res) => {
  const service = await findServiceOr404(req.params.id);
  res.status(200).json(service);
};

// PUT /api/services/:id
// Nota: cambiar el precio NO altera las órdenes ya creadas (guardan su propio precio).
exports.updateService = async (req, res) => {
  const data = pick(req.body, SERVICE_FIELDS);
  assertHasFields(data);
  await findServiceOr404(req.params.id);

  const service = await Service.findByIdAndUpdate(req.params.id, data, updateOptions);
  res.status(200).json(service);
};

// DELETE /api/services/:id — Solo si ninguna orden lo usa
exports.deleteService = async (req, res) => {
  const service = await findServiceOr404(req.params.id);

  const usedIn = await RepairOrder.countDocuments({ 'services.service': service._id });
  if (usedIn > 0) {
    throw new AppError(`No se puede eliminar: el servicio está incluido en ${usedIn} orden(es)`, 409);
  }

  await service.deleteOne();
  res.status(200).json({ message: 'Servicio eliminado exitosamente' });
};
