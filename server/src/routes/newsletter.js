import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import Subscriber from '../models/Subscriber.js';
import { wrap } from '../middleware/error.js';

const router = Router();
const limiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: process.env.NODE_ENV === 'test' ? 1000 : 10, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many requests. Try again later.' } });

router.post(
  '/',
  limiter,
  wrap(async (req, res) => {
    const { email } = z.object({ email: z.string().trim().toLowerCase().email('Please enter a valid email address.') }).parse(req.body);
    await Subscriber.updateOne({ email }, { $setOnInsert: { email } }, { upsert: true });
    res.status(201).json({ message: "You're on the list. Thanks for subscribing!" });
  })
);

export default router;
