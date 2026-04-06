import { useEffect, useRef, useState } from 'react';
import BusinessDetail from '../pages/BusinessDetail';
import ShelterDetail from '../pages/ShelterDetail';
import './Sidebar.css';

const MOBILE_BP = 768;
const HANDLE_H  = 28;  // .sidebar-drag-handle height (px)
const MAX_TOP   = 16;  // card top never rises above 16px from screen top

function getMinTop() {
  // 60px always visible: 28px handle + ~32px so the pill is always grabbable
  return window.innerHeight - 60;
}

export default function Sidebar({ location, shelters, onClose, onSelectLocation, onSheetHeightChange, userLocation }) {
  const mobile = window.innerWidth <= MOBILE_BP;

  // sheetTop: CSS `top` value (px from viewport top).
  // Higher value = card lower on screen.
  // Starts fully off-screen so the slide-in animation plays on mount.
  const [sheetTop, setSheetTop] = useState(mobile ? window.innerHeight : 0);
  const [dragging, setDragging] = useState(false);

  const isDragging = useRef(false);
  const startY     = useRef(0);
  const startTop   = useRef(0);
  const scrollRef  = useRef(null);

  // Measure where the card top should be so the Directions button bottom is
  // just visible (+ 20px breathing room).  offsetTop of .links-list--inline
  // is relative to .sidebar (the nearest positioned ancestor), so it already
  // includes the drag-handle height.
  function measureInitialTop() {
    if (!scrollRef.current) return getMinTop();
    const directionsRow = scrollRef.current.querySelector('.links-list--inline');
    if (!directionsRow) return getMinTop();
    const contentBottom = directionsRow.offsetTop + directionsRow.offsetHeight;
    const neededH = contentBottom + 20;
    const vh = window.innerHeight;
    return Math.max(MAX_TOP, Math.min(getMinTop(), vh - neededH));
  }

  // Slide in on mount
  useEffect(() => {
    if (!mobile) return;
    let raf2;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setSheetTop(measureInitialTop()));
    });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
  }, []); // eslint-disable-line

  // Reset position and scroll when the viewed location changes
  useEffect(() => {
    if (!mobile) return;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    let raf2;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setSheetTop(measureInitialTop()));
    });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
  }, [location.id]); // eslint-disable-line

  // Notify MapView of the current visible sheet height
  useEffect(() => {
    if (mobile && onSheetHeightChange) {
      onSheetHeightChange(window.innerHeight - sheetTop);
    }
  }, [sheetTop]); // eslint-disable-line

  // Lock body scroll on desktop only
  useEffect(() => {
    if (mobile) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []); // eslint-disable-line

  // ── Drag handlers ──────────────────────────────────────────────────────────

  function onTouchStart(e) {
    isDragging.current = true;
    setDragging(true);
    startY.current   = e.touches[0].clientY;
    startTop.current = sheetTop;
  }

  function onTouchMove(e) {
    if (!isDragging.current) return;
    const delta   = e.touches[0].clientY - startY.current;
    const minTop  = getMinTop();
    const clamped = Math.max(MAX_TOP, Math.min(minTop, startTop.current + delta));
    setSheetTop(clamped);
  }

  function onTouchEnd(e) {
    if (!isDragging.current) return;
    isDragging.current = false;
    setDragging(false);

    const delta  = e.changedTouches[0].clientY - startY.current;
    const minTop = getMinTop();
    const cur    = Math.max(MAX_TOP, Math.min(minTop, startTop.current + delta));

    // Pure free positioning — stay exactly where the finger released
    setSheetTop(cur);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const sheetStyle = mobile ? {
    top:        `${sheetTop}px`,
    transition: dragging ? 'none' : 'top 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  } : {};

  return (
    <>
      {/* Desktop only — mobile map stays fully interactive */}
      {!mobile && <div className="sidebar-backdrop" onClick={onClose} />}

      <aside
        className="sidebar"
        role="complementary"
        aria-label="Location details"
        style={sheetStyle}
      >
        {mobile && (
          <div
            className="sidebar-drag-handle"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="sidebar-drag-pill" />
          </div>
        )}

        <button className="sidebar-close" onClick={onClose} aria-label="Close sidebar">
          ✕
        </button>

        <div className="sidebar-scroll" ref={scrollRef}>
          {location.type === 'business' ? (
            <BusinessDetail
              location={location}
              shelters={shelters}
              onClose={onClose}
              onSelectLocation={onSelectLocation}
              userLocation={userLocation}
            />
          ) : (
            <ShelterDetail location={location} onClose={onClose} />
          )}
        </div>
      </aside>
    </>
  );
}
