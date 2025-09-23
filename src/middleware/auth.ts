import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user';

export interface AuthRequest extends Request {
    user?: any;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // Paso 1: Extraer el token del header
        const token = req.header('Authorization')?.replace('Bearer ', '');

        // Paso 2: Verificar existencia del token
        if (!token) {
            return res.status(401).json({ message: 'Acceso denegado. No hay token proporcionado.' });
        }

        // Paso 3: Verificar validez del token
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');

        console.log('decoded: ' + JSON.stringify(decoded));

        // Paso 4: Buscar usuario en base de datos
        const user = await User.findOne({ where: { email: decoded.email } });



        // Paso 5: Verificar existencia del usuario
        if (!user) {
            return res.status(401).json({ message: 'Token no válido, sin usuariooo!!!!.' });
        }

        // Paso 6: Adjuntar usuario a la solicitud
        req.user = user;

        // Paso 7: Permitir continuar
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token no válido, 401111111.' });
    }
};
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    // Verificar si el usuario adjuntado por 'authenticate' es admin
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Acceso denegado. Se requieren permisos de administrador.' });
    }
    next();
}


/* 

authenticate =  se ejecuta en cada solicitud a rutas protegidas

requireAdmin =  se ejecuta solo en rutas que requieren permisos de administrador

El orden de ejecución es secuencial: primero authenticate, luego requireAdmin, finalmente el controlador

Si cualquier middleware falla, la solicitud se rechaza inmediatamente

Los middlewares son reutilizables across múltiples rutas

Este flujo garantiza que solo usuarios autenticados (y con los permisos adecuados) puedan acceder a rutas protegidas.
*/