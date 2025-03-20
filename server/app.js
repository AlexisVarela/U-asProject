// Requerimientos
const express = require('express');
const app = express();
const dotenv = require('dotenv');
const path = require("path");
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const { pool } = require('./controller/config/conexionbd');



// Cargar variables de entorno
dotenv.config();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuración de la sesión
app.use(session({
    secret: process.env.SESSION_SECRET,  
    resave: false,
    saveUninitialized: true
}));

const PORT = process.env.PORT || 3000;

// Configurar el motor de plantillas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Definición de puerto
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});


// Rutas
app.get('/', (req, res) => {
    res.render('carrucel');
});

app.get('/paginaCualquiera', (req, res) => {
    res.render('formulario');
});

app.get('/register', (req, res) => {
    res.render('register', { titulo: "Registro" });
});

// Ruta para procesar el registro
app.post('/register', async (req, res) => {
    const { nombre, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const connection = await pool.getConnection();
        await connection.query('INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)', 
            [nombre, email, hashedPassword]);
        connection.release(); // Liberar conexión del pool

        res.redirect('/login');
    } catch (err) {
        console.error('Error en el registro:', err);
        res.send('Error al registrar usuario');
    }
});

// Ruta para mostrar el formulario de login
app.get('/login', (req, res) => {
    res.render('login', { titulo: "Iniciar Sesión" });
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
