import { User } from '@/types';

// This is a simple demo implementation
// In production, use proper authentication like NextAuth.js, Clerk, or Auth0
export const AUTH_COOKIE_NAME = 'auth-token';

export function validateCredentials(email: string, password: string): User | null {
  // Demo credentials - replace with actual API call
  if (email === 'admin@example.com' && password === 'admin123') {
    return {
      id: '1',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin'
    };
  }
  return null;
}

export function generateToken(user: User): string {
  // In production, use proper JWT tokens
  return Buffer.from(JSON.stringify(user)).toString('base64');
}

export function verifyToken(token: string): User | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    return JSON.parse(decoded) as User;
  } catch {
    return null;
  }
}
