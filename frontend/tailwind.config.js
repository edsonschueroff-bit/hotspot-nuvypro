/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      spacing: {
        '4.5': '1.125rem',
        '5.5': '1.375rem',
        '18': '4.5rem',
      },
      colors: {
        // Primary
        primary: {
          DEFAULT: '#2563eb',
          hover: '#1d4ed8',
          light: '#eff6ff',
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
        },
        // Accent
        accent: {
          DEFAULT: '#f97316',
          hover: '#ea6c0a',
          light: '#fff7ed',
        },
        // Surfaces
        surface: {
          DEFAULT: '#ffffff',
          secondary: '#f8fafc',
          tertiary: '#f1f5f9',
        },
        // Borders
        border: {
          DEFAULT: '#e2e8f0',
          strong: '#cbd5e1',
        },
        // Text
        text: {
          primary: '#0f172a',
          secondary: '#64748b',
          muted: '#94a3b8',
        },
        // Status colors
        success: {
          DEFAULT: '#10b981',
          light: '#ecfdf5',
          50: '#ecfdf5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        warning: {
          DEFAULT: '#f59e0b',
          light: '#fffbeb',
          50: '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
        },
        danger: {
          DEFAULT: '#ef4444',
          light: '#fef2f2',
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
        },
        // Category colors for sidebar icons
        cat: {
          dashboard: '#2563eb',
          marketing: '#f97316',
          network: '#10b981',
          compliance: '#475569',
          finance: '#16a34a',
          settings: '#64748b',
          super: '#7c3aed',
        },
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        'modal': '0 10px 25px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.06)',
        'topbar': '0 1px 0 rgba(0,0,0,0.06)',
      },
      borderRadius: {
        'sm': '6px',
        'md': '10px',
        'lg': '14px',
        'xl': '20px',
      },
      fontSize: {
        'kpi': ['32px', { lineHeight: '1.1', fontWeight: '700', letterSpacing: '-0.02em' }],
        'sidebar-section': ['10px', { lineHeight: '1.4', fontWeight: '600', letterSpacing: '0.08em' }],
      },
      width: {
        'sidebar': '256px',
        'sidebar-collapsed': '64px',
      },
      transitionDuration: {
        '150': '150ms',
      },
    },
  },
  plugins: [],
};
