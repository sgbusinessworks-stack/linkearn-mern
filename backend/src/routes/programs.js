import { Router } from 'express';
import mongoose from 'mongoose';
import Program from '../models/Program.js';
import Item from '../models/Item.js';
import Membership from '../models/Membership.js';
import ReferralCode from '../models/ReferralCode.js';
import { protect, allowRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ensureCodesForAffiliate } from '../utils/referral.js';

const router = Router();
router.use(protect);

router.get('/', asyncHandler(async (req, res) => {
  if (req.user.role === 'manager') {
    const programs = await Program.find({ managerId: req.user._id }).sort({ updatedAt: -1 }).lean();
    const ids = programs.map(p => p._id);
    const [items, memberships] = await Promise.all([
      Item.aggregate([{ $match: { programId: { $in: ids } } }, { $group: { _id: '$programId', count: { $sum: 1 } } }]),
      Membership.aggregate([{ $match: { programId: { $in: ids }, status: 'approved' } }, { $group: { _id: '$programId', count: { $sum: 1 } } }])
    ]);
    const itemMap = new Map(items.map(x => [x._id.toString(), x.count]));
    const affMap = new Map(memberships.map(x => [x._id.toString(), x.count]));
    return res.json(programs.map(p => ({ ...p, itemCount: itemMap.get(p._id.toString()) || 0, affiliateCount: affMap.get(p._id.toString()) || 0 })));
  }
  const memberships = await Membership.find({ affiliateId: req.user._id }).populate('programId').sort({ updatedAt: -1 });
  const joinedIds = memberships.map(m => m.programId?._id).filter(Boolean);
  const marketplace = await Program.find({ status: 'active', _id: { $nin: joinedIds } }).sort({ createdAt: -1 }).lean();
  const mapped = memberships.filter(m => m.programId).map(m => ({ ...m.programId.toObject(), membershipStatus: m.status }));
  res.json({ joined: mapped, discover: marketplace });
}));

router.get('/marketplace', allowRoles('affiliate'), asyncHandler(async (req, res) => {
  const mine = await Membership.find({ affiliateId: req.user._id }).select('programId');
  const programs = await Program.find({ status: 'active', _id: { $nin: mine.map(m => m.programId) } }).sort({ createdAt: -1 }).lean();
  const counts = await Promise.all(programs.map(p => Item.countDocuments({ programId: p._id, status: 'active' })));
  res.json(programs.map((p, i) => ({ ...p, itemCount: counts[i] })));
}));

router.post('/', allowRoles('manager'), asyncHandler(async (req, res) => {
  const { name, commissionType = 'percentage', commissionValue, description = '', status = 'active', currency = 'INR', eligibleEvent = 'purchase', minOrderValue = 0, attributionWindowDays = 30, payoutMinimum = 500, terms, allowRecurringCommission = false } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'Give your program a name.' });
  if (!['percentage', 'fixed'].includes(commissionType)) return res.status(400).json({ message: 'Commission type is invalid.' });
  if (!Number.isFinite(Number(commissionValue)) || Number(commissionValue) < 0 || (commissionType === 'percentage' && Number(commissionValue) > 100)) return res.status(400).json({ message: 'Enter a valid commission amount. Percentage must be 0–100.' });
  const program = await Program.create({ managerId: req.user._id, name: name.trim(), commissionType, commissionValue: Number(commissionValue), description, status, currency, eligibleEvent, minOrderValue: Number(minOrderValue) || 0, attributionWindowDays: Number(attributionWindowDays) || 30, payoutMinimum: Number(payoutMinimum) || 0, terms, allowRecurringCommission });
  res.status(201).json(program);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Program not found.' });
  const program = await Program.findById(req.params.id).lean();
  if (!program || (req.user.role === 'manager' && program.managerId.toString() !== req.user._id.toString())) return res.status(404).json({ message: 'Program not found.' });
  const membership = await Membership.findOne({ programId: program._id, affiliateId: req.user._id });
  if (req.user.role === 'affiliate' && program.status !== 'active' && !membership) return res.status(404).json({ message: 'Program not found.' });
  const items = await Item.find({ programId: program._id, ...(req.user.role === 'affiliate' ? { status: 'active' } : {}) }).sort({ createdAt: -1 }).lean();
  const members = req.user.role === 'manager'
    ? await Membership.find({ programId: program._id }).populate('affiliateId', 'name email').sort({ createdAt: -1 }).lean()
    : [];
  res.json({ ...program, items, membershipStatus: membership?.status || null, members });
}));

router.patch('/:id', allowRoles('manager'), asyncHandler(async (req, res) => {
  const program = await Program.findOne({ _id: req.params.id, managerId: req.user._id });
  if (!program) return res.status(404).json({ message: 'Program not found.' });
  const allowed = ['name', 'description', 'status', 'currency', 'commissionType', 'commissionValue', 'eligibleEvent', 'minOrderValue', 'attributionWindowDays', 'payoutMinimum', 'terms', 'allowRecurringCommission'];
  for (const key of allowed) if (req.body[key] !== undefined) program[key] = req.body[key];
  if (program.commissionType === 'percentage' && (program.commissionValue < 0 || program.commissionValue > 100)) return res.status(400).json({ message: 'Percentage commission must be between 0 and 100.' });
  await program.save();
  res.json(program);
}));

