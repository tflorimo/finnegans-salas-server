import { calendar, oauth2Client } from "../config/googleCalendar";
import Event from "../models/event";


class GoogleCalendarService {
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

}

export default new GoogleCalendarService();
