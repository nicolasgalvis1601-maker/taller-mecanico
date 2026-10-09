/**
 * Script de carga masiva de datos (seed) — Taller Mecánico Pro
 *
 *   npm run seed            → BORRA los datos actuales y carga datos de prueba
 *   npm run seed:check      → solo genera y valida los datos, sin tocar la base
 *
 * Carga, en este orden (porque cada colección necesita los IDs de la anterior):
 *   1. 100 mecánicos, 105 servicios, 200 repuestos y 300 clientes
 *   2. 400 vehículos, cada uno asignado a un cliente existente
 *   3. 600 órdenes de reparación, cada una con vehículo, mecánico,
 *      servicios y repuestos que existen en la base
 *
 * Reglas que respeta (las mismas que valida el backend):
 *   - Documentos de clientes y placas de vehículos únicos.
 *   - Un vehículo tiene como máximo UNA orden activa (no entregada).
 *   - Las órdenes entregadas tienen fecha de salida posterior a la de entrada.
 *   - El precio de cada servicio/repuesto se toma del catálogo y el total
 *     se calcula con el mismo método del modelo (calculateTotal).
 *   - Todos los documentos pasan las validaciones de los esquemas de Mongoose.
 *
 * Los datos se generan con una semilla fija: cada ejecución produce los mismos datos.
 */
require('dotenv').config({ quiet: true });

const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/db');
const Client = require('../src/models/Client');
const Vehicle = require('../src/models/Vehicle');
const Mechanic = require('../src/models/Mechanic');
const Service = require('../src/models/Service');
const Part = require('../src/models/Part');
const RepairOrder = require('../src/models/RepairOrder');

const CHECK_ONLY = process.argv.includes('--check');

// Cantidades a generar
const TOTAL = {
  mechanics: 100,
  services: 105,
  parts: 200,
  clients: 300,
  vehicles: 400,
  orders: 600,
};

/* ------------------------------------------------------------------ */
/* Números aleatorios con semilla fija (resultados repetibles)         */
/* ------------------------------------------------------------------ */
let seed = 20261009;
const random = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const int = (min, max) => Math.floor(random() * (max - min + 1)) + min;
const pick = (list) => list[int(0, list.length - 1)];
const chance = (p) => random() < p;
const pickSome = (list, min, max) => {
  const copy = [...list];
  const n = Math.min(int(min, max), copy.length);
  const out = [];
  for (let i = 0; i < n; i += 1) out.push(copy.splice(int(0, copy.length - 1), 1)[0]);
  return out;
};
const roundTo = (value, step) => Math.round(value / step) * step;
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days, extraHours = 0) => new Date(Date.now() - days * DAY + extraHours * 60 * 60 * 1000);

/* ------------------------------------------------------------------ */
/* Datos base (realistas para Colombia)                                */
/* ------------------------------------------------------------------ */
const MALE_NAMES = [
  'Juan', 'Carlos', 'Andrés', 'Luis', 'Jorge', 'Santiago', 'Felipe', 'Diego', 'Camilo', 'Sebastián',
  'Mateo', 'Daniel', 'Alejandro', 'David', 'Nicolás', 'Julián', 'Óscar', 'Fernando', 'Ricardo', 'Miguel',
];
const FEMALE_NAMES = [
  'María', 'Laura', 'Ana', 'Valentina', 'Daniela', 'Paula', 'Carolina', 'Natalia', 'Juliana', 'Sofía',
  'Camila', 'Andrea', 'Diana', 'Mónica', 'Catalina', 'Luisa', 'Adriana', 'Claudia', 'Sandra', 'Gloria',
];
const LAST_NAMES = [
  'García', 'Rodríguez', 'Martínez', 'López', 'González', 'Hernández', 'Pérez', 'Sánchez', 'Ramírez',
  'Torres', 'Díaz', 'Vargas', 'Rojas', 'Moreno', 'Jiménez', 'Castro', 'Ortiz', 'Gómez', 'Muñoz', 'Suárez',
  'Restrepo', 'Cardona', 'Ospina', 'Giraldo', 'Zapata', 'Valencia', 'Mejía', 'Arango', 'Salazar',
  'Quintero', 'Cárdenas', 'Ríos', 'Duarte', 'Mendoza', 'Acosta', 'Rincón', 'Bermúdez', 'Patiño',
];
const EMAIL_DOMAINS = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.es'];

