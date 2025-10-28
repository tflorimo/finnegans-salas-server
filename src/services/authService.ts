import { google } from "googleapis";
import { oauth2Client, setTokens } from "../config/googleCalendar";
import userService from "./userService";
import jwtService from "./jwtService";
import { AuthUrlOptions, OAuthCallbackResult } from "../models/user.types";

const oauth2 = google.oauth2("v2");

class AuthService {
  private generateAuthUrl(promptType?: 'consent' | 'select_account'): string {
    return oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/calendar",
      ],
      prompt: promptType,
    });
  }

  private async processOAuthCode(code: string) {
    const { tokens } = await oauth2Client.getToken(code);
    setTokens(tokens);

    const { data: profile } = await oauth2.userinfo.get({ auth: oauth2Client });

    return {
      tokens,
      profile: {
        email: profile.email || "",
        name: profile.name || "",
        picture: profile.picture || "",
      },
    };
  }

  async generateAuthenticationUrl(options: AuthUrlOptions): Promise<string> {
    if (!options.userEmail) {
      return this.generateAuthUrl(undefined);
    }

    const hasRefreshToken = await userService.getRefreshToken(options.userEmail);
    const promptType = hasRefreshToken ? undefined : 'consent';
    
    return this.generateAuthUrl(promptType);
  }

  async processOAuthCallback(code: string): Promise<OAuthCallbackResult> {
    const { tokens, profile } = await this.processOAuthCode(code);

    if (!profile.email) {
      throw new Error("No se pudo obtener el email de Google");
    }

    const role = userService.determineUserRole(profile.email);
    const user = await userService.upsertUser({
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
      role
    });

    const hasRefreshToken = await this.checkRefreshToken(profile.email, tokens.refresh_token);
    
    if (!hasRefreshToken) {
      return {
        shouldRedirectToConsent: true,
        consentUrl: this.generateAuthUrl('consent')
      };
    }

    const frontendURL = process.env.FRONTEND_URL;
    if (!frontendURL) {
      throw new Error("FRONTEND_URL no está configurada");
    }

    const appToken = jwtService.generateToken(user.id, profile.email, role);
    const queryParams = new URLSearchParams({
      token: appToken,
      email: profile.email,
      name: profile.name,
      role: role
    });

    return {
      shouldRedirectToConsent: false,
      redirectUrl: `${frontendURL}/auth/callback?${queryParams.toString()}`
    };
  }

  private async checkRefreshToken(email: string, newRefreshToken?: string | null): Promise<boolean> {
    if (newRefreshToken) {
      await userService.updateRefreshToken(email, newRefreshToken);
      return true;
    }

    const existingToken = await userService.getRefreshToken(email);
    return existingToken !== null;
  }
}

export default new AuthService();
