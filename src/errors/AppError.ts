import { ErrorCode, HTTP_STATUS } from './errorCodes';

/**
 * Clase base para errores personalizados de la aplicación
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly errorCode: ErrorCode;
    public readonly isOperational: boolean;
    public readonly details?: any;

    constructor(
        message: string,
        errorCode: ErrorCode,
        statusCode: number,
        isOperational: boolean = true,
        details?: any
    ) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        
        this.errorCode = errorCode;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.details = details;
        
        Error.captureStackTrace(this);
    }
}

export class BadRequestError extends AppError {
    constructor(message: string = 'Solicitud inválida', details?: any) {
        super(message, ErrorCode.BAD_REQUEST, HTTP_STATUS.BAD_REQUEST, true, details);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = 'No autorizado', details?: any) {
        super(message, ErrorCode.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED, true, details);
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = 'Acceso prohibido', details?: any) {
        super(message, ErrorCode.FORBIDDEN, HTTP_STATUS.FORBIDDEN, true, details);
    }
}

export class NotFoundError extends AppError {
    constructor(message: string = 'Recurso no encontrado', details?: any) {
        super(message, ErrorCode.NOT_FOUND, HTTP_STATUS.NOT_FOUND, true, details);
    }
}

export class ConflictError extends AppError {
    constructor(message: string = 'Conflicto con el estado actual', details?: any) {
        super(message, ErrorCode.CONFLICT, HTTP_STATUS.CONFLICT, true, details);
    }
}

export class ValidationError extends AppError {
    constructor(message: string = 'Error de validación', details?: any) {
        super(message, ErrorCode.VALIDATION_ERROR, HTTP_STATUS.VALIDATION_ERROR, true, details);
    }
}

export class InternalServerError extends AppError {
    constructor(message: string = 'Error interno del servidor', details?: any) {
        super(message, ErrorCode.INTERNAL_SERVER_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR, false, details);
    }
}

export class DatabaseError extends AppError {
    constructor(message: string = 'Error de base de datos', details?: any) {
        super(message, ErrorCode.DATABASE_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR, false, details);
    }
}

export class ExternalServiceError extends AppError {
    constructor(message: string = 'Error en servicio externo', details?: any) {
        super(message, ErrorCode.EXTERNAL_SERVICE_ERROR, HTTP_STATUS.BAD_GATEWAY, true, details);
    }
}

export class CheckInError extends AppError {
    constructor(message: string = 'Error en check-in', details?: any) {
        super(message, ErrorCode.CHECK_IN_ERROR, HTTP_STATUS.BAD_REQUEST, true, details);
    }
}

export class EventOverlapError extends AppError {
    constructor(message: string = 'Evento superpuesto', details?: any) {
        super(message, ErrorCode.EVENT_OVERLAP_ERROR, HTTP_STATUS.CONFLICT, true, details);
    }
}

export class RoomNotAvailableError extends AppError {
    constructor(message: string = 'Sala no disponible', details?: any) {
        super(message, ErrorCode.ROOM_NOT_AVAILABLE, HTTP_STATUS.CONFLICT, true, details);
    }
}
