const express = require('express');
const app = express();
const dotenv = require('dotenv');
const path = require("path");
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const { pool } = require('./controller/config/conexionbd');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { google } = require('googleapis');
const analytics = google.analyticsreporting('v4');
const GoogleCalendar = require('./googleCalendar.js');

// Configuración inicial
dotenv.config();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
}));

// Configuración del motor de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

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
// RUTAS DE AUTENTICACIÓN (Eric)
// ======================================

app.get('/register', (req, res) => {
    res.render('register', { 
        title: "Registro",  
        cssFile: '/styles/LoginDB.css', 
        recaptchaSiteKey: process.env.GOOGLE_CLAVE_DE_SITIO
    });
});

app.post('/register', async (req, res) => {
    const { 'g-recaptcha-response': recaptchaResponse, nombre, email, password } = req.body;

    if (!recaptchaResponse) {
        return res.status(400).json({ error: 'Por favor, completa el reCAPTCHA.' });
    }

    try {
        // Verificar reCAPTCHA
        const { data } = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
            params: {
                secret: process.env.GOOGLE_CLAVE_SECRETA,
                response: recaptchaResponse
            }
        });

        if (!data.success) {
            return res.status(400).json({ error: 'Error en la verificación de reCAPTCHA.' });
        }

        // Hash de la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insertar en la base de datos
        const connection = await pool.getConnection();
        await connection.query(
            'INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)', 
            [nombre, email, hashedPassword]
        );
        connection.release();

        res.status(200).json({ success: true, redirect: '/login' });
    } catch (error) {
        console.error('Error en el registro:', error);
        res.status(500).json({ error: 'Error al registrar usuario.' });
    }
});

app.get('/login', (req, res) => {
    res.render('login', { titulo: "Iniciar Sesión", cssFile: '/styles/LoginDB.css' });
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const connection = await pool.getConnection();
        const [results] = await connection.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        connection.release();

        if (results.length === 0) {
            return res.send('Usuario no encontrado');
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            return res.send('Contraseña incorrecta');
        }

        req.session.user = user;
        res.redirect('/');
    } catch (err) {
        console.error('Error en el login:', err);
        res.send('Error en el login');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
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