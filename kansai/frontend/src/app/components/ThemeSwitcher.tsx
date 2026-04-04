'use client';
import { useTheme } from '@/context/ThemeContext';

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-switcher">
      <select 
        value={theme} 
        onChange={(e) => setTheme(e.target.value as 'neo-brutalism' | 'minimalist')}
        className="theme-select"
      >
        <option value="neo-brutalism">Neo-Brutalism</option>
        <option value="minimalist">Minimalist</option>
      </select>

      <style jsx>{`
        .theme-switcher {
          display: flex;
          align-items: center;
        }
        .theme-select {
          padding: 0.5rem 1rem;
          font-family: inherit;
          font-weight: bold;
          font-size: 0.9rem;
          background: var(--bg);
          color: var(--text);
          border: var(--border-width) solid var(--primary);
          cursor: pointer;
          outline: none;
        }
        .theme-select:hover {
          background: rgba(0,0,0,0.02);
        }
      `}</style>
    </div>
  );
}
