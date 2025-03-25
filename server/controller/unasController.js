const Uñas = require('../models/modelUnas'); // Importar el modelo de los uñas

// Obtener todos los uñas
const getUnas = async (req, res) => {
    try {
        const uñas = await Uñas.find();
        res.render('unasVista', { title: 'Lista de Uñas', uñas}); // Aqui lo renderice
    } catch (err) {
        console.error(err);
        res.status(500).send("Error al obtener los Uñas");
    }
};

// Agregar un nuevo uña
const addUnas = async (req, res) => {
    try {
        const { uña, precio, numero } = req.body; // Obtiene los datos de los formularios de la vista
        const nuevoUña = new Uñas({ uña, precio, numero });
        // console.log(nuevoUña);
        await nuevoUña.save();
        res.redirect('/unasVista'); // Redirige a la lista de uñas
    } catch (err) {
        console.error(err);
        res.status(400).send("Error al agregar el uña");
    }
};

// Editar un uñas existente
const updateUnas = async (req, res) => {
    try {
        const { id } = req.params;
        const { uña, precio, numero } = req.body;
        await Uñas.findByIdAndUpdate(id, {uña, precio, numero });
        res.redirect('/unasVista');
    } catch (err) {
        console.error(err);
        res.status(400).send("Error al actualizar el uña");
    }
};

// Eliminar un uñas
const deleteUnas = async (req, res) => {
    try {
        const { id } = req.params;
        await Uñas.findByIdAndDelete(id);
        res.redirect('/unasVista');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error al eliminar el uñas");
    }
};

module.exports = { getUnas, addUnas, updateUnas, deleteUnas };
