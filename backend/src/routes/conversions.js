import { Router } from 'express';
import Program from '../models/Program.js';
import Item from '../models/Item.js';
import Membership from '../models/Membership.js';
import ReferralCode from '../models/ReferralCode.js';
import Conversion from '../models/Conversion.js';
import ReferralClick from '../models/ReferralClick.js';
import Payout from '../models/Payout.js';
import { protect, allowRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { commissionFor } from '../utils/helpers.js';

export async function createConversionFromReferral({ code, orderId, amount, eventType = 'purchase', customerRef = '', note = '', clickId = null, isRenewal = false }) {
  if (!code || !orderId || !Number.isFinite(Number(amount)) || Number(amount) < 0) {
    const error = new Error('Referral code, order ID and a valid amount are required.'); error.status = 400; throw error;
  }
  const referral = await ReferralCode.findOne({ code: String(code).toUpperCase(), active: true });
  if (!referral) { const error = new Error('Referral code was not found or is inactive.'); error.status = 404; throw error; }
  const program = await Program.findOne({ _id: referral.programId, status: 'active' });
  const item = await Item.findOne({ _id: referral.itemId, programId: referral.programId, status: 'active' });
  if (!program || !item) { const error = new Error('This program or item is not currently active.'); error.status = 409; throw error; }
  if (eventType !== program.eligibleEvent && !(eventType === 'subscription' && program.eligibleEvent === 'purchase' && program.allowRecurringCommission)) {
    const error = new Error(`This program does not award commission for ${eventType} events.`); error.status = 400; throw error;
  }
  let click = null;
  if (isRenewal) {
    if (eventType !== 'subscription' || !program.allowRecurringCommission || !customerRef) {
      const error = new Error('Recurring commission requires an enabled subscription program and a stable customer reference.'); error.status = 400; throw error;
    }
    const priorSubscription = await Conversion.findOne({ programId: program._id, itemId: item._id, affiliateId: referral.affiliateId, customerRef: String(customerRef), eventType: 'subscription', clickId: { $ne: null }, status: { $in: ['approved', 'paid'] } });
    if (!priorSubscription) { const error = new Error('No approved, tracked subscription was found for this customer reference.'); error.status = 409; throw error; }
  } else if (clickId) {
    if (!/^[a-f\d]{24}$/i.test(String(clickId))) { const error = new Error('Click ID is invalid.'); error.status = 400; throw error; }
    click = await ReferralClick.findOne({ _id: clickId, referralCodeId: referral._id, code: referral.code });
    if (!click) { const error = new Error('Click ID does not match this referral code.'); error.status = 400; throw error; }
    const windowMs = Number(program.attributionWindowDays) * 24 * 60 * 60 * 1000;
    if (Date.now() - click.clickedAt.getTime() > windowMs || Date.now() < click.clickedAt.getTime()) { const error = new Error('The referral attribution window has expired.'); error.status = 409; throw error; }
  }
  if (Number(amount) < program.minOrderValue) { const error = new Error(`Order does not meet the minimum eligible value of ${program.currency} ${program.minOrderValue}.`); error.status = 400; throw error; }
  const membership = await Membership.findOne({ programId: program._id, affiliateId: referral.affiliateId, status: 'approved' });
  if (!membership) { const error = new Error('Affiliate is not approved for this program.'); error.status = 409; throw error; }
  const duplicate = await Conversion.findOne({ orderId: String(orderId).trim(), itemId: item._id });
  if (duplicate) { const error = new Error('This order has already been recorded for this item.'); error.status = 409; throw error; }
  const commission = commissionFor(program, Number(amount));
  const conversion = await Conversion.create({
    programId: program._id, itemId: item._id, affiliateId: referral.affiliateId,
    referralCodeId: referral._id, clickId: click?._id || null, referralCode: referral.code, orderId: String(orderId).trim(),
    amount: Number(amount), commission, eventType, customerRef: String(customerRef || '').slice(0, 100), note: String(note || '').slice(0, 500), status: 'pending'
  });
  return conversion;
}

const router = Router();
router.use(protect);

router.get('/', asyncHandler(async (req, res) => {
  const query = req.user.role === 'manager'
    ? { programId: { $in: (await Program.find({ managerId: req.user._id }).select('_id')).map(p => p._id) } }
    : { affiliateId: req.user._id };
  if (req.query.status && ['pending', 'approved', 'rejected', 'paid'].includes(req.query.status)) query.status = req.query.status;
  const rows = await Conversion.find(query).populate('programId', 'name currency').populate('itemId', 'name type').populate('affiliateId', 'name email').sort({ convertedAt: -1 }).limit(250).lean();
  res.json(rows);
}));

router.post('/', allowRoles('manager'), asyncHandler(async (req, res) => {
  const { code } = req.body;
  const referral = await ReferralCode.findOne({ code: String(code || '').toUpperCase(), active: true });
  if (!referral) return res.status(404).json({ message: 'Referral code was not found or is inactive.' });
  const ownedProgram = await Program.exists({ _id: referral.programId, managerId: req.user._id });
  if (!ownedProgram) return res.status(404).json({ message: 'Referral code was not found in your programs.' });
  const { orderId, amount, eventType = 'purchase', customerRef = '', note = '' } = req.body;
  const conversion = await createConversionFromReferral({ code, orderId, amount: Number(amount), eventType, customerRef, note });
  const populated = await Conversion.findById(conversion._id).populate('programId', 'name currency').populate('itemId', 'name type').populate('affiliateId', 'name email');
  res.status(201).json(populated);
}));

router.patch('/:id/status', allowRoles('manager'), asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected', 'pending'].includes(status)) return res.status(400).json({ message: 'Conversion status must be approved, rejected or pending.' });
  const managerProgramIds = (await Program.find({ managerId: req.user._id }).select('_id')).map(p => p._id);
  const conversion = await Conversion.findOne({ _id: req.params.id, programId: { $in: managerProgramIds } });
  if (!conversion) return res.status(404).json({ message: 'Conversion not found.' });
  if (conversion.status === 'paid') return res.status(409).json({ message: 'Paid conversions cannot be changed.' });
  const allocatedPayout = await Payout.exists({ conversionIds: conversion._id, status: { $ne: 'rejected' } });
  if (allocatedPayout) return res.status(409).json({ message: 'This commission is allocated to a payout request and cannot be changed until that payout is declined.' });
  conversion.status = status;
  await conversion.save();
  res.json(conversion);
}));

export default router;
