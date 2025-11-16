import { Request, Response, NextFunction } from "express";
import jwtService from "../services/jwtService";

type AuthenticatedRequest = Request & {
  user?: {
    id: number;
    email: string;
    role: string;
  };
};

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ code: "no_token" });
    return;
  }

  try {
    const token = authHeader.slice("Bearer ".length);
    const user = jwtService.verifyAccess(token);

    (req as AuthenticatedRequest).user = user;
    next();
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "TokenExpiredError") {
        // @LOG
        res.status(401).json({ code: "token_expired" });
        return;
      }

      if (error.message === "INVALID_ACCESS_TOKEN_CLAIMS") {
        // @LOG
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
    // @LOG
    res.status(401).json({ message: "Acceso denegado. No autenticado." });
    return;
  }

  if (user.role !== "admin") {
    // @LOG
    res.status(403).json({ message: "Acceso denegado. Se requieren permisos de administrador." });
    return;
  }

  next();
};
