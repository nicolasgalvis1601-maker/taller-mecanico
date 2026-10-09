require('dotenv').config({ quiet: true });

const app = require('./src/app');
const { connectDB, disconnectDB } = require('./src/config/db');

const PORT = process.env.PORT || 3000;

const start = async () => {
  try {
    // Primero la base de datos; el servidor solo escucha si la conexión funcionó
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`[Servidor] Escuchando en el puerto ${PORT}`);
      console.log(`[Health Check] http://localhost:${PORT}/api/health`);
    });

    // Cierre ordenado (Ctrl+C o detención del proceso)
    const shutdown = (signal) => {
      console.log(`\n[Servidor] ${signal} recibido, cerrando...`);
      server.close(async () => {
        await disconnectDB();
        process.exit(0);
      });
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error(`[Error BD] Fallo al conectar a MongoDB: ${error.message}`);
    process.exit(1);
  }
};

start();
