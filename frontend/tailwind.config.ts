import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#fdf6ec',
        warm: '#f5e6c8',
        soft: '#f0d9b5',
        brown: '#3d2c1e',
        mid: '#8c6a4e',
        accent: '#e07b39',
        green: '#6bbf8e',
        red: '#e05c5c',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        serif: ['Fraunces', 'serif'],
        mono: ['DM Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
