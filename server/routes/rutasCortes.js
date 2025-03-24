const express = require('express');
const router = express.Router();
const { getCortes, addCorte, updateCorte, deleteCorte } = require('../controller/corteController');

// Rutas CRUD
router.get('/', getCortes); // Listar cortes
router.post('/addCorte', addCorte); // Agregar nuevo corte
router.post('/editCorte/:id', updateCorte); // Editar un corte
router.post('/deleteCorte/:id', deleteCorte); // Eliminar un corte

module.exports = router;
