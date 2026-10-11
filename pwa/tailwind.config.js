/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        calico: {
          orange: '#E67E22',
          orangeLight: '#F6AD55',
          cocoa: '#3D2F2E',
          cocoaDark: '#241C1C',
          cream: '#FFFBF5',
          creamDark: '#F5EFE6',
          sage: '#48BB78',
          sageLight: '#9AE6B4',
          peach: '#FEEBC8',
          grayBg: '#F8F6F2',
          darkBg: '#181615',
          darkCard: '#242120',
        }
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"PingFang TC"',
          '"Noto Sans TC"',
          'system-ui',
          'sans-serif'
        ]
      },
      boxShadow: {
        'ios-sm': '0 2px 8px -2px rgba(61, 47, 46, 0.06), 0 1px 4px -1px rgba(61, 47, 46, 0.04)',
        'ios': '0 8px 24px -4px rgba(61, 47, 46, 0.08), 0 2px 8px -2px rgba(61, 47, 46, 0.04)',
        'ios-lg': '0 16px 36px -6px rgba(61, 47, 46, 0.12), 0 4px 12px -2px rgba(61, 47, 46, 0.06)',
      }
    },
  },
  plugins: [],
}
