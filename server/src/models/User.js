import mongoose from 'mongoose';
import { CURRENCIES, THEMES } from '../constants.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, select: false }, // absent for accounts created with Google until a password is set
    hasPassword: { type: Boolean, default: true },
    googleId: { type: String, unique: true, sparse: true },
    passwordChangedAt: { type: Date },
    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
    phone: { type: String, trim: true, maxlength: 30, default: '' },
    occupation: { type: String, trim: true, maxlength: 80, default: '' },
    bio: { type: String, trim: true, maxlength: 300, default: '' },
    currency: { type: String, enum: CURRENCIES, default: 'INR' },
    theme: { type: String, enum: THEMES, default: 'light' },
    monthlyBudgetPref: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true }
);

userSchema.methods.toSafe = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    phone: this.phone,
    occupation: this.occupation,
    bio: this.bio,
    currency: this.currency,
    theme: this.theme,
    monthlyBudgetPref: this.monthlyBudgetPref,
    hasPassword: this.hasPassword !== false,
    googleLinked: !!this.googleId,
    createdAt: this.createdAt,
  };
};

export default mongoose.model('User', userSchema);
