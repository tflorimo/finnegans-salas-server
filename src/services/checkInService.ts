import { CheckInStatus } from "../dtos/eventDTO";
import roomService from "./roomService";
import eventService from "./eventService";
import overlapService from "./overlapService";
import { auditService } from './auditService';
import {
    CheckInErrorCode,
    CHECK_IN_ERROR_MESSAGES,
    CheckInResult,
} from "../constants/checkInErrors";
import { Room } from "../models";

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
    ): Promise<CheckInResult> {

        // setea auditEventId si es posible
        let auditEventId: number | null = Number.isFinite(Number(eventId)) ? Number(eventId) : null;

        const currentRoom = await roomService.fetchRoom(roomEmail);

        if (!currentRoom) {

            //Auditoria de checkin fallido - sala no encontrada
            await auditService.recordCheckinFailed(userEmail ?? null, eventId, String(CheckInErrorCode.ROOM_NOT_FOUND)).catch(() => { });
            return {
                success: false,
                errorCode: CheckInErrorCode.ROOM_NOT_FOUND,
                message: CHECK_IN_ERROR_MESSAGES[CheckInErrorCode.ROOM_NOT_FOUND]
            };
        }

        const event = await eventService.getEventById(eventId);

        if (!event) {

            //Auditoria de checkin fallido - evento no encontrado
            await auditService.recordCheckinFailed(userEmail ?? null, eventId, String(CheckInErrorCode.EVENT_NOT_FOUND)).catch(() => { });
            return {
                success: false,
                errorCode: CheckInErrorCode.EVENT_NOT_FOUND,
                message: CHECK_IN_ERROR_MESSAGES[CheckInErrorCode.EVENT_NOT_FOUND]
            };
        }

        // setea auditEventId si es posible
        if (event && typeof (event as any).id !== 'undefined') {
            const maybeId = (event as any).id;
            const asNum = typeof maybeId === 'number' ? maybeId : Number(maybeId);
            auditEventId = Number.isFinite(asNum) ? asNum : auditEventId;
        }

        if (event.deletedAt) {

            //Auditoria de checkin fallido - evento eliminado
            await auditService.recordCheckinFailed(userEmail ?? null, eventId, String(CheckInErrorCode.EVENT_DELETED)).catch(() => { });
            return {
                success: false,
                errorCode: CheckInErrorCode.EVENT_DELETED,
                message: CHECK_IN_ERROR_MESSAGES[CheckInErrorCode.EVENT_DELETED]
            };
        }

        if (event.roomEmail !== roomEmail) {

            //Auditoria de checkin fallido - evento en sala incorrecta
            await auditService.recordCheckinFailed(userEmail ?? null, eventId, String(CheckInErrorCode.EVENT_WRONG_ROOM)).catch(() => { });
            return {
                success: false,
                errorCode: CheckInErrorCode.EVENT_WRONG_ROOM,
                message: CHECK_IN_ERROR_MESSAGES[CheckInErrorCode.EVENT_WRONG_ROOM]
            };
        }

        const checkInStatus = eventService.getEventCheckInStatus(event);

        if (checkInStatus === CheckInStatus.CHECKED_IN) {

            //Auditoria de checkin fallido - ya registrado
            await auditService.recordCheckinFailed(userEmail ?? null, eventId, String(CheckInErrorCode.ALREADY_CHECKED_IN)).catch(() => { });
            return {
                success: false,
                errorCode: CheckInErrorCode.ALREADY_CHECKED_IN,
                message: CHECK_IN_ERROR_MESSAGES[CheckInErrorCode.ALREADY_CHECKED_IN]
            };
        }

        const attendeesDTO = eventService.getEventAttendees(event);

        if (attendeesDTO && !attendeesDTO.some(attendee => attendee.email === userEmail)) {
            //Auditoria de checkin fallido - usuario no es asistente
            await auditService.recordCheckinFailed(userEmail ?? null, eventId, String(CheckInErrorCode.NOT_ATTENDEE)).catch(() => { });
            return {
                success: false,
                errorCode: CheckInErrorCode.NOT_ATTENDEE,
                message: CHECK_IN_ERROR_MESSAGES[CheckInErrorCode.NOT_ATTENDEE]
            };
        }

        const startTime = eventService.getEventStartTime(event);
        const endTime = eventService.getEventEndTime(event);
        const canCheckIn = this.canCheckIn(startTime, endTime);

        if (!canCheckIn.canCheckIn) {
            const errorCode = canCheckIn.errorCode || CheckInErrorCode.UNKNOWN_ERROR;
            const reason = String(errorCode);
            await auditService.recordCheckinFailed(userEmail ?? null, eventId, reason).catch(() => { });
            return {
                success: false,
                errorCode,
                message: CHECK_IN_ERROR_MESSAGES[errorCode]
            };
        }

        // Lógica de overlap para check-in
        const overlapInfo = await overlapService.checkEventOverlapForCheckIn(
            eventId,
            roomEmail,
            event.startTime,
            event.endTime
        );

        if (overlapInfo.isOverlapping && !overlapInfo.isPrimary) {
            const eventWasModified = overlapService.wasEventTimeModified(event);

            if (eventWasModified) {
                // Auditoria de checkin fallido - evento modificado con overlap
                await auditService.recordCheckinFailed(userEmail ?? null, eventId, String(CheckInErrorCode.EVENT_MODIFIED_OVERLAPPED)).catch(() => { });
                return {
                    success: false,
                    errorCode: CheckInErrorCode.EVENT_MODIFIED_OVERLAPPED,
                    message: CHECK_IN_ERROR_MESSAGES[CheckInErrorCode.EVENT_MODIFIED_OVERLAPPED]
                };
            }

            const primaryEvent = await eventService.getEventById(overlapInfo.primaryEventId!);
            if (primaryEvent) {
                const primaryWasModified = overlapService.wasEventTimeModified(primaryEvent);

                if (!primaryWasModified) {
                    // Auditoria de checkin fallido - evento con overlap de prioridad
                    await auditService.recordCheckinFailed(userEmail ?? null, eventId, String(CheckInErrorCode.EVENT_OVERLAPPED)).catch(() => { }); // LOG de auditoria
                    return {
                        success: false,
                        errorCode: CheckInErrorCode.EVENT_OVERLAPPED,
                        message: CHECK_IN_ERROR_MESSAGES[CheckInErrorCode.EVENT_OVERLAPPED]
                    };
                }

                const now = Date.now();
                const eventStart = new Date(event.startTime).getTime();

                if (now < eventStart) {
                    console.log(
                        `► [CheckInService] Evento con prioridad por overlap, ` +
                        `pero aún no comenzó, se habilitará el check-in` +
                        `\n  en su lapso correspondiente para:` +
                        `\n  id del evento: ${eventId}` +
                        `\n  estado: no modificado` +
                        `\n  razón: prioridad por modificación del evento primario` +
                        `\n  id evento primario: ${overlapInfo.primaryEventId}`
                    );

                    return {
                        success: false,
                        errorCode: CheckInErrorCode.EVENT_NOT_STARTED,
                        message: `${CHECK_IN_ERROR_MESSAGES[CheckInErrorCode.EVENT_NOT_STARTED]} ` +
                            `(${new Date(eventStart).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })})`
                    };
                }
            }
        }

        // Check-in exitoso
        await eventService.updateEventCheckInStatus(eventId, CheckInStatus.CHECKED_IN);

        // Auditoria de checkin exitoso
        await auditService.recordCheckin(userEmail ?? null, eventId).catch(() => { });

        const now = Date.now();
        const isEventInProgress = this.isEventInProgress(startTime, endTime, now);

        await roomService.updateRoomStatus(roomEmail, eventId, isEventInProgress);
        const updatedEvent = await eventService.getEventById(eventId);

        console.log(
            `► [CheckInService] Check-in realizado con éxito:` +
            `\n  id evento: ${eventId}` +
            `\n  Realizado por: ${userEmail}` +
            `\n  acción: checkInStatus actualizado a CHECKED_IN`
        );

        return {
            success: true,
            event: updatedEvent ?? event,
            message: "Check-in realizado con éxito"
        };
    }

    canCheckIn(startTime: Date, endTime: Date): { canCheckIn: boolean; errorCode?: CheckInErrorCode } {
        const now = Date.now();
        const {
            end,
            tenMinutesBefore,
            fifteenMinutesAfterStart,
        } = this.getEventTimestamps(startTime, endTime);

        if (now >= end) {
            return {
                canCheckIn: false,
                errorCode: CheckInErrorCode.EVENT_ENDED
            };
        }

        if (now < tenMinutesBefore) {
            return {
                canCheckIn: false,
                errorCode: CheckInErrorCode.TOO_EARLY
            };
        }

        if (now > fifteenMinutesAfterStart) {
            return {
                canCheckIn: false,
                errorCode: CheckInErrorCode.CHECK_IN_EXPIRED
            };
        }

        return { canCheckIn: true };
    }

    async processCheckInEventsStatuses(room: Room): Promise<void> {
        const events = await eventService.getEventsByRoomId(room.email);

        for (const event of events) {
            const newStatus = this.determineCheckInStatus(
                event.startTime,
                event.endTime,
                event.checkInStatus
            );

            if (newStatus !== event.checkInStatus) {
                await eventService.updateEventCheckInStatus(event.id, newStatus);

                if (newStatus === CheckInStatus.EXPIRED) {

                    console.log(
                        `► [CheckInService] Check-in expirado del evento:` +
                        `\n  id evento: ${event.id}` +
                        `\n  nombre evento: ${event.title || "Sin nombre"}` +
                        `\n  acción: checkInStatus actualizado a ${newStatus}`
                    );
                }
            }
        }
    }
}

export default new CheckInService();