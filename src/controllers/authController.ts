import { Request, Response } from "express";
import authService from "../services/authService";
import jwtService from "../services/jwtService";

class AuthController {
  async authRedirect(req: Request, res: Response): Promise<void> {
    try {
      const authUrl = authService.generateAuthenticationUrl();
      res.redirect(authUrl);
    } catch (error) {
      console.error("Error generating auth URL:", error);
      res.status(500).json({
        success: false,
        message: "Error generating authentication URL",
      });
    }
  }

  async oauth2Callback(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.query;

      if (!code || typeof code !== "string") {
        res.status(400).json({
          success: false,
          message: "Código de autorización no proporcionado",
        });
        return;
      }

      const redirectUrl = await authService.processOAuthCallback(code);
      res.redirect(redirectUrl);
    } catch (error) {
      console.error("Error en callback de OAuth2:", error);
      res.status(500).json({
        success: false,
        message: "Error en el proceso de autenticación",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async checkAuth(req: Request, res: Response): Promise<void> {
    try {
      const token = req.header("Authorization")?.replace("Bearer ", "");

      if (!token) {
        res.status(401).json({
          authenticated: false,
          message: "No hay token proporcionado",
        });
        return;
      }

      const result = await jwtService.checkAuthentication(token);

      if (!result.authenticated) {
        res.status(401).json({
          authenticated: false,
          message: result.message || "Token inválido",
        });
        return;
      }

      res.json({
        authenticated: true,
        user: result.user,
      });
    } catch (error) {
      console.error("Error verificando autenticación:", error);
      res.status(401).json({
        authenticated: false,
        message: "Token inválido",
      });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      res.json({
        success: true,
        message: "Sesión cerrada correctamente",
      });
    } catch (error) {
      console.error("Error en logout:", error);
      res.status(500).json({
        success: false,
        message: "Error al cerrar sesión",
      });
    }
  }
}

export default new AuthController();
