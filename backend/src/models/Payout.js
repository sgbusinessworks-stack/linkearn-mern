import mongoose from 'mongoose';

const payoutSchema = new mongoose.Schema({
  affiliateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true },
  conversionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Conversion', required: true }],
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['requested', 'approved', 'paid', 'rejected'], default: 'requested' },
  method: { type: String, default: 'Bank transfer' },
  paymentReference: { type: String, default: '' },
  note: { type: String, default: '' },
  reviewedAt: { type: Date, default: null }
}, { timestamps: true });
export default mongoose.model('Payout', payoutSchema);
