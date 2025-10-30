import jwt from "jsonwebtoken";
import { UserRole } from "../models/user.types";

export class JwtService {
  // TODO: Definir cada cuanto tiempo expiran y se renuevan los tokens
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
    return jwt.sign(
      { sub: id, email, role },
      this.getAccessSecret(),
      { expiresIn: this.ACCESS_TTL }
    );
  }

  generateRefreshToken(id: number): string {
    return jwt.sign(
      { sub: id },
      this.getRefreshSecret(),
      { expiresIn: this.REFRESH_TTL }
    );
  }

  verifyAccess(token: string): jwt.JwtPayload {
    return jwt.verify(token, this.getAccessSecret()) as jwt.JwtPayload;
  }

  verifyRefresh(token: string): jwt.JwtPayload {
    return jwt.verify(token, this.getRefreshSecret()) as jwt.JwtPayload;
  }

  decodeToken(token: string): jwt.JwtPayload | null {
    const decoded = jwt.decode(token);
    return decoded && typeof decoded !== "string" ? decoded : null;
  }
}

export default new JwtService();
