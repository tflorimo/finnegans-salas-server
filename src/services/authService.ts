import { google } from "googleapis";
import { oauth2Client } from "../config/googleOAuth";
import userService from "./userService";
import jwtService from "./jwtService";

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

  async processOAuthCallback(code: string): Promise<string> {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const { data: profile } = await oauth2.userinfo.get({ auth: oauth2Client });

    if (!profile.email) {
      throw new Error("No se pudo obtener el email de Google");
    }

    const role = userService.determineUserRole(profile.email);
    const user = await userService.upsertUser({
      email: profile.email,
      name: profile.name || "",
      picture: profile.picture || "",
      role
    });

    const frontendURL = process.env.FRONTEND_URL;
    if (!frontendURL) {
      throw new Error("FRONTEND_URL no está configurada");
    }

    const appToken = jwtService.generateToken(user.id, profile.email, role);
    const queryParams = new URLSearchParams({
      token: appToken,
      email: profile.email,
      name: profile.name || "",
      role: role
    });

    return `${frontendURL}/auth/callback?${queryParams.toString()}`;
  }
}

export default new AuthService();
