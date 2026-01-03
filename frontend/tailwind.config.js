// Copyright © 2025 Jalapeno Labs

const { heroui } = require('@heroui/react')

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
    '../node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      container: {
        center: true,
        padding: '1rem',
        screens: {
          sm: '100%',
          md: '960px',
          lg: '1140px',
          xl: '1200px'
        }
      }
    }
  },
  darkMode: 'class',
  plugins: [
    heroui()
  ]
}
