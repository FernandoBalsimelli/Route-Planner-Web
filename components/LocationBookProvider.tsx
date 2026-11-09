'use client';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { FAVORITE_COLUMNS, readRecent, recentKey, rememberLocation, sameLocation, validLocation, type FavoriteLocation } from '@/lib/location-book';
import type { LocationSelection } from '@/lib/locations';
type Book = { signedIn: boolean; favorites: FavoriteLocation[]; recent: LocationSelection[]; error: string; hasMore: boolean; busy: boolean; remember: (point: LocationSelection) => void; clearRecent: () => void; loadMore: () => void; save: (point: LocationSelection, name: string) => Promise<void>; archive: (favorite: FavoriteLocation) => Promise<void> };
const Context = createContext<Book | null>(null);
export const useLocationBook = () => useContext(Context);
export default function LocationBookProvider({ user, children }: { user: User | null; children: React.ReactNode }) {
  const [recent, setRecent] = useState<LocationSelection[]>([]);
  const recentRef = useRef<LocationSelection[]>([]);
  const [favorites, setFavorites] = useState<FavoriteLocation[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [limit, setLimit] = useState(50);
  const currentOwner = useRef(user?.id); currentOwner.current = user?.id;
  useEffect(() => {
    try { recentRef.current = readRecent(window.localStorage.getItem(recentKey(user?.id))); } catch { recentRef.current = []; }
    setRecent(recentRef.current);
    setFavorites([]); setError(''); setLimit(50); setHasMore(false);
  }, [user?.id]);
  useEffect(() => {
    let active = true;
    if (!user || !supabase) return;
    const controller = new AbortController();
    void supabase.from('favorite_locations').select(FAVORITE_COLUMNS).eq('owner_id', user.id).eq('archived', false).order('created_at', { ascending: false }).limit(limit + 1).abortSignal(controller.signal).then(({ data, error }) => {
      if (!active) return;
      if (error) setError('No se pudieron cargar tus favoritos: ' + error.message);
      else { setFavorites((data || []).slice(0, limit) as FavoriteLocation[]); setHasMore((data || []).length > limit); setError(''); }
    });
    return () => { active = false; controller.abort(); };
  }, [user?.id, limit]);
  const remember = useCallback((point: LocationSelection) => {
    if (currentOwner.current !== user?.id) return;
    const next = rememberLocation(recentRef.current, point); recentRef.current = next; setRecent(next);
    try { window.localStorage.setItem(recentKey(user?.id), JSON.stringify(next)); } catch { /* Addresses remain usable when browser storage is unavailable. */ }
  }, [user?.id]);
  function clearRecent() { recentRef.current = []; setRecent([]); try { window.localStorage.removeItem(recentKey(user?.id)); } catch {} }
  async function save(point: LocationSelection, name: string) {
    if (!user || !supabase) throw new Error('Inicia sesión para guardar favoritos en tu cuenta.');
    if (!validLocation(point) || !name.trim() || name.trim().length > 120) throw new Error('Confirma el punto y escribe un nombre de hasta 120 caracteres.');
    const ownerId = user.id;
    setBusy(true);
    try {
      const { data, error } = await supabase.from('favorite_locations').upsert({ owner_id: ownerId, name: name.trim(), address_label: point.label, lat: point.lat, lng: point.lng, plus_code: point.plusCode || null, archived: false, updated_at: new Date().toISOString() }, { onConflict: 'owner_id,lat,lng' }).select(FAVORITE_COLUMNS).single();
      if (error) throw new Error('No se pudo guardar el favorito: ' + error.message);
      if (currentOwner.current === ownerId) setFavorites(items => [data as FavoriteLocation, ...items.filter(item => !sameLocation(item, point))]);
    } finally { setBusy(false); }
  }
  async function archive(favorite: FavoriteLocation) {
    if (!user || !supabase) return;
    const ownerId = user.id; setBusy(true);
    try {
      const { error } = await supabase.from('favorite_locations').update({ archived: true, updated_at: new Date().toISOString() }).eq('id', favorite.id).eq('owner_id', ownerId).select('id').single();
      if (error) throw new Error('No se pudo quitar el favorito: ' + error.message);
      if (currentOwner.current === ownerId) setFavorites(items => items.filter(item => item.id !== favorite.id));
    } finally { setBusy(false); }
  }
  return <Context.Provider value={{ signedIn: Boolean(user), favorites, recent, error, hasMore, busy, remember, clearRecent, loadMore: () => setLimit(value => value + 50), save, archive }}>{children}</Context.Provider>;
}
