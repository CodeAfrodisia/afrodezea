import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        charcoal: {
          DEFAULT: '#121212',
          50:  '#1a1a1a',
          100: '#1f1f1f',
          200: '#262626',
          300: '#2e2e2e',
          400: '#3a3a3a',
          500: '#454545',
          600: '#5a5a5a',
          700: '#6e6e6e',
          800: '#0d0d0d',
          900: '#0a0a0a'
        },
        cream: {
          DEFAULT: '#f5f1e6',
          50:  '#f9f6ee',
          100: '#f5f1e6',
          200: '#eee7d6',
          300: '#e6dcc4',
          400: '#ddcfad',
          500: '#d1bf91',
          600: '#bfa97a',
          700: '#a98f5e',
          800: '#8b7245',
          900: '#6e5936'
        },
        wine: {
          DEFAULT: '#2A1625',
          600: '#2A1625',
          700: '#231220',
          800: '#1b0e19',
          900: '#130a12'
        },
        gold: {
          DEFAULT: '#D4AF37',
          400: '#D4AF37',
          500: '#C9A227',
          600: '#B38E1F'
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
