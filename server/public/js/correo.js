const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const GoogleCalendar = require('../../googleCalendar'); // Ruta corregida

// Crear instancia de Google Calendar
const googleCalendar = new GoogleCalendar(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REFRESH_TOKEN
);

// Configurar el transporte de correo
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD
    },
    tls: {
        rejectUnauthorized: false // Ignorar errores de certificados SSL
    }
});

// Función para enviar confirmación por correo electrónico
async function enviarConfirmacion(email, fecha, hora, token) {
    try {
        const confirmacionUrl = `http://localhost:3000/confirmar-cita?token=${token}`;
        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: email,
            subject: 'Confirmación de cita',
            html: `
                <p>Tu cita está programada para el ${fecha} a las ${hora}.</p>
                <p>Por favor, confirma tu asistencia haciendo clic en el siguiente botón:</p>
                <a href="${confirmacionUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; display: inline-block; border-radius: 5px;">
                    Confirmar cita
                </a>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log("✅ Correo de confirmación enviado.");
    } catch (error) {
        console.error("❌ Error al enviar el correo de confirmación:", error);
    }
}

// Función para agendar cita en Google Calendar
async function agendarCita(email, titulo, descripcion, fecha) {
    try {
        // Usar el método createEvent de GoogleCalendar
        const linkEvento = await googleCalendar.createEvent(titulo, descripcion, fecha);
        console.log("✅ Cita agendada en Google Calendar:", linkEvento);
        return linkEvento; // Devuelve el enlace del evento
    } catch (error) {
        console.error("❌ Error al agendar cita en Google Calendar:", error.message);
        throw error;
    }
}

// Exportar funciones
module.exports = { enviarConfirmacion, agendarCita };