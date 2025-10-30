import { Request, Response, CookieOptions } from "express";
import authService from "../services/authService";
import jwtService from "../services/jwtService";
import userService from "../services/userService";

const isProd = process.env.NODE_ENV === "production";
const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
  path: "/api/auth/refresh",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

class AuthController {
  authRedirect(req: Request, res: Response): void {
    const authUrl = authService.generateAuthenticationUrl();
    res.redirect(authUrl);
  }

  async oauth2Callback(req: Request, res: Response): Promise<void> {

    const { code } = req.query;
    if (!code || typeof code !== "string") {
      res.status(400).json({ success: false, message: "codigo_no_proporcionado" });
      return;
    }

    try {
      const { refreshToken, redirectUrl } = await authService.processOAuthCallback(code);

      res.cookie("rt", refreshToken, cookieOptions);
      res.redirect(redirectUrl ?? "/");
    } catch (error) {
      console.error("[oauth2Callback] error", error);
      res.status(500).json({ success: false, message: "oauth_failed" });
    }
  }

  async checkAuth(req: Request, res: Response): Promise<void> {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      res.status(401).json({ authenticated: false, message: "no_token" });
      return;
    }

    try {
      const payload = jwtService.verifyAccess(token);

      if (!payload || typeof payload.sub !== "number") {
        res.status(401).json({ authenticated: false, message: "invalid_token" });
        return;
      }

      const user = await userService.findUserById(payload.sub);
      if (!user) {
        res.status(401).json({ authenticated: false, message: "user_not_found" });
        return;
      }

      res.status(200).json({ authenticated: true, user });
    } catch (error) {
      console.error("[checkAuth] error", error);
      res.status(401).json({ authenticated: false, message: "invalid_token" });
    }
  }

  async refresh(req: Request, res: Response): Promise<void> {

    const rt = req.cookies?.rt;
    if (!rt) {
      res.status(401).json({ code: "no_refresh" });
      return;
    }

    try {
      const payload = jwtService.verifyRefresh(rt);

      if (!payload || typeof payload.sub !== "number") {
        res.status(401).json({ code: "refresh_invalid" });
        return;
      }

      const user = await userService.findUserById(payload.sub);
      if (!user) {
        res.status(401).json({ code: "user_not_found" });
        return;
      }

      const accessToken = jwtService.generateAccessToken(user.id, user.email, user.role);
      const newRefresh = jwtService.generateRefreshToken(user.id);

      res.cookie("rt", newRefresh, cookieOptions);
      console.log("[refresh] issued new tokens for", user.email);

      res.status(200).json({ accessToken });
    } catch (error) {
      console.error("[refresh] error", error);
      res.status(401).json({ code: "refresh_invalid" });
    }
  }

  logout(req: Request, res: Response): void {
    res.clearCookie("rt", { path: cookieOptions.path, sameSite: cookieOptions.sameSite, secure: cookieOptions.secure });
    res.status(204).send();
  }
}

export default new AuthController();
