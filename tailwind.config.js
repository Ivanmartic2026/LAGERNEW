/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
    theme: {
        extend: {
            borderRadius: {
                xl: 'calc(var(--radius) + 4px)',
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 6px)',
                sm: 'calc(var(--radius) - 10px)',
            },
            fontFamily: {
                sans:    ['Inter', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'system-ui', 'sans-serif'],
                display: ['Inter Tight', 'Inter', 'system-ui', 'sans-serif'],
                body:    ['Inter', 'system-ui', 'sans-serif'],
                brand:   ['Inter Tight', 'Inter', 'system-ui', 'sans-serif'],
            },
            letterSpacing: {
                tightest: '-0.04em',
                tighter:  '-0.03em',
                tight:    '-0.02em',
            },
            colors: {
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                surface: {
                    DEFAULT: 'hsl(var(--surface-1))',
                    1: 'hsl(var(--surface-1))',
                    2: 'hsl(var(--surface-2))',
                    3: 'hsl(var(--surface-3))',
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))'
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))'
                },
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))'
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))'
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))'
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))'
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))'
                },
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                signal: {
                    DEFAULT: 'hsl(var(--signal))',
                    hi:      'hsl(var(--signal-hi))',
                    lo:      'hsl(var(--signal-lo))',
                    soft:    'hsl(var(--signal-soft))',
                },
                status: {
                    ok:   'hsl(var(--status-ok))',
                    warn: 'hsl(var(--status-warn))',
                    bad:  'hsl(var(--status-bad))',
                    info: 'hsl(var(--status-info))',
                },
                chart: {
                    '1': 'hsl(var(--chart-1))',
                    '2': 'hsl(var(--chart-2))',
                    '3': 'hsl(var(--chart-3))',
                    '4': 'hsl(var(--chart-4))',
                    '5': 'hsl(var(--chart-5))'
                },
            },
            boxShadow: {
                'glow-signal': '0 0 0 1px hsl(var(--signal) / 0.5), 0 8px 32px -8px hsl(var(--signal) / 0.55), 0 2px 8px -2px hsl(var(--signal) / 0.35)',
                'card-1': '0 1px 0 hsl(0 0% 100% / 0.05) inset, 0 8px 24px -12px rgb(0 0 0 / 0.6)',
                'card-2': '0 1px 0 hsl(0 0% 100% / 0.06) inset, 0 16px 40px -20px rgb(0 0 0 / 0.7)',
            },
            backdropBlur: {
                xs: '4px',
            },
            transitionTimingFunction: {
                'apple': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
                'tesla': 'cubic-bezier(0.16, 1, 0.3, 1)',
            },
            keyframes: {
                'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
                'accordion-up':   { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
                'fade-up':        { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
                'shimmer':        { from: { backgroundPosition: '0 0' }, to: { backgroundPosition: '-200% 0' } },
                'pulse-soft':     { '0%, 100%': { opacity: '0.6' }, '50%': { opacity: '1' } },
            },
            animation: {
                'accordion-down': 'accordion-down 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)',
                'accordion-up':   'accordion-up 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)',
                'fade-up':        'fade-up 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) both',
                'shimmer':        'shimmer 2s linear infinite',
                'pulse-soft':     'pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }
        }
    },
    safelist: [
        'pill', 'pill-ok', 'pill-warn', 'pill-bad', 'pill-info', 'pill-signal',
        'glass', 'glass-strong', 'hairline', 'hairline-strong',
        'glow-signal', 'glow-soft', 'stroke-gradient', 'num-tabular',
        // legacy classes kept for in-flight code that still references them
        'bg-signal', 'text-signal', 'border-signal',
    ],
    plugins: [require("tailwindcss-animate")],
}
