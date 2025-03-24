// models/Comment.js
const mongoose = require('mongoose');

const corteSchema = new mongoose.Schema({
    corte: {
        type: String,
        required: [true, 'No has agregado ningun nombre para el corte']
    },
    precio: {
        type: Number,
        required: [true, 'No has agregado ningun precio para el corte']
    }
});

const Corte = mongoose.model('Corte', corteSchema);

module.exports = Corte;