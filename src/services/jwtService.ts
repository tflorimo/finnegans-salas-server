import jwt from "jsonwebtoken";
import { UserRole } from "../models/user.types";

type AccessTokenData = {
  id: number;
  email: string;
  role: UserRole;
};
export class JwtService {
  private readonly ACCESS_TTL = "15m";
  private readonly REFRESH_TTL = "30d";

  private getAccessSecret(): string {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error("JWT_ACCESS_SECRET no está configurada");
    return secret;
  }

  private getRefreshSecret(): string {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) throw new Error("JWT_REFRESH_SECRET no está configurada");
    return secret;
  }

  generateAccessToken(id: number, email: string, role: UserRole): string {
    return jwt.sign({ sub: id, email, role }, this.getAccessSecret(), {
      expiresIn: this.ACCESS_TTL,
    });
  }

  generateRefreshToken(id: number): string {
    return jwt.sign({ sub: id }, this.getRefreshSecret(), {
      expiresIn: this.REFRESH_TTL,
    });
  }

  verifyAccess(token: string): AccessTokenData {
    const { sub, email, role } = jwt.verify(token, this.getAccessSecret()) as jwt.JwtPayload;

    const id = typeof sub === "number" ? sub : Number.parseInt(String(sub), 10);
    const isValidRole = role === "admin" || role === "user";

    if (!Number.isFinite(id) || typeof email !== "string" || !isValidRole) {
      throw new Error("INVALID_ACCESS_TOKEN_CLAIMS");
    }

    return { id, email, role };
  }

  verifyRefresh(token: string): jwt.JwtPayload {
    return jwt.verify(token, this.getRefreshSecret()) as jwt.JwtPayload;
  }

  extractSubjectId(payload: jwt.JwtPayload): number | null {
    const { sub } = payload;
    if (typeof sub === "number" && Number.isFinite(sub)) return sub;
    if (typeof sub === "string") {
      const parsed = Number.parseInt(sub, 10);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  decodeToken(token: string): jwt.JwtPayload | null {
    const decoded = jwt.decode(token);
    return decoded && typeof decoded !== "string" ? decoded : null;
  }
}

export default new JwtService();
