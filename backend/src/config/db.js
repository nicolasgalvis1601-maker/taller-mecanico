const mongoose = require('mongoose');

/**
 * Conecta a MongoDB. Lanza el error para que server.js decida qué hacer
 * (no se llama process.exit aquí para poder reutilizarlo en las pruebas).
 */
const connectDB = async (uri = process.env.MONGODB_URI) => {
  if (!uri) {
    throw new Error('La variable de entorno MONGODB_URI no está definida (revisa tu archivo .env)');
  }

  const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log(`[Database] MongoDB conectado exitosamente: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
};

const disconnectDB = () => mongoose.connection.close();

module.exports = connectDB;
module.exports.connectDB = connectDB;
module.exports.disconnectDB = disconnectDB;
