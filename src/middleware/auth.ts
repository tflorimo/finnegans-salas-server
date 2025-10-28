import { Request, Response, NextFunction } from "express";
import jwtService from "../services/jwtService";

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ message: 'Acceso denegado. No hay token proporcionado.' });
      return;
    }

    const result = await jwtService.checkAuthentication(token);

    if (!result.authenticated || !result.user) {
      res.status(401).json({ message: result.message || 'Token inválido o expirado.' });
      return;
    }

    (req as any).user = result.user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token inválido.' });
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as any).user;

  if (!user || user.role !== 'admin') {
    res.status(403).json({ message: 'Acceso denegado. Se requieren permisos de administrador.' });
    return;
  }
  next();
};
