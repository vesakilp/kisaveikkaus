import bcrypt from "bcryptjs";

/**
 * Validates password strength
 * Requirements:
 * - At least 8 characters
 * - Contains at least one uppercase letter
 * - Contains at least one lowercase letter
 * - Contains at least one number
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: "Salasanan täytyy olla vähintään 8 merkkiä pitkä" };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Salasanassa täytyy olla vähintään yksi iso kirjain" };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "Salasanassa täytyy olla vähintään yksi pieni kirjain" };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Salasanassa täytyy olla vähintään yksi numero" };
  }

  return { valid: true };
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Validate email format
 */
export function validateEmail(email: string): {
  valid: boolean;
  normalizedEmail?: string;
  error?: string;
} {
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail.length === 0 || normalizedEmail.length > 254) {
    return { valid: false, error: "Virheellinen sähköpostiosoite" };
  }

  if (normalizedEmail.includes(" ")) {
    return { valid: false, error: "Virheellinen sähköpostiosoite" };
  }

  const atIndex = normalizedEmail.indexOf("@");
  if (atIndex <= 0 || atIndex !== normalizedEmail.lastIndexOf("@")) {
    return { valid: false, error: "Virheellinen sähköpostiosoite" };
  }

  const localPart = normalizedEmail.slice(0, atIndex);
  const domainPart = normalizedEmail.slice(atIndex + 1);

  if (!localPart || !domainPart || !domainPart.includes(".")) {
    return { valid: false, error: "Virheellinen sähköpostiosoite" };
  }

  if (
    domainPart.startsWith(".") ||
    domainPart.endsWith(".") ||
    domainPart.includes("..") ||
    localPart.includes("..")
  ) {
    return { valid: false, error: "Virheellinen sähköpostiosoite" };
  }

  return { valid: true, normalizedEmail };
}

/**
 * Validate display name
 */
export function validateDisplayName(displayName: string): { valid: boolean; error?: string } {
  if (displayName.trim().length < 2) {
    return { valid: false, error: "Näyttönimen täytyy olla vähintään 2 merkkiä pitkä" };
  }

  if (displayName.trim().length > 50) {
    return { valid: false, error: "Näyttönimi voi olla enintään 50 merkkiä pitkä" };
  }

  return { valid: true };
}
