import mongoose from 'mongoose';

const programSchema = new mongoose.Schema({
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, default: '', maxlength: 1000 },
  status: { type: String, enum: ['active', 'paused', 'draft'], default: 'active' },
  currency: { type: String, default: 'INR', uppercase: true, minlength: 3, maxlength: 3 },
  commissionType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
  commissionValue: { type: Number, required: true, min: 0 },
  eligibleEvent: { type: String, enum: ['purchase', 'subscription', 'lead'], default: 'purchase' },
  minOrderValue: { type: Number, default: 0, min: 0 },
  attributionWindowDays: { type: Number, default: 30, min: 1, max: 365 },
  payoutMinimum: { type: Number, default: 500, min: 0 },
  terms: { type: String, default: 'Commission is finalized after the order clears the refund window.' },
  allowRecurringCommission: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Program', programSchema);
