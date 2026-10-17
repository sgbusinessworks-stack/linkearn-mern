import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Link2, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, ErrorMessage } from '../components/UI';

function AuthFrame({ children, heading, subtitle, alternate }) {
  return (
    <div className="auth-page">
      <div className="auth-side">
        <div className="auth-brand">
          <span className="brand-mark"><Link2 size={22}/></span>
          <span>link<span>earn</span></span>
        </div>
        <div className="auth-story">
          <div className="auth-orb orb-one"/>
          <div className="auth-orb orb-two"/>
          <div className="auth-quote-mark">“</div>
          <h2>Good connections.<br/><em>Real rewards.</em></h2>
          <p>One simple place to grow your partner network, track every conversion, and reward the people who help you thrive.</p>
          <div className="auth-perks">
            <span><CheckCircle2 size={16}/> Transparent commissions</span>
            <span><CheckCircle2 size={16}/> Links that just work</span>
            <span><CheckCircle2 size={16}/> Payouts without guesswork</span>
          </div>
        </div>
        <div className="auth-side-foot">REFERRAL STUDIO <span>·</span> BUILT FOR GROWTH</div>
      </div>
      <div className="auth-main">
        <div className="auth-form-wrap">
          <div className="mobile-auth-brand"><span className="brand-mark"><Link2 size={20}/></span><strong>link<span>earn</span></strong></div>
          <div className="auth-kicker">YOUR PARTNER WORKSPACE</div>
          <h1>{heading}</h1>
          <p className="auth-subtitle">{subtitle}</p>
          {children}
          <div className="auth-alternate">{alternate}</div>
          <div className="auth-legal">By continuing, you agree to our <a href="#terms" onClick={e => e.preventDefault()}>Terms</a> and <a href="#privacy" onClick={e => e.preventDefault()}>Privacy Policy</a>.</div>
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { user, signIn } = useAuth(); const navigate = useNavigate();
  const [email, setEmail] = useState('manager@linkearn.demo'); const [password, setPassword] = useState('Demo123!'); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace/>;
  async function submit(e) { e.preventDefault(); setError(''); setBusy(true); try { await signIn(email, password); navigate('/'); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  return <AuthFrame heading="Welcome back" subtitle="Your next growth chapter starts here." alternate={<>New to LinkEarn? <Link to="/register">Create an affiliate account <ArrowRight size={14}/></Link></>}>
    <form className="auth-form" onSubmit={submit}><label>Email address<div className="input-with-icon"><Mail size={17}/><input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required placeholder="you@company.com"/></div></label><label>Password<div className="input-with-icon"><LockKeyhole size={17}/><input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required placeholder="Your password"/></div></label><div className="auth-form-meta"><span className="secure-note"><span className="secure-dot"/> Secure sign in</span><span className="demo-note">Demo credentials prefilled</span></div><ErrorMessage>{error}</ErrorMessage><Button type="submit" disabled={busy} className="auth-submit">{busy ? 'Signing in…' : 'Sign in to workspace'} <ArrowRight size={17}/></Button></form>
    <div className="demo-credentials"><div><span className="demo-label">DEMO MANAGER</span><span>manager@linkearn.demo</span></div><div><span className="demo-label">DEMO AFFILIATE</span><span>affiliate@linkearn.demo</span></div><p>Password for both: <b>Demo123!</b></p></div>
  </AuthFrame>;
}

export function RegisterPage() {
  const { user, signUp } = useAuth(); const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' }); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace/>;
  const change = e => setForm({ ...form, [e.target.name]: e.target.value });
  async function submit(e) { e.preventDefault(); setError(''); setBusy(true); try { await signUp(form.name, form.email, form.password); navigate('/programs'); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  return <AuthFrame heading="Join the network" subtitle="Create your affiliate account and start earning from trusted recommendations." alternate={<>Already have an account? <Link to="/login">Sign in <ArrowRight size={14}/></Link></>}>
    <form className="auth-form" onSubmit={submit}><label>Your name<div className="input-with-icon"><UserRound size={17}/><input name="name" value={form.name} onChange={change} autoComplete="name" required maxLength="100" placeholder="Name as you'd like it to appear"/></div></label><label>Email address<div className="input-with-icon"><Mail size={17}/><input type="email" name="email" value={form.email} onChange={change} autoComplete="email" required placeholder="you@example.com"/></div></label><label>Create password<div className="input-with-icon"><LockKeyhole size={17}/><input type="password" name="password" value={form.password} onChange={change} autoComplete="new-password" minLength="8" required placeholder="At least 8 characters"/></div></label><div className="signup-hint">Affiliate accounts are created instantly. Program managers review applications to their offers.</div><ErrorMessage>{error}</ErrorMessage><Button type="submit" disabled={busy} className="auth-submit">{busy ? 'Creating account…' : 'Create affiliate account'} <ArrowRight size={17}/></Button></form>
  </AuthFrame>;
}
