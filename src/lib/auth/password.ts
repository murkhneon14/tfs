import bcrypt from "bcryptjs";

const BCRYPT_SALT_ROUNDS = 12;

export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates password strength according to security best practices:
 * - Minimum 8 characters
 * - Maximum 72 characters (bcrypt hard limit)
 * - Contains at least one letter and one numeric digit
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password is required." };
  }

  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters long." };
  }

  if (password.length > 72) {
    return { valid: false, error: "Password cannot exceed 72 characters." };
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasLetter || !hasNumber) {
    return { valid: false, error: "Password must include at least one letter and one number." };
  }

  return { valid: true };
}

/**
 * Hashes a plaintext password using bcrypt with salt rounds = 12.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Verifies a plaintext password against a stored bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
