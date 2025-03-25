// models/Comment.js
const mongoose = require('mongoose');

const UñasSchema = new mongoose.Schema({
    uña: {
        type: String,
        required: [true, 'No has agregado ningun nombre para el corte']
    },
    precio: {
        type: Number,
        required: [true, 'No has agregado ningun precio para el corte']
    },
    numero: {
        type: Number,
        required: [true, 'No has agregado ningun precio para el corte']
    }

});

const Uñas = mongoose.model('Uñas', UñasSchema);

module.exports = Uñas;