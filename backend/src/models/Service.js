const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre del servicio es obligatorio'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'El precio del servicio es obligatorio'],
      min: [0, 'El precio no puede ser negativo'],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', serviceSchema);