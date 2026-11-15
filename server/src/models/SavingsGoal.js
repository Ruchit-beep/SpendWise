import mongoose from 'mongoose';

const goalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    targetAmount: { type: Number, required: true, min: 1 },
    savedAmount: { type: Number, default: 0, min: 0 },
    targetDate: { type: Date, default: null },
    description: { type: String, trim: true, maxlength: 300, default: '' },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('SavingsGoal', goalSchema);
