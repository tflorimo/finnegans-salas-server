import { User } from "../models/index";
import {
  UserBase,
  UserRole,
  UserAttributes,
} from "../models/user.types";
import nodemailerService from "./nodemailerService";

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
    const user = await User.findByPk(id);

    if (!user) {
      return null;
    }

    return this.mapToUserAttributes(user);
  }

  async findUserByEmail(email: string): Promise<UserAttributes | null> {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return null;
    }

    return this.mapToUserAttributes(user);
  }

  async getNameByEmail(email: string): Promise<string | null> {
    if (!email) throw new Error("Email requerido");

    const user = await User.findOne({
      where: { email },
      attributes: ["name"],
    });

    return user ? user.name : null;
  }

  async getUsersByEmails(emails: string[]): Promise<Array<{ email: string; name: string | null }>> {
    if (emails.length === 0) return [];

    const users = await User.findAll({
      where: { email: emails },
      attributes: ["email", "name"],
    });

    return users.map(user => ({
      email: user.email,
      name: user.name,
    }));
  }

  async upsertUser(userBase: UserBase): Promise<UserAttributes> {
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

        console.log(
          `► [UserService] Usuario actualizado: ` +
          `\n  id: ${existingUser.id}` +
          `\n  email: ${existingUser.email}` +
          `\n  nombre: ${existingUser.name}` +
          `\n  rol: ${existingUser.role}`
        );
      }

      return this.mapToUserAttributes(existingUser);
    }

    const newUser = await User.create({
      email: userBase.email,
      name: userBase.name,
      role: userBase.role,
    });

    console.log(
      `► [UserService] Usuario creado con éxito: ` +
      `\n  id: ${newUser.id}` +
      `\n  email: ${newUser.email}` +
      `\n  nombre: ${newUser.name}` +
      `\n  rol: ${newUser.role}`
    );

    // Envía email de bienvenida
    nodemailerService.sendNotificationEmail({
      type: "USER_CREATED",
      userId: newUser.id,
    })
      .catch((error: any) => {
        console.error("[UserService] Error enviando email de bienvenida:", error);
      });

    return this.mapToUserAttributes(newUser);
  }

  determineUserRole(email: string): UserRole {
    const admins = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    return admins.includes(email) ? "admin" : "user";
  }

  async validateUserForAuth(userId: number): Promise<UserAttributes | null> {

    const user = await User.findByPk(userId);

    if (!user) {
      console.log(`[UserService][validateUserForAuth][ERROR] usuario id ${userId} no encontrado en DB`);
      return null;
    }

    return this.mapToUserAttributes(user);
  }
}

export default new UserService();
