const express = require('express');
const app = express();
const dotenv = require('dotenv');
const path = require("path");
const session = require('express-session'); // para sql
const bodyParser = require('body-parser');
const methodOverride = require('method-override');

// Cargar variables de entorno
const bcrypt = require('bcryptjs');
const axios = require('axios'); // Para hacer solicitudes HTTP


dotenv.config();
require('dotenv').config();


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


// Permisos para put y delete
app.use(methodOverride('_method')); 
// Middleware para procesar datos de los formularios
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Para procesar JSON en las solicitudes



// Ruta para crear un evento de Google Calendar
app.post('/crear-evento', async (req, res) => {
const { summary, location, description, start, end } = req.body;

const event = {
    summary,
    location,
    description,
    start: {
    dateTime: start,
    timeZone: 'America/Chihuahua',
    },
    end: {
    dateTime: end,
    timeZone: 'America/Chihuahua',
    },
};

try {
    const result = await googleCalendar.createEvent(event);
    res.status(200).json({ message: 'Evento creado con éxito', event: result });
} catch (error) {
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

// -----------------SQL-----------------
// Configuración de la sesión
app.use(session({
    secret: process.env.SESSION_SECRET,  
    resave: false,
    saveUninitialized: true
}));


const rutas2SQL = require('./routes/rutas2SQL');
app.use('/', rutas2SQL);

// Mongoose
const {conectarseMongo} = require('./controller/config/conexionMongo'); //Para conectarse con mongo
const rutasCortes = require('./routes/rutasCortes');

// Conectar con mongo
conectarseMongo();

// Rutas para cortes
app.use('/cortes', rutasCortes);
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
