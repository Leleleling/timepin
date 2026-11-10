/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'rgb(var(--tp-brand) / <alpha-value>)',
          soft: 'rgb(var(--tp-brand-soft) / <alpha-value>)',
          deep: 'rgb(var(--tp-brand-deep) / <alpha-value>)',
        },
        sun: {
          DEFAULT: '#F5A623',
          soft: '#FFF3DF',
        },
        success: {
          DEFAULT: 'rgb(var(--tp-success) / <alpha-value>)',
          soft: 'rgb(var(--tp-success-soft) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--tp-warning) / <alpha-value>)',
          deep: 'rgb(var(--tp-warning-deep) / <alpha-value>)',
          soft: 'rgb(var(--tp-warning-soft) / <alpha-value>)',
        },
        muted: {
          DEFAULT: '#6B7280',
          soft: '#F3F4F6',
        },
        canvas: {
          light: '#F9FAFB',
          surface: '#FFFFFF',
          dark: '#111827',
          'surface-dark': '#1F2937',
        },
      },
      fontFamily: {
        sans: [
          'PingFang SC',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'sans-serif',
        ],
      },
      boxShadow: {
        soft: '0 10px 32px -16px rgba(17, 24, 39, 0.24)',
        lift: '0 18px 48px -20px rgb(var(--tp-brand) / 0.42)',
      },
      borderRadius: {
        card: 'var(--tp-radius)',
      },
      transitionDuration: {
        200: '200ms',
      },
    },
  },
  plugins: [],
}
