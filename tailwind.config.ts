import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        burgundy: '#7B1C2E',
        'burgundy-dark': '#5A1220',
        'burgundy-light': '#9B2C3E',
        orange: '#D4622A',
        'orange-light': '#E8834D',
        cream: '#FDF6EC',
        'cream-dark': '#F5E8D0',
        charcoal: '#2C2C2C',
        'charcoal-light': '#4A4A4A',
        warmgray: '#8B7355',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'warm-gradient': 'linear-gradient(135deg, #7B1C2E 0%, #D4622A 100%)',
        'hero-gradient': 'linear-gradient(to bottom, rgba(44,44,44,0.7) 0%, rgba(123,28,46,0.5) 100%)',
        'card-gradient': 'linear-gradient(to bottom, transparent 60%, rgba(44,44,44,0.8) 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'bounce-subtle': 'bounceSub 0.3s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(20px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        bounceSub: { '0%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.05)' }, '100%': { transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
}

export default config
