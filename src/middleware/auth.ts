import { Request, Response, NextFunction  } from "express";
import jwtService from "../services/jwtService";

// Esta autenticación sólo verifica el token del user para las rutas de eventos y salas.
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.header("Authorization");
  if (!authHeader) { res.status(401).json({ code: "no_token" }); return; }

  const token = authHeader.replace("Bearer ", "");

  try {
    const payload = jwtService.verifyAccess(token);
    (req as any).user = { id: Number(payload.sub), email: (payload as any).email, role: (payload as any).role };
    
    next();

  } catch (e: any) {
    if (e?.name === "TokenExpiredError") {
      res.status(401).json({ code: "token_expired" });
      return;
    }
    res.status(401).json({ code: "token_invalid" });
  }
};

// Esta autenticación verifica que el user sea admin para acceder a getAllEvents y en un futuro a logs.
export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    res.status(401).json({ message: "Acceso denegado. No hay token proporcionado." });
    return;
  }

  const token = authHeader.replace("Bearer ", "");
  const result = jwtService.verifyAccess(token);

  if (!result || !result.sub) {
    res.status(401).json({ message: result.message || "Token inválido o expirado." });
    return;
  }

  if (result.role !== "admin") {
    res.status(403).json({ message: "Acceso denegado. Se requieren permisos de administrador." });
    return;
  }

  next();
};