const bcrypt = require('bcryptjs');
const { pool } = require('./config/conexionbd');

// Registrar usuario

const reCAPTCHA = async (req, res) =>{
    res.render('register', { 
        title: "Registro",  
        cssFile: '/styles/LoginDB.css', 
        recaptchaSiteKey: process.env.GOOGLE_CLAVE_DE_SITIO // Pasar la clave de sitio
    });
}

const registerUser = async (req, res) => {
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
};

// Iniciar sesión
const loginUser = async (req, res) => {
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
};

// Cerrar sesión
const logoutUser = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
};

module.exports = { registerUser, loginUser, logoutUser,reCAPTCHA};

