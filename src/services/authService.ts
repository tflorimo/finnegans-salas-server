import { google } from "googleapis";
import { oauth2Client } from "../config/googleOAuth";
import userService from "./userService";
import JwtService from "./jwtService";

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
    if (!profile.email) throw new Error("No se pudo obtener el email de Google");

    const role = userService.determineUserRole(profile.email);
    const user = await userService.upsertUser({ email: profile.email, name: profile.name || "", role });

    const accessToken = JwtService.generateAccessToken(user.id, user.email, user.role);
    const refreshToken = JwtService.generateRefreshToken(user.id);

    const frontendURL = process.env.FRONTEND_URL!;
    const queryParams = new URLSearchParams({
      token: accessToken,
      email: profile.email,
      name: profile.name || "",
      role,
    });

    return {
      accessToken,
      refreshToken,
      redirectUrl: `${frontendURL}/auth/callback?${queryParams.toString()}`
    };
  }
}

export default new AuthService();
