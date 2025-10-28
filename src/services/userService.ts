import User from "../models/user";
import {
  UserData,
  AuthenticatedUser,
  UserRole,
  UserAttributes,
} from "../models/user.types";

class UserService {
  async findUserById(id: number): Promise<AuthenticatedUser | null> {
    const user = await User.findByPk(id);
    
    if (!user) {
      return null;
    }

    const userData = user.get({ plain: true }) as UserAttributes;
    return {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      picture: userData.picture,
      role: userData.role,
    };
  }

  async upsertUser(userData: UserData): Promise<AuthenticatedUser> {
    const [user] = await User.upsert(
      {
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
        role: userData.role,
      },
      { returning: true }
    );

    const plainUser = user.get({ plain: true }) as UserAttributes;
    return {
      id: plainUser.id,
      email: plainUser.email,
      name: plainUser.name,
      picture: plainUser.picture,
      role: plainUser.role,
    };
  }

  async updateRefreshToken(email: string, refreshToken: string): Promise<void> {
    await User.update({ refreshToken }, { where: { email } });
  }

  async getRefreshToken(email: string): Promise<string | null> {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return null;
    }
    const userData = user.get({ plain: true }) as UserAttributes;
    return userData.refreshToken || null;
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
