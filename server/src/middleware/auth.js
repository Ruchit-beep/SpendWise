import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const COOKIE = 'sw_token';
const WEEK = 7 * 24 * 60 * 60 * 1000;
const cookieOpts = () => ({ httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });

export function setSession(res, userId) {
  const token = jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie(COOKIE, token, { ...cookieOpts(), maxAge: WEEK });
}

export function clearSession(res) {
  res.clearCookie(COOKIE, cookieOpts());
}

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE];
    if (!token) return res.status(401).json({ error: 'Please log in to continue.' });
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      clearSession(res);
      return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
    }
    const user = await User.findById(payload.sub);
    if (!user) {
      clearSession(res);
      return res.status(401).json({ error: 'Account not found.' });
    }
    // A password change or reset signs out every session issued before it.
    if (user.passwordChangedAt && payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
      clearSession(res);
      return res.status(401).json({ error: 'Your password was changed. Please log in again.' });
    }
    req.user = user;
    next();
  } catch (e) {
    next(e);
  }
}
