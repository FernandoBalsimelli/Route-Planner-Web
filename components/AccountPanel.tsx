'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
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
    let active = true;
    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error) setNotice('No se pudo comprobar la sesión. Intenta actualizar la página.');
      setUser(data.user);
      onUserChange(data.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      onUserChange(nextUser);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [onUserChange]);

  async function ensureProfile(userId: string, displayName: string) {
    if (!supabase) return;
    const { error } = await supabase.from('profiles').upsert(
      { id: userId, display_name: displayName },
      { onConflict: 'id', ignoreDuplicates: true },
    );
    if (error) throw new Error('La sesión se inició, pero no se pudo preparar tu perfil: ' + error.message);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) { setNotice('La autenticación todavía no está configurada.'); return; }
    setBusy(true);
    setNotice('');
    try {
      const displayName = email.trim().split('@')[0];
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session && data.user) {
          await ensureProfile(data.user.id, displayName);
          setNotice('Cuenta creada. Ya puedes guardar tus rutas.');
        } else {
          setNotice('Te enviamos un correo de confirmación. Confirma tu dirección y después inicia sesión.');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        if (data.user) await ensureProfile(data.user.id, displayName);
        setNotice('Sesión iniciada correctamente.');
      }
      setPassword('');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo completar la autenticación.');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    if (!supabase) return;
    setBusy(true);
    setNotice('');
    const { error } = await supabase.auth.signOut();
    if (error) setNotice('No se pudo cerrar la sesión: ' + error.message);
    else setNotice('Sesión cerrada.');
    setBusy(false);
  }

  return <div className="account-wrap">
    <button className="account-button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-haspopup="dialog">
      {user ? (user.email?.split('@')[0] || 'Mi cuenta') : 'Iniciar sesión'} <span>⌄</span>
    </button>
    {open && <div className="account-popover" role="dialog" aria-label="Cuenta de Route Planner">
      {user ? <>
        <strong>Cuenta activa</strong>
        <p>{user.email}</p>
        <a href="#mi-perfil" onClick={() => setOpen(false)}>Mi perfil y vehículos</a>
        <button className="account-submit" onClick={logout} disabled={busy}>{busy ? 'Procesando…' : 'Cerrar sesión'}</button>
      </> : <>
        <div className="account-tabs">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setNotice(''); }}>Entrar</button>
          <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setNotice(''); }}>Crear cuenta</button>
        </div>
        <form onSubmit={submit}>
          <label>Correo<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" /></label>
          <label>Contraseña<input type="password" required minLength={8} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" /></label>
          <button className="account-submit" disabled={busy}>{busy ? 'Procesando…' : mode === 'signup' ? 'Crear cuenta' : 'Entrar'}</button>
        </form>
      </>}
      {notice && <p className="account-notice" role="status">{notice}</p>}
    </div>}
  </div>;
}
