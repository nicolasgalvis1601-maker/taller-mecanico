const mongoose = require('mongoose');

const mechanicSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'El nombre completo es obligatorio'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'El teléfono es obligatorio'],
      trim: true,
      match: [/^[0-9+()\-\s]{7,20}$/, 'El teléfono no tiene un formato válido'],
    },
    specialty: {
      type: String,
      required: [true, 'La especialidad es obligatoria'],
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Mechanic', mechanicSchema);
