/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* ── Semantic core ─────────────────────────────────────────────
           Warm ivory surfaces, forest-green action, charcoal-olive text,
           terracotta attention, amber warning. Everything below the core
           is an alias onto these families so no screen can drift back to
           blue or purple.
        */
        ink: {
          DEFAULT: '#23282A',
          900: '#1B1F20',
          800: '#262B2C',
          700: '#33393B',
          600: '#4A5154',
          500: '#5C6366',
        },
        muted: {
          DEFAULT: '#6F6A5C',
          light: '#948E7E',
        },
        line: {
          DEFAULT: '#E7E1D3',
          strong: '#DAD2C0',
          soft: '#F0EBDF',
        },
        canvas: '#F7F3EA',
        surface: '#FFFFFF',

        /* Forest — primary action */
        brand: {
          50: '#EEF3EA',
          100: '#DCE7D5',
          200: '#BFD3B2',
          300: '#9DB98C',
          400: '#74975F',
          500: '#4E7A3D',
          600: '#3D6330',
          700: '#314F27',
          800: '#27401F',
          900: '#1F331A',
        },

        /* Sage — positive, calm, secondary */
        sage: {
          50: '#F2F5EE',
          100: '#E4EADB',
          200: '#CBD8BD',
          300: '#AFC39B',
          400: '#92A87C',
          500: '#7A9064',
          600: '#637650',
          700: '#4F5E41',
          800: '#414D36',
          900: '#363F2D',
        },

        /* Olive — informational, neutral-dark accent */
        olive: {
          50: '#F1F2EC',
          100: '#E4E6DB',
          200: '#CBCFB9',
          300: '#AAB08F',
          400: '#878F68',
          500: '#6B7350',
          600: '#565D3F',
          700: '#454A33',
          800: '#383C2A',
          900: '#2C2F21',
        },

        /* Terracotta — attention, human decision */
        terracotta: {
          50: '#FBF1EC',
          100: '#F6E0D6',
          200: '#EEC1AF',
          300: '#E29D84',
          400: '#D27D5F',
          500: '#C2664A',
          600: '#A8533B',
          700: '#8A4430',
          800: '#713828',
          900: '#5D2F22',
        },

        success: {
          50: '#ECF6EE',
          100: '#D6ECDA',
          200: '#AFD9B8',
          300: '#82C090',
          400: '#5AA66C',
          500: '#3F8A52',
          600: '#2F6E3F',
          700: '#265733',
          800: '#1F472A',
          900: '#193A23',
        },
        warn: {
          50: '#FDF6E7',
          100: '#FAEAC6',
          200: '#F3D48C',
          300: '#EABA50',
          400: '#DDA22B',
          500: '#C4891C',
          600: '#A06E14',
          700: '#7E5610',
          800: '#65450F',
          900: '#52390E',
        },
        danger: {
          50: '#FCF0EE',
          100: '#F8DEDA',
          200: '#F0BCB4',
          300: '#E5958A',
          400: '#D66F62',
          500: '#C25446',
          600: '#A4433A',
          700: '#863830',
          800: '#6E2F29',
          900: '#5B2823',
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
        /* Kept for backwards compatibility with earlier screens. */
        grape: {
          50: '#F3F1E7',
          100: '#E7E3D3',
          500: '#7C8F5E',
          600: '#6A7C4E',
          700: '#55653D',
        },
        lilac: {
          50: '#F4F2E8',
          100: '#EAE6D6',
          200: '#DBD5BF',
        },

        /* ── Compatibility aliases ─────────────────────────────────────
           Legacy screens still reference Tailwind's default palette names.
           Remapping them here keeps every one of those screens inside the
           warm system in a single change. New code should use the semantic
           names above instead.
        */
        blue: {
          50: '#F1F2EC', 100: '#E4E6DB', 200: '#CBCFB9', 300: '#AAB08F',
          400: '#878F68', 500: '#6B7350', 600: '#565D3F', 700: '#454A33',
          800: '#383C2A', 900: '#2C2F21',
        },
        indigo: {
          50: '#EFF3EC', 100: '#DFE7D8', 200: '#C2D1B6', 300: '#9FB58D',
          400: '#7C966A', 500: '#5F7B4E', 600: '#4C643E', 700: '#3D5032',
          800: '#334228', 900: '#2A3721',
        },
        violet: {
          50: '#F2F5EE', 100: '#E4EADB', 200: '#CBD8BD', 300: '#AFC39B',
          400: '#92A87C', 500: '#7A9064', 600: '#637650', 700: '#4F5E41',
          800: '#414D36', 900: '#363F2D',
        },
        purple: {
          50: '#F2F5EE', 100: '#E4EADB', 200: '#CBD8BD', 300: '#AFC39B',
          400: '#92A87C', 500: '#7A9064', 600: '#637650', 700: '#4F5E41',
          800: '#414D36', 900: '#363F2D',
        },
        pink: {
          50: '#FBF1EC', 100: '#F6E0D6', 200: '#EEC1AF', 300: '#E29D84',
          400: '#D27D5F', 500: '#C2664A', 600: '#A8533B', 700: '#8A4430',
          800: '#713828', 900: '#5D2F22',
        },
        rose: {
          50: '#FCF0EE', 100: '#F8DEDA', 200: '#F0BCB4', 300: '#E5958A',
          400: '#D66F62', 500: '#C25446', 600: '#A4433A', 700: '#863830',
          800: '#6E2F29', 900: '#5B2823',
        },
        fuchsia: {
          50: '#FBF1EC', 100: '#F6E0D6', 200: '#EEC1AF', 300: '#E29D84',
          400: '#D27D5F', 500: '#C2664A', 600: '#A8533B', 700: '#8A4430',
          800: '#713828', 900: '#5D2F22',
        },
        teal: {
          50: '#EFF3EC', 100: '#DFE7D8', 200: '#C2D1B6', 300: '#9FB58D',
          400: '#7C966A', 500: '#5F7B4E', 600: '#4C643E', 700: '#3D5032',
          800: '#334228', 900: '#2A3721',
        },
        cyan: {
          50: '#F1F2EC', 100: '#E4E6DB', 200: '#CBCFB9', 300: '#AAB08F',
          400: '#878F68', 500: '#6B7350', 600: '#565D3F', 700: '#454A33',
          800: '#383C2A', 900: '#2C2F21',
        },
        sky: {
          50: '#F1F2EC', 100: '#E4E6DB', 200: '#CBCFB9', 300: '#AAB08F',
          400: '#878F68', 500: '#6B7350', 600: '#565D3F', 700: '#454A33',
          800: '#383C2A', 900: '#2C2F21',
        },
        lime: {
          50: '#F2F5EE', 100: '#E4EADB', 200: '#CBD8BD', 300: '#AFC39B',
          400: '#92A87C', 500: '#7A9064', 600: '#637650', 700: '#4F5E41',
          800: '#414D36', 900: '#363F2D',
        },
        emerald: {
          50: '#ECF6EE', 100: '#D6ECDA', 200: '#AFD9B8', 300: '#82C090',
          400: '#5AA66C', 500: '#3F8A52', 600: '#2F6E3F', 700: '#265733',
          800: '#1F472A', 900: '#193A23',
        },
        green: {
          50: '#EEF3EA', 100: '#DCE7D5', 200: '#BFD3B2', 300: '#9DB98C',
          400: '#74975F', 500: '#4E7A3D', 600: '#3D6330', 700: '#314F27',
          800: '#27401F', 900: '#1F331A',
        },
        orange: {
          50: '#FDF6E7', 100: '#FAEAC6', 200: '#F3D48C', 300: '#EABA50',
          400: '#DDA22B', 500: '#C4891C', 600: '#A06E14', 700: '#7E5610',
          800: '#65450F', 900: '#52390E',
        },
        amber: {
          50: '#FDF6E7', 100: '#FAEAC6', 200: '#F3D48C', 300: '#EABA50',
          400: '#DDA22B', 500: '#C4891C', 600: '#A06E14', 700: '#7E5610',
          800: '#65450F', 900: '#52390E',
        },
        red: {
          50: '#FCF0EE', 100: '#F8DEDA', 200: '#F0BCB4', 300: '#E5958A',
          400: '#D66F62', 500: '#C25446', 600: '#A4433A', 700: '#863830',
          800: '#6E2F29', 900: '#5B2823',
        },
        /* Warm neutrals — replace the cool default greys so chrome
           (sidebar, header, tables) matches the ivory canvas. */
        slate: {
          50: '#FAF8F2', 100: '#F4F0E6', 200: '#E8E2D4', 300: '#D5CDBB',
          400: '#ADA491', 500: '#8A8172', 600: '#6B6357', 700: '#514B42',
          800: '#3C3831', 900: '#2A2722',
        },
        gray: {
          50: '#FAF8F2', 100: '#F4F0E6', 200: '#E8E2D4', 300: '#D5CDBB',
          400: '#ADA491', 500: '#8A8172', 600: '#6B6357', 700: '#514B42',
          800: '#3C3831', 900: '#2A2722',
        },
        zinc: {
          50: '#FAF8F2', 100: '#F4F0E6', 200: '#E8E2D4', 300: '#D5CDBB',
          400: '#ADA491', 500: '#8A8172', 600: '#6B6357', 700: '#514B42',
          800: '#3C3831', 900: '#2A2722',
        },
        neutral: {
          50: '#FAF8F2', 100: '#F4F0E6', 200: '#E8E2D4', 300: '#D5CDBB',
          400: '#ADA491', 500: '#8A8172', 600: '#6B6357', 700: '#514B42',
          800: '#3C3831', 900: '#2A2722',
        },
        stone: {
          50: '#FAF8F2', 100: '#F4F0E6', 200: '#E8E2D4', 300: '#D5CDBB',
          400: '#ADA491', 500: '#8A8172', 600: '#6B6357', 700: '#514B42',
          800: '#3C3831', 900: '#2A2722',
        },
      },

      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Instrument Serif"', 'Georgia', 'Times New Roman', 'serif'],
      },
      fontSize: {
        '2xs': ['11px', '15px'],
        xs: ['12px', '17px'],
        sm: ['13px', '19px'],
        base: ['14px', '21px'],
        md: ['15px', '22px'],
        lg: ['17px', '24px'],
        xl: ['19px', '26px'],
        '2xl': ['22px', '29px'],
        '3xl': ['27px', '34px'],
        '4xl': ['33px', '40px'],
        '5xl': ['42px', '46px'],
      },
      borderRadius: {
        lg: '10px',
        xl: '14px',
        '2xl': '18px',
        '3xl': '22px',
        '4xl': '28px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(35,40,42,0.04), 0 6px 18px -10px rgba(35,40,42,0.10)',
        lift: '0 4px 10px rgba(35,40,42,0.05), 0 18px 40px -22px rgba(35,40,42,0.22)',
        pop: '0 10px 30px -8px rgba(35,40,42,0.18)',
        ring: '0 0 0 3px rgba(78,122,61,0.18)',
        inset: 'inset 0 1px 0 rgba(255,255,255,0.7)',
        'glow-brand': '0 0 20px -4px rgba(78,122,61,.35)',
        'glow-sage': '0 0 20px -4px rgba(122,144,100,.32)',
        'glow-terra': '0 0 20px -4px rgba(194,102,74,.32)',
        'glow-amber': '0 0 20px -4px rgba(196,137,28,.30)',
        'glow-danger': '0 0 20px -4px rgba(194,84,70,.30)',
        'glow-olive': '0 0 20px -4px rgba(107,115,80,.30)',
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(14px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.94)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'float-gentle': {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        dash: { to: { strokeDashoffset: '0' } },
        ping: { '75%,100%': { transform: 'scale(2)', opacity: '0' } },
        'gradient-shift': {
          '0%,100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
        'view-fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        sweep: {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(120%)' },
        },
        'soft-pulse': {
          '0%,100%': { opacity: '0.55', transform: 'scale(1)' },
          '50%': { opacity: '0.9', transform: 'scale(1.04)' },
        },
        'draw-line': {
          '0%': { strokeDashoffset: '400' },
          '100%': { strokeDashoffset: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up .45s cubic-bezier(.22,1,.36,1) both',
        'fade-in': 'fade-in .35s ease both',
        'slide-in': 'slide-in .4s cubic-bezier(.22,1,.36,1) both',
        'pop-in': 'pop-in .22s cubic-bezier(.22,1,.36,1) both',
        'scale-in': 'scale-in .28s cubic-bezier(.22,1,.36,1) both',
        float: 'float 7s ease-in-out infinite',
        'float-gentle': 'float-gentle 4s ease-in-out infinite',
        ping: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
        'gradient-shift': 'gradient-shift 8s ease infinite',
        'view-fade-in': 'view-fade-in .4s cubic-bezier(.22,1,.36,1) both',
        sweep: 'sweep 2.4s cubic-bezier(.4,0,.2,1) infinite',
        'soft-pulse': 'soft-pulse 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
