const Client = require('../models/Client');
const Vehicle = require('../models/Vehicle');
const AppError = require('../utils/AppError');
const { pick, assertHasFields, updateOptions } = require('../utils/helpers');

// Express 5 captura automáticamente los errores de las funciones async y los
// envía al manejador global, por eso no hace falta try/catch en cada función.

const CLIENT_FIELDS = ['documentId', 'fullName', 'phone', 'email'];

const findClientOr404 = async (documentId) => {
  const client = await Client.findOne({ documentId: String(documentId).trim() });
  if (!client) throw new AppError('Cliente no encontrado', 404);
  return client;
};

// POST /api/clients — Registrar un nuevo cliente
exports.createClient = async (req, res) => {
  const data = pick(req.body, CLIENT_FIELDS);

  if (data.documentId) {
    const existingClient = await Client.findOne({ documentId: String(data.documentId).trim() });
    if (existingClient) throw new AppError('Ya existe un cliente con este documento', 409);
  }

  const client = await Client.create(data);
  res.status(201).json({ message: 'Cliente registrado exitosamente', client });
};

// GET /api/clients?search=texto — Obtener todos los clientes (con búsqueda opcional)
exports.getAllClients = async (req, res) => {
  const filter = {};
  const { search } = req.query;

  if (typeof search === 'string' && search.trim()) {
    // Se escapan caracteres especiales para que la búsqueda sea literal
    const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ fullName: regex }, { documentId: regex }, { email: regex }, { phone: regex }];
  }

  const clients = await Client.find(filter).sort({ fullName: 1 });
  res.status(200).json(clients);
};

// GET /api/clients/:documentId — Buscar cliente por documento
exports.getClientByDocument = async (req, res) => {
  const client = await findClientOr404(req.params.documentId);
  res.status(200).json(client);
};

// GET /api/clients/:documentId/vehicles — Vehículos de un cliente
exports.getClientVehicles = async (req, res) => {
  const client = await findClientOr404(req.params.documentId);
  const vehicles = await Vehicle.find({ clientId: client._id }).sort({ createdAt: -1 });
  res.status(200).json({ client, vehicles });
};

// PUT /api/clients/:documentId — Actualizar datos del cliente
exports.updateClient = async (req, res) => {
  const data = pick(req.body, CLIENT_FIELDS);
  assertHasFields(data);

  const client = await findClientOr404(req.params.documentId);

  if (data.documentId && String(data.documentId).trim() !== client.documentId) {
    const duplicate = await Client.findOne({ documentId: String(data.documentId).trim() });
    if (duplicate) throw new AppError('Ya existe un cliente con este documento', 409);
  }

  const updated = await Client.findByIdAndUpdate(client._id, data, updateOptions);
  res.status(200).json({ message: 'Cliente actualizado exitosamente', client: updated });
};

// DELETE /api/clients/:documentId — Eliminar cliente (solo si no tiene vehículos)
exports.deleteClient = async (req, res) => {
  const client = await findClientOr404(req.params.documentId);

  const vehiclesCount = await Vehicle.countDocuments({ clientId: client._id });
  if (vehiclesCount > 0) {
    throw new AppError(
      `No se puede eliminar: el cliente tiene ${vehiclesCount} vehículo(s) registrado(s)`,
      409
    );
  }

  await client.deleteOne();
  res.status(200).json({ message: 'Cliente eliminado exitosamente' });
};
