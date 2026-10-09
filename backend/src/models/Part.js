const mongoose = require('mongoose');

const partSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre del repuesto es obligatorio'],
      trim: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'El precio del repuesto es obligatorio'],
      min: [0, 'El precio no puede ser negativo'],
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, 'El stock no puede ser negativo'],
      validate: {
        validator: Number.isInteger,
        message: 'El stock debe ser un número entero',
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Part', partSchema);
