const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    plate: {
      type: String,
      required: [true, 'La placa es obligatoria'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    brand: {
      type: String,
      required: [true, 'La marca es obligatoria'],
      trim: true,
    },
    model: {
      type: String,
      required: [true, 'El modelo es obligatorio'],
      trim: true,
    },
    year: {
      type: Number,
      required: [true, 'El año es obligatorio'],
      min: [1900, 'El año no puede ser menor a 1900'],
      validate: {
        validator: (value) => Number.isInteger(value) && value <= new Date().getFullYear() + 1,
        message: 'El año no es válido',
      },
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'El vehículo debe pertenecer a un cliente'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Vehicle', vehicleSchema);
