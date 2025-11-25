import { CheckInStatus } from "../dtos/eventDTO";
import roomService from "./roomService";
import eventService from "./eventService";
import overlapService from "./overlapService";
import {
    CheckInErrorCode,
    CHECK_IN_ERROR_MESSAGES,
    CheckInResult,
} from "../constants/checkInErrors";
import nodemailerService from "./nodemailerService";
import { getEventTimestamps } from "../utils/checkInUtils";

class CheckInService {

    private isEventInProgress(startTime: Date, endTime: Date, nowMs = Date.now()): boolean {
        const { start, end } = getEventTimestamps(startTime, endTime);
        return nowMs >= start && nowMs < end;
    }

    determineCheckInStatus(startTime: Date, endTime: Date, currentStatus?: CheckInStatus): CheckInStatus {
        const now = Date.now();
        const { end, fifteenMinutesAfterStart, tenMinutesBefore } = getEventTimestamps(startTime, endTime);

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
        const overlapResult = await overlapService.checkEventOverlapForCheckIn(
            event,
            roomEmail,
        );

        if (!overlapResult.canCheckIn) {
            const errorCode =
                overlapResult.errorCode ?? CheckInErrorCode.EVENT_OVERLAPPED;

            return {
                success: false,
                errorCode,
                message: CHECK_IN_ERROR_MESSAGES[errorCode],
            };
        }

        // Check-in exitoso
        await eventService.updateEventCheckInStatus(eventId, CheckInStatus.CHECKED_IN);

        const now = Date.now();
        const checkInTime = new Date(now);

        // Notificación por email de check-in exitoso
        nodemailerService.sendNotificationEmail({
            type: 'CHECK_IN_SUCCESS',
            userEmail,
            eventId,
            roomEmail,
            checkInTime,
        })
            .catch((error) => {
                console.error('[CheckInService] Error enviando email de check-in exitoso:', error);
            });

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
        } = getEventTimestamps(startTime, endTime);

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
}

export default new CheckInService();