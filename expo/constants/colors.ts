export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;

  background: string;
  surface: string;
  surfaceSecondary: string;

  text: string;
  textSecondary: string;
  textTertiary: string;

  calories: string;
  caloriesLight: string;
  protein: string;
  proteinLight: string;
  carbs: string;
  carbsLight: string;
  fats: string;
  fatsLight: string;

  border: string;
  borderLight: string;

  danger: string;
  warning: string;

  shadow: string;
  overlay: string;

  white: string;
  black: string;

  tabIconDefault: string;
  tabIconSelected: string;
}

const lightColors: ThemeColors = {
  primary: '#6B9F65', // Soft, natural green from the image
  primaryLight: '#DDEFB5', // Light green accent
  primaryDark: '#4F7C4B',

  background: '#F8F9F4', // Warm off-white background
  surface: '#FFFFFF',
  surfaceSecondary: '#F0F2EB', // Slightly darker warm white for secondary cards

  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',

  calories: '#8CC461', // Brighter green for calories
  caloriesLight: '#EAF5DF',
  protein: '#FF8A65', // Soft orange
  proteinLight: '#FFF0EC',
  carbs: '#FFD54F', // Soft yellow
  carbsLight: '#FFF9E6',
  fats: '#64B5F6', // Soft blue
  fatsLight: '#EAF5FF',

  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  danger: '#EF4444',
  warning: '#F59E0B',

  shadow: 'rgba(0, 0, 0, 0.05)',
  overlay: 'rgba(0, 0, 0, 0.3)',

  white: '#FFFFFF',
  black: '#000000',

  tabIconDefault: '#9CA3AF',
  tabIconSelected: '#6B9F65',
};

const darkColors: ThemeColors = {
  primary: '#DDEFB5', // In dark mode, the accent is the primary text color
  primaryLight: '#3A4C2E',
  primaryDark: '#C5E1A5',

  background: '#121212',
  surface: '#1E1E1E',
  surfaceSecondary: '#2C2C2C',

  text: '#F3F4F6',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',

  calories: '#8CC461',
  caloriesLight: '#2C3E21',
  protein: '#FF8A65',
  proteinLight: '#4C281D',
  carbs: '#FFD54F',
  carbsLight: '#4C3F17',
  fats: '#64B5F6',
  fatsLight: '#1E364A',

  border: '#374151',
  borderLight: '#4B5563',

  danger: '#F87171',
  warning: '#FBBF24',

  shadow: 'rgba(0, 0, 0, 0.4)',
  overlay: 'rgba(0, 0, 0, 0.6)',

  white: '#FFFFFF',
  black: '#000000',

  tabIconDefault: '#6B7280',
  tabIconSelected: '#DDEFB5',
};

const Colors = {
  light: lightColors,
  dark: darkColors,
};

export default Colors;
