'use client';
import { useTheme } from '@/context/ThemeContext';

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-switcher">
      <button 
        className={theme === 'neo-brutalism' ? 'active' : ''} 
        onClick={() => setTheme('neo-brutalism')}
        title="Neo-Brutalism"
      >
        🎨
      </button>
      <button 
        className={theme === 'liquid-glass' ? 'active' : ''} 
        onClick={() => setTheme('liquid-glass')}
        title="Liquid Glass"
      >
        🧪
      </button>
      <button 
        className={theme === 'minimalist' ? 'active' : ''} 
        onClick={() => setTheme('minimalist')}
        title="Minimalist"
      >
        ⚪
      </button>

      <style jsx>{`
        .theme-switcher {
          display: flex;
          gap: 0.5rem;
          background: var(--secondary);
          padding: 0.25rem;
          border: var(--border-width) solid var(--primary);
        }
        button {
          background: none;
          border: 2px solid transparent;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0.25rem 0.5rem;
          transition: all 0.2s ease;
        }
        button:hover {
          background: rgba(0,0,0,0.05);
        }
        button.active {
          border-color: var(--accent);
          background: rgba(0,0,0,0.05);
        }
      `}</style>
    </div>
  );
}
