/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
        sans: ['Cairo', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        dark: {
          950: '#070b14',
          900: '#0b1120',
          850: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
        },
        emerald: {
          glow: '#10b981',
          dim: '#064e3b',
        },
        gold: {
          500: '#f59e0b',
          600: '#d97706',
          dim: '#78350f',
        },
        cyan: {
          glow: '#06b6d4',
          dim: '#164e63',
        },
      },
      spacing: {
        '2': '8px',
        '4': '16px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '14': '56px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
      },
      boxShadow: {
        'emerald-glow': '0 0 20px -5px rgba(16, 185, 129, 0.3)',
        'cyan-glow': '0 0 20px -5px rgba(6, 182, 212, 0.3)',
        'gold-glow': '0 0 20px -5px rgba(245, 158, 11, 0.3)',
        'danger-glow': '0 0 20px -5px rgba(239, 68, 68, 0.3)',
      },
    },
  },
  plugins: [],
}
