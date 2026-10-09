const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');

// Registrar vehículo
router.post('/', vehicleController.createVehicle);

// Listar vehículos
router.get('/', vehicleController.getVehicles);

// Historial técnico completo por placa (Requerimiento Clave)
router.get('/:plate/history', vehicleController.getVehicleHistoryByPlate);

// Consultar, actualizar y eliminar por placa
router.get('/:plate', vehicleController.getVehicleByPlate);
router.put('/:plate', vehicleController.updateVehicle);
router.delete('/:plate', vehicleController.deleteVehicle);

module.exports = router;