const SPECIALTIES = [
  'Motor', 'Frenos', 'Suspensión y dirección', 'Sistema eléctrico', 'Transmisión y embrague',
  'Aire acondicionado', 'Inyección electrónica', 'Latonería y pintura', 'Diagnóstico computarizado',
  'Alineación y balanceo', 'Mantenimiento general', 'Escape y emisiones',
];

// [nombre, descripción, precio base en pesos]
const SERVICE_BASES = [
  ['Cambio de aceite y filtro', 'Cambio de aceite de motor y filtro de aceite', 90000],
  ['Sincronización', 'Cambio de bujías, filtros y ajuste de motor', 180000],
  ['Alineación', 'Alineación de dirección computarizada', 60000],
  ['Balanceo', 'Balanceo de las cuatro llantas', 40000],
  ['Cambio de pastillas de freno', 'Desmontaje y cambio de pastillas delanteras o traseras', 80000],
  ['Rectificación de discos', 'Rectificación de discos de freno', 70000],
  ['Cambio de líquido de frenos', 'Purga y cambio de líquido de frenos', 60000],
  ['Revisión del sistema de frenos', 'Inspección completa de frenos y ajuste', 45000],
  ['Cambio de embrague', 'Cambio de kit de embrague (disco, prensa y balinera)', 450000],
  ['Revisión de suspensión', 'Inspección de amortiguadores, bujes y rótulas', 60000],
  ['Cambio de amortiguadores', 'Cambio de par de amortiguadores', 150000],
  ['Cambio de correa de distribución', 'Cambio de correa de distribución y tensor', 350000],
  ['Limpieza de inyectores', 'Limpieza de inyectores por ultrasonido', 150000],
  ['Diagnóstico computarizado', 'Escaneo del vehículo y reporte de fallas', 80000],
  ['Mantenimiento de aire acondicionado', 'Limpieza del sistema y revisión de presiones', 160000],
  ['Carga de gas del aire acondicionado', 'Vacío y carga de refrigerante', 120000],
  ['Instalación de batería', 'Cambio e instalación de batería', 30000],
  ['Revisión del sistema eléctrico', 'Revisión de alternador, arranque y cableado', 70000],
  ['Cambio de bujías', 'Cambio del juego de bujías', 60000],
  ['Lavado de motor', 'Lavado y desengrase del motor', 50000],
  ['Cambio de refrigerante', 'Drenaje y cambio de refrigerante', 70000],
  ['Reparación de radiador', 'Desmontaje y reparación de radiador', 180000],
  ['Cambio de bomba de agua', 'Cambio de bomba de agua y empaque', 220000],
  ['Cambio de filtro de aire', 'Cambio del filtro de aire del motor', 25000],
  ['Cambio de filtro de combustible', 'Cambio del filtro de combustible', 40000],
  ['Montaje de llantas', 'Desmontaje y montaje de llantas', 40000],
  ['Reparación de pinchazo', 'Reparación de pinchazo con parche interno', 15000],
  ['Ajuste de motor', 'Reparación general del motor', 1200000],
  ['Cambio de aceite de caja', 'Cambio de aceite de la caja de cambios', 120000],
  ['Revisión previa a la técnico-mecánica', 'Revisión de los puntos que evalúa el CDA', 90000],
  ['Escaneo y borrado de códigos', 'Lectura y borrado de códigos de falla', 60000],
  ['Pintura de pieza', 'Pintura de una pieza de carrocería', 250000],
  ['Latonería menor', 'Reparación de golpes menores en carrocería', 200000],
  ['Cambio de rodamientos', 'Cambio de rodamientos de rueda', 140000],
  ['Revisión del sistema de escape', 'Inspección de tubería, silenciador y soportes', 50000],
];
const VEHICLE_TYPES = [
  ['automóvil', 1],
  ['camioneta', 1.25],
  ['SUV', 1.45],
];

