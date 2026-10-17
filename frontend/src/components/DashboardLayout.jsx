import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Activity, ArrowUpRight, Bell, ChevronDown, CircleHelp, CreditCard, ExternalLink, Grid2X2, LayoutDashboard, Link2, LogOut, Menu, Megaphone, Settings2, Users, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Avatar, IconButton } from './UI';
import { useState } from 'react';

const managerLinks = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/programs', label: 'Programs & offers', icon: Grid2X2 },
  { to: '/affiliates', label: 'Affiliates', icon: Users },
  { to: '/activity', label: 'Conversions', icon: Activity },
  { to: '/payouts', label: 'Payouts', icon: CreditCard }
];
const affiliateLinks = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/programs', label: 'Discover programs', icon: Grid2X2 },
  { to: '/links', label: 'My referral links', icon: Link2 },
  { to: '/activity', label: 'My conversions', icon: Activity },
  { to: '/payouts', label: 'Earnings & payouts', icon: CreditCard }
];

export default function DashboardLayout() {
  const { user, signOut } = useAuth();
  const links = user?.role === 'manager' ? managerLinks : affiliateLinks;
  const location = useLocation(); const navigate = useNavigate();
  const [mobileMenu, setMobileMenu] = useState(false);
  const activeLabel = [...managerLinks, ...affiliateLinks].find(item => item.to === location.pathname)?.label || 'Workspace';
  const menuItems = <>{links.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setMobileMenu(false)}><Icon size={18} strokeWidth={1.8}/><span>{label}</span>{label === 'Conversions' && <span className="nav-count">•</span>}</NavLink>)}</>;
  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand-lockup" onClick={() => navigate('/')}><span className="brand-mark"><Link2 size={21}/></span><span>link<span>earn</span><small>REFERRAL STUDIO</small></span></button>
      <div className="nav-section-label">WORKSPACE</div><nav className="side-nav">{menuItems}</nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={18}/></div><strong>Need a hand?</strong><p>Find your way around LinkEarn.</p><button onClick={() => alert('Help centre: add your support URL in the deployment settings.')}>Visit help centre <ArrowUpRight size={13}/></button></div><div className="sidebar-footer"><span className="online-dot"/> All systems operational</div></div>
    </aside>
    <div className="main-frame">
      <header className="topbar"><div className="topbar-left"><IconButton label="Open menu" className="mobile-menu-button" onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? <X size={19}/> : <Menu size={19}/>}</IconButton><div className="breadcrumb">Workspace <span>/</span> <b>{activeLabel}</b></div></div><div className="topbar-tools"><div className="topbar-plan"><span className="plan-dot"/>{user?.role === 'manager' ? 'Manager workspace' : 'Affiliate workspace'}</div><div className="topbar-divider"/><button className="notification-button" onClick={() => navigate(user?.role === 'manager' ? '/affiliates' : '/activity')} aria-label="View notifications"><Bell size={18}/><i/></button><div className="profile-menu"><Avatar name={user?.name} size="sm"/><div className="profile-text"><strong>{user?.name}</strong><span>{user?.role === 'manager' ? 'Program manager' : 'Affiliate partner'}</span></div><button className="profile-dropdown" title="Sign out" onClick={signOut}><LogOut size={16}/></button></div></div></header>
      {mobileMenu && <div className="mobile-menu">{menuItems}<button className="nav-link" onClick={signOut}><LogOut size={18}/><span>Sign out</span></button></div>}
      <main className="main-content"><Outlet/></main>
      <nav className="mobile-bottom-nav">{links.map(({to,label,icon:Icon,end})=><NavLink key={to} to={to} end={end} className={({isActive})=>`mobile-nav-item ${isActive?'active':''}`}><Icon size={18}/><span>{label==='Programs & offers'?'Programs':label==='Discover programs'?'Discover':label==='My referral links'?'Links':label==='Earnings & payouts'?'Payouts':label==='Conversions'?'Activity':label==='My conversions'?'Activity':label}</span></NavLink>)}</nav><footer className="mobile-footer"><span>© 2026 LinkEarn</span><span>Made for growth <span className="footer-spark">✳</span></span></footer>
    </div>
  </div>;
}
