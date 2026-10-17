import mongoose from 'mongoose';

const referralCodeSchema = new mongoose.Schema({
  programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true, index: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true, index: true },
  affiliateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  code: { type: String, required: true, unique: true, uppercase: true, index: true },
  clicks: { type: Number, default: 0 },
  active: { type: Boolean, default: true }
}, { timestamps: true });
referralCodeSchema.index({ programId: 1, itemId: 1, affiliateId: 1 }, { unique: true });
export default mongoose.model('ReferralCode', referralCodeSchema);