// Marcas reales según el tipo de repuesto
const BRANDS = {
  filtro: ['Mann', 'Wix', 'Bosch', 'Mahle', 'Fram'],
  aceite: ['Mobil', 'Castrol', 'Shell', 'Valvoline', 'Motul'],
  freno: ['Brembo', 'Bosch', 'TRW', 'Valeo', 'ACDelco'],
  electrico: ['Bosch', 'Denso', 'NGK', 'Valeo', 'ACDelco'],
  suspension: ['Monroe', 'Sachs', 'Moog', 'KYB', 'TRW'],
  motor: ['Gates', 'Mahle', 'Dayco', 'Bosch', 'Valeo'],
  llanta: ['Michelin', 'Goodyear', 'Pirelli', 'Bridgestone', 'Continental'],
  carroceria: ['Bosch', 'Valeo', 'Hella', 'Philips', 'Osram'],
};

// [nombre, precio base en pesos, grupo de marcas]
const PART_BASES = [
  ['Filtro de aceite', 25000, 'filtro'], ['Filtro de aire', 35000, 'filtro'], ['Filtro de combustible', 45000, 'filtro'],
  ['Filtro de cabina', 40000, 'filtro'], ['Aceite de motor 10W-30 (galón)', 120000, 'aceite'], ['Aceite de motor 5W-30 (galón)', 140000, 'aceite'],
  ['Pastillas de freno delanteras', 110000, 'freno'], ['Pastillas de freno traseras', 95000, 'freno'], ['Disco de freno', 180000, 'freno'],
  ['Líquido de frenos DOT 4', 30000, 'aceite'], ['Bujía de encendido', 25000, 'electrico'], ['Cable de bujía (juego)', 120000, 'electrico'],
  ['Batería 12V 45Ah', 380000, 'electrico'], ['Amortiguador delantero', 230000, 'suspension'], ['Amortiguador trasero', 190000, 'suspension'],
  ['Correa de distribución', 160000, 'motor'], ['Tensor de correa', 140000, 'motor'], ['Correa de accesorios', 70000, 'motor'],
  ['Bomba de agua', 210000, 'motor'], ['Termostato', 65000, 'motor'], ['Refrigerante (galón)', 55000, 'aceite'],
  ['Kit de embrague', 650000, 'suspension'], ['Rodamiento de rueda', 120000, 'suspension'], ['Rótula de suspensión', 90000, 'suspension'],
  ['Terminal de dirección', 75000, 'suspension'], ['Bujes de tijera (par)', 85000, 'suspension'], ['Bombillo delantero H4', 25000, 'carroceria'],
  ['Plumillas limpiaparabrisas (par)', 45000, 'carroceria'], ['Sensor de oxígeno', 260000, 'electrico'], ['Bobina de encendido', 230000, 'electrico'],
  ['Inyector de combustible', 280000, 'electrico'], ['Empaque de culata', 150000, 'motor'], ['Radiador', 520000, 'motor'],
  ['Manguera de radiador', 45000, 'motor'], ['Alternador reconstruido', 650000, 'electrico'], ['Motor de arranque', 580000, 'electrico'],
  ['Llanta 175/70 R13', 260000, 'llanta'], ['Llanta 205/55 R16', 380000, 'llanta'], ['Válvula PCV', 40000, 'motor'], ['Silenciador', 320000, 'motor'],
];

