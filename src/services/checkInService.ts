import { CheckInStatus } from "../constants/eventStatuses";
import roomService from "./roomService";
import eventService from "./eventService";
import overlapService from "./overlapService";
import userService from "./userService";
import {
    CheckInErrorCode,
    CHECK_IN_ERROR_MESSAGES,
} from "../constants/checkInErrors";
import { CheckInResult } from "../dtos/checkInResultDTO";
import nodemailerService from "./nodemailerService";
import { getEventTimestamps } from "../utils/checkInUtils";
import auditService from "./auditService";

class CheckInService {
    private isEventInProgress(startTime: Date, endTime: Date, nowMs = Date.now()): boolean {
        const { start, end } = getEventTimestamps(startTime, endTime);
        return nowMs >= start && nowMs < end;
    }

    private recordFailedCheckIn(
        userEmail: string | null, 
        userName: string | null, 
        eventId: string | null, 
        errorCode: CheckInErrorCode
    ): void {
        auditService.recordCheckinFailed(
            userEmail, userName, eventId, CHECK_IN_ERROR_MESSAGES[errorCode]
        ).catch(err => {
            console.error('[CheckInService][audit] recordCheckinFailed failed:', err);
        });
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
        const user = await userService.findUserByEmail(userEmail);
        const userName = user?.name || null;

        const currentRoom = await roomService.fetchRoom(roomEmail);

        if (!currentRoom) {

            this.recordFailedCheckIn(
                userEmail ?? null, userName ?? null, eventId ?? null, CheckInErrorCode.ROOM_NOT_FOUND);
            return {
                success: false,
                errorCode: CheckInErrorCode.ROOM_NOT_FOUND,
                message: CHECK_IN_ERROR_MESSAGES[CheckInErrorCode.ROOM_NOT_FOUND]
            };
        }

        const event = await eventService.getEventById(eventId);

        if (!event) {

            this.recordFailedCheckIn(
                userEmail ?? null, userName ?? null, eventId ?? null, CheckInErrorCode.EVENT_NOT_FOUND);
            return {
                success: false,
                errorCode: CheckInErrorCode.EVENT_NOT_FOUND,
                message: CHECK_IN_ERROR_MESSAGES[CheckInErrorCode.EVENT_NOT_FOUND]
            };
        }

        if (event.deletedAt) {

            this.recordFailedCheckIn(
                userEmail ?? null, userName ?? null, eventId ?? null, CheckInErrorCode.EVENT_DELETED);
            return {
                success: false,
                errorCode: CheckInErrorCode.EVENT_DELETED,
                message: CHECK_IN_ERROR_MESSAGES[CheckInErrorCode.EVENT_DELETED]
            };
        }

        if (event.roomEmail !== roomEmail) {

            this.recordFailedCheckIn(
                userEmail ?? null, userName ?? null, eventId ?? null, CheckInErrorCode.EVENT_WRONG_ROOM);
            return {
                success: false,
                errorCode: CheckInErrorCode.EVENT_WRONG_ROOM,
                message: CHECK_IN_ERROR_MESSAGES[CheckInErrorCode.EVENT_WRONG_ROOM]
            };
        }

        const checkInStatus = eventService.getEventCheckInStatus(event);

        if (checkInStatus === CheckInStatus.CHECKED_IN) {
            this.recordFailedCheckIn(
                userEmail ?? null, userName ?? null, eventId ?? null, CheckInErrorCode.ALREADY_CHECKED_IN);
            return {
                success: false,
                errorCode: CheckInErrorCode.ALREADY_CHECKED_IN,
                message: CHECK_IN_ERROR_MESSAGES[CheckInErrorCode.ALREADY_CHECKED_IN]
            };
        }

        const attendeesDTO = eventService.getEventAttendees(event);

        if (attendeesDTO && !attendeesDTO.some(attendee => attendee.email === userEmail)) {

            this.recordFailedCheckIn(
                userEmail ?? null, userName ?? null, eventId ?? null, CheckInErrorCode.NOT_ATTENDEE);
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

            this.recordFailedCheckIn(
                userEmail ?? null, userName ?? null, eventId ?? null, errorCode);
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
            const overlapErrorCode = overlapResult.errorCode ?? CheckInErrorCode.EVENT_OVERLAPPED;
            this.recordFailedCheckIn(
                userEmail ?? null, userName ?? null, eventId ?? null, CheckInErrorCode.EVENT_OVERLAPPED);
            return {
                success: false,
                errorCode: overlapErrorCode,
                message: CHECK_IN_ERROR_MESSAGES[overlapErrorCode],
            };
        }

        // Check-in exitoso
        await eventService.updateEventCheckInStatus(eventId, CheckInStatus.CHECKED_IN);

        // registro en auditoría de check-in exitoso 
        const eventTitle = event?.title;
        const roomName = currentRoom?.name;
        auditService.recordCheckin(
            userEmail ?? null, userName ?? null, eventId ?? null, eventTitle, roomEmail, roomName).catch(err => {
            console.error('[CheckInService][audit] recordCheckin failed:', err);
        });

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

        await roomService.updateRoomStatus(roomEmail, eventId, isEventInProgress);
        const updatedEvent = await eventService.getEventById(eventId);
        const updatedRoom = await roomService.getRoomById(roomEmail);

        return {
            success: true,
            event: updatedEvent ?? event,
            room: updatedRoom,
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