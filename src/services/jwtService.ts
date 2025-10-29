import jwt from "jsonwebtoken";
import userService from "./userService";
import {
  JWTPayload,
  AuthCheckResult,
} from "../models/user.types";

class JwtService {
  generateToken(userId: number, email: string, role: string): string {
    return jwt.sign(
      { id: userId, email, role },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "8h" }
    );
  }

  private verifyToken(token: string): JWTPayload {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "secret"
    ) as JWTPayload;
    return decoded;
  }

  async checkAuthentication(token: string): Promise<AuthCheckResult> {
    try {
      const decoded = this.verifyToken(token);
      const user = await userService.findUserById(decoded.id);
      
      if (!user) {
        return {
          authenticated: false,
          message: "Usuario no encontrado",
        };
      }

      return {
        authenticated: true,
        user,
      };
    } catch (error) {
      return {
        authenticated: false,
        message: "Token no válido.",
      };
    }
  }
}

export default new JwtService();
