export function slugify(value = '') {
  return value.toString().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 16) || 'ITEM';
}

export function commissionFor(program, amount) {
  const base = program.commissionType === 'percentage'
    ? Number(amount) * Number(program.commissionValue) / 100
    : Number(program.commissionValue);
  return Math.max(0, Math.round(base * 100) / 100);
}

export function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt };
}
