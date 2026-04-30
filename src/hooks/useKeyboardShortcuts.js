import { useEffect } from 'react';

/**
 * useKeyboardShortcuts — global keyboard shortcuts for Lager AI
 * 
 * Shortcuts:
 *   ?         — Show help
 *   b         — Go to ProcessBoard
 *   n         — New comment (focus chat input)
 *   j/k       — Navigate cards (when board focused)
 *   g + k     — Go to Konstruktion tab
 *   g + p     — Go to Produktion tab
 *   g + l     — Go to Lager tab
 *   g + m     — Go to Montering tab
 *   g + v     — Go to Leverans tab
 *   g + o     — Go to Overview tab
 *   Esc       — Close modals/panels
 */

export function useKeyboardShortcuts({ navigate, onShowHelp, onFocusChat }) {
  useEffect(() => {
    let gKeyPressed = false;
    let gTimeout = null;

    const handleKeyDown = (e) => {
      // Ignore when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        if (e.key === 'Escape') {
          e.target.blur();
        }
        return;
      }

      // Show help
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onShowHelp?.();
        return;
      }

      // g-key chord prefix
      if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
        gKeyPressed = true;
        clearTimeout(gTimeout);
        gTimeout = setTimeout(() => { gKeyPressed = false; }, 800);
        return;
      }

      // Navigation chords after 'g'
      if (gKeyPressed) {
        gKeyPressed = false;
        clearTimeout(gTimeout);

        const chordMap = {
          k: '/WorkOrders',
          o: 'overview',
          c: 'konstruktion',
          p: 'produktion',
          l: 'lager',
          m: 'montering',
          v: 'leverans',
        };

        if (chordMap[e.key]) {
          e.preventDefault();
          if (e.key === 'k') {
            navigate?.('/WorkOrders');
          } else if (navigate && window.location.pathname.startsWith('/WorkOrders/')) {
            const woId = window.location.pathname.split('/')[2];
            if (woId) navigate(`/WorkOrders/${woId}/${chordMap[e.key]}`);
          }
        }
        return;
      }

      // Direct shortcuts
      switch (e.key) {
        case 'b':
          e.preventDefault();
          navigate?.('/WorkOrders');
          break;
        case 'n':
          e.preventDefault();
          onFocusChat?.();
          break;
        case 'Escape':
          // Close any open modals by dispatching custom event
          window.dispatchEvent(new CustomEvent('close-modals'));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(gTimeout);
    };
  }, [navigate, onShowHelp, onFocusChat]);
}
