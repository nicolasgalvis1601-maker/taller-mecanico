const express = require('express');
const router = express.Router();
const partController = require('../controllers/partController');

router.post('/', partController.createPart);
router.get('/', partController.getParts);
router.get('/:id', partController.getPartById);
router.put('/:id', partController.updatePart);
router.patch('/:id/stock', partController.adjustStock);
router.delete('/:id', partController.deletePart);

module.exports = router;