const CAR_MODELS = {
  Chevrolet: ['Spark', 'Sail', 'Onix', 'Tracker', 'Captiva', 'Aveo'],
  Renault: ['Logan', 'Sandero', 'Duster', 'Kwid', 'Stepway'],
  Mazda: ['2', '3', 'CX-5', 'CX-30'],
  Kia: ['Picanto', 'Rio', 'Sportage', 'Seltos'],
  Toyota: ['Corolla', 'Hilux', 'Fortuner', 'Prado', 'Yaris'],
  Nissan: ['March', 'Versa', 'Frontier', 'Kicks'],
  Hyundai: ['i10', 'Accent', 'Tucson', 'Creta'],
  Volkswagen: ['Gol', 'Jetta', 'T-Cross', 'Voyage'],
  Ford: ['Fiesta', 'Escape', 'Ranger', 'EcoSport'],
  Suzuki: ['Swift', 'Vitara', 'Jimny'],
};

const SUV_MODELS = ['Tracker', 'Captiva', 'Duster', 'CX-5', 'CX-30', 'Sportage', 'Seltos', 'Fortuner', 'Prado', 'Kicks', 'Tucson', 'Creta', 'T-Cross', 'Escape', 'EcoSport', 'Vitara', 'Jimny'];
const PICKUP_MODELS = ['Hilux', 'Frontier', 'Ranger'];
const vehicleType = (model) => (SUV_MODELS.includes(model) ? 'SUV' : PICKUP_MODELS.includes(model) ? 'camioneta' : 'automóvil');

