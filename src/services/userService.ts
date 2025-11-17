import { User } from "../models/index";
import {
  UserBase,
  UserRole,
  UserAttributes,
} from "../models/user.types";

class UserService {
  async findUserById(id: number): Promise<UserAttributes | null> {
    const user = await User.findByPk(id);

    if (!user) {
      return null;
    }

    const userBase = user.get({ plain: true }) as UserAttributes;
    return {
      id: userBase.id,
      email: userBase.email,
      name: userBase.name,
      role: userBase.role,
    };
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

      return {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        role: existingUser.role,
      };
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

    return {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    };
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

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}

export default new UserService();
