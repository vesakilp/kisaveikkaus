import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// Validate JWT_SECRET is properly set
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error(
    "JWT_SECRET environment variable must be set and at least 32 characters long. " +
    "Generate a secure secret with: openssl rand -base64 32"
  );
}

const secret = new TextEncoder().encode(JWT_SECRET);

export interface SessionUser {
  id: number;
  email: string;
  displayName: string;
  isAdmin: boolean;
}

/**
 * Create a session token
 */
export async function createSession(user: SessionUser): Promise<string> {
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(secret);

  return token;
}

/**
 * Verify and decode a session token
 */
export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.user as SessionUser;
  } catch {
    return null;
  }
}

/**
 * Get the current session from cookies
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) {
    return null;
  }

  return verifySession(token);
}

/**
 * Set session cookie
 */
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

/**
 * Clear session cookie
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

/**
 * Check if user is admin
 */
export async function requireAdmin(): Promise<SessionUser> {
  const session = await getSession();
  
  if (!session) {
    throw new Error("Unauthorized");
  }

  if (!session.isAdmin) {
    throw new Error("Forbidden - Admin access required");
  }

  return session;
}

/**
 * Check if user is authenticated
 */
export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  
  if (!session) {
    throw new Error("Unauthorized");
  }

  return session;
}