// Cada escenario une un problema con su diagnóstico, los servicios y los repuestos que tienen sentido.
// "LLANTA" se reemplaza por la medida según el tipo de vehículo.
const SCENARIOS = [
  ['Ruido al frenar', 'Pastillas de freno desgastadas al 90 %; discos con rayas.', ['Cambio de pastillas de freno', 'Rectificación de discos'], ['Pastillas de freno delanteras', 'Líquido de frenos DOT 4']],
  ['Vibración en el pedal del freno', 'Discos de freno deformados por recalentamiento.', ['Rectificación de discos', 'Revisión del sistema de frenos'], ['Disco de freno', 'Pastillas de freno delanteras']],
  ['Mantenimiento preventivo de los 10.000 km', 'Vehículo en buen estado general; se realiza mantenimiento preventivo.', ['Cambio de aceite y filtro', 'Cambio de filtro de aire', 'Revisión del sistema de frenos'], ['Filtro de aceite', 'Aceite de motor 10W-30 (galón)', 'Filtro de aire']],
  ['Mantenimiento preventivo de los 50.000 km', 'Kilometraje de cambio de correa y bujías; demás sistemas en buen estado.', ['Sincronización', 'Cambio de correa de distribución', 'Cambio de aceite y filtro'], ['Bujía de encendido', 'Correa de distribución', 'Tensor de correa', 'Filtro de aceite', 'Aceite de motor 5W-30 (galón)']],
  ['Testigo de check engine encendido', 'Sensor de oxígeno defectuoso según escaneo computarizado.', ['Diagnóstico computarizado', 'Escaneo y borrado de códigos'], ['Sensor de oxígeno']],
  ['No enciende en las mañanas', 'Batería sin capacidad de carga; alternador en buen estado.', ['Revisión del sistema eléctrico', 'Instalación de batería'], ['Batería 12V 45Ah']],
  ['La batería se descarga de un día para otro', 'El alternador no carga; diodos dañados.', ['Revisión del sistema eléctrico'], ['Alternador reconstruido']],
  ['El carro no arranca, solo hace clic', 'Motor de arranque con escobillas desgastadas.', ['Revisión del sistema eléctrico'], ['Motor de arranque']],
  ['Pierde potencia en las subidas', 'Inyectores sucios y filtro de combustible saturado.', ['Limpieza de inyectores', 'Cambio de filtro de combustible'], ['Filtro de combustible']],
  ['Consumo excesivo de combustible', 'Bujías en mal estado y filtros saturados; se requiere sincronización.', ['Sincronización', 'Limpieza de inyectores'], ['Bujía de encendido', 'Filtro de aire', 'Filtro de combustible']],
  ['El motor tiembla en mínima', 'Bobina de encendido con falla en el cilindro 2.', ['Diagnóstico computarizado', 'Cambio de bujías'], ['Bobina de encendido', 'Bujía de encendido']],
  ['Fuga de aceite debajo del motor', 'Empaque de culata con filtración; se cambia el empaque y se limpia el motor.', ['Lavado de motor', 'Cambio de aceite y filtro'], ['Empaque de culata', 'Filtro de aceite', 'Aceite de motor 10W-30 (galón)']],
  ['El aire acondicionado no enfría', 'Falta de gas en el aire acondicionado; sin fugas visibles.', ['Carga de gas del aire acondicionado', 'Mantenimiento de aire acondicionado'], ['Filtro de cabina']],
  ['El motor se recalienta', 'Termostato pegado y refrigerante contaminado.', ['Cambio de refrigerante', 'Reparación de radiador'], ['Termostato', 'Refrigerante (galón)', 'Manguera de radiador']],
  ['Pierde refrigerante', 'Bomba de agua con fuga por el sello.', ['Cambio de bomba de agua', 'Cambio de refrigerante'], ['Bomba de agua', 'Refrigerante (galón)']],
  ['Ruido en la suspensión al pasar policías acostados', 'Amortiguadores delanteros vencidos y bujes de tijera rotos.', ['Revisión de suspensión', 'Cambio de amortiguadores'], ['Amortiguador delantero', 'Bujes de tijera (par)']],
  ['El carro se va hacia un lado', 'Dirección desalineada y llantas desbalanceadas.', ['Alineación', 'Balanceo'], []],
  ['Ruido al girar el timón', 'Terminales de dirección y rótulas con juego.', ['Revisión de suspensión', 'Alineación'], ['Terminal de dirección', 'Rótula de suspensión']],
  ['El carro vibra a alta velocidad', 'Llantas desbalanceadas y rodamiento delantero con juego.', ['Balanceo', 'Cambio de rodamientos'], ['Rodamiento de rueda']],
  ['El embrague patina', 'Kit de embrague desgastado; disco al límite.', ['Cambio de embrague'], ['Kit de embrague']],
  ['Le cuesta meter los cambios', 'Aceite de caja degradado; embrague dentro del rango normal.', ['Cambio de aceite de caja', 'Diagnóstico computarizado'], []],
  ['Golpe en la puerta trasera', 'Hundimiento en la puerta trasera izquierda sin daño estructural.', ['Latonería menor', 'Pintura de pieza'], []],
  ['Las llantas están lisas', 'Llantas por debajo del límite de labrado (1,6 mm).', ['Montaje de llantas', 'Alineación', 'Balanceo'], ['LLANTA']],
  ['Tiene un pinchazo', 'Pinchazo en la banda de rodamiento, reparable.', ['Reparación de pinchazo'], []],
  ['Revisión antes de la técnico-mecánica', 'Bombillo delantero fundido y plumillas en mal estado; lo demás aprobado.', ['Revisión previa a la técnico-mecánica'], ['Bombillo delantero H4', 'Plumillas limpiaparabrisas (par)']],
  ['Sale humo azul por el escape', 'Consumo de aceite por desgaste interno del motor; se requiere ajuste.', ['Ajuste de motor', 'Diagnóstico computarizado'], ['Empaque de culata', 'Aceite de motor 10W-30 (galón)', 'Válvula PCV']],
  ['Ruido fuerte en el escape', 'Silenciador perforado por corrosión.', ['Revisión del sistema de escape'], ['Silenciador']],
];
// Cantidad habitual de cada repuesto en una reparación (si no aparece, es 1)
const PART_QUANTITY = {
  'Bujía de encendido': 4, 'Amortiguador delantero': 2, 'Aceite de motor 10W-30 (galón)': 1,
  'Llanta 175/70 R13': 4, 'Llanta 205/55 R16': 4, 'Refrigerante (galón)': 2,
};
const NOTES = [
  'Cliente solicita llamada antes de autorizar repuestos adicionales.',
  'Vehículo entregado lavado.',
  'Cliente trae sus propios repuestos para una próxima visita.',
  'Se recomienda volver en 5.000 km.',
  'Garantía de 3 meses sobre la mano de obra.',
  'Pendiente confirmar disponibilidad del repuesto con el proveedor.',
];

