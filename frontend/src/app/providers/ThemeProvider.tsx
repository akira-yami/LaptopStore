import { createContext, useContext, useState, type ReactNode } from 'react';

const THEME_KEY = 'laptopstore-theme';

const ThemeContext = createContext<{ darkMode: boolean; toggleTheme: () => void } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'dark' || saved === 'light') return saved === 'dark';
    } catch { /* Dùng thiết lập hệ thống khi trình duyệt chặn lưu trữ. */ }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    try {
      localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
    } catch { /* Lựa chọn vẫn có hiệu lực trong phiên hiện tại. */ }
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
      <div className="app-theme" data-theme={darkMode ? 'dark' : 'light'}>{children}</div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used within ThemeProvider');
  return theme;
}
