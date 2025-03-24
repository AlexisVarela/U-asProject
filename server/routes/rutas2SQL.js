const express = require('express');
const router = express.Router();
const { registerUser, loginUser, logoutUser, reCAPTCHA } = require('../controller/loginController');

// Rutas
router.get('/register', reCAPTCHA);
router.post('/register', registerUser);
router.get('/login', (req, res) => res.render('login', { titulo: "Iniciar Sesión" }));
router.post('/login', loginUser);
router.get('/logout', logoutUser);

module.exports = router;
