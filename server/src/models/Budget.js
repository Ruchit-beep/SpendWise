import mongoose from 'mongoose';
import { EXPENSE_CATEGORIES, OVERALL } from '../constants.js';

const budgetSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    category: { type: String, enum: [OVERALL, ...EXPENSE_CATEGORIES], required: true },
    limit: { type: Number, required: true, min: 1 },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);
budgetSchema.index({ user: 1, month: 1, category: 1 }, { unique: true });

export default mongoose.model('Budget', budgetSchema);
