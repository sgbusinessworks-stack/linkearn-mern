import ReferralCode from '../models/ReferralCode.js';
import { slugify } from './helpers.js';

export async function ensureCodesForAffiliate(programId, affiliateId, items) {
  const codes = [];
  for (const item of items) {
    let existing = await ReferralCode.findOne({ programId, itemId: item._id, affiliateId });
    if (existing) { if (!existing.active) { existing.active = true; await existing.save(); } codes.push(existing); continue; }
    const prefix = item.type === 'service' ? 'SVC' : 'PRD';
    const itemPart = slugify(item.name).slice(0, 10);
    const affiliatePart = affiliateId.toString().slice(-6).toUpperCase();
    let code = `${prefix}-${itemPart}-${affiliatePart}`;
    let suffix = 2;
    while (await ReferralCode.exists({ code })) code = `${prefix}-${itemPart}-${affiliatePart}-${suffix++}`;
    try {
      existing = await ReferralCode.create({ programId, itemId: item._id, affiliateId, code });
    } catch (error) {
      if (error.code !== 11000) throw error;
      existing = await ReferralCode.findOne({ programId, itemId: item._id, affiliateId });
    }
    if (existing) codes.push(existing);
  }
  return codes;
}
