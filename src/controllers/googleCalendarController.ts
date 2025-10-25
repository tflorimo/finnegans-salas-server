import { Response } from 'express';
import googleCalendarService from '../services/googleCalendarService';
import { hasValidTokens } from '../config/googleCalendar';
import { AuthRequest } from "../middleware/auth";

const googleCalendarController = {
  /**
   * Obtiene eventos de Google Calendar y, si se indica, los guarda en la BD.
   * Requiere que la ruta esté protegida con el middleware `authenticate`
   * para que `req.user` contenga el usuario autenticado.
   */
  // async getEvents(req: AuthRequest, res: Response) {
  //   try {
  //     if (!hasValidTokens()) {
  //       return res.status(401).json({
  //         error: 'No autenticado con Google',
  //       });
  //     }

  //     const calendarId = String(req.query.calendarId);
  //     const now = new Date();

  //     const timeMin = String( // valor por defecto: 30 dias atras
  //       req.query.timeMin || 
  //       new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 dias en milisegundos
  //     );
  //     const timeMax = String(
  //       req.query.timeMax ||
  //       new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 dias en milisegundos
  //     );


  //     const events = await googleCalendarService.getEvents(calendarId, timeMin, timeMax);

  //     // Guarda en BD si se solicita con ?save=true
  //     if (req.query.save === 'true' && events) {
  //       const userId = req.user?.id ? String(req.user.id) : '1';
  //       await googleCalendarService.saveEvents(events, userId, calendarId);
  //     }

  //     res.json({
  //       success: true,
  //       count: events?.length || 0,
  //       events: events || [],
  //     });
  //   } catch (error: any) {
  //     console.error('Error en getEvents:', error);
  //     res.status(500).json({
  //       error: 'Error al obtener eventos',
  //       details: error.message,
  //     });
  //   }
  // },
};


export default googleCalendarController;
