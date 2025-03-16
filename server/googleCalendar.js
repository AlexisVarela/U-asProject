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
}

module.exports = GoogleCalendar;