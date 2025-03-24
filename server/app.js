// Requerimientos
const express = require('express');
const app = express();
const dotenv = require('dotenv');
const path = require("path");
const session = require('express-session'); // para sql
const bodyParser = require('body-parser');
const methodOverride = require('method-override');

// Cargar variables de entorno
dotenv.config();

//Configuración express
// Variable del puerto
const PORT = process.env.PORT || 3000;

// Configurar el motor de plantillas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
// Permisos para put y delete
app.use(methodOverride('_method')); 
// Middleware para procesar datos de los formularios
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Definición de puerto
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});


// Rutas
app.get('/', (req, res) => {
    res.render('carrucel');
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
