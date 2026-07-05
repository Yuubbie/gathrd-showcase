/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#15111F',
        void: '#0F0B1A',
        signal: {
          DEFAULT: '#6D3FF0',
          deep: '#3D1F8C',
          50: '#F2EDFD',
          100: '#E4D9FB',
        },
        parchment: '#FAF8FC',
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
        display: ['Sora', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'signal-gradient': 'linear-gradient(160deg, #6D3FF0 0%, #3D1F8C 60%, #0F0B1A 100%)',
      },
    },
  },
  plugins: [],
};
