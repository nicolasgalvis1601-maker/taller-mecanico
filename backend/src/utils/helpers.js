const mongoose = require('mongoose');
const AppError = require('./AppError');

/**
 * Devuelve un objeto solo con los campos permitidos que vienen definidos.
 * Evita que el cliente modifique campos internos (_id, total, createdAt, etc.).
 */
const pick = (source = {}, allowedFields = []) =>
  allowedFields.reduce((acc, field) => {
    if (source[field] !== undefined) acc[field] = source[field];
    return acc;
  }, {});

/**
 * Lanza un 400 si el valor no es un ObjectId válido de MongoDB.
 */
const assertObjectId = (value, fieldName = 'id') => {
  if (!mongoose.isValidObjectId(value)) {
    throw new AppError(`El campo "${fieldName}" no es un ID válido`, 400);
  }
};

/**
 * Lanza un 400 si el cuerpo de la petición no trae ningún campo editable.
 */
const assertHasFields = (data) => {
  if (Object.keys(data).length === 0) {
    throw new AppError('No se enviaron campos válidos para actualizar', 400);
  }
};

/** Opciones estándar para actualizaciones: devuelve el documento nuevo y valida. */
const updateOptions = { returnDocument: 'after', runValidators: true };

module.exports = { pick, assertObjectId, assertHasFields, updateOptions };
