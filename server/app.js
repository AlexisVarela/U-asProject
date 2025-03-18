// Requerimientos
const express = require('express');
const app = express();
const env = require('dotenv').config();
const path = require("path");
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const session = require('express-session');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


app.use(session({
    secret: process.env.SESSION_SECRET,  
    resave: false,
    saveUninitialized: true
}));


const PORT = process.env.PORT || 3000 ;

//Configurar el motor de plantillas los htmls y archivos ejs.
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
// Para que busque los archivos estaticos en la carpeta public
app.use(express.static(path.join(__dirname, 'public')));


// Definición de puerto
app.listen(PORT, () => {
    console.log('Servidor corriendo en http://localhost:3000');
});

// Rutas
app.get('/', (req, res)=>{
    // res.sendFile(path.join(__dirname, 'views', 'principal.html'));;
    res.render('carrucel');
});

//BASE DE DATOS ERIC
app.get('/register', (req, res) => {
    res.render('register', { titulo: "Registro" });
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
    res.render('login', { titulo: "Iniciar Sesión" });
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
app.use(bodyParser.urlencoded({ extended: true }));

// Crear la conexión a MySQL usando las variables de entorno
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Conectar a la base de datos
db.connect(err => {
    if (err) {
        console.error('Error al conectar a MySQL:', err);
        return;
    }
    console.log('Conectado a MySQL');
});

// TERMINO ERIC
