// Requerimientos
const express = require('express');
const app = express();
const env = require('dotenv').config();
const path = require("path");

// Variables que tienen que ver 
const PORT = process.env.PORT || 3000 ;

//Configurar el motor de plantillas los htmls y archivos ejs.
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
// Para que busque los archivos estaticos en la carpeta public
app.use(express.static(path.join(__dirname, 'public')));



// Definición de puerto
app.listen(PORT, () => {
    console.log(`Ya jalo TU, http://localhost:${PORT}`);
});

// Rutas
app.get('/', (req, res)=>{
    res.render('carrucel');
});

app.get('/formulario', (req, res)=>{
    res.render('formulario');
});