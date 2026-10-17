import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import DashboardLayout from './components/DashboardLayout';
import { Loading } from './components/UI';
import OverviewPage from './pages/OverviewPage';
import ProgramsPage from './pages/ProgramsPage';
import ProgramDetailPage from './pages/ProgramDetailPage';
import LinksPage from './pages/LinksPage';
import ActivityPage from './pages/ActivityPage';
import AffiliatesPage from './pages/AffiliatesPage';
import PayoutsPage from './pages/PayoutsPage';
import ReferralRedirectPage from './pages/ReferralRedirectPage';
import { LoginPage, RegisterPage } from './pages/AuthPages';

function RequireAuth({ children }) { const { user, ready } = useAuth(); if (!ready) return <div className="auth-loading"><Loading/></div>; return user ? children : <Navigate to="/login" replace/>; }
function RoleGate({ role, children }) { const { user } = useAuth(); return user?.role === role ? children : <Navigate to="/" replace/>; }
function PublicOnly({ children }) { const { user, ready } = useAuth(); if (!ready) return <div className="auth-loading"><Loading/></div>; return user ? <Navigate to="/" replace/> : children; }
function MissingPage() { return <div className="not-found"><div className="not-found-code">404</div><h1>This link took a wrong turn.</h1><p>The page may have moved, or it might never have existed.</p><a className="btn btn-primary" href="/">Back to workspace</a></div>; }

export default function App() {
 return <Routes>
  <Route path="/r/:code" element={<ReferralRedirectPage/>}/>
  <Route path="/login" element={<PublicOnly><LoginPage/></PublicOnly>}/>
  <Route path="/register" element={<PublicOnly><RegisterPage/></PublicOnly>}/>
  <Route path="/" element={<RequireAuth><DashboardLayout/></RequireAuth>}>
   <Route index element={<OverviewPage/>}/>
   <Route path="programs" element={<ProgramsPage/>}/>
   <Route path="programs/:id" element={<ProgramDetailPage/>}/>
   <Route path="links" element={<RoleGate role="affiliate"><LinksPage/></RoleGate>}/>
   <Route path="activity" element={<ActivityPage/>}/>
   <Route path="affiliates" element={<RoleGate role="manager"><AffiliatesPage/></RoleGate>}/>
   <Route path="payouts" element={<PayoutsPage/>}/>
   <Route path="*" element={<MissingPage/>}/>
  </Route>
  <Route path="*" element={<MissingPage/>}/>
 </Routes>;
}
