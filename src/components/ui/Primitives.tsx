import React from 'react';
import styled, { css } from 'styled-components';

export type ButtonVariant = 'primary' | 'secondary' | 'outline';

export interface AgnosticButtonProps {
  variant?: ButtonVariant;
  isLoading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  onClick?: () => void;
  onPress?: () => void;
  type?: 'button' | 'submit' | 'reset';
  ariaLabel?: string;
  children: React.ReactNode;
}

const StyledButtonBase = styled.button<{
  $variant: ButtonVariant;
  $fullWidth?: boolean;
}>`
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: ${(props) => props.theme.spacing.xs};
  min-height: 48px;
  min-width: 48px;
  padding: ${(props) => props.theme.spacing.xs} ${(props) => props.theme.spacing.sm};
  border-radius: ${(props) => props.theme.radii.md};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  width: ${(props) => (props.$fullWidth ? '100%' : 'auto')};
  transition: transform 150ms ease, opacity 150ms ease, background-color 150ms ease;

  ${(props) =>
    props.$variant === 'primary' &&
    css`
      background-color: ${props.theme.colors.primary};
      color: ${props.theme.colors.textInverse};
      border: 1px solid ${props.theme.colors.primary};
      &:hover:not(:disabled) {
        background-color: ${props.theme.colors.primaryHover};
      }
    `}

  ${(props) =>
    props.$variant === 'secondary' &&
    css`
      background-color: ${props.theme.colors.surface};
      color: ${props.theme.colors.text};
      border: 1px solid ${props.theme.colors.border};
      &:hover:not(:disabled) {
        background-color: ${props.theme.colors.surfaceHover};
      }
    `}

  ${(props) =>
    props.$variant === 'outline' &&
    css`
      background-color: transparent;
      color: ${props.theme.colors.text};
      border: 1px solid ${props.theme.colors.border};
      &:hover:not(:disabled) {
        background-color: ${props.theme.colors.surface};
      }
    `}

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

export const AgnosticButton: React.FC<AgnosticButtonProps> = ({
  variant = 'primary',
  isLoading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  onPress,
  type = 'button',
  ariaLabel,
  children,
}) => {
  const handleInteraction = () => {
    if (disabled || isLoading) return;
    if (onClick) onClick();
    else if (onPress) onPress();
  };

  return (
    <StyledButtonBase
      type={type}
      $variant={variant}
      $fullWidth={fullWidth}
      disabled={disabled || isLoading}
      onClick={handleInteraction}
      aria-label={ariaLabel}
    >
      {isLoading ? 'A processar...' : children}
    </StyledButtonBase>
  );
};

export const AppShell = styled.div<{ $lockViewport?: boolean }>`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  background-color: ${(props) => props.theme.colors.background};
  color: ${(props) => props.theme.colors.text};
  padding-bottom: ${(props) => props.theme.spacing.xxl};

  @media (min-width: 1024px) {
    padding-bottom: ${(props) => props.theme.spacing.md};
  }

  ${(props) =>
    props.$lockViewport &&
    css`
      height: 100dvh;
      max-height: 100dvh;
      overflow: hidden;
      padding-bottom: 58px;

      @media (min-width: 1024px) {
        padding-bottom: 0;
      }

      @media (max-height: 520px) {
        height: auto;
        max-height: none;
        overflow: visible;
      }
    `}
`;

export const MainViewport = styled.main<{
  $isFullScreen?: boolean;
  $lockViewport?: boolean;
}>`
  display: flex;
  flex-direction: column;
  flex: 1;
  width: 100%;
  max-width: ${(props) => (props.$isFullScreen ? '100%' : '1680px')};
  margin: 0 auto;
  padding: ${(props) => props.theme.spacing.sm};
  gap: ${(props) => props.theme.spacing.sm};

  @media (min-width: 768px) {
    padding: ${(props) => props.theme.spacing.md};
    gap: ${(props) => props.theme.spacing.md};
  }

  ${(props) =>
    props.$lockViewport &&
    css`
      min-height: 0;
      overflow: hidden;

      @media (max-height: 520px) {
        overflow: visible;
      }
    `}
`;

export const SurfacePanel = styled.section`
  display: flex;
  flex-direction: column;
  background-color: ${(props) => props.theme.colors.surface};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: ${(props) => props.theme.radii.lg};
  padding: ${(props) => props.theme.spacing.sm};
  gap: ${(props) => props.theme.spacing.sm};

  @media (min-width: 768px) {
    padding: ${(props) => props.theme.spacing.md};
  }
`;

export const StyledInput = styled.input`
  min-height: 48px;
  width: 100%;
  padding: ${(props) => props.theme.spacing.xs} ${(props) => props.theme.spacing.sm};
  background-color: ${(props) => props.theme.colors.background};
  color: ${(props) => props.theme.colors.text};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: ${(props) => props.theme.radii.md};
  font-size: 14px;
  outline: none;

  &::placeholder {
    color: ${(props) => props.theme.colors.textMuted};
  }

  &:focus {
    border-color: ${(props) => props.theme.colors.primary};
  }
`;

export const StyledSelect = styled.select`
  min-height: 48px;
  width: 100%;
  padding: ${(props) => props.theme.spacing.xs} ${(props) => props.theme.spacing.sm};
  background-color: ${(props) => props.theme.colors.background};
  color: ${(props) => props.theme.colors.text};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: ${(props) => props.theme.radii.md};
  font-size: 14px;
  outline: none;
  cursor: pointer;

  &:focus {
    border-color: ${(props) => props.theme.colors.primary};
  }
`;

export const SegmentedControlBar = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: ${(props) => props.theme.spacing.xxs};
  background-color: ${(props) => props.theme.colors.background};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: ${(props) => props.theme.radii.md};
  padding: ${(props) => props.theme.spacing.xxs};
`;

export const SegmentedButton = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${(props) => props.theme.spacing.xs};
  min-height: 44px;
  padding: ${(props) => props.theme.spacing.xs} ${(props) => props.theme.spacing.sm};
  border-radius: ${(props) => props.theme.radii.sm};
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  background-color: ${(props) =>
    props.$active ? props.theme.colors.primary : 'transparent'};
  color: ${(props) =>
    props.$active ? props.theme.colors.textInverse : props.theme.colors.textSecondary};
  transition: background-color 140ms ease, color 140ms ease;

  &:hover {
    color: ${(props) =>
      props.$active ? props.theme.colors.textInverse : props.theme.colors.text};
  }
`;

export const MonospaceValue = styled.span<{
  $tone?: 'default' | 'onRoute' | 'delivered' | 'loaded' | 'missing' | 'bff';
}>`
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  color: ${(props) => {
    switch (props.$tone) {
      case 'onRoute':
        return props.theme.colors.onRouteText;
      case 'delivered':
        return props.theme.colors.deliveredText;
      case 'loaded':
        return props.theme.colors.loadedText;
      case 'missing':
        return props.theme.colors.missingText;
      case 'bff':
        return props.theme.colors.bffText;
      default:
        return props.theme.colors.text;
    }
  }};
`;