router.post('/:id/join', allowRoles('affiliate'), asyncHandler(async (req, res) => {
  const program = await Program.findOne({ _id: req.params.id, status: 'active' });
  if (!program) return res.status(404).json({ message: 'This program is not accepting affiliates.' });
  let membership = await Membership.findOne({ programId: program._id, affiliateId: req.user._id });
  if (membership?.status === 'rejected') {
    membership.status = 'pending';
    membership.joinedAt = new Date();
    membership.reviewedAt = null;
    await membership.save();
  } else if (!membership) {
    try { membership = await Membership.create({ programId: program._id, affiliateId: req.user._id, status: 'pending' }); }
    catch (error) {
      if (error.code !== 11000) throw error;
      membership = await Membership.findOne({ programId: program._id, affiliateId: req.user._id });
    }
  }
  res.status(201).json({ membershipStatus: membership.status, message: membership.status === 'approved' ? 'You are already part of this program.' : membership.status === 'pending' && membership.reviewedAt === null ? 'Application submitted. The program manager will review it.' : 'Application status updated.' });
}));

router.post('/:id/items', allowRoles('manager'), asyncHandler(async (req, res) => {
  const program = await Program.findOne({ _id: req.params.id, managerId: req.user._id });
  if (!program) return res.status(404).json({ message: 'Program not found.' });
  const { name, type, sku = '', description = '', destinationUrl = '' } = req.body;
  if (!name?.trim() || !['product', 'service'].includes(type)) return res.status(400).json({ message: 'Item name and a valid type are required.' });
  if (destinationUrl && !/^https?:\/\//i.test(destinationUrl)) return res.status(400).json({ message: 'Destination URL must start with http:// or https://.' });
  const item = await Item.create({ programId: program._id, name: name.trim(), type, sku, description, destinationUrl });
  const approved = await Membership.find({ programId: program._id, status: 'approved' }).select('affiliateId');
  for (const member of approved) await ensureCodesForAffiliate(program._id, member.affiliateId, [item]);
  res.status(201).json(item);
}));

router.patch('/:id/items/:itemId', allowRoles('manager'), asyncHandler(async (req, res) => {
  const program = await Program.findOne({ _id: req.params.id, managerId: req.user._id });
  const item = await Item.findOne({ _id: req.params.itemId, programId: req.params.id });
  if (!program || !item) return res.status(404).json({ message: 'Item not found.' });
  for (const key of ['name', 'type', 'sku', 'description', 'destinationUrl', 'status']) if (req.body[key] !== undefined) item[key] = req.body[key];
  if (item.destinationUrl && !/^https?:\/\//i.test(item.destinationUrl)) return res.status(400).json({ message: 'Destination URL must start with http:// or https://.' });
  if (!['product', 'service'].includes(item.type)) return res.status(400).json({ message: 'Item type must be product or service.' });
  await item.save();
  res.json(item);
}));

router.get('/:id/codes', asyncHandler(async (req, res) => {
  if (req.user.role === 'manager') {
    const ownsProgram = await Program.exists({ _id: req.params.id, managerId: req.user._id });
    if (!ownsProgram) return res.status(404).json({ message: 'Program not found.' });
    const codes = await ReferralCode.find({ programId: req.params.id }).populate('itemId', 'name type destinationUrl').populate('affiliateId', 'name email').sort({ createdAt: -1 }).lean();
    return res.json(codes);
  }
  const membership = await Membership.findOne({ programId: req.params.id, affiliateId: req.user._id, status: 'approved' });
  if (!membership) return res.status(403).json({ message: 'Your application must be approved before you can access referral links.' });
  const program = await Program.findById(req.params.id);
  const items = await Item.find({ programId: req.params.id, status: 'active' });
  const codes = await ensureCodesForAffiliate(program._id, req.user._id, items);
  const codesWithItems = await ReferralCode.find({ _id: { $in: codes.map(c => c._id) } }).populate('itemId', 'name type destinationUrl').sort({ createdAt: -1 }).lean();
  res.json(codesWithItems);
}));

router.patch('/:id/members/:affiliateId', allowRoles('manager'), asyncHandler(async (req, res) => {
  const program = await Program.findOne({ _id: req.params.id, managerId: req.user._id });
  if (!program) return res.status(404).json({ message: 'Program not found.' });
  const { status } = req.body;
  if (!['approved', 'rejected', 'pending'].includes(status)) return res.status(400).json({ message: 'Invalid membership status.' });
  const membership = await Membership.findOneAndUpdate({ programId: program._id, affiliateId: req.params.affiliateId }, { status, reviewedAt: new Date() }, { new: true }).populate('affiliateId', 'name email');
  if (!membership) return res.status(404).json({ message: 'Affiliate application not found.' });
  if (status === 'approved') {
    const items = await Item.find({ programId: program._id, status: 'active' });
    await ensureCodesForAffiliate(program._id, membership.affiliateId._id, items);
  } else {
    await ReferralCode.updateMany({ programId: program._id, affiliateId: membership.affiliateId._id }, { $set: { active: false } });
  }
  res.json(membership);
}));

export default router;
