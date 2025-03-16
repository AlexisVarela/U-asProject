// app.js
const express = require('express');
const app = express();
require('dotenv').config();
const path = require('path');

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

// Ruta para crear un evento
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

// Ruta para verificar disponibilidad
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

// Rutas de vistas
app.get('/', (req, res) => {
  res.render('carrucel');
});

app.get('/Citas', (req, res) => {
  res.render('Citas', { title: 'citas', cssFile: '/styles/citas.css' });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log('Servidor corriendo en el puerto', PORT);
});