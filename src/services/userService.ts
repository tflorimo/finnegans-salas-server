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
    const [user] = await User.upsert(
      {
        email: userBase.email,
        name: userBase.name,
        role: userBase.role,
      },
      { returning: true }
    );

    const plainUser = user.get({ plain: true }) as UserAttributes;
    return {
      id: plainUser.id,
      email: plainUser.email,
      name: plainUser.name,
      role: plainUser.role,
    };
  }

  determineUserRole(email: string): UserRole {
    const admins = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    return admins.includes(email) ? "admin" : "user";
  }
}

export default new UserService();
