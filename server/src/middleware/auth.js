/**
 * Authentication middleware
 * Verifies JWT from HTTP-only cookie and loads user with roles from DB
 */

import { jwtVerify } from 'jose';
import { prisma } from '../index.js';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'change-me-to-a-256-bit-secret-key'
);

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // DEV-läge: acceptera dev-token utan JWT-validering
    if (token === 'dev-token-admin') {
      req.user = {
        id: 'dev-admin-1',
        email: 'admin@lagerai.se',
        role: 'admin',
        systemRoles: ['admin'],
        full_name: 'Admin',
        allowed_modules: [],
      };
      return next();
    }

    const { payload } = await jwtVerify(token, JWT_SECRET, {
      clockTolerance: 60,
    });

    // Load user from DB to get real roles
    const dbUser = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    const systemRoles = [payload.role];
    if (dbUser?.secondary_roles && Array.isArray(dbUser.secondary_roles)) {
      systemRoles.push(...dbUser.secondary_roles);
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      systemRoles: [...new Set(systemRoles)],
      full_name: payload.full_name || dbUser?.full_name,
      allowed_modules: payload.allowed_modules || [],
    };

    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const userRoles = req.user.systemRoles || [req.user.role];
    if (!userRoles.some((r) => roles.includes(r))) {
      return res.status(403).json({ error: `Required role: ${roles.join(' or ')}` });
    }
    next();
  };
}
