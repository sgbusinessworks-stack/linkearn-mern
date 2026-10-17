import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import Program from './models/Program.js';
import Item from './models/Item.js';
import Membership from './models/Membership.js';
import ReferralCode from './models/ReferralCode.js';
import Conversion from './models/Conversion.js';
import Payout from './models/Payout.js';
import { ensureCodesForAffiliate } from './utils/referral.js';
import { commissionFor } from './utils/helpers.js';

try {
  await connectDB();
  let manager = await User.findOne({ email: 'manager@linkearn.demo' });
  if (!manager) manager = await User.create({ name: 'Maya Bennett', email: 'manager@linkearn.demo', password: 'Demo123!', role: 'manager' });
  let affiliate = await User.findOne({ email: 'affiliate@linkearn.demo' });
  if (!affiliate) affiliate = await User.create({ name: 'Arjun Das', email: 'affiliate@linkearn.demo', password: 'Demo123!', role: 'affiliate' });

  let program = await Program.findOne({ managerId: manager._id, name: 'Glow & Grow Partner Program' });
  if (!program) program = await Program.create({
    managerId: manager._id, name: 'Glow & Grow Partner Program',
    description: 'A thoughtful wellness collection for everyday routines. Reward trusted recommendations with clear, item-level tracking.',
    status: 'active', currency: 'INR', commissionType: 'percentage', commissionValue: 12,
    eligibleEvent: 'purchase', minOrderValue: 500, attributionWindowDays: 30,
    payoutMinimum: 500, terms: 'Commission is finalized after the 14-day refund window. Cancelled or refunded orders are not eligible. Payouts are reviewed by the program manager.'
  });
  const itemsToSeed = [
    { name: 'Everyday Wellness Kit', type: 'product', sku: 'GW-KIT-01', description: 'A starter bundle for a consistent daily wellness routine.', destinationUrl: 'https://example.com/wellness-kit' },
    { name: 'Personal Nutrition Session', type: 'service', sku: 'GW-SVC-02', description: 'A one-to-one session to turn healthy intentions into practical habits.', destinationUrl: 'https://example.com/nutrition-session' },
    { name: 'Monthly Wellness Membership', type: 'service', sku: 'GW-SUB-03', description: 'A monthly subscription with fresh guidance and member resources.', destinationUrl: 'https://example.com/membership' }
  ];
  const items = [];
  for (const itemData of itemsToSeed) {
    let item = await Item.findOne({ programId: program._id, name: itemData.name });
    if (!item) item = await Item.create({ programId: program._id, ...itemData });
    items.push(item);
  }
  let membership = await Membership.findOne({ programId: program._id, affiliateId: affiliate._id });
  if (!membership) membership = await Membership.create({ programId: program._id, affiliateId: affiliate._id, status: 'approved', reviewedAt: new Date() });
  else if (membership.status !== 'approved') { membership.status = 'approved'; await membership.save(); }
  const codes = await ensureCodesForAffiliate(program._id, affiliate._id, items);

  const conversionSeeds = [
    { item: items[0], code: codes.find(c => c.itemId.toString() === items[0]._id.toString()), orderId: 'DEMO-ORD-1001', amount: 2499, status: 'paid', note: 'Demo order, payout settled.' },
    { item: items[1], code: codes.find(c => c.itemId.toString() === items[1]._id.toString()), orderId: 'DEMO-ORD-1002', amount: 1499, status: 'approved', note: 'Eligible after review.' },
    { item: items[2], code: codes.find(c => c.itemId.toString() === items[2]._id.toString()), orderId: 'DEMO-ORD-1003', amount: 799, status: 'pending', note: 'Waiting for program manager review.' }
  ];
  const conversions = [];
  for (const itemData of conversionSeeds) {
    let conversion = await Conversion.findOne({ orderId: itemData.orderId, itemId: itemData.item._id });
    if (!conversion) conversion = await Conversion.create({
      programId: program._id, itemId: itemData.item._id, affiliateId: affiliate._id,
      referralCodeId: itemData.code._id, referralCode: itemData.code.code,
      orderId: itemData.orderId, amount: itemData.amount, commission: commissionFor(program, itemData.amount),
      eventType: 'purchase', status: itemData.status, note: itemData.note,
      convertedAt: new Date(Date.now() - (itemData.status === 'pending' ? 1 : itemData.status === 'approved' ? 4 : 9) * 86400000)
    });
    conversions.push(conversion);
  }
  const paidConversion = conversions.find(c => c.orderId === 'DEMO-ORD-1001');
  let payout = await Payout.findOne({ affiliateId: affiliate._id, programId: program._id, note: 'Demo settled payout' });
  if (!payout && paidConversion) payout = await Payout.create({
    affiliateId: affiliate._id, programId: program._id, conversionIds: [paidConversion._id], amount: paidConversion.commission,
    currency: program.currency, status: 'paid', method: 'Bank transfer', paymentReference: 'DEMO-UTR-10245', note: 'Demo settled payout', reviewedAt: new Date()
  });
  console.log('\nLinkEarn demo data is ready.');
  console.log('Manager : manager@linkearn.demo / Demo123!');
  console.log('Affiliate: affiliate@linkearn.demo / Demo123!');
  console.log('Program : ' + program.name);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
