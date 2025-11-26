import { Request, Response, NextFunction } from "express";
import authService from "../services/authService";
import jwtService from "../services/jwtService";
import userService from "../services/userService";
import {
  refreshCookieName,
  setRefreshCookie,
  clearRefreshCookie,
  setTempAccessCookie,
} from "../config/authCookies";
import { isOAuthAccessDeniedError } from "../config/oAuthAccess";
import { buildFrontendCallbackUrl } from "../utils/frontendRedirect";
import auditService from "../services/auditService";
import { UnauthorizedError } from "../errors/AppError";

class AuthController {
  authRedirect = (_: Request, res: Response): void => {
    res.redirect(authService.generateAuthenticationUrl());
  };

  oauth2Callback = async (req: Request, res: Response): Promise<void> => {
    const { code } = req.query;

    if (typeof code !== "string") {
      const redirectUrl = buildFrontendCallbackUrl({
        success: "false",
        message: "codigo_no_proporcionado",
      });
      res.redirect(302, redirectUrl);
      return;
    }

    try {
      const { accessToken, refreshToken, redirectUrl } = await authService.processOAuthCallback(code);

      clearRefreshCookie(res);
      setRefreshCookie(res, refreshToken);
      setTempAccessCookie(res, accessToken);

      res.redirect(302, redirectUrl);
    } catch (error) {
      const attemptedEmail = typeof req.query.email === 'string' ? req.query.email : null;

      let errorMessage = 'OAUTH_FAILED';
      if (isOAuthAccessDeniedError(error)) {
        errorMessage = error.reason;
      }

      // Registro de login fallido en auditoría 
      auditService.recordLoginFailed(attemptedEmail, errorMessage, null).catch(err => {
        console.error('[AuthController][audit] recordLoginFailed failed:', err);
      });

      const redirectUrl = buildFrontendCallbackUrl({
        success: "false",
        message: errorMessage,
      });
      res.redirect(302, redirectUrl);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refreshToken = req.cookies?.[refreshCookieName];
      if (!refreshToken) {
        throw new UnauthorizedError("Token de refresco no proporcionado");
      }

      const payload = jwtService.verifyRefresh(refreshToken);
      const userId = jwtService.extractSubjectId(payload);
      const tokenEmail = jwtService.extractEmail(payload);

      if (!userId) {
        throw new UnauthorizedError("Token de refresco inválido");
      }

      const user = await userService.findUserById(userId);
      if (!user) {
        throw new UnauthorizedError("Usuario no encontrado");
      }

      if (tokenEmail && tokenEmail !== user.email) {
        throw new UnauthorizedError("Token de refresco no corresponde a este usuario");
      }

      const accessToken = jwtService.generateAccessToken(user.id, user.email, user.role);
      const newRefreshToken = jwtService.generateRefreshToken(user.id, user.email);

      setRefreshCookie(res, newRefreshToken);
      res.status(200).json({ accessToken });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    const userEmail = (req as any).user?.email ?? null;
    
    let userName: string | null = null;
    if (userEmail) {
      const user = await userService.findUserByEmail(userEmail);
      userName = user?.name ?? null;
    }
    
    // registro de logout en auditoría 
    auditService.recordLogout(userEmail, userName).catch(err => {
      console.error('[AuthController][audit] recordLogout failed:', err);
    });

    clearRefreshCookie(res);
    res.status(204).send();
  };
}

export default new AuthController();
