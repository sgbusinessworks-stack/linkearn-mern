import mongoose from 'mongoose';

const conversionSchema = new mongoose.Schema({
  programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true, index: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  affiliateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  referralCodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReferralCode', required: true },
  clickId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReferralClick', default: null },
  referralCode: { type: String, required: true },
  orderId: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  commission: { type: Number, required: true, min: 0 },
  eventType: { type: String, enum: ['purchase', 'subscription', 'lead'], default: 'purchase' },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'paid'], default: 'pending' },
  customerRef: { type: String, default: '' },
  convertedAt: { type: Date, default: Date.now },
  note: { type: String, default: '' }
}, { timestamps: true });
conversionSchema.index({ orderId: 1, itemId: 1 }, { unique: true });
export default mongoose.model('Conversion', conversionSchema);
