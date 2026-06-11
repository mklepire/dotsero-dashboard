import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import './index.css';
import { LayoutDashboard, Users, MapPin, FileText, Receipt, Bell, MessageSquare, Settings } from 'lucide-react';
import Dashboard      from './pages/Dashboard';
import Tenants        from './pages/Tenants';
import TenantDetail   from './pages/TenantDetail';
import Parcels        from './pages/Parcels';
import Leases         from './pages/Leases';
import Invoices       from './pages/Invoices';
import Communications from './pages/Communications';

const NAV = [
  { section: 'Main' },
  { path: '/',              label: 'Dashboard',      Icon: LayoutDashboard },
  { path: '/tenants',       label: 'Tenants',         Icon: Users },
  { path: '/parcels',       label: 'Lots',            Icon: MapPin },
  { path: '/leases',        label: 'Leases',          Icon: FileText },
  { section: 'Billing' },
  { path: '/invoices',      label: 'Invoices',        Icon: Receipt },
  { path: '/followups',     label: 'Follow-ups',      Icon: Bell },
  { section: 'Tools' },
  { path: '/communications',label: 'Communications',  Icon: MessageSquare },
  { path: '/settings',      label: 'Settings',        Icon: Settings },
];

const PAGE_TITLES = {
  '/':               'Dashboard',
  '/tenants':        'Tenants',
  '/parcels':        'Lots & Parcels',
  '/leases':         'Leases',
  '/invoices':       'Invoices',
  '/followups':      'Follow-ups',
  '/communications': 'Communications',
  '/settings':       'Settings',
};

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
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
    </div>
  );
}

function Topbar() {
  const location = useLocation();
  const base = '/' + location.pathname.split('/')[1];
  const title = PAGE_TITLES[base] || 'Dotsero';
  const today = new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="topbar-title">{title}</div>
        <div className="topbar-sub">{today}</div>
      </div>
    </div>
  );
}

function Layout() {
  return (
    <div className="shell">
      <Sidebar />
      <div className="main">
        <Topbar />
        <Routes>
          <Route path="/"                  element={<Dashboard />} />
          <Route path="/tenants"           element={<Tenants />} />
          <Route path="/tenants/:id"       element={<TenantDetail />} />
          <Route path="/parcels"           element={<Parcels />} />
          <Route path="/leases"            element={<Leases />} />
          <Route path="/invoices"          element={<Invoices />} />
          <Route path="/communications"    element={<Communications />} />
          <Route path="*"                  element={<div className="page-content"><p style={{color:'var(--slate-light)'}}>Page coming soon.</p></div>} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}
