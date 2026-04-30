import { base44 } from '@/api/base44Client';

// Check if running in browser (not during SSR)
const isBrowser = typeof window !== 'undefined';

export async function runMigrationsOnce() {
  if (!isBrowser) return;

  // Check if migrations already ran this session
  if (sessionStorage.getItem('migrations_completed')) {
    return;
  }

  try {
    // DEV-läge: alltid autentiserad som admin
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return;
    }

    // Migrations körs inte i dev-läge (ingen base44.functions)
    sessionStorage.setItem('migrations_completed', 'true');
  } catch (error) {
    // Silently fail
    sessionStorage.setItem('migrations_completed', 'true');
    console.error('Migration error:', error);
  }
}