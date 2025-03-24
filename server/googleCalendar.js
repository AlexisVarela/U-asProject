const { google } = require('googleapis');
const { OAuth2 } = google.auth;

class GoogleCalendar {
  constructor(clientId, clientSecret, refreshToken) {
    this.oAuth2Client = new OAuth2(
      clientId,
      clientSecret,
      'https://developers.google.com/oauthplayground' // Agrega la redirect_uri
    );
    this.oAuth2Client.setCredentials({ refresh_token: refreshToken });

    // Configura los alcances
    this.oAuth2Client.scopes = ['https://www.googleapis.com/auth/calendar'];

    console.log("Cliente OAuth2 configurado:", this.oAuth2Client);

    this.calendar = google.calendar({ version: 'v3', auth: this.oAuth2Client });
  }

  // ✅ MÉTODO PARA CREAR EVENTO (Ahora con duración de 1 hora y ubicación fija)
  async createEvent(title, description, startTime) {
    try {
      console.log("Valor de startTime recibido:", startTime); // Verifica el valor de startTime

      // Validar que startTime sea una cadena válida
      if (typeof startTime !== 'string' || startTime.trim() === '') {
        throw new Error('El valor de startTime no es válido.');
      }

      // Convertir startTime a un objeto Date
      const start = new Date(startTime);
      if (isNaN(start.getTime())) {
        throw new Error('El valor de startTime no es una fecha válida.');
      }

      const end = new Date(start);
      end.setHours(start.getHours() + 1); // Duración fija de 1 hora

      const event = {
        summary: title,
        location: "America/Chihuahua",
        description: description,
        start: { dateTime: start.toISOString(), timeZone: "America/Chihuahua" },
        end: { dateTime: end.toISOString(), timeZone: "America/Chihuahua" },
      };

      console.log("Creando evento en Google Calendar:", event); // Verifica los datos del evento

      const res = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });

      console.log("✅ Evento creado:", res.data.htmlLink);
      return res.data.htmlLink; // Devuelve el enlace del evento
    } catch (error) {
      console.error('❌ Error al crear evento:', error.message); // Verifica el error
      throw new Error(`❌ Error al crear evento: ${error.message}`);
    }
  }

  // ✅ MÉTODO PARA VERIFICAR DISPONIBILIDAD
  async checkAvailability(timeMin, timeMax) {
    try {
      const res = await this.calendar.freebusy.query({
        resource: {
          timeMin,
          timeMax,
          timeZone: "America/Chihuahua",
          items: [{ id: "primary" }],
        },
      });

      return res.data.calendars.primary.busy;
    } catch (error) {
      throw new Error(`❌ Error al verificar disponibilidad: ${error.message}`);
    }
  }

  // ✅ MÉTODO PARA OBTENER EVENTOS (Ajustado para devolver enlaces)
  async getEvents() {
    try {
      const response = await this.calendar.events.list({
        calendarId: "primary",
        timeMin: new Date().toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: "startTime",
      });

      // Ahora devuelve el enlace del evento junto con la info
      const eventos = response.data.items.map((evento) => ({
        title: evento.summary,
        start: evento.start.dateTime || evento.start.date,
        end: evento.end.dateTime || evento.end.date,
        link: evento.htmlLink, // Enlace al evento en Google Calendar
      }));

      return eventos;
    } catch (error) {
      console.error("❌ Error al obtener eventos de Google Calendar:", error);
      throw error;
    }
  }
}

module.exports = GoogleCalendar;