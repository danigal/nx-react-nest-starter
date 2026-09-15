import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Theme = 'system' | 'light' | 'dark';
const storageKey = 'starter-theme';

interface ThemeContextValue {
  theme: Theme;
  setTheme(theme: Theme): void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function storedTheme(): Theme {
  const value = localStorage.getItem(storageKey);
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(storedTheme);

  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', dark);
    };
    apply();
    if (theme === 'system') media.addEventListener('change', apply);
    localStorage.setItem(storageKey, theme);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
