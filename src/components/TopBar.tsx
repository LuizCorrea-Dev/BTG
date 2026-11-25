import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import {
  Clock,
  LogOut,
  Maximize2,
  Minimize2,
  Moon,
  Plane,
  PlaneLanding,
  PlaneTakeoff,
  RefreshCw,
  Search,
  Sun,
} from 'lucide-react';

export type ActiveTab = 'dashboard' | 'arrivals' | 'departures' | 'baggage';

interface TopBarProps {
  serverTimeIso: string;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  themeMode: 'light' | 'dark';
  onToggleTheme: () => void;
  isAuthenticated: boolean;
  username?: string;
  airport?: string;
  wsConnected?: boolean;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
  onRefresh?: () => void;
  onLogout?: () => void;
}

const HeaderContainer = styled.header`
  position: sticky;
  top: 0;
  z-index: 50;
  flex-shrink: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 6px 10px;
  background-color: ${(props) => props.theme.colors.surface};
  border-bottom: 1px solid ${(props) => props.theme.colors.border};
  width: 100%;
  max-width: 100vw;
  box-sizing: border-box;
  overflow: hidden;

  @media (min-width: 768px) {
    gap: ${(props) => props.theme.spacing.md};
    padding: ${(props) => props.theme.spacing.xs} ${(props) => props.theme.spacing.md};
  }
`;

const BrandWordmark = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  color: ${(props) => props.theme.colors.text};
  font-size: 13px;
  font-weight: 700;
  letter-spacing: -0.02em;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  min-height: 36px;
  padding: 0;

  @media (min-width: 768px) {
    font-size: 18px;
    min-height: 44px;
    flex-shrink: 0;
  }
`;

const BrandIcon = styled.img`
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  display: block;

  @media (min-width: 768px) {
    width: 26px;
    height: 26px;
  }
`;

const DesktopOnlySpan = styled.span`
  display: none;
  @media (min-width: 420px) {
    display: inline;
  }
`;

const DesktopNav = styled.nav`
  display: none;

  @media (min-width: 1024px) {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: ${(props) => props.theme.spacing.md};
  }
`;

const NavLinkButton = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.xs};
  min-height: 44px;
  padding: ${(props) => props.theme.spacing.xs} ${(props) => props.theme.spacing.xs};
  background: transparent;
  border: none;
  border-bottom: 2px solid
    ${(props) => (props.$active ? props.theme.colors.primary : 'transparent')};
  color: ${(props) =>
    props.$active ? props.theme.colors.text : props.theme.colors.textSecondary};
  font-size: 14px;
  font-weight: ${(props) => (props.$active ? 700 : 500)};
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: color 140ms ease, border-color 140ms ease;

  &:hover {
    color: ${(props) => props.theme.colors.text};
  }
`;

const RightZone = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;

  @media (min-width: 768px) {
    gap: ${(props) => props.theme.spacing.xs};
  }
`;

const DigitalClockBox = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 36px;
  padding: 4px 8px;
  background-color: ${(props) => props.theme.colors.background};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: ${(props) => props.theme.radii.md};
  color: ${(props) => props.theme.colors.primary};
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
  flex-shrink: 0;

  @media (min-width: 768px) {
    min-height: 44px;
    padding: ${(props) => props.theme.spacing.xxs} ${(props) => props.theme.spacing.sm};
    font-size: 17px;
  }
`;

const IconActionBtn = styled.button<{ $hideOnMobile?: boolean }>`
  display: ${(props) => (props.$hideOnMobile ? 'none' : 'inline-flex')};
  align-items: center;
  justify-content: center;
  min-height: 36px;
  min-width: 36px;
  padding: 6px;
  background-color: ${(props) => props.theme.colors.background};
  color: ${(props) => props.theme.colors.text};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: ${(props) => props.theme.radii.md};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background-color 140ms ease;

  &:hover {
    background-color: ${(props) => props.theme.colors.surfaceHover};
  }

  @media (min-width: 768px) {
    display: inline-flex;
    min-height: 44px;
    min-width: 44px;
    padding: ${(props) => props.theme.spacing.xs};
  }
`;

const MobileBottomBar = styled.nav`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 40;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  align-items: center;
  height: 58px;
  background-color: ${(props) => props.theme.colors.surface};
  border-top: 1px solid ${(props) => props.theme.colors.border};

  @media (min-width: 1024px) {
    display: none;
  }
`;

