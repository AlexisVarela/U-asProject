// controller/config/conexionMongo.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

// Función para conectar a MongoDB
const conectarseMongo = async () => {
    try {
        const coneccion = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB conectado en: ',coneccion.connection.name);
    } catch (err) {
        console.error('Error de conexión a MongoDB:', err);
        process.exit(1); // Salir del proceso con un error
    }
};

// Exportar la función connectMongo
module.exports = { conectarseMongo };