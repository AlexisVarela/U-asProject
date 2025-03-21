// Importar la versión de promesa de MYSQL2
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

// Configuración de la conexión a MySQL
const dbSettings = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Crear el pool de conexiones
const pool = mysql.createPool(dbSettings);

// Mensajes de prueba para verificar la conexión
console.log("🔹 Usuario:", process.env.DB_USER);
console.log("🔹 Base de datos:", process.env.DB_NAME);

// Probar conexión a la base de datos al iniciar
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log("Conectado a MySQL como:", process.env.DB_USER);
        connection.release();
    } catch (err) {
        console.error("Error al conectar a MySQL:", err);
    }
})();

// Exportar el pool de conexiones
module.exports = {pool};
