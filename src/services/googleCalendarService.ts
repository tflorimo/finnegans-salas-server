// src/services/googleCalendarService.ts
import { calendar, oauth2Client } from "../config/googleCalendar";


class GoogleCalendarService {

/**
    Obtiene los eventos de un calendario de Google.
    @param calendarId  ID del calendario (por ejemplo "primary").
    @param timeMin     Fecha/hora mínima en formato ISO 8601.
    @param timeMax     Fecha/hora máxima en formato ISO 8601.
*/

    async getEvents(calendarId: string, timeMin: string, timeMax: string) {
        try {
            //  Verifica si el access_token expiró y lo refresca automáticamente
            if (
                oauth2Client.credentials.expiry_date &&
                oauth2Client.credentials.expiry_date <= Date.now()
            ) {
                await oauth2Client.getAccessToken(); // Método recomendado, reemplaza refreshAccessToken()
            }

            const response = await calendar.events.list({
                calendarId,
                timeMin,
                timeMax,
                singleEvents: true,   // Devuelve instancias individuales de eventos recurrentes
                orderBy: "startTime", // Ordena por fecha/hora de inicio
                maxResults: 2500,     // Límite máximo de resultados
            });

            return response.data.items;
        } catch (error) {
            console.error("Error fetching events from Google Calendar:", error);
            throw error;
        }
    }


    /*
    * Genera la URL de autenticación OAuth2.
    * Útil si quieres iniciar el flujo de autenticación fuera del controlador principal.
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
      Intercambia un código de autorización por tokens de Google
      y actualiza las credenciales del cliente OAuth2.
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
}

// Exporta una instancia única del servicio
export default new GoogleCalendarService();
