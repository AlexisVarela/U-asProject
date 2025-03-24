const Corte = require('../models/modelCortes'); // Importar el modelo de los cortes

// Obtener todos los cortes
const getCortes = async (req, res) => {
    try {
        const cortes = await Corte.find();
        res.render('cortes', { title: 'Lista de Cortes', cortes }); // Aqui lo renderice
    } catch (err) {
        console.error(err);
        res.status(500).send("Error al obtener los cortes");
    }
};

// Agregar un nuevo corte
const addCorte = async (req, res) => {
    try {
        const { corte, precio } = req.body;
        const nuevoCorte = new Corte({ corte, precio });
        await nuevoCorte.save();
        res.redirect('/cortes'); // Redirige a la lista de cortes
    } catch (err) {
        console.error(err);
        res.status(400).send("Error al agregar el corte");
    }
};

// Editar un corte existente
const updateCorte = async (req, res) => {
    try {
        const { id } = req.params;
        const { corte, precio } = req.body;
        await Corte.findByIdAndUpdate(id, { corte, precio });
        res.redirect('/cortes');
    } catch (err) {
        console.error(err);
        res.status(400).send("Error al actualizar el corte");
    }
};

// Eliminar un corte
const deleteCorte = async (req, res) => {
    try {
        const { id } = req.params;
        await Corte.findByIdAndDelete(id);
        res.redirect('/cortes');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error al eliminar el corte");
    }
};

module.exports = { getCortes, addCorte, updateCorte, deleteCorte };
