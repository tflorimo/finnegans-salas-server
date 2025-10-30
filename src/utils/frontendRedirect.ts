const frontendBase = process.env.FRONTEND_URL ?? "http://localhost:5173";
const callbackPath = process.env.FRONTEND_CALLBACK_PATH ?? "/auth/callback";

// Callback para usuarios que no tienen permisos de autenticación OAuth
export const buildFrontendCallbackUrl = (params: Record<string, string>): string => {
  const url = new URL(callbackPath, frontendBase);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
};
