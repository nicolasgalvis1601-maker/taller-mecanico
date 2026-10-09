const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');

// Registrar cliente
router.post('/', clientController.createClient);

// Obtener todos los clientes (opcional: ?search=texto)
router.get('/', clientController.getAllClients);

// Buscar cliente por documento de identidad
router.get('/:documentId', clientController.getClientByDocument);

// Vehículos de un cliente
router.get('/:documentId/vehicles', clientController.getClientVehicles);

// Actualizar cliente
router.put('/:documentId', clientController.updateClient);

// Eliminar cliente
router.delete('/:documentId', clientController.deleteClient);

module.exports = router;
