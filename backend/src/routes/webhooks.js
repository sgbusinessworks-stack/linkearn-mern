import { Router } from 'express';
import { createConversionFromReferral } from './conversions.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.post('/conversion', asyncHandler(async (req, res) => {
  const expected = process.env.CONVERSION_WEBHOOK_SECRET;
  if (!expected || req.headers['x-webhook-secret'] !== expected) return res.status(401).json({ message: 'Invalid webhook secret.' });
  const { clickId, isRenewal = false } = req.body;
  if (!isRenewal && !clickId) return res.status(400).json({ message: 'clickId is required to validate the attribution window.' });
  const conversion = await createConversionFromReferral(req.body);
  res.status(201).json({ id: conversion._id, status: conversion.status, amount: conversion.amount, commission: conversion.commission, currency: 'program currency' });
}));
export default router;
