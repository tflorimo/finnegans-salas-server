import { Request, Response, NextFunction } from "express";
import jwtService from "../services/jwtService";
import userService from "../services/userService";

type AuthenticatedRequest = Request & {
  user?: {
    id: number;
    email: string;
    role: string;
  };
};

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ code: "no_token" });
    return;
  }

  try {
    const token = authHeader.slice("Bearer ".length);
    const payload = jwtService.verifyAccess(token);

    // Validar que el usuario exista en la DB
    const user = await userService.validateUserForAuth(payload.id);

    if (!user) {
      console.log(`► [Auth Middleware] Usuario id ${payload.id} rechazado (no existe en DB)`);
      res.status(401).json({ code: "user_invalid" });
      return;
    }

    // Usar datos frescos de la DB (especialmente el role)
    (req as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "TokenExpiredError") {
        res.status(401).json({ code: "token_expired" });
        return;
      }

      if (error.message === "INVALID_ACCESS_TOKEN_CLAIMS") {
        res.status(401).json({ code: "token_invalid" });
        return;
      }
    }

    res.status(401).json({ code: "token_invalid" });
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    res.status(401).json({ message: "Acceso denegado. No autenticado." });
    return;
  }

  if (user.role !== "admin") {
    res.status(403).json({ message: "Acceso denegado. Se requieren permisos de administrador." });
    return;
  }

  next();
};
