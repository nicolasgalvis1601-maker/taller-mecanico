const mongoose = require('mongoose');

/**
 * 404 para cualquier ruta que no exista.
 */
const notFound = (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.originalUrl,
  });
};

/**
 * Manejador global de errores.
 * Traduce los errores de Mongoose / Express a códigos HTTP correctos
 * en lugar de devolver siempre 500.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || err.status || 500;
  let message = err.message || 'Error interno del servidor';
  let details = err.details;

  // Errores de validación del esquema (campos obligatorios, mínimos, enums...)
  if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = 'Datos inválidos';
    details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.kind === 'ObjectId' || e.name === 'CastError' ? `Valor inválido para "${e.path}"` : e.message,
    }));
  }

  // ID con formato incorrecto (ej: /api/mechanics/123)
  else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Valor inválido para el campo "${err.path}"`;
  }

  // Índice único duplicado (documento, placa...)
  else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || err.keyPattern || {})[0] || 'campo';
    message = `Ya existe un registro con ese valor de "${field}"`;
  }

  // JSON mal formado en el cuerpo de la petición
  else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'El cuerpo de la petición no es un JSON válido';
  }

  if (status >= 500) {
    console.error('[Error de Servidor]:', err.stack || err);
    // En producción no se exponen detalles internos
    if (process.env.NODE_ENV === 'production') message = 'Error interno del servidor';
  }

  const body = { error: message };
  if (details) body.details = details;
  res.status(status).json(body);
};

module.exports = { notFound, errorHandler };
