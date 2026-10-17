import { Router } from 'express';
import Program from '../models/Program.js';
import Conversion from '../models/Conversion.js';
import Payout from '../models/Payout.js';
import { protect, allowRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(protect);

router.get('/', asyncHandler(async (req, res) => {
  let query = {};
  if (req.user.role === 'affiliate') query.affiliateId = req.user._id;
  else {
    const programIds = (await Program.find({ managerId: req.user._id }).select('_id')).map(p => p._id);
    query.programId = { $in: programIds };
  }
  const payouts = await Payout.find(query).populate('affiliateId', 'name email').populate('programId', 'name currency').populate('conversionIds').sort({ createdAt: -1 }).lean();
  res.json(payouts);
}));

router.post('/', allowRoles('affiliate'), asyncHandler(async (req, res) => {
  const { programId, method = 'Bank transfer', note = '' } = req.body;
  const program = await Program.findById(programId);
  if (!program) return res.status(404).json({ message: 'Program not found.' });
  const approvedIds = (await Conversion.find({ affiliateId: req.user._id, programId, status: 'approved' }).select('_id commission')).map(c => ({ id: c._id, commission: c.commission }));
  const priorPayouts = await Payout.find({ affiliateId: req.user._id, programId, status: { $ne: 'rejected' } }).select('conversionIds');
  const reserved = new Set(priorPayouts.flatMap(p => p.conversionIds.map(id => id.toString())));
  const available = approvedIds.filter(c => !reserved.has(c.id.toString()));
  const amount = Math.round(available.reduce((sum, c) => sum + c.commission, 0) * 100) / 100;
  if (amount < program.payoutMinimum) return res.status(400).json({ message: `Your available balance must reach ${program.currency} ${program.payoutMinimum} before requesting a payout.` });
  if (!available.length) return res.status(400).json({ message: 'There is no approved commission available to cash out.' });
  const payout = await Payout.create({ affiliateId: req.user._id, programId, conversionIds: available.map(c => c.id), amount, currency: program.currency, method, note });
  res.status(201).json(payout);
}));

router.patch('/:id/status', allowRoles('manager'), asyncHandler(async (req, res) => {
  const { status, paymentReference = '', note = '' } = req.body;
  if (!['approved', 'paid', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid payout status.' });
  const programIds = (await Program.find({ managerId: req.user._id }).select('_id')).map(p => p._id);
  const payout = await Payout.findOne({ _id: req.params.id, programId: { $in: programIds } });
  if (!payout) return res.status(404).json({ message: 'Payout request not found.' });
  if (payout.status === 'paid') return res.status(409).json({ message: 'This payout is already marked paid.' });
  if (payout.status === 'rejected' && status !== 'approved') return res.status(409).json({ message: 'Rejected payout requests cannot be updated.' });
  payout.status = status;
  payout.paymentReference = String(paymentReference).slice(0, 120);
  payout.note = String(note).slice(0, 500);
  payout.reviewedAt = new Date();
  await payout.save();
  if (status === 'paid') await Conversion.updateMany({ _id: { $in: payout.conversionIds }, status: 'approved' }, { $set: { status: 'paid' } });
  res.json(payout);
}));

export default router;
