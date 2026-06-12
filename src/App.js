import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import './index.css';
import { LayoutDashboard, Users, MapPin, FileText, Receipt, Bell, MessageSquare, Settings, CheckSquare, LogOut } from 'lucide-react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import Login         from './pages/Login';
import Dashboard     from './pages/Dashboard';
import Tenants       from './pages/Tenants';
import TenantDetail  from './pages/TenantDetail';
import Parcels       from './pages/Parcels';
import Leases        from './pages/Leases';
import Invoices      from './pages/Invoices';
import Communications from './pages/Communications';
import Tasks         from './pages/Tasks';

const NAV = [
  { section: 'Main' },
  { path: '/',               label: 'Dashboard',     Icon: LayoutDashboard },
  { path: '/tenants',        label: 'Tenants',        Icon: Users },
  { path: '/parcels',        label: 'Lots',           Icon: MapPin },
  { path: '/leases',         label: 'Leases',         Icon: FileText },
  { section: 'Billing' },
  { path: '/invoices',       label: 'Invoices',       Icon: Receipt },
  { path: '/followups',      label: 'Follow-ups',     Icon: Bell },
  { section: 'Tools' },
  { path: '/tasks',          label: 'Tasks',          Icon: CheckSquare },
  { path: '/communications', label: 'Communications', Icon: MessageSquare },
  { path: '/settings',       label: 'Settings',       Icon: Settings },
];

const PAGE_TITLES = {
  '/':               'Dashboard',
  '/tenants':        'Tenants',
  '/parcels':        'Lots & Parcels',
  '/leases':         'Leases',
  '/invoices':       'Invoices',
  '/followups':      'Follow-ups',
  '/tasks':          'Tasks',
  '/communications': 'Communications',
  '/settings':       'Settings',
};

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, displayName } = useAuth();
  const base = '/' + location.pathname.split('/')[1];

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-name">Dotsero</div>
        <div className="sidebar-logo-sub">C&amp;C Ventures LLC</div>
      </div>
      {NAV.map((item, i) => {
        if (item.section) return <div key={i} className="sidebar-section">{item.section}</div>;
        const active = base === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
        return (
          <div key={item.path} className={`nav-item ${active ? 'active' : ''}`} onClick={() => navigate(item.path)}>
            <item.Icon size={16}/> {item.label}
          </div>
        );
      })}
      <div style={{marginTop:'auto', padding:'1rem 1.25rem', borderTop:'1px solid rgba(255,255,255,0.08)'}}>
        <div style={{fontSize:12,color:'var(--slate-light)',marginBottom:8}}>{displayName}</div>
        <button
          onClick={signOut}
          style={{
            display:'flex', alignItems:'center', gap:8,
            background:'none', border:'none', color:'rgba(255,255,255,0.5)',
            fontSize:13, cursor:'pointer', padding:0,
          }}
        >
          <LogOut size={14}/> Sign out
        </button>
      </div>
    </div>
  );
}

function Topbar() {
  const location = useLocation();
  const base = '/' + location.pathname.split('/')[1];
  const title = PAGE_TITLES[base] || 'Dotsero';
  const today = new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="topbar-title">{title}</div>
        <div className="topbar-sub">{today}</div>
      </div>
    </div>
  );
}

function AppShell() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--slate)'}}>
      <div className="spinner" style={{width:28,height:28,borderColor:'rgba(255,255,255,0.2)',borderTopColor:'white'}}/>
    </div>
  );

  if (!user) return <Login />;

  return (
    <div className="shell">
      <Sidebar />
      <div className="main">
        <Topbar />
        <Routes>
          <Route path="/"                   element={<Dashboard />} />
          <Route path="/tenants"            element={<Tenants />} />
          <Route path="/tenants/:id"        element={<TenantDetail />} />
          <Route path="/parcels"            element={<Parcels />} />
          <Route path="/leases"             element={<Leases />} />
          <Route path="/invoices"           element={<Invoices />} />
          <Route path="/tasks"              element={<Tasks />} />
          <Route path="/communications"     element={<Communications />} />
          <Route path="*"                   element={<div className="page-content"><p style={{color:'var(--slate-light)'}}>Page coming soon.</p></div>} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
}
