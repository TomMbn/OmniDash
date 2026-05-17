/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                serif: ['DM Serif Display', 'Georgia', 'serif'],
                sans:  ['DM Sans', 'system-ui', 'sans-serif'],
            },
            colors: {
                // Backgrounds
                'od-base':    '#0A0A0A',
                'od-raised':  '#111111',
                'od-overlay': '#1A1A1A',
                'od-subtle':  '#222222',
                'od-muted':   '#2C2C2C',
                // Accent
                'od-accent':  '#D4976A',
                // Modules
                'muscu':  '#D4976A',
                'sleep':  '#7A91B8',
                'nutri':  '#7DAD8A',
                'dress':  '#B8967E',
                'travel': '#A08B6A',
                // Status
                'od-success': '#6AAA7E',
                'od-warning': '#C9A04C',
                'od-error':   '#B05A5A',
            },
            animation: {
                'fade-in':    'fadeIn var(--dur-base, 320ms) var(--ease-out, cubic-bezier(0.16,1,0.3,1)) forwards',
                'slide-up':   'slideUp var(--dur-base, 320ms) var(--ease-out, cubic-bezier(0.16,1,0.3,1)) forwards',
                'scale-in':   'scaleIn var(--dur-base, 320ms) var(--ease-out, cubic-bezier(0.16,1,0.3,1)) forwards',
            },
            keyframes: {
                fadeIn: {
                    '0%':   { opacity: '0', transform: 'translateY(8px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideUp: {
                    '0%':   { opacity: '0', transform: 'translateY(16px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                scaleIn: {
                    '0%':   { opacity: '0', transform: 'scale(0.96)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
            },
            borderRadius: {
                'sm': '10px',
                'md': '16px',
                'lg': '22px',
                'xl': '28px',
            },
            boxShadow: {
                'sm':     '0 1px 4px rgba(0,0,0,0.5)',
                'md':     '0 4px 20px rgba(0,0,0,0.55)',
                'lg':     '0 16px 48px rgba(0,0,0,0.65)',
                'accent': '0 8px 32px rgba(212,151,106,0.18)',
            },
            transitionTimingFunction: {
                'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
            },
            transitionDuration: {
                'fast': '180ms',
                'base': '320ms',
                'slow': '480ms',
            },
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}
