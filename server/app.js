const express = require('express');
const app = express();
const dotenv = require('dotenv');
const path = require("path");
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const { pool } = require('./controller/config/conexionbd');
const citasPendientes = new Map(); // Almacena citas pendientes de confirmación
const { v4: uuidv4 } = require('uuid');
const { getAnalyticsUsers } = require('./public/js/analytics'); // Importa la función desde analytics.js

// Cargar las variables de entorno
dotenv.config();  // Esto cargará las variables del archivo .env

// Middleware para parsear cuerpos JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas aquí...

const axios = require('axios'); // Para hacer solicitudes HTTP


const { google } = require('googleapis');
const analytics = google.analyticsreporting('v4'); // Usamos la API de Reporting v4

// Configura la autenticación
const authClient = new google.auth.JWT({
    email: process.env.CORREO_ANALYTICS, // Correo de la cuenta de servicio
    key: process.env.ID_ANALYTICS.replace(/\\n/g, '\n'), // Clave privada (reemplaza \\n por \n)
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
});


// Ruta para obtener los datos de usuarios desde Google Analytics
// Ruta para obtener los datos de usuarios desde Google Analytics
app.get('/obtener-usuarios-analytics', async (req, res) => {
    try {
        const data = await getAnalyticsUsers();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// API DE ANALITYCS
// Ruta para registrar clics en las tarjetas
// Esta ruta podría ser llamada desde el frontend al hacer clic en una tarjeta
app.post('/track-click', (req, res) => {
    const { title } = req.body;

    // Aquí puedes almacenar el clic en una base de datos o en memoria
    // Por ejemplo, podrías usar un Map para almacenar los clics temporalmente
    if (!clicksMap.has(title)) {
        clicksMap.set(title, 1);
    } else {
        clicksMap.set(title, clicksMap.get(title) + 1);
    }

    res.json({ success: true, title });
});

// Variable para almacenar los clics (puedes usar una base de datos en su lugar)
const clicksMap = new Map();
// Ruta para obtener los datos de clics
app.get('/get-clicks', (req, res) => {
    const clicksData = Array.from(clicksMap).map(([title, count]) => ({ title, count }));
    res.json(clicksData);
});




// Variable para almacenar los clics (puedes usar una base de datos en su lugar)


// Variable global para almacenar los clics
const clicsPorTarjeta = {};

// Ruta para registrar clics
app.post('/registrar-clic', (req, res) => {
    const { cardTitle } = req.body;

    if (!clicsPorTarjeta[cardTitle]) {
        clicsPorTarjeta[cardTitle] = 1;
    } else {
        clicsPorTarjeta[cardTitle]++;
    }

    res.json({ success: true, cardTitle, count: clicsPorTarjeta[cardTitle] });
});


// Ruta para obtener los datos de clics
app.get('/obtener-clics', (req, res) => {
    res.json(clicsPorTarjeta);
});







// Importar Twilio
const { enviarConfirmacion, agendarCita } = require("./public/js/correo"); // Importar funciones de correo
// Fin de Importar Twilio

// Ruta para agendar cita y enviar confirmación por Wcorreo
app.post('/agendar-cita', async (req, res) => {
    const { email, titulo, descripcion, fecha } = req.body;

    // Validar el correo electrónico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Correo electrónico inválido." });
    }

    try {
        const token = uuidv4(); // Generar un token único
        const hora = fecha.split('T')[1].slice(0, 5); // Extrae la hora (HH:MM)

        // Guardar la cita pendiente de confirmación
        citasPendientes.set(token, { email, titulo, descripcion, fecha });

        // Enviar correo de confirmación
        await enviarConfirmacion(email, fecha.split('T')[0], hora, token);

        res.status(200).json({ mensaje: "✅ Correo de confirmación enviado. Por favor, revisa tu correo." });
    } catch (error) {
        console.error("❌ Error al agendar la cita:", error);
        res.status(500).json({ error: error.message });
    }
});
// Fin de ruta de agendar cita y enviar confirmación por correo

app.get('/confirmar-cita', async (req, res) => {
    const { token } = req.query;

    if (!token || !citasPendientes.has(token)) {
        return res.status(400).send("Token inválido o cita no encontrada.");
    }

    try {
        const cita = citasPendientes.get(token);
        const { email, titulo, descripcion, fecha } = cita;

        // Agendar la cita en Google Calendar
        await agendarCita(email, titulo, descripcion, fecha);

        // Eliminar la cita pendiente de confirmación
        citasPendientes.delete(token);

        res.send("✅ Cita confirmada y agendada correctamente.");
    } catch (error) {
        console.error("❌ Error al confirmar la cita:", error);
        res.status(500).send("Error al confirmar la cita.");
    }
});
// Ruta para mostrar el formulario de agendar cita
app.get('/agendar-cita', (req, res) => {
    res.render('agendar-cita', { title: 'Agendar Cita', cssFile: '/styles/agendar.css' });
  });
// Fin de ruta de mostrar el formulario de agendar cita  




dotenv.config();
require('dotenv').config();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuración de la sesión
app.use(session({
    secret: process.env.SESSION_SECRET,  
    resave: false,
    saveUninitialized: true
}));

// Configurar el motor de plantillas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

//Cositas de google calendar
const GoogleCalendar = require('./googleCalendar.js');
const googleCalendar = new GoogleCalendar(
process.env.GOOGLE_CLIENT_ID,
process.env.GOOGLE_CLIENT_SECRET,
process.env.GOOGLE_REFRESH_TOKEN
);

// Configurar el servidor
const PORT = process.env.PORT || 3000;
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); // Para procesar JSON en las solicitudes


// Ruta para crear un evento de Google Calendar
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

// Ruta para verificar disponibilidad de Google Calendar
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

// Ruta para obtener eventos de Google Calendar
app.get('/obtener-eventos', async (req, res) => {
    try {
        const eventos = await googleCalendar.getEvents(); // Método para obtener eventos
        res.status(200).json(eventos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Rutas de vistas ----------------------------------------------------------------------
app.get('/', (req, res) => {
res.render('carrucel');
});

app.get('/Citas', (req, res) => {
res.render('Citas', { title: 'citas', cssFile: '/styles/citas.css' });
});
// Fin de Rutas de vistas ----------------------------------------------------------------

app.get('/register', (req, res) => {
    res.render('register', { 
        title: "Registro",  
        cssFile: '/styles/LoginDB.css', 
        recaptchaSiteKey: process.env.GOOGLE_CLAVE_DE_SITIO // Pasar la clave de sitio
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
// Ruta para mostrar el formulario de login
app.get('/login', (req, res) => {
    res.render('login', { titulo: "Iniciar Sesión", cssFile: '/styles/LoginDB.css' });
});

// Ruta para procesar el login
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

        // Verificar contraseña
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


// Ruta para cerrar sesión
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// Middleware para procesar formularios
app.use(bodyParser.urlencoded({ extended: true }));

// AQUI COMIENZA EL DASHBOARD
app.get('/dashboard', (req, res) => {
    res.render('dashboard', { titulo: "Dashboard", cssFile: '/styles/dashboard.css' });
});

app.get('/EstiloCabello', (req, res) => {
    res.render('EstiloCabello', { title: 'Cortes de Cabello', cssFile: '/styles/Estilos.css' });
});

app.get('/EstiloUnas', (req, res) => {
    res.render('EstiloUnas', { title: 'Estilos de Uñas', cssFile: '/styles/Estilos.css' });
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});