import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cg: {
          // Core backgrounds
          bg: {
            primary: '#0A0E14',
            secondary: '#111720',
            tertiary: '#1A2130',
            surface: '#212B3D',
            overlay: 'rgba(10, 14, 20, 0.8)',
            video: '#000000',
          },
          // Text
          text: {
            primary: '#E8ECF2',
            secondary: '#8B95A8',
            tertiary: '#5A6478',
            inverse: '#0A0E14',
          },
          // Borders
          border: {
            default: '#1E2738',
            subtle: '#161D2A',
            strong: '#2A3548',
            focus: '#3B82F6',
          },
          // Brand
          brand: {
            DEFAULT: '#3B82F6',
            hover: '#2563EB',
            subtle: 'rgba(59, 130, 246, 0.08)',
            muted: 'rgba(59, 130, 246, 0.15)',
          },
          // Status
          status: {
            online: '#22C55E',
            offline: '#6B7280',
            processing: '#3B82F6',
            warning: '#F59E0B',
            error: '#EF4444',
            info: '#06B6D4',
          },
          // Severity
          severity: {
            critical: {
              DEFAULT: '#DC2626',
              bg: 'rgba(220, 38, 38, 0.08)',
              border: 'rgba(220, 38, 38, 0.2)',
            },
            high: {
              DEFAULT: '#F97316',
              bg: 'rgba(249, 115, 22, 0.08)',
              border: 'rgba(249, 115, 22, 0.2)',
            },
            medium: {
              DEFAULT: '#EAB308',
              bg: 'rgba(234, 179, 8, 0.08)',
              border: 'rgba(234, 179, 8, 0.2)',
            },
            low: {
              DEFAULT: '#3B82F6',
              bg: 'rgba(59, 130, 246, 0.08)',
              border: 'rgba(59, 130, 246, 0.2)',
            },
            info: {
              DEFAULT: '#6B7280',
              bg: 'rgba(107, 114, 128, 0.08)',
              border: 'rgba(107, 114, 128, 0.2)',
            },
          },
          // AI Vision overlay colors
          vision: {
            person: '#00E5FF',
            phone: '#FFD600',
            face: '#00E676',
            threat: '#FF1744',
            zone: '#D946EF',
          },
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.125rem' }],
        base: ['0.875rem', { lineHeight: '1.25rem' }],
        lg: ['1rem', { lineHeight: '1.5rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
      },
      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
      },
      boxShadow: {
        'cg-sm': '0 1px 2px rgba(0, 0, 0, 0.3)',
        'cg-md':
          '0 4px 12px rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.04)',
        'cg-lg':
          '0 8px 24px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
        'cg-xl': '0 16px 48px rgba(0, 0, 0, 0.6)',
        'cg-glow-critical': '0 0 16px -2px rgba(220, 38, 38, 0.45)',
        'cg-glow-warning': '0 0 16px -2px rgba(245, 158, 11, 0.45)',
        'cg-glow-online': '0 0 12px -2px rgba(34, 197, 94, 0.45)',
        'cg-glow-active': '0 0 12px -1px rgba(59, 130, 246, 0.5)',
      },
      zIndex: {
        base: '0',
        dropdown: '10',
        sticky: '20',
        overlay: '30',
        modal: '40',
        toast: '50',
        tooltip: '60',
      },
      transitionDuration: {
        fast: '150ms',
        normal: '200ms',
        slow: '300ms',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in-right': 'slideInRight 250ms ease-out',
        'slide-in-left': 'slideInLeft 250ms ease-out',
        'slide-in-up': 'slideInUp 200ms ease-out',
        'slide-in-down': 'slideInDown 200ms ease-out',
        'fade-in': 'fadeIn 200ms ease-out',
        shimmer: 'shimmer 1.5s infinite',
      },
      keyframes: {
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      screens: {
        xs: '480px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1440px',
        '2xl': '1920px',
      },
    },
  },
  plugins: [],
};

export default config;
