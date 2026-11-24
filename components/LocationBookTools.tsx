'use client';
import React, { useEffect, useState } from 'react';
import { useLocationBook } from './LocationBookProvider';
import { favoritePoint, sameLocation } from '@/lib/location-book';
import type { LocationSelection } from '@/lib/locations';
export default function LocationBookTools({ title, value, selected, open, onToggle, onPick }: { title: string; value: string; selected?: LocationSelection | null; open: boolean; onToggle: () => void; onPick: (point: LocationSelection) => void }) {
  const book = useLocationBook();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => { setName(selected?.label.slice(0, 120) || ''); setAdding(false); setMessage(''); }, [selected?.lat, selected?.lng, selected?.label]);
  if (!book) return null;
  const favorite = selected && book.knownFavorites.find(item => sameLocation(item, selected));
  const normalized = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
  const matches = (text: string) => normalized(text).includes(normalized(selected ? '' : value.trim()));
  async function toggleFavorite() {
    if (!book || !selected || book.busy) return;
    try {
      if (favorite) { await book.archive(favorite); setMessage('Quitado de favoritos. Puedes volver a guardarlo.'); }
      else if (!adding) { setAdding(true); return; }
      else { await book.save(selected, name); setAdding(false); setMessage('Sucursal guardada en tus favoritos.'); }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo actualizar el favorito.'); }
  }
  return <div className="location-book-tools">
    <button type="button" className="map-open-button" aria-expanded={open} onClick={onToggle}>☆ {open ? 'Cerrar ubicaciones guardadas' : 'Recientes y favoritos'}</button>
    {selected && selected.label === value && <button type="button" className="map-open-button" disabled={book.busy || !book.signedIn} onClick={() => void toggleFavorite()}>{favorite ? '★ Quitar de favoritos' : adding ? 'Guardar favorito' : '☆ Guardar sucursal'}</button>}
    {selected && !book.signedIn && <small>Inicia sesión para guardar esta sucursal en tu cuenta.</small>}
    {adding && <label className="favorite-name">Nombre para identificarla<input aria-label={`Nombre del favorito para ${title}`} maxLength={120} value={name} onChange={event => setName(event.target.value)} placeholder="Express · sucursal 1234"/></label>}
    {message && <p role="status" className="location-search-status">{message}</p>}
    {open && <div className="location-book-list" role="region" aria-label={`Ubicaciones guardadas para ${title}`}>
      <strong>Mis sucursales favoritas</strong>
      {!book.signedIn ? <p>Inicia sesión para consultar tus favoritos desde cualquier dispositivo.</p> : <>
        <label className="favorite-name">Buscar en todos mis favoritos<input type="search" aria-label={`Buscar favoritos para ${title}`} placeholder="Sucursal, número de tienda o dirección" maxLength={120} value={book.search} onChange={event => book.searchFavorites(event.target.value)}/></label>
        <p>Busca por el nombre que guardaste o por la dirección. No cambia el punto hasta que elijas una sucursal.</p>
        {!selected && value.trim().length > 120 && <p className="hint">Los favoritos buscan hasta 120 caracteres. Se trasladó el inicio de tu búsqueda; puedes ajustar este filtro. La dirección completa del planificador se conserva.</p>}
        {book.search && <button type="button" className="text-button" onClick={() => book.searchFavorites('')}>Limpiar búsqueda de favoritos</button>}
        {book.loading && <p role="status">Buscando tus sucursales guardadas…</p>}
        {book.error && <div role="alert"><p>{book.error}</p><button type="button" onClick={book.retryFavorites}>Reintentar favoritos</button></div>}
        {!book.loading && !book.error && <>{book.favorites.map(item => <button type="button" key={item.id} onClick={() => onPick(favoritePoint(item))}><b>★ {item.name}</b><small>{item.address_label}</small></button>)}{!book.favorites.length && <p>{book.search.trim() ? 'No hay favoritos que coincidan. Prueba con otra parte del nombre o de la dirección.' : 'Confirma una sucursal y guárdala para encontrarla aquí.'}</p>}</>}
        {book.hasMore && <button type="button" disabled={book.loading} onClick={book.loadMore}>Cargar más favoritos</button>}
      </>}
      <strong>Recientes en este dispositivo</strong>
      {book.recent.filter(item => matches(item.label)).map((item, index) => <button type="button" key={`${item.lat}-${item.lng}-${index}`} onClick={() => onPick(item)}><b>{item.label}</b><small>{item.plusCode || `${item.lat}, ${item.lng}`}</small></button>)}
      {!book.recent.length && <p>Aquí aparecerán los últimos 12 puntos que confirmes.</p>}
      {!!book.recent.length && <button type="button" className="danger-button" onClick={book.clearRecent}>Borrar recientes de este dispositivo</button>}
    </div>}
  </div>;
}
