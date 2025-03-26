const express = require('express');
const app = express();
const dotenv = require('dotenv');
const path = require("path");
const session = require('express-session');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');

const { isAuthenticated, isAdmin, apiAuth } = require('./middleware/authMiddleware');
const passport = require('./controller/config/passport.js'); 
const flash = require('connect-flash');

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

// Configuración de sesión
app.use(session({
    secret: process.env.SESSION_SECRET, 
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Middleware para hacer user disponible en todas las vistas
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    next();
});

// Rutas públicas (no requieren autenticación)
const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/obtener-eventos',
    '/agendar-cita',
    '/confirmar-cita'
    // Agrega aquí otras rutas públicas
];

// Middleware global de seguridad
app.use((req, res, next) => {
    if (publicRoutes.includes(req.path)) return next();
    if (!req.isAuthenticated()) {
        req.flash('error', 'Debes iniciar sesión para acceder');
        return res.redirect('/login');
    }
    next();
});

// Permisos para put y delete
app.use(methodOverride('_method')); 
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Variables globales
const citasPendientes = new Map();
const clicksMap = new Map();
const clicsPorTarjeta = {};

// Configuración de Google APIs
const authClient = new google.auth.JWT({
    email: process.env.CORREO_ANALYTICS,
    key: process.env.ID_ANALYTICS.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
});

const googleCalendar = new GoogleCalendar(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REFRESH_TOKEN
);

// Importación de controladores
const { enviarConfirmacion, agendarCita } = require("./public/js/correo");
const { getAnalyticsUsers } = require('./public/js/analytics');

// ======================================
// RUTAS
// ======================================

// Rutas de login
const rutas2SQL = require('./routes/rutas2SQL');
app.use('/', rutas2SQL);

// Rutas de MongoDB
const { conectarseMongo } = require('./controller/config/conexionMongo');
conectarseMongo();

const rutasCortes = require('./routes/rutasCortes');
const rutasUnas = require('./routes/rutasUnas.js');
app.use('/cortes', rutasCortes);
app.use('/unasVista', rutasUnas);

// Rutas de vistas principales
app.get('/', (req, res) => {
    res.render('carrucel', { 
        title: 'Carrucel',
        user: req.user || null 
    });
});

app.get('/Citas', isAuthenticated, (req, res) => {
    res.render('Citas', { 
        title: 'citas', 
        cssFile: '/styles/citas.css',
        user: req.user 
    });
});

app.get('/agendar-cita', isAuthenticated, (req, res) => {
    res.render('agendar-cita', { 
        title: 'Agendar Cita', 
        cssFile: '/styles/agendar.css',
        user: req.user 
    });
});

app.get('/dashboard', isAuthenticated, (req, res) => {
    res.render('dashboard', { 
        titulo: "Dashboard", 
        cssFile: '/styles/dashboard.css',
        user: req.user 
    });
});

app.get('/EstiloCabello', isAuthenticated, (req, res) => {
    res.render('EstiloCabello', { 
        title: 'Cortes de Cabello', 
        cssFile: '/styles/Estilos.css', 
        user: req.user 
    });
});

app.get('/EstiloUnas', isAuthenticated, (req, res) => {
    res.render('EstiloUnas', { 
        title: 'Estilos de Uñas', 
        cssFile: '/styles/Estilos.css', 
        user: req.user 
    });
});

// Rutas de administrador
app.get('/admin', isAuthenticated, isAdmin, (req, res) => {
    res.render('admin-panel', { 
        title: 'Admin Panel',
        user: req.user 
    });
});

// ======================================
// RUTAS DE API
// ======================================

app.post('/crear-evento', apiAuth, async (req, res) => {
    const { summary, location, description, start, end } = req.body;

    if (!start) {
        return res.status(400).json({ error: 'El campo start es requerido.' });
    }

    try {
        const linkEvento = await googleCalendar.createEvent(summary, description, start);
        res.status(200).json({ message: 'Evento creado', link: linkEvento });
    } catch (error) {
        res.status(500).json({ error: error.message });
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


//===========================================================================
app.get('/test', (req, res) => {
    if (req.user) {
        res.send(`
            <h1>✅ Usuario autenticado</h1>
            <p>ID: ${req.user.id}</p>
            <p>Nombre: ${req.user.nombre}</p>
            <p>Email: ${req.user.email}</p>
            <p>Rol: ${req.user.role_id === 1 ? 'Admin' : 'User'}</p>
            <a href="/logout">Cerrar sesión</a>
        `);
    } else {
        res.send(`
            <h1>🔐 No autenticado</h1>
            <p>Por favor, <a href="/login">inicia sesión</a>.</p>
        `);
    }
});


// ======================================
// INICIO DEL SERVIDOR
// ======================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});



