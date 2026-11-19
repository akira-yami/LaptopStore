import { useTheme } from '@/app/providers/ThemeProvider';
import { Icon } from './Icon';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { darkMode, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className={`icon-btn theme-toggle ${className}`}
      onClick={toggleTheme}
      aria-label="Chế độ tối"
      aria-pressed={darkMode}
      title={darkMode ? 'Bật chế độ sáng' : 'Bật chế độ tối'}
    >
      <Icon name={darkMode ? 'sun' : 'moon'} />
    </button>
  );
}
