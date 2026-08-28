import { useState } from 'react';
import { Lock, User as UserIcon, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { useToast } from '@/components/toast';
import paddyAsset from '../Assets/paddy.jpg';
import logoAsset from '../Assets/logo.png';

export function LoginScreen() {
  const { login } = useAuth();
  const { toast } = useToast();
  const { data } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const bgUrl = data.loginBgUrl || paddyAsset;
  const farmLogo = data.logo || logoAsset;
  const brightness = data.loginBgBrightness ?? 1;
  const overlay = data.loginBgOverlay ?? 0.5;
  const blur = data.loginBgBlur ?? 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setTimeout(() => {
      const ok = login(username, password);
      if (!ok) {
        const msg = 'Invalid credentials or account inactive. Try admin / 123.';
        setError(msg);
        toast(msg, 'error');
      } else {
        toast('Welcome back! Signed in successfully.', 'success');
      }
      setBusy(false);
    }, 300);
  };

  const fillDemo = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background image with CSS filters */}
      <img
        src={bgUrl}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: `brightness(${brightness}) blur(${blur}px)` }}
      />
      {/* Dynamic dark overlay for readability */}
      <div className="absolute inset-0 bg-black pointer-events-none" style={{ opacity: overlay }} />

      {/* Login card — fully transparent, floating on the background */}
      <div className="relative z-10 w-full max-w-sm p-8">
        <div className="flex items-center gap-3 mb-8">
          <img src={farmLogo} alt="Idallawa Agro logo" className="w-12 h-12 rounded-xl object-cover shadow-lg ring-1 ring-white/30" />
          <div>
            <div className="font-display font-800 text-lg leading-tight text-white drop-shadow-md">Idallawa Agro</div>
            <div className="text-xs text-white/80 drop-shadow">Pvt Ltd · Farm & Nursery</div>
          </div>
        </div>

        <h2 className="font-display text-xl font-800 text-white drop-shadow-md">Sign in to your account</h2>
        <p className="mt-1 text-sm text-white/80 drop-shadow">Enter your credentials to access the farm management system.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-600 text-white/90 mb-1 drop-shadow">Username</label>
            <div className="relative">
              <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin or dataentry"
                autoFocus
                className="w-full pl-10 pr-3 py-2.5 rounded-none border-0 border-b border-white/40 bg-transparent text-sm text-white placeholder-white/50 focus:border-accent-400 focus:ring-0 outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-600 text-white/90 mb-1 drop-shadow">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password"
                className="w-full pl-10 pr-10 py-2.5 rounded-none border-0 border-b border-white/40 bg-transparent text-sm text-white placeholder-white/50 focus:border-accent-400 focus:ring-0 outline-none transition"
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-black/40 backdrop-blur-sm border border-white/20 text-sm text-white">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !username || !password}
            className="w-full inline-flex items-center justify-center font-600 text-sm px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white shadow-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 p-4 rounded-xl bg-black/30 backdrop-blur-sm border border-white/15 text-xs text-white/90 space-y-2">
          <div className="font-600 text-white">Demo credentials — click to fill</div>
          <button onClick={() => fillDemo('admin', '123')} className="w-full text-left flex items-center justify-between p-2 rounded-lg bg-white/10 hover:bg-white/20 transition border border-white/15">
            <span><span className="font-600 text-white">Administrator</span> — full access</span>
            <span className="text-white/70"><code className="bg-white/15 px-1 rounded text-white">admin</code> / <code className="bg-white/15 px-1 rounded text-white">123</code></span>
          </button>
        </div>
      </div>
    </div>
  );
}
