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
  headerBg: string;
  headerText: string;
  headerTextSecondary: string;
  headerBorder: string;
  headerActiveBorder: string;
  tableHeaderBg: string;
  tableHeaderText: string;
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
    surface: '#F1F4EA',
    surfaceElevated: '#FFFFFF',
    surfaceSubtle: '#E6EBD8',
    surfaceHover: '#EAF3D2',
    text: '#111810',
    textSecondary: '#36422F',
    textMuted: '#55634C',
    textInverse: '#FFFFFF',
    border: '#C5D1A5',
    borderSubtle: '#E2E8D5',
    primary: '#5E8000',
    primaryHover: '#4B6700',
    primarySurface: '#EEF6D6',
    secondary: '#1A2116',
    secondarySurface: '#E5E9DF',
    headerBg: '#95C11F',
    headerText: '#111810',
    headerTextSecondary: '#243018',
    headerBorder: '#7BA314',
    headerActiveBorder: '#111810',
    tableHeaderBg: '#A9CF38',
    tableHeaderText: '#111810',
    onRouteText: '#9A3412',
    onRouteBg: '#FFEDD5',
    deliveredText: '#3F6212',
    deliveredBg: '#ECFCCB',
    loadedText: '#1D4ED8',
    loadedBg: '#DBEAFE',
    missingText: '#991B1B',
    missingBg: '#FEE2E2',
    bffText: '#115E59',
    bffBg: '#CCFBF1',
    departureText: '#3F6212',
    departureBg: '#ECFCCB',
    arrivalText: '#166534',
    arrivalBg: '#DCFCE7',
    overlayBackdrop: 'rgba(17, 24, 16, 0.65)',
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
    headerBg: '#1E293B',
    headerText: '#F8FAFC',
    headerTextSecondary: '#CBD5E1',
    headerBorder: '#334155',
    headerActiveBorder: '#38BDF8',
    tableHeaderBg: '#1E293B',
    tableHeaderText: '#CBD5E1',
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
    overflow-x: clip;
  }

  * {
    box-sizing: border-box;
  }
`;
