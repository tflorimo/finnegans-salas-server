import type { CookieOptions, Response } from "express";
import dotenv from "dotenv";

dotenv.config();

const isProd = process.env.NODE_ENV === "production";

export const refreshCookieName = process.env.AUTH_REFRESH_COOKIE ?? "rt";
export const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
  path: process.env.AUTH_REFRESH_PATH ?? "/api/auth/refresh",
  maxAge: Number(process.env.AUTH_REFRESH_MAX_AGE_MS ?? 30 * 24 * 60 * 60 * 1000),
};

export const refreshCookieClearOptions: Pick<CookieOptions, "path" | "sameSite" | "secure"> = {
  path: refreshCookieOptions.path,
  sameSite: refreshCookieOptions.sameSite,
  secure: refreshCookieOptions.secure,
};

export const setRefreshCookie = (res: Response, token: string): void => {
  res.cookie(refreshCookieName, token, refreshCookieOptions);
};

export const clearRefreshCookie = (res: Response): void => {
  res.clearCookie(refreshCookieName, refreshCookieClearOptions);
};
