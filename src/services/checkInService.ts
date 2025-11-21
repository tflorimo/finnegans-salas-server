import { CheckInStatus } from "../dtos/eventDTO";
import roomService from "./roomService";
import eventService from "./eventService";
import overlapService from "./overlapService";
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
        const { end, fifteenMinutesAfterStart, tenMinutesBefore } = this.getEventTimestamps(startTime, endTime);

        if (currentStatus === CheckInStatus.CHECKED_IN) {

            if (now < tenMinutesBefore) {
                return CheckInStatus.PENDING;
            } else {
                return CheckInStatus.CHECKED_IN;
            }
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

        const currentRoom = await roomService.fetchRoom(roomEmail);

        if (!currentRoom) {
            return {
                success: false,
                errorCode: CheckInErrorCode.ROOM_NOT_FOUND,
                message: CHECK_IN_ERROR_MESSAGES[CheckInErrorCode.ROOM_NOT_FOUND]
            };
        }

        const event = await eventService.getEventById(eventId);

        if (!event) {
            return {
                success: false,
                errorCode: CheckInErrorCode.EVENT_NOT_FOUND,
                message: CHECK_IN_ERROR_MESSAGES[CheckInErrorCode.EVENT_NOT_FOUND]
            };
        }

        if (event.deletedAt) {
            return {
                success: false,
                errorCode: CheckInErrorCode.EVENT_DELETED,
                message: CHECK_IN_ERROR_MESSAGES[CheckInErrorCode.EVENT_DELETED]
            };
        }

        if (event.roomEmail !== roomEmail) {
            return {
                success: false,
                errorCode: CheckInErrorCode.EVENT_WRONG_ROOM,
                message: CHECK_IN_ERROR_MESSAGES[CheckInErrorCode.EVENT_WRONG_ROOM]
            };
        }

        const checkInStatus = eventService.getEventCheckInStatus(event);

        if (checkInStatus === CheckInStatus.CHECKED_IN) {
            return {
                success: false,
                errorCode: CheckInErrorCode.ALREADY_CHECKED_IN,
                message: CHECK_IN_ERROR_MESSAGES[CheckInErrorCode.ALREADY_CHECKED_IN]
            };
        }

        const attendeesDTO = eventService.getEventAttendees(event);

        if (attendeesDTO && !attendeesDTO.some(attendee => attendee.email === userEmail)) {
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

        const now = Date.now();
        const isEventInProgress = this.isEventInProgress(startTime, endTime, now);

        console.log(
            `► [CheckInService] Check-in realizado con éxito:` +
            `\n  id evento: ${eventId}` +
            `\n  Realizado por: ${userEmail}` +
            `\n  acción: checkInStatus actualizado a CHECKED_IN`
        );

        await roomService.updateRoomStatus(roomEmail, eventId, isEventInProgress);
        const updatedEvent = await eventService.getEventById(eventId);

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
                    // @LOG
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