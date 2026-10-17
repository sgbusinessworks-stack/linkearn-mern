import { Router } from 'express';
import mongoose from 'mongoose';
import Program from '../models/Program.js';
import Item from '../models/Item.js';
import Membership from '../models/Membership.js';
import ReferralCode from '../models/ReferralCode.js';
import Conversion from '../models/Conversion.js';
import Payout from '../models/Payout.js';
import { protect, allowRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(protect);

router.get('/overview', asyncHandler(async (req, res) => {
  if (req.user.role === 'manager') {
    const programs = await Program.find({ managerId: req.user._id }).select('_id name status');
    const ids = programs.map(p => p._id);
    const [items, members, conversions, pendingConversions, payouts, recent] = await Promise.all([
      Item.countDocuments({ programId: { $in: ids }, status: 'active' }),
      Membership.countDocuments({ programId: { $in: ids }, status: 'approved' }),
      Conversion.find({ programId: { $in: ids } }).lean(),
      Conversion.countDocuments({ programId: { $in: ids }, status: 'pending' }),
      Payout.find({ programId: { $in: ids } }).lean(),
      Conversion.find({ programId: { $in: ids } }).populate('affiliateId', 'name').populate('itemId', 'name').sort({ convertedAt: -1 }).limit(6).lean()
    ]);
    const pendingPayouts = payouts.filter(p => ['requested', 'approved'].includes(p.status)).reduce((s, p) => s + p.amount, 0);
    const paid = conversions.filter(c => c.status === 'paid').reduce((s, c) => s + c.commission, 0);
    const approved = conversions.filter(c => c.status === 'approved').reduce((s, c) => s + c.commission, 0);
    const pending = conversions.filter(c => c.status === 'pending').reduce((s, c) => s + c.commission, 0);
    const sales = conversions.filter(c => c.status !== 'rejected').reduce((s, c) => s + c.amount, 0);
    const totalClicks = await ReferralCode.aggregate([{ $match: { programId: { $in: ids } } }, { $group: { _id: null, total: { $sum: '$clicks' } } }]);
    return res.json({ role: 'manager', stats: { programs: programs.length, items, affiliates: members, clicks: totalClicks[0]?.total || 0, sales, conversions: conversions.length, pendingCommission: pending, approvedCommission: approved, paidCommission: paid, pendingConversions, pendingPayouts }, programs, recent });
  }

  const memberships = await Membership.find({ affiliateId: req.user._id, status: 'approved' }).select('programId');
  const programIds = memberships.map(m => m.programId);
  const [conversions, codes, programs, payoutDocs, recent] = await Promise.all([
    Conversion.find({ affiliateId: req.user._id }).lean(),
    ReferralCode.find({ affiliateId: req.user._id }).lean(),
    Program.find({ _id: { $in: programIds } }).lean(),
    Payout.find({ affiliateId: req.user._id }).lean(),
    Conversion.find({ affiliateId: req.user._id }).populate('programId', 'name').populate('itemId', 'name').sort({ convertedAt: -1 }).limit(6).lean()
  ]);
  const reservedConversionIds = new Set(payoutDocs.filter(p => p.status !== 'rejected').flatMap(p => p.conversionIds.map(id => id.toString())));
  const earned = conversions.filter(c => ['approved', 'paid'].includes(c.status)).reduce((s, c) => s + c.commission, 0);
  const paid = conversions.filter(c => c.status === 'paid').reduce((s, c) => s + c.commission, 0);
  const pending = conversions.filter(c => c.status === 'pending').reduce((s, c) => s + c.commission, 0);
  const available = conversions.filter(c => c.status === 'approved' && !reservedConversionIds.has(c._id.toString())).reduce((s, c) => s + c.commission, 0);
  const approvedPayouts = payoutDocs.filter(p => ['requested', 'approved'].includes(p.status)).reduce((s, p) => s + p.amount, 0);
  const totalClicks = codes.reduce((s, c) => s + c.clicks, 0);
  res.json({ role: 'affiliate', stats: { programs: programs.length, clicks: totalClicks, conversions: conversions.length, conversionRate: totalClicks ? conversions.length / totalClicks * 100 : 0, earned, paid, pending, available, reserved: approvedPayouts }, programs, recent, payouts: payoutDocs });
}));

router.get('/manager/affiliates', allowRoles('manager'), asyncHandler(async (req, res) => {
  const programs = await Program.find({ managerId: req.user._id }).select('_id name');
  const memberships = await Membership.find({ programId: { $in: programs.map(p => p._id) } }).populate('affiliateId', 'name email createdAt active').populate('programId', 'name').sort({ createdAt: -1 }).lean();
  res.json(memberships.map(m => ({ ...m, affiliateId: m.affiliateId, programId: m.programId })));
}));

export default router;
