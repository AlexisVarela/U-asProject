// server/middleware/authMiddleware.js
module.exports = {
    // Middleware para verificar si el usuario está logueado
    isAuthenticated: (req, res, next) => {
        if (req.isAuthenticated()) return next();
        req.flash('error', '🔐 Debes iniciar sesión primero');
        res.redirect('/login');
    },
    

    // Middleware para verificar si es ADMIN (role_id = 1)
    isAdmin: (req, res, next) => {
        if (req.isAuthenticated() && req.user.role_id === 1) return next();
        req.flash('error', '⛔ Acceso solo para administradores');
        res.redirect('/dashboard');
    }
};


