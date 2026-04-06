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
  primary: '#0B8F6C',
  primaryLight: '#E8F5F0',
  primaryDark: '#067A5B',

  background: '#F5F5F7',
  surface: '#FFFFFF',
  surfaceSecondary: '#F0F0F2',

  text: '#1D1D1F',
  textSecondary: '#6E6E73',
  textTertiary: '#AEAEB2',

  calories: '#34C759',
  caloriesLight: '#E8FAF0',
  protein: '#FF6B6B',
  proteinLight: '#FFF0F0',
  carbs: '#F5A623',
  carbsLight: '#FFF8EC',
  fats: '#5AC8FA',
  fatsLight: '#EDF8FF',

  border: '#E5E5EA',
  borderLight: '#F2F2F7',

  danger: '#FF3B30',
  warning: '#FF9500',

  shadow: 'rgba(0, 0, 0, 0.06)',
  overlay: 'rgba(0, 0, 0, 0.4)',

  white: '#FFFFFF',
  black: '#000000',

  tabIconDefault: '#AEAEB2',
  tabIconSelected: '#0B8F6C',
};

const darkColors: ThemeColors = {
  primary: '#2ECB96',
  primaryLight: '#1A3D33',
  primaryDark: '#25B882',

  background: '#0E0E10',
  surface: '#1C1C1E',
  surfaceSecondary: '#2C2C2E',

  text: '#F5F5F7',
  textSecondary: '#A1A1A6',
  textTertiary: '#636366',

  calories: '#30D158',
  caloriesLight: '#1A3326',
  protein: '#FF6B6B',
  proteinLight: '#3D1F1F',
  carbs: '#FFD60A',
  carbsLight: '#3D3517',
  fats: '#64D2FF',
  fatsLight: '#1A2F3D',

  border: '#38383A',
  borderLight: '#2C2C2E',

  danger: '#FF453A',
  warning: '#FF9F0A',

  shadow: 'rgba(0, 0, 0, 0.3)',
  overlay: 'rgba(0, 0, 0, 0.6)',

  white: '#FFFFFF',
  black: '#000000',

  tabIconDefault: '#636366',
  tabIconSelected: '#2ECB96',
};

const Colors = {
  light: lightColors,
  dark: darkColors,
};

export default Colors;
