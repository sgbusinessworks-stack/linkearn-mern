import { ArrowUpRight, CircleAlert, LoaderCircle, Plus, Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PageHeader({ eyebrow, title, subtitle, action }) {
  return <div className="page-header"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{subtitle && <p className="page-subtitle">{subtitle}</p>}</div>{action && <div className="page-actions">{action}</div>}</div>;
}
export function Button({ children, variant = 'primary', size = 'normal', className = '', ...props }) {
  return <button className={`btn btn-${variant} btn-${size} ${className}`} {...props}>{children}</button>;
}
export function IconButton({ children, label, className = '', ...props }) { return <button className={`icon-btn ${className}`} aria-label={label} title={label} {...props}>{children}</button>; }
export function StatCard({ icon: Icon, label, value, note, tone = 'mint' }) {
  return <div className="stat-card"><div className={`stat-icon tone-${tone}`}>{Icon && <Icon size={18} strokeWidth={2.1} />}</div><div className="stat-label">{label}</div><div className="stat-value">{value}</div>{note && <div className="stat-note">{note}</div>}</div>;
}
export function StatusBadge({ status }) {
  const clean = (status || 'unknown').toLowerCase();
  const labels = { active: 'Active', paused: 'Paused', draft: 'Draft', approved: 'Approved', pending: 'Pending', rejected: 'Rejected', paid: 'Paid', requested: 'Requested', product: 'Product', service: 'Service' };
  return <span className={`status-badge status-${clean}`}><span className="status-dot" />{labels[clean] || clean.replaceAll('_', ' ')}</span>;
}
export function Loading({ label = 'Loading your workspace' }) { return <div className="loading"><LoaderCircle className="spin" size={22} /><span>{label}</span></div>; }
export function ErrorMessage({ children }) { return children ? <div className="inline-error"><CircleAlert size={16} />{children}</div> : null; }
export function EmptyState({ icon: Icon, title, body, action }) { return <div className="empty-state"><div className="empty-icon">{Icon && <Icon size={24} />}</div><h3>{title}</h3><p>{body}</p>{action}</div>; }
export function SectionTitle({ title, subtitle, action }) { return <div className="section-title"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>; }
export function Avatar({ name = 'Member', size = 'md' }) {
  const initials = name.split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
  return <div className={`avatar avatar-${size}`}>{initials || 'M'}</div>;
}
export function LinkButton({ to, children }) { return <Link className="btn btn-secondary btn-small" to={to}>{children}<ArrowUpRight size={15}/></Link>; }
export function ApproveButtons({ onApprove, onReject, busy = false }) { return <div className="row-actions"><Button size="small" variant="success" disabled={busy} onClick={onApprove}><Check size={14} />Approve</Button><Button size="small" variant="ghost-danger" disabled={busy} onClick={onReject}><X size={14} />Reject</Button></div>; }
