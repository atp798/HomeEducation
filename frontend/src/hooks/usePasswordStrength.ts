export type Strength = 'weak' | 'medium' | 'strong';

export function checkPasswordStrength(password: string): Strength {
  if (!password || password.length < 6) return 'weak';
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const long = password.length >= 12;

  const score = [hasLetter, hasNumber, hasSpecial, long].filter(Boolean).length;
  if (score >= 3) return 'strong';
  if (score === 2) return 'medium';
  return 'weak';
}
