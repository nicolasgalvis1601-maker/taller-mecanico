const express = require('express');
const cors = require('cors');

const clientRoutes = require('./routes/clientRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const repairOrderRoutes = require('./routes/repairOrderRoutes');
const mechanicRoutes = require('./routes/mechanicRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const partRoutes = require('./routes/partRoutes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

// 1. Middlewares globales
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// En Express 5 req.body es undefined si la petición no trae cuerpo;
// se deja como objeto vacío para que los controladores no fallen.
app.use((req, res, next) => {
  if (req.body === undefined) req.body = {};
  next();
});

// 2. Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'API del Taller Mecánico funcionando correctamente',
    timestamp: new Date().toISOString(),
  });
});

// 3. Rutas de la API (SIEMPRE antes del 404)
app.use('/api/clients', clientRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/orders', repairOrderRoutes);
app.use('/api/mechanics', mechanicRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/parts', partRoutes);

// 4. Rutas no encontradas (404)
app.use(notFound);

// 5. Manejador global de errores
app.use(errorHandler);

module.exports = app;