const MobileTabButton = styled.button<{ $active?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 48px;
  background: transparent;
  border: none;
  color: ${(props) =>
    props.$active ? props.theme.colors.primary : props.theme.colors.textSecondary};
  font-size: 11px;
  font-weight: ${(props) => (props.$active ? 700 : 500)};
  cursor: pointer;
  gap: 2px;
  white-space: nowrap;
`;

export const TopBar: React.FC<TopBarProps> = ({
  serverTimeIso,
  activeTab,
  onSelectTab,
  themeMode,
  onToggleTheme,
  isAuthenticated,
  airport = 'OPO',
  isFullScreen,
  onToggleFullScreen,
  onRefresh,
  onLogout,
}) => {
  const [clockDate, setClockDate] = useState<Date>(() => {
    const parsed = new Date(serverTimeIso);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  });

  useEffect(() => {
    const parsed = new Date(serverTimeIso);
    if (!Number.isNaN(parsed.getTime())) {
      setClockDate(parsed);
    }
  }, [serverTimeIso]);

  useEffect(() => {
    const interval = setInterval(() => {
      setClockDate((prev) => new Date(prev.getTime() + 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = String(clockDate.getHours()).padStart(2, '0');
  const minutes = String(clockDate.getMinutes()).padStart(2, '0');
  const seconds = String(clockDate.getSeconds()).padStart(2, '0');
  const formattedClock = `${hours}:${minutes}:${seconds}`;

  return (
    <>
      <HeaderContainer>
        {/* Zone 1: Brand Title */}
        <BrandWordmark
          type="button"
          onClick={() => isAuthenticated && onSelectTab('dashboard')}
          aria-label="BagsToGo OCC Início"
        >
          <BrandIcon src="/favicon.svg" alt="" aria-hidden="true" />
          <span>
            BagsToGo<DesktopOnlySpan> OCC</DesktopOnlySpan> · {airport}
          </span>
        </BrandWordmark>

        {/* Zone 2: Primary Navigation Links */}
        {isAuthenticated && (
          <DesktopNav aria-label="Navegação Principal">
            <NavLinkButton
              type="button"
              $active={activeTab === 'dashboard'}
              onClick={() => onSelectTab('dashboard')}
            >
              <Plane size={16} />
              <span>Voos</span>
            </NavLinkButton>
            <NavLinkButton
              type="button"
              $active={activeTab === 'arrivals'}
              onClick={() => onSelectTab('arrivals')}
            >
              <PlaneLanding size={16} />
              <span>Chegadas</span>
            </NavLinkButton>
            <NavLinkButton
              type="button"
              $active={activeTab === 'departures'}
              onClick={() => onSelectTab('departures')}
            >
              <PlaneTakeoff size={16} />
              <span>Partidas</span>
            </NavLinkButton>
            <NavLinkButton
              type="button"
              $active={activeTab === 'baggage'}
              onClick={() => onSelectTab('baggage')}
            >
              <Search size={16} />
              <span>Bagagem</span>
            </NavLinkButton>
          </DesktopNav>
        )}

        {/* Zone 3: Digital Clock with Seconds Rolling & Operational Actions */}
        <RightZone>
          <DigitalClockBox
            data-testid="live-digital-clock"
            aria-label={`Relógio digital operacional ${formattedClock}`}
            title="Hora sincronizada em tempo real com servidor BagsToGo"
          >
            <Clock size={14} />
            <span>{formattedClock}</span>
          </DigitalClockBox>

          {isAuthenticated && onRefresh && (
            <IconActionBtn
              type="button"
              onClick={onRefresh}
              aria-label="Atualizar dados agora"
              title="Atualizar indicadores em tempo real"
            >
              <RefreshCw size={15} />
            </IconActionBtn>
          )}

          <IconActionBtn
            type="button"
            $hideOnMobile
            onClick={onToggleTheme}
            aria-label={
              themeMode === 'dark' ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'
            }
            title={
              themeMode === 'dark'
                ? 'Alternar para Tema Claro'
                : 'Alternar para Tema Escuro'
            }
          >
            {themeMode === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </IconActionBtn>

          {isAuthenticated && (
            <IconActionBtn
              type="button"
              $hideOnMobile
              onClick={onToggleFullScreen}
              aria-label={
                isFullScreen ? 'Sair de Tela Cheia' : 'Modo Tela Cheia OCC'
              }
              title="Expandir para Centro de Controle Operacional (Full Screen)"
            >
              {isFullScreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </IconActionBtn>
          )}

          {isAuthenticated && onLogout && (
            <IconActionBtn
              type="button"
              onClick={onLogout}
              aria-label="Terminar Sessão"
              title="Sair da conta"
            >
              <LogOut size={15} />
            </IconActionBtn>
          )}
        </RightZone>
      </HeaderContainer>

      {/* Mobile & Tablet Thumb-Zone Navigation Bar: Voos | Chegadas | Partidas | Bagagem */}
      {isAuthenticated && (
        <MobileBottomBar aria-label="Navegação Móvel">
          <MobileTabButton
            type="button"
            $active={activeTab === 'dashboard'}
            onClick={() => onSelectTab('dashboard')}
          >
            <Plane size={19} />
            <span>Voos</span>
          </MobileTabButton>
          <MobileTabButton
            type="button"
            $active={activeTab === 'arrivals'}
            onClick={() => onSelectTab('arrivals')}
          >
            <PlaneLanding size={19} />
            <span>Chegadas</span>
          </MobileTabButton>
          <MobileTabButton
            type="button"
            $active={activeTab === 'departures'}
            onClick={() => onSelectTab('departures')}
          >
            <PlaneTakeoff size={19} />
            <span>Partidas</span>
          </MobileTabButton>
          <MobileTabButton
            type="button"
            $active={activeTab === 'baggage'}
            onClick={() => onSelectTab('baggage')}
          >
            <Search size={19} />
            <span>Bagagem</span>
          </MobileTabButton>
        </MobileBottomBar>
      )}
    </>
  );
};
