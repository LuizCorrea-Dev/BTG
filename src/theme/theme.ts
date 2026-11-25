import { createGlobalStyle } from 'styled-components';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceSubtle: string;
  surfaceHover: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  border: string;
  borderSubtle: string;
  primary: string;
  primaryHover: string;
  primarySurface: string;
  secondary: string;
  secondarySurface: string;
  // Operational Flight & Baggage Status Colors (WCAG >= 4.5:1)
  onRouteText: string;
  onRouteBg: string;
  deliveredText: string;
  deliveredBg: string;
  loadedText: string;
  loadedBg: string;
  missingText: string;
  missingBg: string;
  bffText: string;
  bffBg: string;
  departureText: string;
  departureBg: string;
  arrivalText: string;
  arrivalBg: string;
  overlayBackdrop: string;
}

export interface ThemeSpacing {
  xxs: string; // 4px
  xs: string;  // 8px
  sm: string;  // 16px
  md: string;  // 24px
  lg: string;  // 32px
  xl: string;  // 48px
  xxl: string; // 64px
}

export interface AppTheme {
  mode: 'light' | 'dark';
  colors: ThemeColors;
  spacing: ThemeSpacing;
  radii: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefaultTheme extends AppTheme {}
}

const sharedSpacing: ThemeSpacing = {
  xxs: '4px',
  xs: '8px',
  sm: '16px',
  md: '24px',
  lg: '32px',
  xl: '48px',
  xxl: '64px',
};

const sharedRadii = {
  sm: '0px',
  md: '0px',
  lg: '0px',
  xl: '0px',
};

export const lightTheme: AppTheme = {
  mode: 'light',
  spacing: sharedSpacing,
  radii: sharedRadii,
  colors: {
    background: '#FFFFFF',
    surface: '#F3F4F6',
    surfaceElevated: '#FFFFFF',
    surfaceSubtle: '#E5E7EB',
    surfaceHover: '#E5E7EB',
    text: '#111827',
    textSecondary: '#374151',
    textMuted: '#4B5563',
    textInverse: '#FFFFFF',
    border: '#D1D5DB',
    borderSubtle: '#E5E7EB',
    primary: '#0369A1',
    primaryHover: '#075985',
    primarySurface: '#E0F2FE',
    secondary: '#1E293B',
    secondarySurface: '#E2E8F0',
    onRouteText: '#9A3412',
    onRouteBg: '#FFEDD5',
    deliveredText: '#166534',
    deliveredBg: '#DCFCE7',
    loadedText: '#075985',
    loadedBg: '#E0F2FE',
    missingText: '#991B1B',
    missingBg: '#FEE2E2',
    bffText: '#115E59',
    bffBg: '#CCFBF1',
    departureText: '#075985',
    departureBg: '#E0F2FE',
    arrivalText: '#166534',
    arrivalBg: '#DCFCE7',
    overlayBackdrop: 'rgba(15, 23, 42, 0.65)',
  },
};

export const darkTheme: AppTheme = {
  mode: 'dark',
  spacing: sharedSpacing,
  radii: sharedRadii,
  colors: {
    background: '#0F172A',
    surface: '#1E293B',
    surfaceElevated: '#263449',
    surfaceSubtle: '#0B1120',
    surfaceHover: '#334155',
    text: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textMuted: '#94A3B8',
    textInverse: '#0F172A',
    border: '#334155',
    borderSubtle: '#1E293B',
    primary: '#38BDF8',
    primaryHover: '#7DD3FC',
    primarySurface: 'rgba(56, 189, 248, 0.14)',
    secondary: '#E2E8F0',
    secondarySurface: '#334155',
    onRouteText: '#FDBA74',
    onRouteBg: 'rgba(249, 115, 22, 0.16)',
    deliveredText: '#4ADE80',
    deliveredBg: 'rgba(34, 197, 94, 0.16)',
    loadedText: '#38BDF8',
    loadedBg: 'rgba(56, 189, 248, 0.16)',
    missingText: '#FCA5A5',
    missingBg: 'rgba(239, 68, 68, 0.18)',
    bffText: '#5EEAD4',
    bffBg: 'rgba(20, 184, 166, 0.16)',
    departureText: '#7DD3FC',
    departureBg: 'rgba(56, 189, 248, 0.15)',
    arrivalText: '#86EFAC',
    arrivalBg: 'rgba(34, 197, 94, 0.15)',
    overlayBackdrop: 'rgba(2, 6, 23, 0.78)',
  },
};

export const GlobalThemeStyle = createGlobalStyle`
  body {
    background-color: ${(props) => props.theme.colors.background};
    color: ${(props) => props.theme.colors.text};
    transition: background-color 160ms ease, color 160ms ease;
    overflow-x: hidden;
  }

  * {
    box-sizing: border-box;
  }
`;
