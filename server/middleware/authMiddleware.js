// Middleware para verificar autenticación
module.exports = {
    isAuthenticated: (req, res, next) => {
        if (req.isAuthenticated()) return next();
        req.flash('error', '🔐 Debes iniciar sesión primero');
        return res.redirect('/login');
    },

    // Middleware para verificar rol de admin
    isAdmin: (req, res, next) => {
        if (req.isAuthenticated() && req.user.role_id === 1) return next();
        req.flash('error', '⛔ Acceso solo para administradores');
        return res.redirect('/dashboard');
    },

    // Middleware para APIs
    apiAuth: (req, res, next) => {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: 'No autorizado' });
        }
        next();
    }
};