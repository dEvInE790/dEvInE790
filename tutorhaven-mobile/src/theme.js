// TutorHaven design tokens: deep navy (trust), soft mint (growth), warm white (welcome).
export const colors = {
  navy950: '#0a1428', navy900: '#0f1c36', navy800: '#182746', navy700: '#24365c', navy600: '#344874',
  navy500: '#4a5f8f', navy400: '#6b80ae', navy300: '#9aabcf', navy200: '#c7d2e8', navy100: '#e4eaf5', navy50: '#f3f6fb',
  mint700: '#177152', mint600: '#1a8d64', mint500: '#27ae7c', mint400: '#4cc897', mint300: '#7fdcb8', mint200: '#b0ebd3', mint100: '#d7f5e8', mint50: '#effbf6',
  cream50: '#fdfcf9', cream100: '#faf7f0', cream200: '#f3eee2', cream300: '#e8e0cd',
  amber: '#f5b544', amberInk: '#8a5a00', amberBg: '#fdf1d8',
  coral: '#d9533f', coralInk: '#b8402e', coralBg: '#fdf0ee',
  white: '#ffffff', line: 'rgba(15,28,54,0.08)',
}

export const fonts = {
  display: 'PlusJakartaSans_700Bold',
  displayHeavy: 'PlusJakartaSans_800ExtraBold',
  displaySemi: 'PlusJakartaSans_600SemiBold',
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
}

export const radius = { sm: 10, md: 14, lg: 18, xl: 24, full: 999 }

export const shadow = {
  soft: { shadowColor: '#0f1c36', shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  lift: { shadowColor: '#0f1c36', shadowOpacity: 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 6 },
  glow: { shadowColor: '#27ae7c', shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
}

export const space = (n) => n * 4
