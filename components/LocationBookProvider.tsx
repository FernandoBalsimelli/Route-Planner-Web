'use client';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { FAVORITE_COLUMNS, readRecent, recentKey, rememberLocation, sameLocation, validLocation, type FavoriteLocation } from '@/lib/location-book';
import type { LocationSelection } from '@/lib/locations';
import { favoriteSearchFilter, FAVORITE_PAGE_SIZE, FAVORITE_SEARCH_DEBOUNCE_MS, FAVORITE_QUERY_TIMEOUT_MS } from '@/lib/favorite-search';
type Book = { signedIn: boolean; favorites: FavoriteLocation[]; knownFavorites: FavoriteLocation[]; recent: LocationSelection[]; error: string; hasMore: boolean; busy: boolean; loading: boolean; search: string; searchFavorites: (value: string) => void; retryFavorites: () => void; remember: (point: LocationSelection) => void; clearRecent: () => void; loadMore: () => void; save: (point: LocationSelection, name: string) => Promise<void>; archive: (favorite: FavoriteLocation) => Promise<void> };
const Context = createContext<Book | null>(null);
export const useLocationBook = () => useContext(Context);
export default function LocationBookProvider({ user, children }: { user: User | null; children: React.ReactNode }) {
  const [recent, setRecent] = useState<LocationSelection[]>([]);
  const recentRef = useRef<LocationSelection[]>([]);
  const [favorites, setFavorites] = useState<FavoriteLocation[]>([]);
  const [knownFavorites, setKnownFavorites] = useState<FavoriteLocation[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const queryGeneration = useRef(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [limit, setLimit] = useState(FAVORITE_PAGE_SIZE);
  const currentOwner = useRef(user?.id); currentOwner.current = user?.id;
  useEffect(() => {
    try { recentRef.current = readRecent(window.localStorage.getItem(recentKey(user?.id))); } catch { recentRef.current = []; }
    setRecent(recentRef.current);
    queryGeneration.current++;
    setFavorites([]); setKnownFavorites([]); setSearch(''); setError(''); setLimit(FAVORITE_PAGE_SIZE); setHasMore(false);
  }, [user?.id]);
  useEffect(() => {
    let active = true;
    if (!user || !supabase) return;
    const generation = ++queryGeneration.current;
    const controller = new AbortController();
    const current = () => active && queryGeneration.current === generation && currentOwner.current === user.id;
    setLoading(true); setError('');
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const debounce = setTimeout(() => {
      deadline = setTimeout(() => {
        if (!current()) return;
        active = false; controller.abort(); setLoading(false); setFavorites([]); setHasMore(false);
        setError('La búsqueda de favoritos tardó demasiado. Reintenta; tus sucursales siguen guardadas.');
      }, FAVORITE_QUERY_TIMEOUT_MS);
      let query = supabase!.from('favorite_locations').select(FAVORITE_COLUMNS).eq('owner_id', user.id).eq('archived', false);
      if (search.trim()) query = query.or(favoriteSearchFilter(search));
      void Promise.resolve(query.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(limit + 1).abortSignal(controller.signal)).then(({ data, error }) => {
        if (!current()) return;
        if (error) { setFavorites([]); setHasMore(false); setError('No se pudieron cargar tus favoritos: ' + error.message); }
        else {
          const rows = (data || []).slice(0, limit) as FavoriteLocation[];
          setFavorites(rows); setHasMore((data || []).length > limit);
          setKnownFavorites(items => [...rows, ...items.filter(item => !rows.some(row => row.id === item.id))]);
          setError('');
        }
      }).catch(() => { if (current()) { setFavorites([]); setHasMore(false); setError('No se pudo conectar para buscar tus favoritos. Reintenta sin cambiar la dirección.'); } }).finally(() => { clearTimeout(deadline); if (current()) setLoading(false); });
    }, search.trim() ? FAVORITE_SEARCH_DEBOUNCE_MS : 0);
    return () => { active = false; clearTimeout(debounce); clearTimeout(deadline); controller.abort(); };
  }, [user?.id, limit, search, revision]);
  function searchFavorites(value: string) {
    if (value.slice(0,120) === search) return;
    queryGeneration.current++; setSearch(value.slice(0,120)); setLimit(FAVORITE_PAGE_SIZE);
    setFavorites([]); setHasMore(false); setError(''); setLoading(Boolean(user));
  }
  function retryFavorites() { queryGeneration.current++; setRevision(value => value + 1); }
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
      if (currentOwner.current === ownerId) {
        setKnownFavorites(items => [data as FavoriteLocation, ...items.filter(item => !sameLocation(item, point))]);
        setRevision(value => value + 1);
      }
    } finally { setBusy(false); }
  }
  async function archive(favorite: FavoriteLocation) {
    if (!user || !supabase) return;
    const ownerId = user.id; setBusy(true);
    try {
      const { error } = await supabase.from('favorite_locations').update({ archived: true, updated_at: new Date().toISOString() }).eq('id', favorite.id).eq('owner_id', ownerId).select('id').single();
      if (error) throw new Error('No se pudo quitar el favorito: ' + error.message);
      if (currentOwner.current === ownerId) {
        setFavorites(items => items.filter(item => item.id !== favorite.id));
        setKnownFavorites(items => items.filter(item => item.id !== favorite.id));
        setRevision(value => value + 1);
      }
    } finally { setBusy(false); }
  }
  return <Context.Provider value={{ signedIn: Boolean(user), favorites, knownFavorites, recent, error, hasMore, busy, loading, search, searchFavorites, retryFavorites, remember, clearRecent, loadMore: () => { if (!loading && hasMore) setLimit(value => value + FAVORITE_PAGE_SIZE); }, save, archive }}>{children}</Context.Provider>;
}
