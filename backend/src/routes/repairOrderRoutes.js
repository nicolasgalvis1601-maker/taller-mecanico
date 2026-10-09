const express = require('express');
const router = express.Router();
const repairOrderController = require('../controllers/repairOrderController');

// Crear orden de ingreso al taller
router.post('/', repairOrderController.createOrder);

// Listar todas las órdenes (opcional: ?status=EN_REPARACION)
router.get('/', repairOrderController.getOrders);

// Órdenes activas en el taller (va ANTES de "/:orderId" para que "active" no se tome como ID)
router.get('/active', repairOrderController.getActiveOrders);

// Consultar y editar una orden
router.get('/:orderId', repairOrderController.getOrderById);
router.patch('/:orderId', repairOrderController.updateOrder);

// Cambiar el estado de una orden
// (RECIBIDO, DIAGNOSTICO, EN_REPARACION, ESPERANDO_REPUESTOS, FINALIZADO, ENTREGADO)
router.patch('/:orderId/status', repairOrderController.updateOrderStatus);

// Agregar servicios/repuestos a una orden existente
router.post('/:orderId/items', repairOrderController.addItemToOrder);

// Quitar un servicio o repuesto de la orden (:type = services | parts)
router.delete('/:orderId/items/:type/:itemId', repairOrderController.removeItemFromOrder);

module.exports = router;
