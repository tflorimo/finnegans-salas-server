export interface CheckInResult {
    success: boolean;
    event?: any;
    errorCode?: CheckInErrorCode;
    message?: string;
}

export enum CheckInErrorCode {
    // 404 - Not Found
    ROOM_NOT_FOUND = 'ROOM_NOT_FOUND',
    EVENT_NOT_FOUND = 'EVENT_NOT_FOUND',
    EVENT_DELETED = 'EVENT_DELETED',
    EVENT_WRONG_ROOM = 'EVENT_WRONG_ROOM',
    
    // 403 - Forbidden
    NOT_ATTENDEE = 'NOT_ATTENDEE',
    EVENT_OVERLAPPED = 'EVENT_OVERLAPPED',
    EVENT_MODIFIED_OVERLAPPED = 'EVENT_MODIFIED_OVERLAPPED',
    EVENT_NOT_STARTED = 'EVENT_NOT_STARTED',
    
    // 409 - Conflict
    ALREADY_CHECKED_IN = 'ALREADY_CHECKED_IN',
    EVENT_ENDED = 'EVENT_ENDED',
    CHECK_IN_EXPIRED = 'CHECK_IN_EXPIRED',
    
    // 400 - Bad Request
    TOO_EARLY = 'TOO_EARLY',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export const CHECK_IN_ERROR_MESSAGES: Record<CheckInErrorCode, string> = {
    // 404
    [CheckInErrorCode.ROOM_NOT_FOUND]: 'Sala no encontrada',
    [CheckInErrorCode.EVENT_NOT_FOUND]: 'Evento no encontrado',
    [CheckInErrorCode.EVENT_DELETED]: 'Este evento ha sido eliminado',
    [CheckInErrorCode.EVENT_WRONG_ROOM]: 'El evento no pertenece a esta sala',
    
    // 403
    [CheckInErrorCode.NOT_ATTENDEE]: 'Para poder hacer check-in, debes estar como asistente del evento',
    [CheckInErrorCode.EVENT_OVERLAPPED]: 'Este evento está superpuesto. Solo puede hacerse check-in en el evento primario',
    [CheckInErrorCode.EVENT_MODIFIED_OVERLAPPED]: 'Este evento fue modificado y está superpuesto. Solo puede hacerse check-in en el evento primario',
    [CheckInErrorCode.EVENT_NOT_STARTED]: 'No puedes hacer check-in antes del horario de inicio del evento',
    
    // 409
    [CheckInErrorCode.ALREADY_CHECKED_IN]: 'Este evento ya tiene el check-in realizado',
    [CheckInErrorCode.EVENT_ENDED]: 'El evento ya ha terminado',
    [CheckInErrorCode.CHECK_IN_EXPIRED]: 'El tiempo para hacer check-in ha expirado (15 min después del inicio)',
    
    // 400
    [CheckInErrorCode.TOO_EARLY]: 'Aún no puedes hacer check-in. Intenta 10 minutos antes del evento',
    [CheckInErrorCode.UNKNOWN_ERROR]: 'No es posible realizar check-in en este momento',
};

export const CHECK_IN_HTTP_STATUS: Record<CheckInErrorCode, number> = {
    // 404
    [CheckInErrorCode.ROOM_NOT_FOUND]: 404,
    [CheckInErrorCode.EVENT_NOT_FOUND]: 404,
    [CheckInErrorCode.EVENT_DELETED]: 404,
    [CheckInErrorCode.EVENT_WRONG_ROOM]: 404,
    
    // 403
    [CheckInErrorCode.NOT_ATTENDEE]: 403,
    [CheckInErrorCode.EVENT_OVERLAPPED]: 403,
    [CheckInErrorCode.EVENT_MODIFIED_OVERLAPPED]: 403,
    [CheckInErrorCode.EVENT_NOT_STARTED]: 403,
    
    // 409
    [CheckInErrorCode.ALREADY_CHECKED_IN]: 409,
    [CheckInErrorCode.EVENT_ENDED]: 409,
    [CheckInErrorCode.CHECK_IN_EXPIRED]: 409,
    
    // 400
    [CheckInErrorCode.TOO_EARLY]: 400,
    [CheckInErrorCode.UNKNOWN_ERROR]: 400,
};
