const bcrypt = require('bcryptjs');
const { pool } = require('./config/conexionbd');
const passport = require('passport'); // Añadir esta línea

// Registrar usuario (reCAPTCHA se mantiene igual)
const reCAPTCHA = async (req, res) => {
    res.render('register', { 
        title: "Registro",  
        cssFile: '/styles/LoginDB.css', 
        recaptchaSiteKey: process.env.GOOGLE_CLAVE_DE_SITIO
    });
};

// Registro con Passport (adaptado para incluir reCAPTCHA si es necesario)
const registerUser = async (req, res, next) => {
    const { nombre, email, password, role_id } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const connection = await pool.getConnection();
        await connection.query(
            'INSERT INTO usuarios (nombre, email, password, role_id) VALUES (?, ?, ?, ?)',
            [nombre, email, hashedPassword, role_id] // 2 = Rol de usuario por defecto
        );
        connection.release();
        
        // Redirigir al login tras registro exitoso
        res.redirect('/login');
    } catch (err) {
        console.error('Error en el registro:', err);
        res.redirect('/register');
    }
};

// Login y Logout (ahora manejados por Passport directamente)
const loginUser = passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true // Requiere connect-flash
});

const logoutUser = (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
};

module.exports = { registerUser, loginUser, logoutUser, reCAPTCHA };