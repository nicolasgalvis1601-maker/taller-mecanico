const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
  {
    documentId: {
      type: String,
      required: [true, 'El documento de identidad es obligatorio'],
      unique: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: [true, 'El nombre completo es obligatorio'],
      trim: true,
      minlength: [3, 'El nombre debe tener al menos 3 caracteres'],
    },
    phone: {
      type: String,
      required: [true, 'El teléfono de contacto es obligatorio'],
      trim: true,
      match: [/^[0-9+()\-\s]{7,20}$/, 'El teléfono no tiene un formato válido'],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'El correo electrónico no tiene un formato válido'],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Client', clientSchema);
