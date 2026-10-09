const Vehicle = require('../models/Vehicle');
const Client = require('../models/Client');
const RepairOrder = require('../models/RepairOrder');
const AppError = require('../utils/AppError');
const { pick, assertObjectId, assertHasFields, updateOptions } = require('../utils/helpers');

const VEHICLE_FIELDS = ['plate', 'brand', 'model', 'year', 'clientId'];
const OWNER_FIELDS = 'fullName documentId phone email';

const normalizePlate = (plate) => String(plate).trim().toUpperCase();

const findVehicleOr404 = async (plate) => {
  const vehicle = await Vehicle.findOne({ plate: normalizePlate(plate) });
  if (!vehicle) throw new AppError('Vehículo no encontrado con la placa suministrada', 404);
  return vehicle;
};

const assertClientExists = async (clientId) => {
  assertObjectId(clientId, 'clientId');
  const clientExists = await Client.exists({ _id: clientId });
  if (!clientExists) throw new AppError('El cliente asignado no existe', 404);
};

// POST /api/vehicles — Registrar un vehículo asignado a un cliente
exports.createVehicle = async (req, res) => {
  const data = pick(req.body, VEHICLE_FIELDS);

  if (!data.clientId) throw new AppError('El vehículo debe pertenecer a un cliente (clientId)', 400);
  await assertClientExists(data.clientId);

  if (data.plate) {
    data.plate = normalizePlate(data.plate);
    const existingVehicle = await Vehicle.exists({ plate: data.plate });
    if (existingVehicle) throw new AppError('Ya existe un vehículo registrado con esta placa', 409);
  }

  const vehicle = await Vehicle.create(data);
  res.status(201).json({ message: 'Vehículo registrado exitosamente', vehicle });
};

// GET /api/vehicles — Listar vehículos con su propietario
exports.getVehicles = async (req, res) => {
  const vehicles = await Vehicle.find().populate('clientId', OWNER_FIELDS).sort({ plate: 1 });
  res.status(200).json(vehicles);
};

// GET /api/vehicles/:plate — Consultar un vehículo por placa
exports.getVehicleByPlate = async (req, res) => {
  const vehicle = await findVehicleOr404(req.params.plate);
  await vehicle.populate('clientId', OWNER_FIELDS);
  res.status(200).json(vehicle);
};

// PUT /api/vehicles/:plate — Actualizar un vehículo
exports.updateVehicle = async (req, res) => {
  const data = pick(req.body, VEHICLE_FIELDS);
  assertHasFields(data);

  const vehicle = await findVehicleOr404(req.params.plate);

  if (data.clientId) await assertClientExists(data.clientId);

  if (data.plate) {
    data.plate = normalizePlate(data.plate);
    if (data.plate !== vehicle.plate && (await Vehicle.exists({ plate: data.plate }))) {
      throw new AppError('Ya existe un vehículo registrado con esta placa', 409);
    }
  }

  const updated = await Vehicle.findByIdAndUpdate(vehicle._id, data, updateOptions).populate(
    'clientId',
    OWNER_FIELDS
  );
  res.status(200).json({ message: 'Vehículo actualizado exitosamente', vehicle: updated });
};

// DELETE /api/vehicles/:plate — Eliminar vehículo (solo si no tiene órdenes)
exports.deleteVehicle = async (req, res) => {
  const vehicle = await findVehicleOr404(req.params.plate);

  const ordersCount = await RepairOrder.countDocuments({ vehicle: vehicle._id });
  if (ordersCount > 0) {
    throw new AppError(
      `No se puede eliminar: el vehículo tiene ${ordersCount} orden(es) de reparación en su historial`,
      409
    );
  }

  await vehicle.deleteOne();
  res.status(200).json({ message: 'Vehículo eliminado exitosamente' });
};

// GET /api/vehicles/:plate/history — Historial técnico completo por placa (Requerimiento Clave)
exports.getVehicleHistoryByPlate = async (req, res) => {
  const vehicle = await findVehicleOr404(req.params.plate);
  await vehicle.populate('clientId', OWNER_FIELDS);

  // El campo en RepairOrder se llama "vehicle" (antes se buscaba "vehicleId" y nunca encontraba nada)
  const repairHistory = await RepairOrder.find({ vehicle: vehicle._id })
    .populate('mechanic', 'fullName specialty phone')
    .populate('services.service', 'name description')
    .populate('parts.part', 'name brand')
    .sort({ entryDate: -1 });

  const totalSpent = repairHistory.reduce((acc, order) => acc + (order.total || 0), 0);

  res.status(200).json({
    vehicle: {
      _id: vehicle._id,
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      owner: vehicle.clientId,
    },
    totalRepairs: repairHistory.length,
    totalSpent,
    history: repairHistory,
  });
};
