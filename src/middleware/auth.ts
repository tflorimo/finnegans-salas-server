import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user';

export interface AuthRequest extends Request {
    user?: any;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: 'Acceso denegado. No hay token proporcionado.' });
        }
        //Verifica y decodifica el token
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        console.log('decoded: ' + JSON.stringify(decoded));

        const user = await User.findOne({ where: { email: decoded.email } });

        if (!user) {
            return res.status(401).json({ message: 'Token no válido, sin usuariooo!!!!.' });
        }
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token no válido, 401111111.' });
    }
};
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    // verifica si el usuario adjuntado por 'authenticate' es admin
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Acceso denegado. Se requieren permisos de administrador.' });
    }
    next();
}


/* 
Nota:
authenticate =  se ejecuta en cada solicitud a rutas protegidas
requireAdmin =  se ejecuta solo en rutas que requieren permisos de administrador
el orden de ejecución es secuencial: primero authenticate, luego requireAdmin, finalmente el controlador
si cualquier middleware falla, la solicitud se rechaza inmediatamente , los middlewares son reutilizables across múltiples rutas
Este flujo garantiza que solo usuarios autenticados (y con los permisos adecuados) puedan acceder a rutas protegidas.
*/