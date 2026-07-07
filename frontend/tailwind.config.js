/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#10151F',
        void: '#070A10',
        signal: {
          DEFAULT: '#A9791E',
          deep: '#7C5914',
          50: '#F7EFDC',
          100: '#EEDFB8',
        },
        parchment: '#FAF8F2',
        sage: {
          DEFAULT: '#1C8A5E',
          50: '#E8F5EF',
        },
        amberflag: '#C2760C',
        rose: {
          DEFAULT: '#C4293D',
          50: '#FBEAEC',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'signal-gradient': 'linear-gradient(160deg, #16233A 0%, #0E1826 55%, #070A10 100%)',
      },
    },
  },
  plugins: [],
};
