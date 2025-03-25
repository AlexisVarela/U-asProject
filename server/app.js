const express = require('express');
const app = express();
const dotenv = require('dotenv');
const path = require("path");
const session = require('express-session'); // para sql
const bodyParser = require('body-parser');
const methodOverride = require('method-override');

// Cargar variables de entorno
const bcrypt = require('bcryptjs');
const { pool } = require('./controller/config/conexionbd');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { google } = require('googleapis');
const analytics = google.analyticsreporting('v4');
const GoogleCalendar = require('./googleCalendar.js');

dotenv.config();

// Middlewares
app.use(bodyParser.urlencoded({ extended: true }));

// Configuración del motor de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));


// Permisos para put y delete
app.use(methodOverride('_method')); 
// Middleware para procesar datos de los formularios
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Para procesar JSON en las solicitudes

// Variables globales
const citasPendientes = new Map(); // Almacena citas pendientes de confirmación
const clicksMap = new Map(); // Almacena clics en tarjetas
const clicsPorTarjeta = {}; // Almacena clics por tarjeta (alternativo)

// Configuración de Google Analytics
const authClient = new google.auth.JWT({
    email: process.env.CORREO_ANALYTICS,
    key: process.env.ID_ANALYTICS.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
});

// Configuración de Google Calendar
const googleCalendar = new GoogleCalendar(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REFRESH_TOKEN
);

// Importación de controladores
const { enviarConfirmacion, agendarCita } = require("./public/js/correo");
const { getAnalyticsUsers } = require('./public/js/analytics');

// ======================================
// RUTAS DE VISTAS
// ======================================
// -----------------SQL-----------------
// Configuración de la sesión
app.use(session({
    secret: process.env.SESSION_SECRET,  
    resave: false,
    saveUninitialized: true
}));

// Rutas de login (Eric)
const rutas2SQL = require('./routes/rutas2SQL');
app.use('/', rutas2SQL);


// --------------Mongoose-------------
const {conectarseMongo} = require('./controller/config/conexionMongo'); //Para conectarse con mongo
const rutasCortes = require('./routes/rutasCortes');
const rutasUnas = require('./routes/rutasUnas.js');

// Conectar con mongo
conectarseMongo();

// Rutas para cortes
app.use('/cortes', rutasCortes);
app.use('/unasVista', rutasUnas);


// -------------[Angie]----------------
// Ruta para obtener eventos de Google Calendar
app.get('/obtener-eventos', async (req, res) => {
    try {
        const eventos = await googleCalendar.getEvents(); // Método para obtener eventos
        res.status(200).json(eventos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/', (req, res) => {
    res.render('carrucel');
});

app.get('/Citas', (req, res) => {
    res.render('Citas', { title: 'citas', cssFile: '/styles/citas.css' });
});

app.get('/agendar-cita', (req, res) => {
    res.render('agendar-cita', { title: 'Agendar Cita', cssFile: '/styles/agendar.css' });
});

app.get('/dashboard', (req, res) => {
    res.render('dashboard', { titulo: "Dashboard", cssFile: '/styles/dashboard.css' });
});

app.get('/EstiloCabello', (req, res) => {
    res.render('EstiloCabello', { title: 'Cortes de Cabello', cssFile: '/styles/Estilos.css' });
});

app.get('/EstiloUnas', (req, res) => {
    res.render('EstiloUnas', { title: 'Estilos de Uñas', cssFile: '/styles/Estilos.css' });
});

// ======================================
// RUTAS DE CITAS Y CALENDARIO
// ======================================

app.post('/agendar-cita', async (req, res) => {
    const { email, titulo, descripcion, fecha } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Correo electrónico inválido." });
    }

    try {
        const token = uuidv4();
        const hora = fecha.split('T')[1].slice(0, 5);

        citasPendientes.set(token, { email, titulo, descripcion, fecha });
        await enviarConfirmacion(email, fecha.split('T')[0], hora, token);

        res.status(200).json({ mensaje: "✅ Correo de confirmación enviado. Por favor, revisa tu correo." });
    } catch (error) {
        console.error("❌ Error al agendar la cita:", error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/confirmar-cita', async (req, res) => {
    const { token } = req.query;

    if (!token || !citasPendientes.has(token)) {
        return res.status(400).send("Token inválido o cita no encontrada.");
    }

    try {
        const cita = citasPendientes.get(token);
        const { email, titulo, descripcion, fecha } = cita;

        await agendarCita(email, titulo, descripcion, fecha);
        citasPendientes.delete(token);

        res.send("✅ Cita confirmada y agendada correctamente.");
    } catch (error) {
        console.error("❌ Error al confirmar la cita:", error);
        res.status(500).send("Error al confirmar la cita.");
    }
});

// ======================================
// RUTAS DE GOOGLE CALENDAR
// ======================================

app.post('/crear-evento', async (req, res) => {
    const { summary, location, description, start, end } = req.body;

    if (!start) {
        return res.status(400).json({ error: 'El campo start es requerido.' });
    }

    try {
        const linkEvento = await googleCalendar.createEvent(summary, description, start);
        res.status(200).json({ message: 'Evento creado con éxito', link: linkEvento });
    } catch (error) {
        console.error('❌ Error al crear evento:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/verificar-disponibilidad', async (req, res) => {
    const { start, end } = req.body;

    try {
        const busySlots = await googleCalendar.checkAvailability(start, end);
        if (busySlots.length === 0) {
            res.status(200).json({ available: true });
        } else {
            res.status(200).json({ available: false, busySlots });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/obtener-eventos', async (req, res) => {
    try {
        const eventos = await googleCalendar.getEvents();
        res.status(200).json(eventos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ======================================
// RUTAS DE ANALYTICS Y SEGUIMIENTO
// ======================================

app.get('/obtener-usuarios-analytics', async (req, res) => {
    try {
        const data = await getAnalyticsUsers();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/track-click', (req, res) => {
    const { title } = req.body;

    if (!clicksMap.has(title)) {
        clicksMap.set(title, 1);
    } else {
        clicksMap.set(title, clicksMap.get(title) + 1);
    }

    res.json({ success: true, title });
});

app.get('/get-clicks', (req, res) => {
    const clicksData = Array.from(clicksMap).map(([title, count]) => ({ title, count }));
    res.json(clicksData);
});

app.post('/registrar-clic', (req, res) => {
    const { cardTitle } = req.body;

    if (!clicsPorTarjeta[cardTitle]) {
        clicsPorTarjeta[cardTitle] = 1;
    } else {
        clicsPorTarjeta[cardTitle]++;
    }

    res.json({ success: true, cardTitle, count: clicsPorTarjeta[cardTitle] });
});

app.get('/obtener-clics', (req, res) => {
    res.json(clicsPorTarjeta);
});

// ======================================
// INICIO DEL SERVIDOR
// ======================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
