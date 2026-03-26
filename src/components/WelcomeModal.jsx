import { useState } from 'react';
import './WelcomeModal.css';

const SCREENS = [
  {
    title: 'Welcome to SafeWork ☕🚪',
    body:  'Tel Aviv keeps working. Even when the sirens do too. SafeWork helps you find cafés and workspaces close to a shelter — so you can get stuff done and know exactly where to go if you need to.',
  },
  {
    title: 'It runs on you 🙏',
    body:  'The more people add places and share their experience, the more useful this gets for everyone. Know a great spot? Add it. Been there? Rate it.',
  },
];

export default function WelcomeModal({ onClose }) {
  const [screen,   setScreen]   = useState(0);
  const [dontShow, setDontShow] = useState(false);

  function handleClose() {
    if (dontShow) localStorage.setItem('safework_welcome_seen', 'true');
    onClose();
  }

  const isLast = screen === SCREENS.length - 1;

  return (
    <div className="wm-backdrop" onClick={handleClose}>
      <div className="wm-card" onClick={e => e.stopPropagation()}>
        <h2 className="wm-title">{SCREENS[screen].title}</h2>
        <p className="wm-body">{SCREENS[screen].body}</p>

        {isLast && (
          <label className="wm-check">
            <input
              type="checkbox"
              checked={dontShow}
              onChange={e => setDontShow(e.target.checked)}
            />
            Don't show this again
          </label>
        )}

        <div className="wm-footer">
          <div className="wm-dots">
            {SCREENS.map((_, i) => (
              <span key={i} className={`wm-dot ${i === screen ? 'wm-dot--active' : ''}`} />
            ))}
          </div>

          {isLast ? (
            <button className="wm-btn" onClick={handleClose}>Let's go →</button>
          ) : (
            <button className="wm-btn" onClick={() => setScreen(s => s + 1)}>Next →</button>
          )}
        </div>
      </div>
    </div>
  );
}
