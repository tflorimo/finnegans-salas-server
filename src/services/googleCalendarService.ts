import { calendar, oauth2Client } from "../config/googleCalendar";
import Event from "../models/event";


class GoogleCalendarService {

    /**
      * Obtiene los eventos de un calendario de Google.
      * @param calendarId  ID del calendario (ej "primary")
      * @param timeMin     Fecha/hora mínima en formato ISO 8601
      * @param timeMax     Fecha/hora máxima en formato ISO 8601
    */
    // async getEvents(calendarId: string, timeMin: string, timeMax: string) {
    //     try {
    //         //  Verifica si el access_token expiró y lo refresca automáticamente
    //         if (
    //             oauth2Client.credentials.expiry_date &&
    //             oauth2Client.credentials.expiry_date <= Date.now()
    //         ) {
    //             await oauth2Client.getAccessToken();
    //         }

    //         const response = await calendar.events.list({
    //             calendarId,
    //             timeMin,
    //             timeMax,
    //             singleEvents: true,   // instancias individuales de eventos recurrentes
    //             orderBy: "startTime", // Ordena por fecha/hora de inicio
    //             maxResults: 2500,     // limite de resultados
    //         });

    //         return response.data.items;
    //     } catch (error) {
    //         console.error("Error trayendo eventos de Google Calendar:", error);
    //         throw error;
    //     }
    // }

    /**
     * Genera la URL de autenticación OAuth2
     */
    getAuthUrl(): string {
        return oauth2Client.generateAuthUrl({
            access_type: "offline",
            scope: [
                "https://www.googleapis.com/auth/userinfo.profile",
                "https://www.googleapis.com/auth/userinfo.email",
                "https://www.googleapis.com/auth/calendar",
            ],
            prompt: "consent",
        });
    }

    /*
     * Intercambia un código de autorización por tokens de Google y actualiza las credenciales del cliente OAuth2
     */
    async getTokens(code: string) {
        try {
            const { tokens } = await oauth2Client.getToken(code);
            oauth2Client.setCredentials(tokens);
            return tokens;
        } catch (error) {
            console.error("Error obteniendo tokens:", error);
            throw error;
        }
    }
    async saveEvents(events: any[], userId: string, calendarId: string) {
        for (const event of events) {
            await Event.upsert({
                googleEventId: event.id!,
                title: event.summary || 'Sin título',
                startTime: new Date(event.start?.dateTime || (event.start?.date as string)),
                endTime: new Date(event.end?.dateTime || (event.end?.date as string)),
                roomEmail: calendarId,
                userId,
                attendees: JSON.stringify(event.attendees || []),
            });
        }
        console.log(` ${events.length} eventos guardados en BD`);
    }



}

export default new GoogleCalendarService();
