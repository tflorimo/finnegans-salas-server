export type UserRole = "admin" | "user";

export interface UserData {
    email: string;
    name: string;
    picture?: string;
    role: UserRole;
}

export interface AuthenticatedUser extends UserData {
    id: number;
}

export interface UserAttributes extends AuthenticatedUser {
    refreshToken?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date | null;
}

export interface JWTPayload {
    id: number;
    email: string;
    role: UserRole;
}

export interface AuthCheckResult {
    authenticated: boolean;
    user?: AuthenticatedUser;
    message?: string;
}

export interface AuthUrlOptions {
    userEmail?: string;
}

export interface OAuthCallbackResult {
    shouldRedirectToConsent: boolean;
    consentUrl?: string;
    redirectUrl?: string;
}
