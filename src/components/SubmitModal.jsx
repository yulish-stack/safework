import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './SubmitModal.css';

const EMPTY_HOURS = [
  { days: '', time: '' },
  { days: '', time: '' },
  { days: '', time: '' },
];

// ── Shared components ────────────────────────────────────────────────────────

function YesNo({ value, onChange }) {
  return (
    <div className="yn-toggle">
      <button type="button" className={`yn-toggle__btn ${value ? 'yn-toggle__btn--active' : ''}`} onClick={() => onChange(true)}>Yes</button>
      <button type="button" className={`yn-toggle__btn ${!value ? 'yn-toggle__btn--active' : ''}`} onClick={() => onChange(false)}>No</button>
    </div>
  );
}

// Nominatim (OpenStreetMap) autocomplete — no API key required.
// Calls onChange(address) and onCoordsChange({lat, lng}) when a suggestion is selected.
// Clears both when the user edits the field manually.
function AddressInput({ onChange, onCoordsChange, initialValue = '', initialCoords = null }) {
  const [inputVal, setInputVal]       = useState(initialValue);
  const [suggestions, setSuggestions] = useState([]);
  const debounceRef = useRef(null);
  const wrapperRef  = useRef(null);

  // Propagate prefilled address/coords to parent on mount
  useEffect(() => {
    if (initialValue)  onChange(initialValue);
    if (initialCoords) onCoordsChange(initialCoords);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target))
        setSuggestions([]);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  function handleChange(e) {
    const val = e.target.value;
    setInputVal(val);
    onChange('');
    onCoordsChange(null);
    clearTimeout(debounceRef.current);
    setSuggestions([]);
    if (val.length < 3) return;

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=il&q=${encodeURIComponent(val)}`,
          { headers: { 'Accept-Language': 'he' } }
        );
        const data = await res.json();
        setSuggestions(data);
      } catch { /* silently ignore network errors */ }
    }, 400);
  }

  function handleSelect(result) {
    const { road, house_number, city, town, suburb } = result.address ?? {};
    const street = house_number ? `${road} ${house_number}` : road;
    const cityName = city || town || suburb || 'תל אביב';
    const shortAddress = `${street}, ${cityName}`;
    setInputVal(shortAddress);
    setSuggestions([]);
    onChange(shortAddress);
    onCoordsChange({ lat: parseFloat(result.lat), lng: parseFloat(result.lon) });
  }

  return (
    <div className="address-field" ref={wrapperRef}>
      <input
        className="form-input"
        value={inputVal}
        onChange={handleChange}
        placeholder="Type an address (e.g. Dizengoff 50, Tel Aviv)"
        autoComplete="off"
      />
      {suggestions.length > 0 && (
        <ul className="address-suggestions" role="listbox">
          {suggestions.map((r) => (
            <li
              key={r.place_id}
              role="option"
              className="address-suggestion"
              onMouseDown={e => { e.preventDefault(); handleSelect(r); }}
            >
              {r.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Business form ─────────────────────────────────────────────────────────────

function BusinessForm({ onSubmit, prefill }) {
  const [name, setName]           = useState(prefill?.name    || '');
  const [address, setAddress]     = useState(prefill?.address || '');
  const [coords, setCoords]       = useState(prefill?.coords  || null);
  const [website, setWebsite]     = useState(prefill?.website || '');
  const [instagram, setInstagram] = useState('');
  const [type, setType]           = useState('café');
  const [hours, setHours]         = useState(() => {
    const filled = (prefill?.hours || []).slice(0, 3);
    return [...filled, ...Array.from({ length: 3 - filled.length }, () => ({ days: '', time: '' }))];
  });
  const [wifi, setWifi]           = useState(false);
  const [outlets, setOutlets]     = useState(false);
  const [busy, setBusy]           = useState(false);
  const [err, setErr]             = useState('');

  function updateHour(i, field, val) {
    setHours(prev => prev.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) { setErr('Name is required.'); return; }
    if (!coords)      { setErr('Please select an address from the suggestions.'); return; }
    setBusy(true); setErr('');
    const filledHours = hours.filter(h => h.days.trim() && h.time.trim());
    const { error } = await supabase.from('businesses').insert({
      name:          name.trim(),
      address,
      latitude:      coords.lat,
      longitude:     coords.lng,
      type,
      opening_hours: filledHours.length ? JSON.stringify(filledHours) : null,
      website:       website.trim() || null,
      instagram:     instagram.replace(/^@/, '').trim() || null,
      wifi,
      wifi_quality:  null,
      power_outlets: outlets,
      is_approved:   true,   // businesses appear on map immediately
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onSubmit();
  }

  return (
    <form className="submit-form" onSubmit={handleSubmit}>
      <label className="form-label">Name *
        <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Coffee House TLV" />
      </label>

      <label className="form-label">Address *
        <AddressInput
          onChange={setAddress}
          onCoordsChange={setCoords}
          initialValue={prefill?.address || ''}
          initialCoords={prefill?.coords  || null}
        />
      </label>

      <label className="form-label">Website <span className="form-hint">(optional)</span>
        <input className="form-input" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yourwebsite.com" type="url" />
      </label>

      <label className="form-label">Instagram <span className="form-hint">(optional)</span>
        <input className="form-input" value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@yourhandle" />
      </label>

      <label className="form-label">Type
        <select className="form-input" value={type} onChange={e => setType(e.target.value)}>
          <option value="café">Café</option>
          <option value="restaurant">Restaurant</option>
          <option value="coworking">Coworking</option>
        </select>
      </label>

      <fieldset className="form-fieldset">
        <legend className="form-legend">Opening Hours <span className="form-hint">(optional)</span></legend>
        {hours.map((row, i) => (
          <div key={i} className="hours-row-input">
            <input className="form-input form-input--days" placeholder="Days (e.g. Sun–Thu)" value={row.days} onChange={e => updateHour(i, 'days', e.target.value)} />
            <input className="form-input form-input--time" placeholder="Hours (e.g. 08:00–22:00)" value={row.time} onChange={e => updateHour(i, 'time', e.target.value)} />
          </div>
        ))}
      </fieldset>

      <div className="form-label">WiFi available
        <YesNo value={wifi} onChange={setWifi} />
      </div>
      <div className="form-label">Power outlets
        <YesNo value={outlets} onChange={setOutlets} />
      </div>

      {err && <p className="form-error">{err}</p>}
      <button className="form-submit" type="submit" disabled={busy}>
        {busy ? 'Submitting…' : 'Submit location'}
      </button>
    </form>
  );
}

// ── Shelter form ──────────────────────────────────────────────────────────────

function ShelterForm({ onSubmit }) {
  const [name, setName]             = useState('');
  const [address, setAddress]       = useState('');
  const [coords, setCoords]         = useState(null);
  const [accessible, setAccessible] = useState(false);
  const [isPublic, setIsPublic]     = useState(true);
  const [notes, setNotes]           = useState('');
  const [busy, setBusy]             = useState(false);
  const [err, setErr]               = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) { setErr('Name is required.'); return; }
    if (!coords)      { setErr('Please select an address from the suggestions.'); return; }
    setBusy(true); setErr('');
    const shelterData = {
      name:          name.trim(),
      address,
      latitude:      coords.lat,
      longitude:     coords.lng,
      is_accessible: accessible,
      is_public:     isPublic,
      is_approved:   true,
      source:        'community',
    };
    if (notes.trim()) shelterData.notes = notes.trim();
    const { error } = await supabase.from('shelters').insert(shelterData);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onSubmit();
  }

  return (
    <form className="submit-form" onSubmit={handleSubmit}>
      <label className="form-label">Name *
        <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Shelter – City Hall" />
      </label>

      <label className="form-label">Address *
        <AddressInput onChange={setAddress} onCoordsChange={setCoords} />
      </label>

      <div className="form-label">Wheelchair accessible
        <YesNo value={accessible} onChange={setAccessible} />
      </div>
      <div className="form-label">Public shelter
        <YesNo value={isPublic} onChange={setIsPublic} />
      </div>
      <label className="form-label">Notes <span className="form-hint">(optional)</span>
        <textarea className="form-input form-textarea" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional info…" />
      </label>

      {err && <p className="form-error">{err}</p>}
      <button className="form-submit" type="submit" disabled={busy}>
        {busy ? 'Submitting…' : 'Submit shelter'}
      </button>
    </form>
  );
}

// ── Modal shell ───────────────────────────────────────────────────────────────

export default function SubmitModal({ onClose, prefill }) {
  const [tab, setTab]         = useState('business');
  const [success, setSuccess] = useState(false);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2 className="modal-title">Submit a location</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {success ? (
          <div className="modal-success">
            <p className="modal-success__msg">
            {success === 'business'
              ? <>✅ Your location has been added!{' '}
                  <button
                    className="modal-refresh-link"
                    onClick={() => window.location.reload()}
                  >Tap here to refresh the map →</button>
                </>
              : '✅ Shelter submitted for review — thank you!'}
          </p>
            <div className="modal-success__actions">
              <button className="form-submit form-submit--secondary" onClick={() => setSuccess(false)}>Submit another</button>
              <button className="form-submit" onClick={onClose}>Close</button>
            </div>
          </div>
        ) : (
          <>
            <div className="modal-tabs">
              <button className={`modal-tab ${tab === 'business' ? 'modal-tab--active' : ''}`} onClick={() => setTab('business')}>Business</button>
              <button className={`modal-tab ${tab === 'shelter'  ? 'modal-tab--active' : ''}`} onClick={() => setTab('shelter')}>Shelter</button>
            </div>
            <div className="modal-body">
              {tab === 'business'
                ? <BusinessForm onSubmit={() => setSuccess('business')} prefill={prefill} />
                : <ShelterForm  onSubmit={() => setSuccess('shelter')} />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
