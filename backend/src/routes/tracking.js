import { Router } from 'express';
import ReferralCode from '../models/ReferralCode.js';
import Item from '../models/Item.js';
import Program from '../models/Program.js';
import ReferralClick from '../models/ReferralClick.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.get('/:code', asyncHandler(async (req, res) => {
  const referral = await ReferralCode.findOne({ code: req.params.code.toUpperCase(), active: true });
  if (!referral) return res.status(404).json({ message: 'Referral link not found or inactive.' });
  const [item, program] = await Promise.all([Item.findById(referral.itemId), Program.findById(referral.programId)]);
  if (!item || item.status !== 'active' || !program || program.status !== 'active') return res.status(410).json({ message: 'This referral offer is no longer active.' });
  await ReferralCode.updateOne({ _id: referral._id, active: true }, { $inc: { clicks: 1 } });
  const click = await ReferralClick.create({ referralCodeId: referral._id, programId: program._id, itemId: item._id, affiliateId: referral.affiliateId, code: referral.code });
  res.json({ code: referral.code, clickId: click._id, clickedAt: click.clickedAt, item: { id: item._id, name: item.name, type: item.type, destinationUrl: item.destinationUrl }, program: { id: program._id, name: program.name, attributionWindowDays: program.attributionWindowDays }, affiliateId: referral.affiliateId });
}));
export default router;
