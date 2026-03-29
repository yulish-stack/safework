import { useEffect, useRef, useState } from 'react';
import BusinessDetail from '../pages/BusinessDetail';
import ShelterDetail from '../pages/ShelterDetail';
import './Sidebar.css';

const MOBILE_BP = 768;

function getSnap() {
  const vh = window.innerHeight;
  const sheetH = Math.round(vh * 0.90);
  return {
    sheetH,
    min: sheetH - 44,                    // 44px visible — drag handle only (hard floor)
    mid: sheetH - Math.round(vh * 0.47), // ~47vh visible — name/address/nearest shelter
    max: 0,                              // ~90vh visible — full content
  };
}

export default function Sidebar({ location, shelters, onClose, onSelectLocation, onSheetHeightChange, userLocation }) {
  const mobile  = window.innerWidth <= MOBILE_BP;
  const snap    = useRef(getSnap());

  const [translateY, setTranslateY] = useState(mobile ? snap.current.sheetH : 0);
  const [dragging,   setDragging]   = useState(false);

  const isDragging = useRef(false);
  const startY     = useRef(0);
  const startTY    = useRef(0);
  const scrollRef  = useRef(null);

  // Slide up on initial mount
  useEffect(() => {
    if (!mobile) return;
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => setTranslateY(snap.current.mid));
      return () => cancelAnimationFrame(raf2);
    });
    return () => cancelAnimationFrame(raf1);
  }, []); // eslint-disable-line

  // Reset snap and scroll position when the viewed location changes
  useEffect(() => {
    if (mobile) setTranslateY(snap.current.mid);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [location.id]); // eslint-disable-line

  // Notify MapView of the current visible sheet height
  useEffect(() => {
    if (mobile && onSheetHeightChange) {
      onSheetHeightChange(snap.current.sheetH - translateY);
    }
  }, [translateY]); // eslint-disable-line

  // Lock body scroll on desktop only
  useEffect(() => {
    if (mobile) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []); // eslint-disable-line

  // ── Drag handlers ──────────────────────────────────────────────────────────

  function onTouchStart(e) {
    isDragging.current  = true;
    setDragging(true);
    startY.current  = e.touches[0].clientY;
    startTY.current = translateY;
  }

  function onTouchMove(e) {
    if (!isDragging.current) return;
    const delta   = e.touches[0].clientY - startY.current;
    // Hard floor: never let translateY exceed sheetH - 44 (44px always visible)
    const clamped = Math.max(0, Math.min(snap.current.sheetH - 44, startTY.current + delta));
    setTranslateY(clamped);
  }

  function onTouchEnd(e) {
    if (!isDragging.current) return;
    isDragging.current = false;
    setDragging(false);

    const endY  = e.changedTouches[0].clientY;
    const delta = endY - startY.current;
    const cur   = Math.min(startTY.current + delta, snap.current.sheetH - 44);
    const { min, mid, max } = snap.current;

    if (delta > 60) {
      // Fast downward flick
      setTranslateY(cur > (mid + min) / 2 ? min : mid);
    } else if (delta < -60) {
      // Fast upward flick
      setTranslateY(cur < mid / 2 ? max : mid);
    } else {
      // Nearest snap
      const nearest = [
        [min, Math.abs(cur - min)],
        [mid, Math.abs(cur - mid)],
        [max, Math.abs(cur - max)],
      ].sort((a, b) => a[1] - b[1])[0][0];
      setTranslateY(nearest);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const sheetStyle = mobile ? {
    transform:  `translateY(${translateY}px)`,
    transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
