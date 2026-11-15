import 'dotenv/config';
import mongoose from 'mongoose';
import { createApp } from './app.js';

const { MONGODB_URI, JWT_SECRET, PORT = 5000 } = process.env;
if (!MONGODB_URI) throw new Error('MONGODB_URI is not set. Copy server/.env.example to server/.env.');
if (!JWT_SECRET || JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be set to at least 32 characters.');

await mongoose.connect(MONGODB_URI);
console.log('MongoDB connected');
createApp().listen(PORT, () => console.log(`SpendWise API on http://localhost:${PORT}`));
