import { useState, useEffect, useCallback } from 'react';
import { fetchAll, approve, remove, update } from '../lib/admin';
import './AdminPanel.css';

const ADMIN_PWD = import.meta.env.VITE_ADMIN_PASSWORD;

// ── Shared helpers ──────────────────────────────────────────────────────────

function YesNo({ value, onChange }) {
  return (
    <div className="a-yn">
      <button type="button" className={`a-yn__btn ${value ? 'a-yn__btn--on' : ''}`} onClick={() => onChange(true)}>Yes</button>
      <button type="button" className={`a-yn__btn ${!value ? 'a-yn__btn--on' : ''}`} onClick={() => onChange(false)}>No</button>
    </div>
  );
}

function parseHours(raw) {
  try { return JSON.parse(raw) || []; } catch { return []; }
}

// ── Inline edit forms ───────────────────────────────────────────────────────

function EditBizForm({ row, onSave, onCancel }) {
  const initHours = parseHours(row.opening_hours);
  const paddedHours = [
    ...(initHours.slice(0, 3)),
    ...Array(Math.max(0, 3 - initHours.length)).fill({ days: '', time: '' }),
  ];

  const [name, setName]         = useState(row.name ?? '');
  const [address, setAddress]   = useState(row.address ?? '');
  const [mapsLink, setMapsLink] = useState(row.maps_link ?? '');
  const [type, setType]         = useState(row.type ?? 'café');
  const [hours, setHours]       = useState(paddedHours);
  const [wifi, setWifi]         = useState(row.wifi ?? false);
  const [wifiQ, setWifiQ]       = useState(row.wifi_quality ?? '');
  const [outlets, setOutlets]   = useState(row.power_outlets ?? false);
  const [lat, setLat]           = useState(row.latitude ?? '');
  const [lng, setLng]           = useState(row.longitude ?? '');
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState('');

  function updateHour(i, field, val) {
    setHours(prev => prev.map((h, idx) => idx === i ? { ...h, [field]: val } : h));
  }

  async function handleSave() {
    setSaving(true); setErr('');
    const filledHours = hours.filter(h => h.days?.trim() && h.time?.trim());
    try {
      await onSave({
        name, address, maps_link: mapsLink.trim() || null, type,
        opening_hours: filledHours.length ? JSON.stringify(filledHours) : null,
        wifi, wifi_quality: wifiQ || null, power_outlets: outlets,
        latitude: lat !== '' ? Number(lat) : null,
        longitude: lng !== '' ? Number(lng) : null,
      });
    } catch (e) { setErr(e.message); setSaving(false); }
  }

  return (
    <div className="a-edit-form">
      <div className="a-edit-grid">
        <label className="a-field">Name
          <input className="a-input" value={name} onChange={e => setName(e.target.value)} />
        </label>
        <label className="a-field">Address
          <input className="a-input" value={address} onChange={e => setAddress(e.target.value)} />
        </label>
        <label className="a-field">Maps link
          <input className="a-input" value={mapsLink} onChange={e => setMapsLink(e.target.value)} placeholder="https://maps.google.com/…" />
        </label>
        <label className="a-field">Type
          <select className="a-input" value={type} onChange={e => setType(e.target.value)}>
            <option value="café">Café</option>
            <option value="restaurant">Restaurant</option>
            <option value="coworking">Coworking</option>
          </select>
        </label>
        <label className="a-field">WiFi quality
          <select className="a-input" value={wifiQ} onChange={e => setWifiQ(e.target.value)}>
            <option value="">— unknown —</option>
            <option value="good">Good</option>
            <option value="ok">OK</option>
            <option value="poor">Poor</option>
          </select>
        </label>
        <label className="a-field">Latitude
          <input className="a-input" type="number" step="any" value={lat} onChange={e => setLat(e.target.value)} />
        </label>
        <label className="a-field">Longitude
          <input className="a-input" type="number" step="any" value={lng} onChange={e => setLng(e.target.value)} />
        </label>
      </div>

      <div className="a-edit-row-group">
        <span className="a-field-label">Opening hours</span>
        {hours.map((row, i) => (
          <div key={i} className="a-hours-row">
            <input className="a-input" placeholder="Days" value={row.days} onChange={e => updateHour(i, 'days', e.target.value)} />
            <input className="a-input" placeholder="Time" value={row.time} onChange={e => updateHour(i, 'time', e.target.value)} />
          </div>
        ))}
      </div>

      <div className="a-edit-bools">
        <span className="a-field-label">WiFi</span>
        <YesNo value={wifi} onChange={setWifi} />
        <span className="a-field-label">Outlets</span>
        <YesNo value={outlets} onChange={setOutlets} />
      </div>

      {err && <p className="a-err">{err}</p>}
      <div className="a-edit-actions">
        <button className="a-btn a-btn--save" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        <button className="a-btn a-btn--cancel" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function EditShelterForm({ row, onSave, onCancel }) {
  const [name, setName]             = useState(row.name ?? '');
  const [address, setAddress]       = useState(row.address ?? '');
  const [mapsLink, setMapsLink]     = useState(row.maps_link ?? '');
  const [accessible, setAccessible] = useState(row.is_accessible ?? false);
  const [isPublic, setIsPublic]     = useState(row.is_public ?? true);
  const [notes, setNotes]           = useState(row.notes ?? '');
  const [lat, setLat]               = useState(row.latitude ?? '');
  const [lng, setLng]               = useState(row.longitude ?? '');
  const [saving, setSaving]         = useState(false);
  const [err, setErr]               = useState('');

  async function handleSave() {
    setSaving(true); setErr('');
    try {
      await onSave({
        name, address, maps_link: mapsLink.trim() || null,
        is_accessible: accessible, is_public: isPublic,
        notes: notes || null,
        latitude:  lat !== '' ? Number(lat) : null,
        longitude: lng !== '' ? Number(lng) : null,
      });
    } catch (e) { setErr(e.message); setSaving(false); }
  }

  return (
    <div className="a-edit-form">
      <div className="a-edit-grid">
        <label className="a-field">Name
          <input className="a-input" value={name} onChange={e => setName(e.target.value)} />
        </label>
        <label className="a-field">Address
          <input className="a-input" value={address} onChange={e => setAddress(e.target.value)} />
        </label>
        <label className="a-field">Maps link
          <input className="a-input" value={mapsLink} onChange={e => setMapsLink(e.target.value)} placeholder="https://maps.google.com/…" />
        </label>
        <label className="a-field">Latitude
          <input className="a-input" type="number" step="any" value={lat} onChange={e => setLat(e.target.value)} />
        </label>
        <label className="a-field">Longitude
          <input className="a-input" type="number" step="any" value={lng} onChange={e => setLng(e.target.value)} />
        </label>
      </div>

      <div className="a-edit-bools">
        <span className="a-field-label">Accessible</span>
        <YesNo value={accessible} onChange={setAccessible} />
        <span className="a-field-label">Public</span>
        <YesNo value={isPublic} onChange={setIsPublic} />
      </div>

      <label className="a-field a-field--full">Notes
        <textarea className="a-input a-textarea" rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
      </label>

      {err && <p className="a-err">{err}</p>}
      <div className="a-edit-actions">
        <button className="a-btn a-btn--save" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        <button className="a-btn a-btn--cancel" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ── Tables ───────────────────────────────────────────────────────────────────

function BusinessesTable({ rows, mode, editingId, onEdit, onCancelEdit, onSaveEdit, onApprove, onReject, onDelete }) {
  if (!rows.length) return <p className="a-empty">No entries.</p>;

  return (
    <div className="a-table-wrap">
      <table className="a-table">
        <thead>
          <tr>
            <th>Name</th><th>Address</th><th>Type</th><th>WiFi</th><th>Outlets</th><th>Maps</th>
            <th colSpan={2}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <>
              <tr key={row.id} className={editingId === row.id ? 'a-row--editing' : ''}>
                <td>{row.name}</td>
                <td className="a-cell--address">{row.address}</td>
                <td>{row.type}</td>
                <td>{row.wifi ? 'Yes' : 'No'}</td>
                <td>{row.power_outlets ? 'Yes' : 'No'}</td>
                <td>{row.maps_link ? <a href={row.maps_link} target="_blank" rel="noreferrer" className="a-maps-link">View</a> : '—'}</td>
                {mode === 'pending' ? (
                  <>
                    <td><button className="a-btn a-btn--approve" onClick={() => onApprove(row.id)}>Approve</button></td>
                    <td><button className="a-btn a-btn--reject"  onClick={() => onReject(row.id)}>Reject</button></td>
                  </>
                ) : (
                  <>
                    <td><button className="a-btn a-btn--edit"   onClick={() => editingId === row.id ? onCancelEdit() : onEdit(row)}>
                      {editingId === row.id ? 'Cancel' : 'Edit'}
                    </button></td>
                    <td><button className="a-btn a-btn--delete" onClick={() => onDelete(row.id)}>Delete</button></td>
                  </>
                )}
              </tr>
              {editingId === row.id && (
                <tr key={`${row.id}-edit`}>
                  <td colSpan={8} className="a-edit-cell">
                    <EditBizForm
                      row={row}
                      onSave={data => onSaveEdit('businesses', row.id, data)}
                      onCancel={onCancelEdit}
                    />
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SheltersTable({ rows, mode, editingId, onEdit, onCancelEdit, onSaveEdit, onApprove, onReject, onDelete }) {
  if (!rows.length) return <p className="a-empty">No entries.</p>;

  return (
    <div className="a-table-wrap">
      <table className="a-table">
        <thead>
          <tr>
            <th>Name</th><th>Address</th><th>Accessible</th><th>Public</th><th>Maps</th>
            <th colSpan={2}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <>
              <tr key={row.id} className={editingId === row.id ? 'a-row--editing' : ''}>
                <td>{row.name}</td>
                <td className="a-cell--address">{row.address}</td>
                <td>{row.is_accessible ? 'Yes' : 'No'}</td>
                <td>{row.is_public ? 'Yes' : 'No'}</td>
                <td>{row.maps_link ? <a href={row.maps_link} target="_blank" rel="noreferrer" className="a-maps-link">View</a> : '—'}</td>
                {mode === 'pending' ? (
                  <>
                    <td><button className="a-btn a-btn--approve" onClick={() => onApprove(row.id)}>Approve</button></td>
                    <td><button className="a-btn a-btn--reject"  onClick={() => onReject(row.id)}>Reject</button></td>
                  </>
                ) : (
                  <>
                    <td><button className="a-btn a-btn--edit"   onClick={() => editingId === row.id ? onCancelEdit() : onEdit(row)}>
                      {editingId === row.id ? 'Cancel' : 'Edit'}
                    </button></td>
                    <td><button className="a-btn a-btn--delete" onClick={() => onDelete(row.id)}>Delete</button></td>
                  </>
                )}
              </tr>
              {editingId === row.id && (
                <tr key={`${row.id}-edit`}>
                  <td colSpan={7} className="a-edit-cell">
                    <EditShelterForm
                      row={row}
                      onSave={data => onSaveEdit('shelters', row.id, data)}
                      onCancel={onCancelEdit}
                    />
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('sw_admin') === '1');
  const [pwd, setPwd]       = useState('');
  const [loginErr, setLoginErr] = useState('');

  const [loading, setLoading]   = useState(false);
  const [actionErr, setActionErr] = useState('');
  const [pendingB, setPendingB] = useState([]);
  const [pendingS, setPendingS] = useState([]);
  const [approvedB, setApprovedB] = useState([]);
  const [approvedS, setApprovedS] = useState([]);

  // Which row is currently open for editing
  const [editingId, setEditingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setActionErr('');
    try {
      const d = await fetchAll();
      setPendingB(d.pendingBusinesses);
      setPendingS(d.pendingShelters);
      setApprovedB(d.approvedBusinesses);
      setApprovedS(d.approvedShelters);
    } catch (e) {
      setActionErr('Failed to load: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (authed) load(); }, [authed, load]);

  function login(e) {
    e.preventDefault();
    if (pwd === ADMIN_PWD) {
      sessionStorage.setItem('sw_admin', '1');
      setAuthed(true);
    } else {
      setLoginErr('Incorrect password.');
    }
  }

  function logout() {
    sessionStorage.removeItem('sw_admin');
    setAuthed(false);
  }

  async function handleApprove(table, id) {
    setActionErr('');
    try { await approve(table, id); await load(); }
    catch (e) { setActionErr(e.message); }
  }

  async function handleReject(table, id) {
    if (!window.confirm('Reject and delete this submission?')) return;
    setActionErr('');
    try { await remove(table, id); await load(); }
    catch (e) { setActionErr(e.message); }
  }

  async function handleDelete(table, id) {
    if (!window.confirm('Delete this location permanently?')) return;
    setActionErr('');
    try { await remove(table, id); await load(); }
    catch (e) { setActionErr(e.message); }
  }

  async function handleSaveEdit(table, id, data) {
    await update(table, id, data);
    setEditingId(null);
    await load();
  }

  // ── Login screen ───────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="a-login-wrap">
        <form className="a-login" onSubmit={login}>
          <h1 className="a-login__title">SafeWork Admin</h1>
          <input
            className="a-input"
            type="password"
            placeholder="Password"
            value={pwd}
            onChange={e => setPwd(e.target.value)}
            autoFocus
          />
          {loginErr && <p className="a-err">{loginErr}</p>}
          <button className="a-btn a-btn--save" type="submit">Log in</button>
        </form>
      </div>
    );
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  const tableProps = (table) => ({
    editingId,
    onEdit:       (row) => setEditingId(row.id),
    onCancelEdit: ()    => setEditingId(null),
    onSaveEdit:   handleSaveEdit,
    onApprove:    (id)  => handleApprove(table, id),
    onReject:     (id)  => handleReject(table, id),
    onDelete:     (id)  => handleDelete(table, id),
  });

  return (
    <div className="a-panel">
      <div className="a-panel-header">
        <h1 className="a-panel-title">SafeWork Admin</h1>
        <button className="a-btn a-btn--cancel" onClick={logout}>Logout</button>
      </div>

      {actionErr && <p className="a-err a-err--banner">{actionErr}</p>}
      {loading   && <p className="a-loading">Loading…</p>}

      {!loading && (
        <>
          <section className="a-section">
            <h2 className="a-section-title">
              Pending Businesses
              {pendingB.length > 0 && <span className="a-badge">{pendingB.length}</span>}
            </h2>
            <BusinessesTable rows={pendingB} mode="pending" {...tableProps('businesses')} />
          </section>

          <section className="a-section">
            <h2 className="a-section-title">
              Pending Shelters
              {pendingS.length > 0 && <span className="a-badge">{pendingS.length}</span>}
            </h2>
            <SheltersTable rows={pendingS} mode="pending" {...tableProps('shelters')} />
          </section>

          <section className="a-section">
            <h2 className="a-section-title">Approved Businesses</h2>
            <BusinessesTable rows={approvedB} mode="approved" {...tableProps('businesses')} />
          </section>

          <section className="a-section">
            <h2 className="a-section-title">Approved Shelters</h2>
            <SheltersTable rows={approvedS} mode="approved" {...tableProps('shelters')} />
          </section>
        </>
      )}
    </div>
  );
}
