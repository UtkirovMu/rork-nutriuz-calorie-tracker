export interface ThemeColors {
  primary: string;
  primaryLight: string;
  background: string;
  surface: string;
  surfaceSecondary: string;
  card: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderLight: string;
  black: string;
  white: string;
  calories: string;
  caloriesLight: string;
  protein: string;
  proteinLight: string;
  carbs: string;
  carbsLight: string;
  fats: string;
  fatsLight: string;
  danger: string;
}

const Colors: { light: ThemeColors; dark: ThemeColors } = {
  light: {
    primary: '#10B981',
    primaryLight: '#D1FAE5',
    background: '#F8FAFB',
    surface: '#FFFFFF',
    surfaceSecondary: '#F1F5F9',
    card: '#FFFFFF',
    text: '#0F172A',
    textSecondary: '#64748B',
    textTertiary: '#94A3B8',
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    black: '#000000',
    white: '#FFFFFF',
    calories: '#F59E0B',
    caloriesLight: '#FEF3C7',
    protein: '#EF4444',
    proteinLight: '#FEE2E2',
    carbs: '#3B82F6',
    carbsLight: '#DBEAFE',
    fats: '#8B5CF6',
    fatsLight: '#EDE9FE',
    danger: '#EF4444',
  },
  dark: {
    primary: '#34D399',
    primaryLight: '#064E3B',
    background: '#0F172A',
    surface: '#1E293B',
    surfaceSecondary: '#334155',
    card: '#1E293B',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',
    border: '#334155',
    borderLight: '#1E293B',
    black: '#000000',
    white: '#FFFFFF',
    calories: '#FBBF24',
    caloriesLight: '#78350F',
    protein: '#F87171',
    proteinLight: '#7F1D1D',
    carbs: '#60A5FA',
    carbsLight: '#1E3A5F',
    fats: '#A78BFA',
    fatsLight: '#4C1D95',
    danger: '#F87171',
  },
};

export default Colors;
