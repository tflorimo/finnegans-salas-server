const allowedDomain = process.env.GOOGLE_ALLOWED_DOMAIN;
//@TODO: Comentar para producción
const testerEmails = new Set(
  (process.env.GOOGLE_TEST_USERS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

export type OAuthAccessDeniedReason = "oauth_domain_not_allowed" | "oauth_not_tester";

export class OAuthAccessDeniedError extends Error {
  constructor(public readonly reason: OAuthAccessDeniedReason) {
    super(reason);
    this.name = "OAuthAccessDeniedError";
  }
}

export const isOAuthAccessDeniedError = (
  error: unknown
): error is OAuthAccessDeniedError => error instanceof OAuthAccessDeniedError;

export const ensureOAuthAccess = (email: string): void => {
  const normalized = email.toLowerCase();

  //@TODO: descomentar para producción
  /*   if (!normalized.endsWith(`@${allowedDomain}`)) {
      throw new OAuthAccessDeniedError("oauth_domain_not_allowed");
    } */

  //@TODO: Comentar para producción
  if (!testerEmails.has(normalized)) {
    throw new OAuthAccessDeniedError("oauth_not_tester");
  }
};
