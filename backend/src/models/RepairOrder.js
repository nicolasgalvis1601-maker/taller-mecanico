const mongoose = require('mongoose');

// Estados posibles de una orden, en el orden normal del flujo del taller
const ORDER_STATUSES = [
  'RECIBIDO',
  'DIAGNOSTICO',
  'EN_REPARACION',
  'ESPERANDO_REPUESTOS',
  'FINALIZADO',
  'ENTREGADO',
];

// Estados en los que el vehículo sigue dentro del taller
const ACTIVE_STATUSES = ['RECIBIDO', 'DIAGNOSTICO', 'EN_REPARACION', 'ESPERANDO_REPUESTOS', 'FINALIZADO'];

// Estados en los que ya no se pueden agregar servicios ni repuestos
const CLOSED_STATUSES = ['FINALIZADO', 'ENTREGADO'];

const quantityField = {
  type: Number,
  default: 1,
  min: [1, 'La cantidad mínima es 1'],
  validate: { validator: Number.isInteger, message: 'La cantidad debe ser un número entero' },
};

const orderServiceSchema = new mongoose.Schema(
  {
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    quantity: quantityField,
    // Precio unitario congelado al momento de agregarlo (si luego cambia el
    // precio del catálogo, la orden conserva el valor cobrado)
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderPartSchema = new mongoose.Schema(
  {
    part: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Part',
      required: true,
    },
    quantity: quantityField,
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const repairOrderSchema = new mongoose.Schema(
  {
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: [true, 'El vehículo es obligatorio'],
      index: true,
    },
    mechanic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mechanic',
      required: [true, 'El mecánico es obligatorio'],
      index: true,
    },
    entryDate: { type: Date, default: Date.now },
    exitDate: { type: Date },
    problem: {
      type: String,
      required: [true, 'La descripción del problema es obligatoria'],
      trim: true,
    },
    diagnosis: { type: String, trim: true },
    status: {
      type: String,
      enum: {
        values: ORDER_STATUSES,
        message: `Estado inválido. Valores permitidos: ${ORDER_STATUSES.join(', ')}`,
      },
      default: 'RECIBIDO',
      index: true,
    },
    services: [orderServiceSchema],
    parts: [orderPartSchema],
    notes: { type: String, trim: true },
    total: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

/** Recalcula el total de la orden a partir de servicios y repuestos. */
repairOrderSchema.methods.calculateTotal = function calculateTotal() {
  const sum = (items) => items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  this.total = sum(this.services) + sum(this.parts);
  return this.total;
};

const RepairOrder = mongoose.model('RepairOrder', repairOrderSchema);

module.exports = RepairOrder;
module.exports.ORDER_STATUSES = ORDER_STATUSES;
module.exports.ACTIVE_STATUSES = ACTIVE_STATUSES;
module.exports.CLOSED_STATUSES = CLOSED_STATUSES;
