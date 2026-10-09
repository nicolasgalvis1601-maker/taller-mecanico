const express = require('express');
const router = express.Router();
// Ojo con las mayúsculas: el archivo es "mechanicController.js".
// En Windows "MechanicController" funcionaba, pero en Linux (servidores) falla.
const mechanicController = require('../controllers/mechanicController');

router.post('/', mechanicController.createMechanic);
router.get('/', mechanicController.getMechanics);
router.get('/:id', mechanicController.getMechanicById);
router.get('/:id/orders', mechanicController.getMechanicOrders);
router.put('/:id', mechanicController.updateMechanic);
router.delete('/:id', mechanicController.deleteMechanic);

module.exports = router;
