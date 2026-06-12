import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { LogIn } from 'lucide-react';

export default function Login() {
  const { signIn } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    setError('');
    const { error } = await signIn(email, password);
    if (error) {
      setError('Invalid email or password.');
      setLoading(false);
    }
    // On success, AuthContext updates user and App renders dashboard
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--slate)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--white)',
        borderRadius: 'var(--radius-lg)',
        padding: '2.5rem',
        width: 360,
        boxShadow: 'var(--shadow-md)',
      }}>
        {/* Logo */}
        <div style={{marginBottom:'2rem',textAlign:'center'}}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            color: 'var(--slate)',
            lineHeight: 1.2,
          }}>
            Dotsero
          </div>
          <div style={{fontSize:12,color:'var(--slate-light)',marginTop:4,letterSpacing:'0.06em',textTransform:'uppercase'}}>
            C&C Ventures LLC
          </div>
        </div>

        {/* Fields */}
        <div className="field">
          <label className="field-label">Email</label>
          <input
            className="field-input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
        </div>
        <div className="field">
          <label className="field-label">Password</label>
          <input
            className="field-input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
        </div>

        {error && (
          <div style={{
            fontSize:13, color:'var(--red-text)',
            background:'var(--red-bg)',
            padding:'8px 12px',
            borderRadius:'var(--radius-md)',
            marginBottom:14,
          }}>
            {error}
          </div>
        )}

        <button
          className="btn btn-primary"
          style={{width:'100%',justifyContent:'center',padding:'10px'}}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <div className="spinner" style={{width:14,height:14,borderWidth:2,borderColor:'rgba(255,255,255,0.3)',borderTopColor:'white'}}/>
            : <><LogIn size={14}/> Sign in</>
          }
        </button>

        <div style={{fontSize:12,color:'var(--slate-light)',textAlign:'center',marginTop:'1.5rem'}}>
          Access restricted to authorized users only.
        </div>
      </div>
    </div>
  );
}
