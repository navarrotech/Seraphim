// Copyright © 2026 Jalapeno Labs

import { heroui } from '@heroui/react'

import { generateTailwindScale } from '../common/src/tailwindConfig'

import theme from './public/brand/theme.json'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../common/src/**/*.{ts,tsx}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
    '../node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
      },
      borderRadius: {
        'sm': '0.25rem',
        'DEFAULT': '0.5rem',
        'md': '0.75rem',
        'lg': '1rem',
        'xl': '1.25rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      container: {
        center: true,
        padding: '1rem',
        screens: {
          sm: '100%',
          md: '960px',
          lg: '1140px',
          xl: '1200px',
        },
      },
    },
  },
  plugins: [
    heroui({
      // https://www.heroui.com/docs/customization/colors#common-colors
      addCommonColors: true,
      // https://www.heroui.com/docs/customization/customize-theme
      themes: {
        light: {
          colors: {
            // Brand color for HeroUI components:
            'primary': {
              ...generateTailwindScale(theme.Primary),
              'DEFAULT': theme.Primary,
              'foreground': '#000000',
            },
            'default': {
              DEFAULT: '#ffffff',
              foreground: '#111111',
            },
            'secondary': {
              DEFAULT: '#000000',
              foreground: '#ffffff',
            },
            'background': '#F2EEEB',

            // input backgrounds
            'default-100': '#FFFFFF',
            'default-200': '#F1EDEA',

            // label/placeholder text
            'default-600': '#020202',
            'foreground-500': '#020202',

            // These drive bg-content1 / bg-content2, etc.
            'content1': '#FFFFFF',
            'content2': '#F2EEEB',
            'content3': '#F1EDEA',
            'content4': '#FBFAF9',
          },
        },
        dark: {
          colors: {
            'primary': {
              ...generateTailwindScale(theme.Primary),
              DEFAULT: theme.Primary,
              foreground: '#ffffff',
            },
            'default': {
              DEFAULT: '#2A2A29',
              foreground: '#ffffff',
            },
            'secondary': {
              DEFAULT: '#ffffff',
              foreground: '#000000',
            },
            'background': '#020202',

            // input backgrounds
            'default-100': '#020202',
            'default-200': '#0D0D0D',

            // label/placeholder text
            'default-600': '#A8A6A4',
            'foreground-500': '#A8A6A4',

            // Dark equivalents:
            'content1': '#2A2A29',
            'content2': '#020202',
            'content3': '#232220',
            'content4': '#12110F',
          },
        },
      },
    }),
  ],
}
