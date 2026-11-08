'use client';

import { useEffect, useState } from 'react';

export type LocationSelection = {
  label: string;
  lat: number;
  lng: number;
  plusCode?: string;
  source?: string;
};

type Props = {
  title: string;
  color: 'green' | 'orange' | 'number';
  value: string;
  placeholder: string;
  apiUrl: string;
  selected?: LocationSelection | null;
  onChange: (value: string) => void;
  onConfirm: (location: LocationSelection) => void;
};

export default function LocationInput({ title, color, value, placeholder, apiUrl, selected, onChange, onConfirm }: Props) {
  const [suggestions, setSuggestions] = useState<LocationSelection[]>([]);
  const [pending, setPending] = useState<LocationSelection | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    if (selected && selected.label === value) {
      setSuggestions([]);
      setPending(null);
      setSearchError('');
      setLoading(false);
      return;
    }
    if (value.trim().length < 2) {
      setSuggestions([]);
      setPending(null);
      setSearchError('');
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setSearchError('');
      try {
        const response = await fetch(`${apiUrl}/v1/locations/suggest?q=${encodeURIComponent(value.trim())}`, { signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || 'No se pudieron cargar las sugerencias.');
        setSuggestions(Array.isArray(payload.suggestions) ? payload.suggestions : []);
      } catch (error) {
        if (controller.signal.aborted) return;
        setSuggestions([]);
        setSearchError(error instanceof Error ? error.message : 'No se pudieron cargar las sugerencias.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 320);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, apiUrl, selected]);

  function confirmPending() {
    if (!pending) return;
    onChange(pending.label);
    onConfirm(pending);
    setPending(null);
    setSuggestions([]);
    setSearchError('');
  }

  return <div className="location-field">
    <label className="field">
      <span><i className={color === 'number' ? 'stop-number' : `dot ${color}`}>{color === 'number' ? title.replace('PARADA ', '') : ''}</i> {color === 'number' ? title : title.toUpperCase()}</span>
      <input
        value={value}
        onChange={event => { onChange(event.target.value); setPending(null); }}
        placeholder={placeholder}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={suggestions.length > 0}
      />
    </label>
    {loading && <p className="location-search-status">Buscando direcciones y lugares…</p>}
    {suggestions.length > 0 && !pending && <div className="location-suggestions" role="listbox" aria-label={`Sugerencias para ${title}`}>
      {suggestions.map((suggestion, index) => <button
        type="button"
        className="location-suggestion"
        key={`${suggestion.lat}-${suggestion.lng}-${index}`}
        onClick={() => setPending(suggestion)}
      >
        <span className="suggestion-pin">⌖</span>
        <span className="suggestion-copy"><strong>{suggestion.label}</strong><small>{suggestion.plusCode || `${suggestion.lat.toFixed(6)}, ${suggestion.lng.toFixed(6)}`}</small></span>
        <span className="suggestion-arrow">›</span>
      </button>)}
    </div>}
    {searchError && <p className="location-search-error">{searchError} Puedes continuar escribiendo una dirección completa.</p>}
    {pending && <div className="location-confirm-card">
      <div><strong>¿Es este el punto correcto?</strong><p>{pending.label}</p><small>{pending.plusCode || `${pending.lat.toFixed(6)}, ${pending.lng.toFixed(6)}`}</small></div>
      <a href={`https://www.google.com/maps/search/?api=1&query=${pending.lat},${pending.lng}`} target="_blank" rel="noreferrer">Ver mapa ↗</a>
      <div className="location-confirm-actions"><button type="button" onClick={() => setPending(null)}>Elegir otro</button><button type="button" onClick={confirmPending}>Confirmar punto</button></div>
    </div>}
    {selected && selected.label === value && !pending && <p className="location-confirmed"><span>✓ Punto confirmado</span><small>{selected.plusCode || `${selected.lat.toFixed(6)}, ${selected.lng.toFixed(6)}`}</small></p>}
  </div>;
}
