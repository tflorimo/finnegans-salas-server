import { Request, Response } from "express";
import authService from "../services/authService";
import jwtService from "../services/jwtService";
import userService from "../services/userService";
import {
  refreshCookieName,
  setRefreshCookie,
  clearRefreshCookie,
} from "../config/authCookies";
import { isOAuthAccessDeniedError } from "../config/oAuthAccess";
import { buildFrontendCallbackUrl } from "../utils/frontendRedirect";

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
      const { refreshToken, redirectUrl } = await authService.processOAuthCallback(code);
      setRefreshCookie(res, refreshToken);
      res.redirect(302, redirectUrl);
    } catch (error) {
      if (isOAuthAccessDeniedError(error)) {
        console.warn("[oauth2Callback] acceso denegado:", error.reason);
        const redirectUrl = buildFrontendCallbackUrl({
          success: "false",
          message: error.reason,
        });
        res.redirect(302, redirectUrl);
        return;
      }

      console.error("[oauth2Callback] error", error);
      const redirectUrl = buildFrontendCallbackUrl({
        success: "false",
        message: "oauth_failed",
      });
      res.redirect(302, redirectUrl);
    }
  };

  checkAuth = async (req: Request, res: Response): Promise<void> => {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      res.status(401).json({ authenticated: false, message: "no_token" });
      return;
    }

    try {
      const payload = jwtService.verifyAccess(token);
      const userId = jwtService.extractSubjectId(payload);

      if (!userId) {
        res.status(401).json({ authenticated: false, message: "invalid_token" });
        return;
      }

      const user = await userService.findUserById(userId);
      if (!user) {
        res.status(401).json({ authenticated: false, message: "user_not_found" });
        return;
      }

      (req as any).user = user;
      res.status(200).json({ authenticated: true, user });
    } catch (error) {
      console.error("[checkAuth] error", error);
      res.status(401).json({ authenticated: false, message: "invalid_token" });
    }
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const refreshToken = req.cookies?.[refreshCookieName];
    if (!refreshToken) {
      res.status(401).json({ code: "no_refresh" });
      return;
    }

    try {
      const payload = jwtService.verifyRefresh(refreshToken);
      const userId = jwtService.extractSubjectId(payload);

      if (!userId) {
        res.status(401).json({ code: "refresh_invalid" });
        return;
      }

      const user = await userService.findUserById(userId);
      if (!user) {
        res.status(401).json({ code: "user_not_found" });
        return;
      }

      const accessToken = jwtService.generateAccessToken(user.id, user.email, user.role);
      const newRefreshToken = jwtService.generateRefreshToken(user.id);

      setRefreshCookie(res, newRefreshToken);
      res.status(200).json({ accessToken });
    } catch (error) {
      console.error("[refresh] error", error);
      res.status(401).json({ code: "refresh_invalid" });
    }
  };

  logout = (_: Request, res: Response): void => {
    clearRefreshCookie(res);
    res.status(204).send();
  };
}

export default new AuthController();
