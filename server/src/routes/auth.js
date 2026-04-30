/**
 * Auth routes
 * POST /api/v1/auth/login
 * POST /api/v1/auth/logout
 * GET  /api/v1/auth/me
 * POST /api/v1/auth/refresh
 */

import { Router } from 'express';
import bcrypt from 'bcrypt';
import { SignJWT, jwtVerify } from 'jose';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../index.js';

const router = Router();

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'change-me-to-a-256-bit-secret-key'
);
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function setTokenCookie(res, token) {
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge,
  });
}

// ── POST /api/v1/auth/login ──
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user by email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    // NOTE: During migration, Base44 users won't have bcrypt hashes.
    // They'll need password reset. This assumes migrated data has bcrypt hashes.
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account deactivated' });
    }

    // Generate JWT
    const token = await new SignJWT({
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      allowed_modules: user.allowed_modules || [],
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRES_IN)
      .sign(JWT_SECRET);

    setTokenCookie(res, token);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        secondary_roles: user.secondary_roles,
        allowed_modules: user.allowed_modules,
        home_page_override: user.home_page_override,
        mobile_preferred: user.mobile_preferred,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/v1/auth/logout ──
router.post('/logout', (_req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

// ── GET /api/v1/auth/me ──
router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      full_name: true,
      role: true,
      secondary_roles: true,
      allowed_modules: true,
      home_page_override: true,
      mobile_preferred: true,
      is_active: true,
    },
  });

  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'User not found or deactivated' });
  }

  res.json({ user });
});

// ── POST /api/v1/auth/refresh ──
router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET, {
      clockTolerance: 60,
    });

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, full_name: true, allowed_modules: true, is_active: true },
    });

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User not found or deactivated' });
    }

    const newToken = await new SignJWT({
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      allowed_modules: user.allowed_modules || [],
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRES_IN)
      .sign(JWT_SECRET);

    setTokenCookie(res, newToken);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export { router as authRouter };
