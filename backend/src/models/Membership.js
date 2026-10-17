import mongoose from 'mongoose';

const membershipSchema = new mongoose.Schema({
  programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true, index: true },
  affiliateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  joinedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date, default: null }
}, { timestamps: true });
membershipSchema.index({ programId: 1, affiliateId: 1 }, { unique: true });
export default mongoose.model('Membership', membershipSchema);
