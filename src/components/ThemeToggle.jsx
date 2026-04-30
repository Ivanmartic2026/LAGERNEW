import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export default function ThemeToggle() {
  const { isDark, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="w-9 h-9 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff6b35]"
      title={isDark ? 'Byt till ljust tema' : 'Byt till mörkt tema'}
      aria-label={isDark ? 'Ljust tema' : 'Mörkt tema'}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
