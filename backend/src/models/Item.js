import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 140 },
  type: { type: String, enum: ['product', 'service'], required: true },
  sku: { type: String, trim: true, default: '' },
  description: { type: String, default: '', maxlength: 600 },
  destinationUrl: { type: String, default: '' },
  status: { type: String, enum: ['active', 'archived'], default: 'active' }
}, { timestamps: true });

export default mongoose.model('Item', itemSchema);