/* ------------------------------------------------------------------ */
/* Generadores                                                         */
/* ------------------------------------------------------------------ */
const plain = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const personName = () => {
  const names = chance(0.5) ? MALE_NAMES : FEMALE_NAMES;
  const first = pick(names);
  let second = '';
  if (chance(0.35)) {
    let other;
    do other = pick(names); while (other === first);
    second = ` ${other}`;
  }
  return `${first}${second} ${pick(LAST_NAMES)} ${pick(LAST_NAMES)}`;
};
const phone = () => `3${pick(['00', '01', '04', '10', '12', '14', '15', '17', '20', '23', '50'])} ${int(100, 999)} ${int(1000, 9999)}`;

function buildMechanics() {
  return Array.from({ length: TOTAL.mechanics }, () => ({
    fullName: personName(),
    phone: phone(),
    specialty: pick(SPECIALTIES),
  }));
}

function buildServices() {
  const list = [];
  for (const [type, factor] of VEHICLE_TYPES) {
    for (const [name, description, price] of SERVICE_BASES) {
      list.push({ name: `${name} (${type})`, baseName: name, type, description, price: roundTo(price * factor, 1000) });
    }
  }
  return list; // 35 servicios × 3 tipos de vehículo = 105
}

function buildParts() {
  const list = [];
  for (const [name, price, group] of PART_BASES) {
    for (const brand of BRANDS[group]) {
      // ~12 % de los repuestos queda con stock bajo (≤ 5) para que se vea la alerta del panel
      const stock = chance(0.12) ? int(0, 5) : int(6, 80);
      list.push({ name, brand, price: roundTo(price * (0.85 + random() * 0.4), 500), stock });
    }
  }
  return list.slice(0, TOTAL.parts);
}

function buildClients() {
  const usedDocs = new Set();
  return Array.from({ length: TOTAL.clients }, () => {
    let documentId;
    do documentId = String(int(10000000, 1199999999)); while (usedDocs.has(documentId));
    usedDocs.add(documentId);

    const fullName = personName();
    const client = { documentId, fullName, phone: phone() };
    if (chance(0.8)) {
      const [first, , last] = plain(fullName).split(' ').filter(Boolean).concat(['', '']);
      client.email = `${first}.${last || 'cliente'}${int(1, 999)}@${pick(EMAIL_DOMAINS)}`;
    }
    return client;
  });
}

function buildVehicles(clientIds) {
  const usedPlates = new Set();
  const letters = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  const currentYear = new Date().getFullYear();

  return Array.from({ length: TOTAL.vehicles }, (_, i) => {
    let plate;
    do {
      plate = `${pick(letters)}${pick(letters)}${pick(letters)}${int(100, 999)}`;
    } while (usedPlates.has(plate));
    usedPlates.add(plate);

    const brand = pick(Object.keys(CAR_MODELS));
    const model = pick(CAR_MODELS[brand]);
    return {
      plate,
      brand,
      model,
      year: int(2005, currentYear),
      // Los primeros 300 vehículos van uno por cliente; los demás a clientes al azar
      clientId: i < clientIds.length ? clientIds[i] : pick(clientIds),
    };
  });
}

