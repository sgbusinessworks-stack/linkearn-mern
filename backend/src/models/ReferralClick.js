import mongoose from 'mongoose';

const referralClickSchema = new mongoose.Schema({
  referralCodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReferralCode', required: true, index: true },
  programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true, index: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  affiliateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  code: { type: String, required: true, uppercase: true },
  clickedAt: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

export default mongoose.model('ReferralClick', referralClickSchema);
