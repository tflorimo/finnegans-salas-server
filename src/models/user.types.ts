export type UserRole = "admin" | "user";

export interface UserBase {
    email: string;
    name: string;
    role: UserRole;
}

export interface PersistedUser extends UserBase {
    id: number;
}

export interface UserAttributes extends PersistedUser {
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date | null;
}

export type JWTPayload = Pick<PersistedUser, "id" | "email" | "role">;

export interface AuthCheckResult {
    authenticated: boolean;
    user?: PersistedUser;
    message?: string;
}