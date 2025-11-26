import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { HTTP_STATUS } from '../errors/errorCodes';

// Middleware global de manejo de errores
export const errorHandler = (
    err: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (res.headersSent) {
        return next(err);
    }

    console.error('═══════════════════════════════════════════════════════');
    console.error(`[ERROR HANDLER] ${new Date().toISOString()}`);
    console.error(`Path: ${req.method} ${req.path}`);
    console.error(`Message: ${err.message}`);
    
    if (err instanceof AppError) {
        console.error(`Error Code: ${err.errorCode}`);
        console.error(`Status Code: ${err.statusCode}`);
        if (err.details) {
            console.error(`Details:`, err.details);
        }
    }
    
    console.error(`Stack:`, err.stack);
    console.error('═══════════════════════════════════════════════════════');

    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            error: {
                code: err.errorCode,
                message: err.message,
                ...(err.details && { details: err.details }),
                ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
            }
        });
        return;
    }

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: process.env.NODE_ENV === 'production' 
                ? 'Error interno del servidor' 
                : err.message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
    });
};

// Middleware para rutas no encontradas (404)
export const notFoundHandler = (req: Request, res: Response): void => {
    res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: `Ruta no encontrada: ${req.method} ${req.path}`
        }
    });
};
