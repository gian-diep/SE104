/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontSize: {
        xs:   ['0.75rem',  { lineHeight: '1.25', letterSpacing: '0.02em', fontWeight: '400' }],
        sm:   ['0.875rem', { lineHeight: '1.3',  letterSpacing: '0.02em', fontWeight: '400' }],
        base: ['1rem',     { lineHeight: '1.5',  letterSpacing: '0.02em', fontWeight: '400' }],
        lg:   ['1.125rem', { lineHeight: '1.5',  letterSpacing: '0.02em', fontWeight: '500' }],
        xl:   ['1.25rem',  { lineHeight: '1.5',  letterSpacing: '0.02em', fontWeight: '500' }],
        '2xl':['1.5rem',   { lineHeight: '1.4',  letterSpacing: '0.02em', fontWeight: '600' }],
        '3xl':['1.875rem', { lineHeight: '1.3',  letterSpacing: '0.02em', fontWeight: '600' }],
        '4xl':['2.25rem',  { lineHeight: '1.2',  letterSpacing: '0.02em', fontWeight: '700' }],
        '5xl':['3rem',     { lineHeight: '1.1',  letterSpacing: '0.02em', fontWeight: '700' }],
        '6xl':['3.75rem',  { lineHeight: '1.1',  letterSpacing: '0.02em', fontWeight: '700' }],
        '7xl':['4.5rem',   { lineHeight: '1.05', letterSpacing: '0.02em', fontWeight: '700' }],
        '8xl':['6rem',     { lineHeight: '1.05', letterSpacing: '0.02em', fontWeight: '700' }],
        '9xl':['8rem',     { lineHeight: '1.05', letterSpacing: '0.02em', fontWeight: '700' }],
      },
      fontFamily: {
        heading:   ['Roboto', 'sans-serif'],
        paragraph: ['Roboto', 'sans-serif'],
      },
      colors: {
        destructive:            '#E53E3E',
        'destructive-foreground':'#FFFFFF',
        muted:                  '#F5F5F5',
        'muted-foreground':     '#757575',
        background:             '#FFFFFF',
        secondary:              '#E0E0E0',
        foreground:             '#333333',
        'secondary-foreground': '#333333',
        'primary-foreground':   '#FFFFFF',
        primary:                '#009688',
        card:                   '#FFFFFF',
        'card-foreground':      '#333333',
        border:                 '#E0E0E0',
        input:                  '#E0E0E0',
        ring:                   '#009688',
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [],
}