function buildOrders({ vehicles, mechanicIds, services, parts }) {
  // Índices del catálogo para buscar por nombre
  const serviceByKey = new Map(services.map((x) => [`${x.baseName}|${x.type}`, x]));
  const partsByName = new Map();
  parts.forEach((x) => partsByName.set(x.name, [...(partsByName.get(x.name) || []), x]));

  // Verifica que todos los escenarios usen servicios y repuestos que existen
  for (const [, , serviceNames, partNames] of SCENARIOS) {
    serviceNames.forEach((n) => { if (!serviceByKey.has(`${n}|automóvil`)) throw new Error(`Servicio inexistente: ${n}`); });
    partNames.filter((n) => n !== 'LLANTA').forEach((n) => { if (!partsByName.has(n)) throw new Error(`Repuesto inexistente: ${n}`); });
  }

  const buildOrder = (vehicle, status, entryDate) => {
    const [problem, diagnosis, serviceNames, partNames] = pick(SCENARIOS);
    const type = vehicleType(vehicle.model);
    const justArrived = status === 'RECIBIDO';
    const inDiagnosis = status === 'DIAGNOSTICO';

    // El precio SIEMPRE sale del catálogo (igual que en el backend)
    const serviceLines = justArrived ? [] : serviceNames
      .slice(0, inDiagnosis ? 1 : serviceNames.length)
      .map((n) => serviceByKey.get(`${n}|${type}`))
      .map((sv) => ({ service: sv._id, quantity: 1, price: sv.price }));

    const partLines = justArrived || inDiagnosis ? [] : partNames
      .map((n) => (n === 'LLANTA' ? (type === 'automóvil' ? 'Llanta 175/70 R13' : 'Llanta 205/55 R16') : n))
      .map((n) => {
        const part = pick(partsByName.get(n));
        return { part: part._id, quantity: PART_QUANTITY[n] || 1, price: part.price };
      });

    const order = {
      vehicle: vehicle._id,
      mechanic: pick(mechanicIds),
      entryDate,
      problem,
      diagnosis: justArrived ? undefined : diagnosis,
      status,
      services: serviceLines,
      parts: partLines,
      notes: chance(0.2) ? pick(NOTES) : undefined,
    };
    if (status === 'ENTREGADO') order.exitDate = new Date(entryDate.getTime() + int(1, 10) * DAY);
    return order;
  };

  const orders = [];

  // 1) Órdenes ACTIVAS: un vehículo distinto para cada una (regla: una sola activa por vehículo)
  const activePlan = [
    ['RECIBIDO', 15], ['DIAGNOSTICO', 15], ['EN_REPARACION', 20], ['ESPERANDO_REPUESTOS', 10], ['FINALIZADO', 10],
  ];
  const activeVehicles = pickSome(vehicles, 70, 70);
  let v = 0;
  for (const [status, count] of activePlan) {
    for (let i = 0; i < count; i += 1) {
      orders.push(buildOrder(activeVehicles[v++], status, daysAgo(int(0, 14), int(0, 10))));
    }
  }

  // 2) Órdenes ENTREGADAS (historial): entre 25 días y 18 meses atrás
  while (orders.length < TOTAL.orders) {
    orders.push(buildOrder(pick(vehicles), 'ENTREGADO', daysAgo(int(25, 540), int(0, 10))));
  }

  // Total calculado con el mismo método del modelo
  return orders.map((data) => {
    const order = new RepairOrder(data);
    order.calculateTotal();
    order.createdAt = data.entryDate;
    order.updatedAt = data.exitDate || data.entryDate;
    return order;
  });
}

/* ------------------------------------------------------------------ */
/* Validación (sin base de datos)                                      */
/* ------------------------------------------------------------------ */
async function validateAll(Model, docs, label) {
  for (let i = 0; i < docs.length; i += 1) {
    const instance = docs[i] instanceof mongoose.Model ? docs[i] : new Model(docs[i]);
    try {
      await instance.validate();
    } catch (error) {
      const detail = error.errors ? Object.values(error.errors).map((e) => e.message).join('; ') : error.message;
      throw new Error(`${label} #${i + 1} no es válido: ${detail}`);
    }
  }
}

