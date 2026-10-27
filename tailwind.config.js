/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#23282A',
          900: '#1B1F20',
          700: '#33393B',
          600: '#4A5154',
        },
        muted: {
          DEFAULT: '#6F6A5C',
          light: '#948E7E',
        },
        line: {
          DEFAULT: '#E7E1D3',
          strong: '#DAD2C0',
        },
        canvas: '#F7F3EA',
        brand: {
          50: '#EEF3EA',
          100: '#DCE7D5',
          200: '#BFD3B2',
          300: '#9DB98C',
          400: '#74975F',
          500: '#4E7A3D',
          600: '#3D6330',
          700: '#314F27',
        },
        success: {
          50: '#ECFDF5',
          100: '#D3F8E6',
          500: '#10B981',
          600: '#0E9F70',
          700: '#0A7F5A',
        },
        warn: {
          50: '#FFF8EB',
          100: '#FDEFCF',
          500: '#F0A32A',
          600: '#D98A12',
          700: '#A96A0C',
        },
        danger: {
          50: '#FEF3F2',
          100: '#FDE3E1',
          500: '#EF4444',
          600: '#DC2E2E',
          700: '#B02323',
        },
        grape: {
          50: '#F3F1E7',
          100: '#E7E3D3',
          500: '#7C8F5E',
          600: '#6A7C4E',
          700: '#55653D',
        },
        cream: {
          DEFAULT: '#FBF6EC',
          50: '#FEFBF5',
          100: '#F7EFDF',
          200: '#F1E4CC',
        },
        sand: {
          100: '#F8EBC9',
          200: '#F1DCA8',
          300: '#E7C87F',
        },
        lilac: {
          50: '#F4F2E8',
          100: '#EAE6D6',
          200: '#DBD5BF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Instrument Serif"', 'Georgia', 'Times New Roman', 'serif'],
      },
      fontSize: {
        '2xs': ['10.5px', '14px'],
        xs: ['11.5px', '16px'],
        sm: ['12.5px', '18px'],
        base: ['13.5px', '20px'],
        md: ['14.5px', '21px'],
        lg: ['16px', '23px'],
        xl: ['18px', '25px'],
        '2xl': ['21px', '28px'],
        '3xl': ['26px', '32px'],
        '4xl': ['32px', '38px'],
      },
      borderRadius: {
        lg: '10px',
        xl: '14px',
        '2xl': '18px',
        '3xl': '22px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,33,56,0.04), 0 6px 18px -10px rgba(15,33,56,0.10)',
        lift: '0 4px 10px rgba(15,33,56,0.05), 0 18px 40px -22px rgba(15,33,56,0.22)',
        pop: '0 10px 30px -8px rgba(15,33,56,0.18)',
        ring: '0 0 0 3px rgba(78,122,61,0.18)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(14px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        dash: {
          to: { strokeDashoffset: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up .45s cubic-bezier(.22,1,.36,1) both',
        'fade-in': 'fade-in .35s ease both',
        'slide-in': 'slide-in .4s cubic-bezier(.22,1,.36,1) both',
        'pop-in': 'pop-in .22s cubic-bezier(.22,1,.36,1) both',
        float: 'float 7s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
