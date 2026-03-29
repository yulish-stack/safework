import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './SocialSection.css';

// ── Utilities ─────────────────────────────────────────────────────────────────

function getVoterToken() {
  let token = localStorage.getItem('voter_token');
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem('voter_token', token);
  }
  return token;
}

function timeAgo(dateStr) {
  const utc  = /Z|[+-]\d{2}:\d{2}$/.test(dateStr) ? dateStr : dateStr + 'Z';
  const diff = Date.now() - new Date(utc).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins} ${mins === 1 ? 'minute' : 'minutes'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} ${hrs === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

// ── Ratings ───────────────────────────────────────────────────────────────────

export function RatingsSection({ locationId, entityType, categories }) {
  const [ratings, setRatings]     = useState([]);
  const [hoveredKey, setHoveredKey] = useState(null);
  const [hoveredStar, setHoveredStar] = useState(0);
  const voterToken = getVoterToken();

  useEffect(() => {
    supabase
      .from('ratings')
      .select('*')
      .eq('entity_id', locationId)
      .eq('entity_type', entityType)
      .then(({ data, error }) => { if (!error) setRatings(data || []); });
  }, [locationId, entityType]);

  async function handleRate(categoryKey, score) {
    const alreadyVoted = ratings.some(
      r => r.category === categoryKey && r.voter_token === voterToken
    );
    if (alreadyVoted) return;

    const { data, error } = await supabase
      .from('ratings')
      .insert({ entity_id: locationId, entity_type: entityType, category: categoryKey, score, voter_token: voterToken })
      .select()
      .single();

    if (!error && data) setRatings(prev => [...prev, data]);
  }

  return (
    <section className="detail-section">
      <h2 className="detail-section__title">Ratings</h2>
      <div className="ratings-grid">
        {categories.map(({ label, key }) => {
          const catRatings  = ratings.filter(r => r.category === key);
          const userScore   = ratings.find(r => r.category === key && r.voter_token === voterToken)?.score ?? null;
          const hasVoted    = userScore !== null;
          const isHovering  = hoveredKey === key;
          const displayScore = hasVoted ? userScore : (isHovering ? hoveredStar : 0);
          const avg = catRatings.length
            ? (catRatings.reduce((s, r) => s + r.score, 0) / catRatings.length).toFixed(1)
            : null;

          return (
            <div key={key} className="rating-row">
              <span className="rating-row__label">{label}</span>
              <div
                className="rating-stars"
                onMouseLeave={() => { setHoveredKey(null); setHoveredStar(0); }}
              >
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    className={`star-btn ${star <= displayScore ? 'star-btn--filled' : ''}`}
                    onClick={() => handleRate(key, star)}
                    onMouseEnter={() => { if (!hasVoted) { setHoveredKey(key); setHoveredStar(star); } }}
                    disabled={hasVoted}
                    aria-label={`Rate ${star} out of 5`}
                  >
                    {star <= displayScore ? '★' : '☆'}
                  </button>
                ))}
              </div>
              <span className="rating-meta">
                {avg !== null
                  ? `${avg} · ${catRatings.length} ${catRatings.length === 1 ? 'vote' : 'votes'}`
                  : 'No ratings yet'}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Comments ──────────────────────────────────────────────────────────────────

export function CommentsSection({ locationId, entityType }) {
  const [comments, setComments] = useState([]);
  const [name, setName]         = useState('');
  const [body, setBody]         = useState('');
  const [posting, setPosting]   = useState(false);
  const [err, setErr]           = useState('');
  const voterToken = getVoterToken();

  useEffect(() => {
    supabase
      .from('comments')
      .select('*')
      .eq('entity_id', locationId)
      .eq('entity_type', entityType)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => { if (!error) setComments(data || []); });
  }, [locationId, entityType]);

  async function handlePost(e) {
    e.preventDefault();
    if (!name.trim() || !body.trim()) { setErr('Name and comment are required.'); return; }
    setPosting(true); setErr('');

    const { data, error } = await supabase
      .from('comments')
      .insert({
        entity_id:    locationId,
        entity_type:  entityType,
        display_name: name.trim(),
        body:         body.trim(),
        voter_token:  voterToken,
      })
      .select()
      .single();

    setPosting(false);
    if (error) { setErr(error.message); return; }
    setComments(prev => [data, ...prev]);
    setName('');
    setBody('');
  }

  return (
    <section className="detail-section">
      <h2 className="detail-section__title">Comments</h2>

      {comments.length > 0 ? (
        <ul className="comment-list">
          {comments.map(c => (
            <li key={c.id} className="comment-item">
              <div className="comment-header">
                <span className="comment-author">{c.display_name}</span>
                <span className="comment-time">{timeAgo(c.created_at)}</span>
              </div>
              <p className="comment-body">{c.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="comment-empty">No comments yet. Be the first!</p>
      )}

      <form className="comment-form" onSubmit={handlePost}>
        <input
          className="comment-field"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
        />
        <textarea
          className="comment-field comment-field--area"
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Share your experience..."
          rows={3}
        />
        {err && <p className="comment-err">{err}</p>}
        <button className="comment-submit" type="submit" disabled={posting}>
          {posting ? 'Posting…' : 'Post'}
        </button>
      </form>
    </section>
  );
}