// Asigna IDs en memoria para poder relacionar las colecciones antes de guardar
const withIds = (docs) => docs.map((d) => ({ _id: new mongoose.Types.ObjectId(), ...d }));

/* ------------------------------------------------------------------ */
/* Programa principal                                                  */
/* ------------------------------------------------------------------ */
async function main() {
  console.log(CHECK_ONLY ? '[Seed] Modo verificación: no se tocará la base de datos.' : '[Seed] Iniciando carga de datos...');

  // 1. Generar todo en memoria
  const mechanics = withIds(buildMechanics());
  const services = withIds(buildServices());
  const parts = withIds(buildParts());
  const clients = withIds(buildClients());
  const vehicles = withIds(buildVehicles(clients.map((c) => c._id)));
  const orders = buildOrders({
    vehicles,
    mechanicIds: mechanics.map((x) => x._id),
    services,
    parts,
  });

  // 2. Validar contra los esquemas de Mongoose
  await validateAll(Mechanic, mechanics, 'Mecánico');
  await validateAll(Service, services, 'Servicio');
  await validateAll(Part, parts, 'Repuesto');
  await validateAll(Client, clients, 'Cliente');
  await validateAll(Vehicle, vehicles, 'Vehículo');
  await validateAll(RepairOrder, orders, 'Orden');

  const activeByVehicle = new Map();
  for (const o of orders) {
    if (o.status !== 'ENTREGADO') {
      const key = String(o.vehicle);
      if (activeByVehicle.has(key)) throw new Error(`El vehículo ${key} quedó con dos órdenes activas`);
      activeByVehicle.set(key, true);
    }
  }
  console.log('[Seed] Todos los datos pasan las validaciones de los modelos.');

  if (CHECK_ONLY) {
    printSummary({ mechanics, services, parts, clients, vehicles, orders });
    return;
  }

  // 3. Guardar en MongoDB
  await connectDB();
  console.log('[Seed] Borrando datos anteriores...');
  await Promise.all([RepairOrder, Vehicle, Client, Part, Service, Mechanic].map((M) => M.deleteMany({})));

  console.log('[Seed] Insertando datos...');
  await Mechanic.insertMany(mechanics);
  await Service.insertMany(services.map(({ baseName, type, ...rest }) => rest));
  await Part.insertMany(parts);
  await Client.insertMany(clients);
  await Vehicle.insertMany(vehicles);
  // timestamps: false para conservar las fechas reales de cada orden
  await RepairOrder.insertMany(orders.map((o) => o.toObject()), { timestamps: false });

  const counts = await Promise.all([Mechanic, Service, Part, Client, Vehicle, RepairOrder].map((M) => M.countDocuments()));
  printSummary({ mechanics, services, parts, clients, vehicles, orders }, counts);
}

function printSummary(data, counts) {
  const labels = ['Mecánicos', 'Servicios', 'Repuestos', 'Clientes', 'Vehículos', 'Órdenes'];
  const sizes = [data.mechanics, data.services, data.parts, data.clients, data.vehicles, data.orders].map((x) => x.length);
  console.log('');
  console.log(counts ? '[Seed] Datos guardados en la base:' : '[Seed] Datos generados:');
  labels.forEach((label, i) => console.log(`   ${label.padEnd(10)} ${String(counts ? counts[i] : sizes[i]).padStart(4)}`));

  const active = data.orders.filter((o) => o.status !== 'ENTREGADO').length;
  const lowStock = data.parts.filter((p) => p.stock <= 5).length;
  console.log(`   (${active} órdenes activas en el taller, ${data.orders.length - active} entregadas, ${lowStock} repuestos con stock bajo)`);
}

main()
  .then(async () => {
    if (!CHECK_ONLY) await disconnectDB();
    console.log('[Seed] Listo.');
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(`[Seed] Error: ${error.message}`);
    try { await disconnectDB(); } catch { /* sin conexión */ }
    process.exit(1);
  });
