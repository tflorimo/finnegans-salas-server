import { User } from "../models/index";
import {
  UserBase,
  UserRole,
  UserAttributes,
} from "../models/user.types";
import nodemailerService from "./nodemailerService";
import auditService from "./auditService";
import { ValidationError } from "../errors/AppError";

class UserService {
  private mapToUserAttributes(user: User): UserAttributes {
    const userBase = user.get({ plain: true }) as UserAttributes;
    return {
      id: userBase.id,
      email: userBase.email,
      name: userBase.name,
      role: userBase.role,
    };
  }

  async findUserById(id: number): Promise<UserAttributes | null> {
    try {
      const user = await User.findByPk(id);

      if (!user) {
        return null;
      }

      return this.mapToUserAttributes(user);
    } catch (error) {
      console.error(`[UserService] Error al buscar usuario por ID: ${id}`, error);
      throw error;
    }
  }

  async findUserByEmail(email: string): Promise<UserAttributes | null> {
    try {
      const user = await User.findOne({ where: { email } });

      if (!user) {
        return null;
      }

      return this.mapToUserAttributes(user);
    } catch (error) {
      console.error(`[UserService] Error al buscar usuario por email: ${email}`, error);
      throw error;
    }
  }

  async getNameByEmail(email: string): Promise<string | null> {
    try {
      if (!email) throw new ValidationError("Email requerido");

      const user = await User.findOne({
        where: { email },
        attributes: ["name"],
      });

      return user ? user.name : null;
    } catch (error) {
      console.error(`[UserService] Error al obtener nombre por email: ${email}`, error);
      throw error;
    }
  }

  async getUsersByEmails(emails: string[]): Promise<Array<{ email: string; name: string | null }>> {
    try {
      if (emails.length === 0) return [];

      const users = await User.findAll({
        where: { email: emails },
        attributes: ["email", "name"],
      });

      return users.map(user => ({
        email: user.email,
        name: user.name,
      }));
    } catch (error) {
      console.error('[UserService] Error al obtener usuarios por emails:', error);
      throw error;
    }
  }

  async upsertUser(userBase: UserBase): Promise<UserAttributes> {
    try {
      const existingUser = await User.findOne({
        where: { email: userBase.email }
      });

      if (existingUser) {
        const needsUpdate =
          existingUser.name !== userBase.name ||
          existingUser.role !== userBase.role;

        if (needsUpdate) {
          await existingUser.update({
            name: userBase.name,
            role: userBase.role,
          });

          auditService.recordUserUpdated(
            existingUser.email,
            `nombre: ${existingUser.name}, rol: ${existingUser.role}`
          ).catch((err) => {
            console.error('[UserService][audit] recordUserUpdated failed:', err);
          });
        }

        return this.mapToUserAttributes(existingUser);
      }

      const newUser = await User.create({
        email: userBase.email,
        name: userBase.name,
        role: userBase.role,
      });

      auditService.recordUserCreated(newUser.email, newUser.name).catch((err) => {
        console.error('[UserService][audit] recordUserCreated failed:', err);
      });

      // Envía email de bienvenida
      nodemailerService.sendNotificationEmail({
        type: "USER_CREATED",
        userId: newUser.id,
      })
        .catch((error: any) => {
          console.error("[UserService] Error enviando email de bienvenida:", error);
        });

      return this.mapToUserAttributes(newUser);
    } catch (error) {
      console.error(`[UserService] Error al crear/actualizar usuario: ${userBase.email}`, error);
      throw error;
    }
  }

  determineUserRole(email: string): UserRole {
    const admins = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    return admins.includes(email) ? "admin" : "user";
  }

  async validateUserForAuth(userId: number): Promise<UserAttributes | null> {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        return null;
      }

      return this.mapToUserAttributes(user);
    } catch (error) {
      console.error(`[UserService] Error al validar usuario para autenticación: ${userId}`, error);
      throw error;
    }
  }
}

export default new UserService();
