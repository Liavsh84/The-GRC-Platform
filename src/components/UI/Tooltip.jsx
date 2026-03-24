import { useState, useEffect, useRef } from 'react';

/**
 * Global tooltip driven by data-tip attributes.
 * Mount once anywhere in the tree. Any element with data-tip="text"
 * will automatically show a tooltip on hover after a short delay.
 */
const GlobalTooltip = () => {
  const [tip, setTip] = useState(null);
  const timerRef = useRef(null);
  const activeRef = useRef(null);

  useEffect(() => {
    const show = (el) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const rect = el.getBoundingClientRect();
        const above = rect.top > 72;
        // Clamp so bubble stays within viewport horizontally
        const rawX = rect.left + rect.width / 2;
        const x = Math.max(124, Math.min(rawX, window.innerWidth - 124));
        setTip({
          text: el.getAttribute('data-tip'),
          x,
          y: above ? rect.top - 10 : rect.bottom + 10,
          above,
        });
      }, 380);
    };

    const hide = () => {
      clearTimeout(timerRef.current);
      activeRef.current = null;
      setTip(null);
    };

    const onOver = (e) => {
      const el = e.target.closest('[data-tip]');
      if (!el) { if (activeRef.current) hide(); return; }
      if (activeRef.current === el) return;
      activeRef.current = el;
      show(el);
    };

    const onOut = (e) => {
      if (!activeRef.current) return;
      if (activeRef.current.contains(e.relatedTarget)) return;
      hide();
    };

    document.addEventListener('mouseover', onOver);
    document.addEventListener('mouseout', onOut);
    return () => {
      clearTimeout(timerRef.current);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
    };
  }, []);

  if (!tip?.text) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: tip.x,
        top: tip.y,
        transform: tip.above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
      className="tooltip-root"
    >
      <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl max-w-[240px] text-center leading-relaxed">
        {tip.text}
      </div>
      {/* Arrow */}
      <div style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 0,
        height: 0,
        ...(tip.above ? {
          bottom: -5,
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop: '5px solid #111827',
        } : {
          top: -5,
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderBottom: '5px solid #111827',
        }),
      }} />
    </div>
  );
};

export default GlobalTooltip;
