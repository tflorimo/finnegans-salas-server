import { CheckInStatus } from "../dtos/eventDTO";
import { Event } from "../models/event";
import roomService from "./roomService";
import eventService from "./eventService";
import overlapService from "./overlapService";

const TEN_MINUTES_MS = 10 * 60 * 1000;
export const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

class CheckInService {

    private getTimestamp(date: Date): number {
        return new Date(date).getTime();
    }

    private getEventTimestamps(startTime: Date, endTime: Date) {
        return {
            start: this.getTimestamp(startTime),
            end: this.getTimestamp(endTime),
            tenMinutesBefore: this.getTimestamp(startTime) - TEN_MINUTES_MS,
            fifteenMinutesAfterStart: this.getTimestamp(startTime) + FIFTEEN_MINUTES_MS
        };
    }

    private isEventInProgress(startTime: Date, endTime: Date, nowMs = Date.now()): boolean {
        const { start, end } = this.getEventTimestamps(startTime, endTime);
        return nowMs >= start && nowMs < end;
    }

    determineCheckInStatus(startTime: Date, endTime: Date, currentStatus?: CheckInStatus): CheckInStatus {
        const now = Date.now();
        const { end, fifteenMinutesAfterStart } = this.getEventTimestamps(startTime, endTime);

        if (currentStatus === CheckInStatus.CHECKED_IN) {
            return CheckInStatus.CHECKED_IN;
        }

        if (now >= end || now > fifteenMinutesAfterStart) {
            return CheckInStatus.EXPIRED;
        }

        return CheckInStatus.PENDING;
    }

    async checkInEvent(
        roomEmail: string,
        eventId: string,
        userEmail: string
    ): Promise<{ success: boolean; event?: Event | null; message?: string }> {

        const respuesta = {
            success: false,
            event: null as Event | null,
            message: 'template de mensaje'
        };

        const currentRoom = await roomService.fetchRoom(roomEmail);

        if (!currentRoom) {
            respuesta.message = 'Sala no encontrada';
            return respuesta;
        }

        const event = await eventService.getEventById(eventId);

        if (!event) {
            respuesta.message = 'Evento no encontrado';
            return respuesta;
        }

        if (event.deletedAt) {
            respuesta.message = 'Este evento ha sido eliminado';
            return respuesta;
        }

        if (event.roomEmail !== roomEmail) {
            respuesta.message = 'El evento no pertenece a esta sala';
            return respuesta;
        }

        const checkInStatus = eventService.getEventCheckInStatus(event);

        if (checkInStatus === CheckInStatus.CHECKED_IN) {
            respuesta.message = "Este evento ya tiene el check-in realizado.";
            return respuesta;
        }

        const attendeesDTO = eventService.getEventAttendees(event);

        if (attendeesDTO && !attendeesDTO.some(attendee => attendee.email === userEmail)) {
            respuesta.message = "Para poder hacer check-in, debes estar como asistente del evento!";
            return respuesta;
        }

        const startTime = eventService.getEventStartTime(event);
        const endTime = eventService.getEventEndTime(event);
        const canCheckIn = this.canCheckIn(startTime, endTime);

        if (!canCheckIn.canCheckIn) {
            respuesta.message = canCheckIn.reason || "No es posible realizar check-in en este momento.";
            return respuesta;
        }

        const overlapInfo = await overlapService.checkEventOverlapForCheckIn(
            eventId,
            roomEmail,
            event.startTime,
            event.endTime
        );

        if (overlapInfo.isOverlapping && !overlapInfo.isPrimary) {
            const eventWasModified = overlapService.wasEventTimeModified(event);

            if (eventWasModified) {
                respuesta.message =
                    `Este evento fue modificado y está superpuesto. ` +
                    `Solo puede hacerse check-in en el evento primario.`;
                return respuesta;
            }

            const primaryEvent = await eventService.getEventById(overlapInfo.primaryEventId!);
            if (primaryEvent) {
                const primaryWasModified = overlapService.wasEventTimeModified(primaryEvent);

                if (!primaryWasModified) {
                    respuesta.message =
                        `Este evento está superpuesto. ` +
                        `Solo puede hacerse check-in en el evento primario.`;
                    return respuesta;
                }

                const now = Date.now();
                const eventStart = new Date(event.startTime).getTime();

                if (now < eventStart) {
                    respuesta.message =
                        `No puedes hacer check-in antes del horario de inicio ` +
                        `del evento (${new Date(eventStart).toLocaleTimeString('es-ES',
                            { hour: '2-digit', minute: '2-digit' })}).`;
                    return respuesta;
                }

                console.log(
                    // @LOG
                    `[CheckInService] Evento ${eventId} ` +
                    `(no modificado) permitiendo check-in en overlap causado por ` +
                    `modificación del evento ${overlapInfo.primaryEventId}`
                );
            }
        }

        await eventService.updateEventCheckInStatus(eventId, CheckInStatus.CHECKED_IN);

        const now = Date.now();
        const isEventInProgress = this.isEventInProgress(startTime, endTime, now);

        await roomService.updateRoomStatus(roomEmail, eventId, isEventInProgress);
        await eventService.reloadEvent(event);

        console.log(
            // @LOG
            `[CheckInService] CheckIn de la sala ${roomEmail}` +
            `\nen el evento ${eventId} realizado con éxito por ${userEmail}`
        );

        respuesta.success = true;
        respuesta.event = event;
        respuesta.message = "Check-in realizado con éxito!";
        return respuesta;
    }

    canCheckIn(startTime: Date, endTime: Date): { canCheckIn: boolean; reason?: string } {
        const now = Date.now();
        const start = new Date(startTime).getTime();
        const end = new Date(endTime).getTime();
        const tenMinutesBefore = start - TEN_MINUTES_MS;
        const fifteenMinutesAfter = start + FIFTEEN_MINUTES_MS;

        if (now >= end) {
            return { canCheckIn: false, reason: "El evento ya ha terminado." };
        }

        if (now < tenMinutesBefore) {
            return {
                canCheckIn: false, reason: "Aún no puedes hacer check-in. Intenta 10 minutos antes del evento."
            };
        }

        if (now > fifteenMinutesAfter) {
            return {
                canCheckIn: false, reason: "El tiempo para hacer check-in ha expirado (15 min después del inicio)."
            };
        }

        return { canCheckIn: true };
    }
}

export default new CheckInService();