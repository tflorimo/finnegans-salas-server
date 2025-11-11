import { google } from "googleapis";
import { oauth2Client } from "../config/googleOAuth";
import userService from "./userService";
import JwtService from "./jwtService";
import { ensureOAuthAccess } from "../config/oAuthAccess";
import auditService from "./auditService";


const oauth2 = google.oauth2("v2");

class AuthService {
  generateAuthenticationUrl(): string {
    return oauth2Client.generateAuthUrl({
      access_type: "online",
      scope: [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
    });
  }

  async processOAuthCallback(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    redirectUrl: string;
  }> {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const { data: profile } = await oauth2.userinfo.get({ auth: oauth2Client });
    const email = profile.email?.toLowerCase();

    if (!email) {
      throw new Error("No se pudo obtener el email de Google");
    }

    // Donde se verifica si el usuario tiene acceso permitido, por ahora, sólo la lista de mails permitidos. 
    ensureOAuthAccess(email);

    const role = userService.determineUserRole(email);
    const user = await userService.upsertUser({
      email,
      name: profile.name ?? "",
      role,
    });

    const accessToken = JwtService.generateAccessToken(user.id, user.email, user.role);
    const refreshToken = JwtService.generateRefreshToken(user.id);
     // registrar login de forma asíncrona, no bloquea la respuesta
    void auditService.recordLogin(user.email);

    const frontendURL = process.env.FRONTEND_URL!;
    const queryParams = new URLSearchParams({
      success: "true",
      token: accessToken,
      email: user.email,
      name: user.name ?? "",
      role,
    });

    return {
      accessToken,
      refreshToken,
      redirectUrl: `${frontendURL}/auth/callback?${queryParams.toString()}`,
    };
  }
}

export default new AuthService();
