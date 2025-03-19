// app.js
const express = require('express');
const app = express();
require('dotenv').config();
const path = require('path');
const axios = require('axios'); // Para hacer solicitudes HTTP
const bcrypt = require('bcrypt'); // bcrypt para hashear contraseñas


// COSAS DEL ERIC   ---------------------------------------------------------------------





// FIN COSAS DEL ERIC   ---------------------------------------------------------------------


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


//BASE DE DATOS ERIC
app.get('/register', (req, res) => {
    res.render('register', { titulo: "Registro",  cssFile: '/styles/LoginDB.css', 
        recaptchaSiteKey: process.env.GOOGLE_CLAVE_DE_SITIO // Pasar la clave al frontend
        
    });
    
});
// Ruta para manejar el envío del formulario (POST /register)
app.post('/register', async (req, res) => {
    const { 'g-recaptcha-response': recaptchaResponse, nombre, email, password } = req.body;

    // Verificar si el usuario completó el reCAPTCHA
    if (!recaptchaResponse) {
        return res.status(400).json({ error: 'Por favor, completa el reCAPTCHA.' });
    }

    try {
        // Verificar reCAPTCHA con Google
        const response = await axios.post(
            `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.GOOGLE_CLAVE_SECRETA}&response=${recaptchaResponse}`
        );

        const { success } = response.data;

        if (success) {
            // reCAPTCHA válido, procesar el formulario
            const hashedPassword = await bcrypt.hash(password, 10); // Hashear la contraseña

            // Insertar el usuario en la base de datos
            db.query(
                'INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)',
                [nombre, email, hashedPassword],
                (err, result) => {
                    if (err) {
                        console.error('Error en el registro:', err);
                        return res.status(500).json({ error: 'Error al registrar usuario.' });
                    }
                    res.json({ message: 'Registro exitoso.' });
                }
            );
        } else {
            // reCAPTCHA inválido
            res.status(400).json({ error: 'Error en la verificación de reCAPTCHA.' });
        }
    } catch (error) {
        console.error('Error al verificar reCAPTCHA:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// Ruta para procesar el registro

app.post('/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    db.query('INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)',
        [nombre, email, hashedPassword], (err, result) => {
            if (err) {
                console.error('Error en el registro:', err);
                return res.send('Error al registrar usuario');
            }
            res.redirect('/login');
        });
});

// Ruta para mostrar el formulario de login
app.get('/login', (req, res) => {
    res.render('login', { titulo: "Iniciar Sesión", cssFile: '/styles/LoginDB.css' });
});



// Ruta para procesar el login
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    db.query('SELECT * FROM usuarios WHERE email = ?', [email], async (err, results) => {
        if (err || results.length === 0) {
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
    });
});


// Ruta para cerrar sesión
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// Middleware para procesar formularios

// Crear la conexión a MySQL usando las variables de entorno


// Conectar a la base de datos

// TERMINO ERIC










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
  console.log('Servidor corriendo en el puerto', PORT);
});