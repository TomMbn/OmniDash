/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans:  ['Onest', 'system-ui', 'sans-serif'],
            },
            colors: {
                // Fonds
                'od-base':    'var(--bg-base)',
                'od-raised':  'var(--bg-raised)',
                'od-overlay': 'var(--bg-overlay)',
                'od-subtle':  'var(--bg-subtle)',
                'od-muted':   'var(--bg-muted)',
                // Accent
                'od-accent':  'var(--accent)',
                // Modules
                'muscu':   'var(--module-muscu)',
                'sleep':   'var(--module-sleep)',
                'nutri':   'var(--module-nutri)',
                'dress':   'var(--module-dress)',
                'travel':  'var(--module-travel)',
                'windows': 'var(--module-windows)',
                // Statuts
                'od-success': 'var(--status-success)',
                'od-warning': 'var(--status-warning)',
                'od-error':   'var(--status-error)',
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
                'sm': 'var(--radius-sm)',
                'md': 'var(--radius-md)',
                'lg': 'var(--radius-lg)',
                'xl': 'var(--radius-xl)',
            },
            boxShadow: {
                'sm':     'var(--shadow-sm)',
                'md':     'var(--shadow-md)',
                'lg':     'var(--shadow-lg)',
                'accent': 'var(--shadow-accent)',
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
