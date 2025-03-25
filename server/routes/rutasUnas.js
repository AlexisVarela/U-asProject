const express = require('express');
const router = express.Router();
const { getUnas, addUnas, updateUnas, deleteUnas } = require('../controller/unasController');

// Rutas CRUD
router.get('/', getUnas); // Listar Uñas
router.post('/addUnas', addUnas); // Agregar nuevo Uñas
router.post('/editUnas/:id', updateUnas); // Editar un Uñas
router.post('/deleteUnas/:id', deleteUnas); // Eliminar un Uñas

module.exports = router;
