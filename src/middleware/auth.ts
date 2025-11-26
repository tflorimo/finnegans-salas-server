import { Request, Response, NextFunction } from "express";
import jwtService from "../services/jwtService";
import userService from "../services/userService";
import auditService from "../services/auditService";

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

    // Valida que el usuario exista en la DB
    const user = await userService.validateUserForAuth(payload.id);

    if (!user) {
      await auditService.recordAuthUserRejected(String(payload.id), 'Usuario no existe en BD').catch(err => {
        console.error('[Auth Middleware][audit] recordAuthUserRejected failed:', err);
      });
      res.status(401).json({ code: "user_invalid" });
      return;
    }

    (req as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "TokenExpiredError") {
        await auditService.recordAuthInvalidToken(undefined, 'Token expirado').catch(err => {
          console.error('[Auth Middleware][audit] recordAuthInvalidToken failed:', err);
        });
        res.status(401).json({ code: "token_expired" });
        return;
      }

      if (error.message === "INVALID_ACCESS_TOKEN_CLAIMS") {
        await auditService.recordAuthInvalidToken(undefined, 'Claims inválidos').catch(err => {
          console.error('[Auth Middleware][audit] recordAuthInvalidToken failed:', err);
        });
        res.status(401).json({ code: "token_invalid" });
        return;
      }
    }

    await auditService.recordAuthInvalidToken(undefined, 'Token inválido').catch(err => {
      console.error('[Auth Middleware][audit] recordAuthInvalidToken failed:', err);
    });
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
