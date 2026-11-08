'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export default function AccountPanel({ onUserChange }: { onUserChange: (user: User | null) => void }) {
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => { setUser(data.user); onUserChange(data.user); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      onUserChange(nextUser);
    });
    return () => subscription.unsubscribe();
  }, [onUserChange]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) { setNotice('La autenticación todavía no está configurada.'); return; }
    setBusy(true); setNotice('');
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        if (data.session && data.user) {
          await supabase.from('profiles').insert({ id: data.user.id, display_name: email.split('@')[0] });
          setNotice('Cuenta creada. Ya puedes guardar tus rutas.');
        } else {
          setNotice('Cuenta iniciada. Revisa tu correo para confirmar el registro y después inicia sesión.');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) await supabase.from('profiles').insert({ id: data.user.id, display_name: email.split('@')[0] });
        setNotice('Sesión iniciada.');
      }
      setPassword('');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo completar la autenticación.');
    } finally { setBusy(false); }
  }

  async function logout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setNotice('Sesión cerrada.');
  }

  return <div className="account-wrap">
    <button className="account-button" onClick={() => setOpen(value => !value)}>{user ? (user.email?.split('@')[0] || 'Mi cuenta') : 'Iniciar sesión'} <span>⌄</span></button>
    {open && <div className="account-popover">
      {user ? <><strong>Cuenta activa</strong><p>{user.email}</p><button className="account-submit" onClick={logout}>Cerrar sesión</button></> : <>
        <div className="account-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => {setMode('login');setNotice('');}}>Entrar</button><button className={mode === 'signup' ? 'active' : ''} onClick={() => {setMode('signup');setNotice('');}}>Crear cuenta</button></div>
        <form onSubmit={submit}><label>Correo<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com"/></label><label>Contraseña<input type="password" required minLength={8} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres"/></label><button className="account-submit" disabled={busy}>{busy ? 'Procesando…' : mode === 'signup' ? 'Crear cuenta' : 'Entrar'}</button></form>
      </>}
      {notice && <p className="account-notice">{notice}</p>}
    </div>}
  </div>;
}
