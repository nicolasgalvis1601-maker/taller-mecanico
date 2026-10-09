/**
 * Error controlado de la aplicación.
 * Se lanza desde los controladores con un código HTTP y un mensaje claro;
 * el manejador global de errores lo convierte en la respuesta JSON.
 */
class AppError extends Error {
  constructor(message, statusCode = 500, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    if (details) this.details = details;
  }
}

module.exports = AppError;
