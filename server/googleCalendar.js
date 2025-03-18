// googleCalendar.js
const { google } = require('googleapis');
const { OAuth2 } = google.auth;

class GoogleCalendar {
  constructor(clientId, clientSecret, refreshToken) {
    this.oAuth2Client = new OAuth2(clientId, clientSecret);
    this.oAuth2Client.setCredentials({ refresh_token: refreshToken });
    this.calendar = google.calendar({ version: 'v3', auth: this.oAuth2Client });
  }

  async createEvent(event) {
    try {
      const res = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });
      return res.data;
    } catch (error) {
      throw new Error(`Error al crear evento: ${error.message}`);
    }
  }

  async checkAvailability(timeMin, timeMax) {
    try {
      const res = await this.calendar.freebusy.query({
        resource: {
          timeMin,
          timeMax,
          timeZone: 'America/Chihuahua',
          items: [{ id: 'primary' }],
        },
      });
      return res.data.calendars.primary.busy;
    } catch (error) {
      throw new Error(`Error al verificar disponibilidad: ${error.message}`);
    }
  }
  // CON ESTE MÉTODO SE OBTIENEN LOS EVENTOS DE GOOGLE CALENDAR
  async getEvents() {
    try {
        const response = await this.calendar.events.list({
            calendarId: 'primary', // Usar el calendario principal
            timeMin: new Date().toISOString(), // Eventos a partir de la fecha actual
            maxResults: 10, // Limitar el número de eventos
            singleEvents: true,
            orderBy: 'startTime',
        });

        // Formatear los eventos para FullCalendar
        const eventos = response.data.items.map(evento => ({
            title: evento.summary,
            start: evento.start.dateTime || evento.start.date,
            end: evento.end.dateTime || evento.end.date,
        }));

        return eventos;
    } catch (error) {
        console.error('Error al obtener eventos de Google Calendar:', error);
        throw error;
    }
}
// FIn de obtener eventos
}

module.exports = GoogleCalendar;