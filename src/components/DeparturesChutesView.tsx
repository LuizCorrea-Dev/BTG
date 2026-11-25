import React, { useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import {
  ArrowUp,
  Box,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Layers,
  PackageCheck,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  DepartureFlightContainerInfo,
  FlightRecord,
} from '../types/bagstogo';
import {
  computeDepartureContainerBreakdown,
  getSwipedGroupIndex,
  groupDeparturesByChute,
} from '../utils/bagstogoLogic';
import { MonospaceValue, SurfacePanel } from './ui/Primitives';

interface DeparturesChutesViewProps {
  flights: FlightRecord[];
  isLandscapeMobile?: boolean;
  onSelectFlight: (flight: FlightRecord) => void;
}

const ChutesContainer = styled(SurfacePanel)`
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
`;

const HeaderRow = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.xs};
`;

const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: ${(props) => props.theme.colors.text};
`;

const SubKicker = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${(props) => props.theme.colors.departureText};
`;

const ChutesQueueCard = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${(props) => props.theme.colors.border};
  background-color: ${(props) => props.theme.colors.background};
  width: 100%;
  min-width: 0;
`;

const ChutesCardHeader = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background-color: ${(props) => props.theme.colors.surface};
  border-bottom: 1px solid ${(props) => props.theme.colors.border};
  gap: 8px;
`;

const ChutesCardTitle = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${(props) => props.theme.colors.text};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const ChutesCardHint = styled.span`
  font-size: 11px;
  color: ${(props) => props.theme.colors.textSecondary};
`;

const ResetChuteBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 28px;
  padding: 4px 10px;
  background-color: ${(props) => props.theme.colors.primary};
  color: ${(props) => props.theme.colors.textInverse};
  border: none;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
`;

const ChutesLinesList = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const ChuteLineRow = styled.div<{ $selected?: boolean }>`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid ${(props) => props.theme.colors.borderSubtle};
  background-color: ${(props) =>
    props.$selected
      ? props.theme.colors.departureBg
      : props.theme.colors.background};
  cursor: pointer;
  gap: 10px;
  min-height: 46px;
  transition: background-color 120ms ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: ${(props) =>
      props.$selected
        ? props.theme.colors.departureBg
        : props.theme.colors.surfaceHover};
  }
`;

const ChuteLineLeft = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: nowrap;
  gap: 8px;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
`;

const ChuteNumberLabel = styled.span<{ $selected?: boolean }>`
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 700;
  color: ${(props) =>
    props.$selected
      ? props.theme.colors.departureText
      : props.theme.colors.primary};
  white-space: nowrap;
  flex-shrink: 0;
`;

const ChuteFlightsSequence = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: nowrap;
  gap: 6px;
`;

const ChuteFlightChip = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 28px;
  padding: 3px 8px;
  border: 1px solid
    ${(props) =>
      props.$active ? props.theme.colors.primary : props.theme.colors.border};
  background-color: ${(props) =>
    props.$active ? props.theme.colors.primary : props.theme.colors.surface};
  color: ${(props) =>
    props.$active ? props.theme.colors.textInverse : props.theme.colors.text};
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
`;

const ChuteFilterBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${(props) => props.theme.colors.textSecondary};
  white-space: nowrap;
  flex-shrink: 0;
  display: none;

  @media (min-width: 640px) {
    display: inline;
  }
`;

/* Live Real-Time Status Panel when clicking a Departure Flight in the Chute */
const LiveFlightStatusPanel = styled.div`
  display: flex;
  flex-direction: column;
  padding: 12px;
  background-color: ${(props) => props.theme.colors.surface};
  border-top: 2px solid ${(props) => props.theme.colors.primary};
  gap: 10px;
`;

const LiveFlightHeader = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const LiveFlightTitleGroup = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`;

const LivePulseBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background-color: ${(props) => props.theme.colors.departureBg};
  color: ${(props) => props.theme.colors.departureText};
  border: 1px solid ${(props) => props.theme.colors.departureText};
  font-size: 11px;
  font-weight: 700;
`;

const LiveFlightGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;

  @media (min-width: 640px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const LiveMetricCell = styled.div`
  display: flex;
  flex-direction: column;
  padding: 6px 8px;
  background-color: ${(props) => props.theme.colors.background};
  border: 1px solid ${(props) => props.theme.colors.border};
  gap: 2px;
`;

const LiveMetricLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${(props) => props.theme.colors.textSecondary};
  line-height: 1.35;
  overflow-wrap: anywhere;
`;

const NomenclatureRow = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 10px 12px;
  background-color: ${(props) => props.theme.colors.background};
  border: 1px solid ${(props) => props.theme.colors.border};
  gap: 6px;
  width: 100%;
`;

const NomenclatureBadgesGroup = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`;

const NomenclatureTag = styled.span<{ $tone?: 'by' | 'bt' | 'prio' | 'bulk' }>`
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid
    ${(props) => {
      switch (props.$tone) {
        case 'by':
          return props.theme.colors.loadedText;
        case 'bt':
          return props.theme.colors.bffText;
        case 'prio':
          return props.theme.colors.onRouteText;
        case 'bulk':
          return props.theme.colors.deliveredText;
        default:
          return props.theme.colors.border;
      }
    }};
  background-color: ${(props) => {
    switch (props.$tone) {
      case 'by':
        return props.theme.colors.loadedBg;
      case 'bt':
        return props.theme.colors.bffBg;
      case 'prio':
        return props.theme.colors.onRouteBg;
      case 'bulk':
        return props.theme.colors.deliveredBg;
      default:
        return props.theme.colors.surface;
    }
  }};
  color: ${(props) => {
    switch (props.$tone) {
      case 'by':
        return props.theme.colors.loadedText;
      case 'bt':
        return props.theme.colors.bffText;
      case 'prio':
        return props.theme.colors.onRouteText;
      case 'bulk':
        return props.theme.colors.deliveredText;
      default:
        return props.theme.colors.text;
    }
  }};
`;

const LiveActionRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
`;

const OpenModalBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 6px 12px;
  background-color: ${(props) => props.theme.colors.primary};
  color: ${(props) => props.theme.colors.textInverse};
  border: none;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
`;

const CloseInlineBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 30px;
  padding: 4px 8px;
  background-color: ${(props) => props.theme.colors.background};
  color: ${(props) => props.theme.colors.textSecondary};
  border: 1px solid ${(props) => props.theme.colors.border};
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
`;

const SectionToolbar = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 4px;
`;

const SectionLabel = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${(props) => props.theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const ScrollControls = styled.div`
  display: none;
  align-items: center;
  gap: 4px;

  @media (min-width: 768px) {
    display: inline-flex;
  }
`;

const ScrollBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 32px;
  padding: 4px 8px;
  background-color: ${(props) => props.theme.colors.background};
  border: 1px solid ${(props) => props.theme.colors.border};
  color: ${(props) => props.theme.colors.text};
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
`;

const TableContainer = styled.div`
  display: none;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x pan-y;
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: ${(props) => props.theme.radii.md};
  background-color: ${(props) => props.theme.colors.background};

  @media (min-width: 768px) {
    display: block;
  }
`;

/* Mobile-First (< 768px): Compact Flight List (Voo, Chute, Hora) + Swipeable Chute Details in Column */
const MobileSectionWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;

  @media (min-width: 768px) {
    display: none;
  }
`;

const MobileFlightListBox = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 1px solid ${(props) => props.theme.colors.border};
  background-color: ${(props) => props.theme.colors.background};
`;

const MobileFlightListHeader = styled.div`
  display: grid;
  grid-template-columns: 1.4fr 1fr 0.8fr;
  align-items: center;
  padding: 8px 12px;
  background-color: ${(props) => props.theme.colors.surface};
  border-bottom: 1px solid ${(props) => props.theme.colors.border};
  font-size: 11px;
  font-weight: 700;
  color: ${(props) => props.theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const MobileFlightListScroll = styled.div`
  display: flex;
  flex-direction: column;
  max-height: 224px;
  overflow-y: auto;
`;

const MobileFlightListItem = styled.button<{ $active?: boolean }>`
  display: grid;
  grid-template-columns: 1.4fr 1fr 0.8fr;
  align-items: center;
  width: 100%;
  min-height: 44px;
  padding: 8px 12px;
  text-align: left;
  background-color: ${(props) =>
    props.$active
      ? props.theme.colors.departureBg
      : props.theme.colors.background};
  border: none;
  border-left: 3px solid
    ${(props) =>
      props.$active ? props.theme.colors.primary : 'transparent'};
  border-bottom: 1px solid ${(props) => props.theme.colors.borderSubtle};
  color: ${(props) => props.theme.colors.text};
  cursor: pointer;
  transition: background-color 120ms ease;

  &:last-child {
    border-bottom: none;
  }
`;

const MobileSwapCard = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 1px solid ${(props) => props.theme.colors.primary};
  background-color: ${(props) => props.theme.colors.surface};
  touch-action: pan-y;
  user-select: none;
`;

const MobileSwapHeader = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  background-color: ${(props) => props.theme.colors.background};
  border-bottom: 1px solid ${(props) => props.theme.colors.border};
  gap: 6px;
`;

const SwapNavBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 44px;
  min-width: 84px;
  padding: 6px 10px;
  background-color: ${(props) => props.theme.colors.surface};
  color: ${(props) => props.theme.colors.text};
  border: 1px solid ${(props) => props.theme.colors.border};
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;

  &:active {
    background-color: ${(props) => props.theme.colors.primary};
    color: ${(props) => props.theme.colors.textInverse};
  }
`;

const SwapCenterIndicator = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 2px;
  min-width: 0;
  flex: 1;
`;

const SwapChuteTitle = styled.span`
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 700;
  color: ${(props) => props.theme.colors.primary};
`;

const SwapHintText = styled.span`
  font-size: 10px;
  font-weight: 600;
  color: ${(props) => props.theme.colors.textSecondary};
`;

const SwapChutesPillBar = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  overflow-x: auto;
  background-color: ${(props) => props.theme.colors.background};
  border-bottom: 1px solid ${(props) => props.theme.colors.borderSubtle};
`;

const SwapChutePill = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  padding: 4px 10px;
  background-color: ${(props) =>
    props.$active ? props.theme.colors.primary : props.theme.colors.surface};
  color: ${(props) =>
    props.$active ? props.theme.colors.textInverse : props.theme.colors.text};
  border: 1px solid
    ${(props) =>
      props.$active ? props.theme.colors.primary : props.theme.colors.border};
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
`;

const MobileColumnDetailsList = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 10px 12px;
  gap: 8px;
`;

const MobileColumnFieldRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background-color: ${(props) => props.theme.colors.background};
  border: 1px solid ${(props) => props.theme.colors.border};
  gap: 12px;

  & > *:last-child {
    text-align: right;
  }
`;

const MobileColumnFieldStack = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 10px;
  background-color: ${(props) => props.theme.colors.background};
  border: 1px solid ${(props) => props.theme.colors.border};
  gap: 6px;
`;

const MobileFieldLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${(props) => props.theme.colors.textSecondary};
  line-height: 1.3;
`;

const Table = styled.table<{ $minWidth?: string }>`
  width: 100%;
  min-width: ${(props) => props.$minWidth || '840px'};
  border-collapse: collapse;
  font-size: 13px;
`;

const Thead = styled.thead`
  background-color: ${(props) => props.theme.colors.tableHeaderBg};
  border-bottom: 1px solid ${(props) => props.theme.colors.border};
`;

const Th = styled.th<{
  $align?: 'left' | 'right' | 'center';
  $sticky?: boolean;
}>`
  padding: 8px 6px;
  text-align: ${(props) => props.$align || 'left'};
  font-size: 11px;
  font-weight: 700;
  color: ${(props) => props.theme.colors.tableHeaderText};
  white-space: nowrap;

  @media (min-width: 768px) {
    padding: 8px 10px;
    font-size: 12px;
  }

  ${(props) =>
    props.$sticky
      ? `
    position: sticky;
    left: 0;
    z-index: 2;
    background-color: ${props.theme.colors.tableHeaderBg};
    box-shadow: 1px 0 0 ${props.theme.colors.border};
  `
      : ''}
`;

const Tr = styled.tr`
  border-bottom: 1px solid ${(props) => props.theme.colors.borderSubtle};
  cursor: pointer;
  transition: background-color 120ms ease;

  &:hover {
    background-color: ${(props) => props.theme.colors.surfaceHover};
  }
`;

const Td = styled.td<{
  $align?: 'left' | 'right' | 'center';
  $sticky?: boolean;
}>`
  padding: 8px 6px;
  text-align: ${(props) => props.$align || 'left'};
  color: ${(props) => props.theme.colors.text};
  white-space: nowrap;
  height: 44px;
  font-size: 12px;

  @media (min-width: 768px) {
    padding: 8px 10px;
    font-size: 13px;
  }

  ${(props) =>
    props.$sticky
      ? `
    position: sticky;
    left: 0;
    z-index: 1;
    background-color: ${props.theme.colors.background};
    box-shadow: 1px 0 0 ${props.theme.colors.borderSubtle};
  `
      : ''}
`;

export const DeparturesChutesView: React.FC<DeparturesChutesViewProps> = ({
  flights,
  onSelectFlight,
}) => {
  const [selectedChute, setSelectedChute] = useState<string | null>(null);
  const [selectedFlightKey, setSelectedFlightKey] = useState<string | null>(
    null
  );
  // Active flight selected in the mobile "Detalhamento de Voos por Chute" list & swipe card
  const [mobileDetailFlightId, setMobileDetailFlightId] = useState<
    string | null
  >(null);
  const swipeTouchStartXRef = useRef<number | null>(null);
  const chutesTableScrollRef = useRef<HTMLDivElement | null>(null);

  const allChuteGroups = useMemo(() => {
    return groupDeparturesByChute(flights);
  }, [flights]);

  const displayedChuteGroups = useMemo(() => {
    if (!selectedChute) return allChuteGroups;
    return allChuteGroups.filter((g) => g.chute === selectedChute);
  }, [allChuteGroups, selectedChute]);

  const visibleFlightInfos = useMemo(() => {
    const list: DepartureFlightContainerInfo[] = [];
    for (const group of displayedChuteGroups) {
      for (const info of group.flights) {
        list.push(info);
      }
    }
    return list;
  }, [displayedChuteGroups]);

  // Resolve the active flight for the mobile list + vertical column swap card
  const activeMobileFlightInfo = useMemo(() => {
    if (visibleFlightInfos.length === 0) return null;
    if (mobileDetailFlightId) {
      const found = visibleFlightInfos.find(
        (info) =>
          info.flightRecord.id === mobileDetailFlightId ||
          info.flight === mobileDetailFlightId
      );
      if (found) return found;
    }
    return visibleFlightInfos[0];
  }, [visibleFlightInfos, mobileDetailFlightId]);

  // Active Chute index in allChuteGroups for left/right swipe navigation between Chutes
  const activeSwipeChuteIndex = useMemo(() => {
    if (allChuteGroups.length === 0) return 0;
    const targetChute =
      selectedChute || activeMobileFlightInfo?.chute || allChuteGroups[0].chute;
    const idx = allChuteGroups.findIndex((g) => g.chute === targetChute);
    return idx >= 0 ? idx : 0;
  }, [allChuteGroups, selectedChute, activeMobileFlightInfo]);

  const prevChuteGroup = useMemo(() => {
    if (allChuteGroups.length === 0) return null;
    const idx = getSwipedGroupIndex(
      activeSwipeChuteIndex,
      allChuteGroups.length,
      'prev'
    );
    return allChuteGroups[idx];
  }, [allChuteGroups, activeSwipeChuteIndex]);

  const nextChuteGroup = useMemo(() => {
    if (allChuteGroups.length === 0) return null;
    const idx = getSwipedGroupIndex(
      activeSwipeChuteIndex,
      allChuteGroups.length,
      'next'
    );
    return allChuteGroups[idx];
  }, [allChuteGroups, activeSwipeChuteIndex]);

  const handleSwapChute = (direction: 'prev' | 'next') => {
    if (allChuteGroups.length === 0) return;
    const nextIdx = getSwipedGroupIndex(
      activeSwipeChuteIndex,
      allChuteGroups.length,
      direction
    );
    const targetGroup = allChuteGroups[nextIdx];
    if (!targetGroup) return;
    if (selectedChute) {
      setSelectedChute(targetGroup.chute);
    }
    if (targetGroup.flights.length > 0) {
      setMobileDetailFlightId(targetGroup.flights[0].flightRecord.id);
    }
  };

  const handleSelectChuteInSwap = (chuteCode: string) => {
    const group = allChuteGroups.find((g) => g.chute === chuteCode);
    if (!group) return;
    if (selectedChute) {
      setSelectedChute(group.chute);
    }
    if (group.flights.length > 0) {
      setMobileDetailFlightId(group.flights[0].flightRecord.id);
    }
  };

  const handleSwipeTouchStart = (clientX: number) => {
    swipeTouchStartXRef.current = clientX;
  };

  const handleSwipeTouchEnd = (clientX: number) => {
    if (swipeTouchStartXRef.current === null) return;
    const deltaX = clientX - swipeTouchStartXRef.current;
    swipeTouchStartXRef.current = null;
    if (Math.abs(deltaX) >= 40) {
      handleSwapChute(deltaX < 0 ? 'next' : 'prev');
    }
  };

  // Live selected flight info (automatically updated in real time from flights prop)
  const liveSelectedFlightInfo = useMemo(() => {
    if (!selectedFlightKey) return null;
    const found = (flights || []).find(
      (f) =>
        f.direction === 'departure' &&
        (f.id === selectedFlightKey || f.flight === selectedFlightKey)
    );
    return found ? computeDepartureContainerBreakdown(found) : null;
  }, [flights, selectedFlightKey]);

  const handleChuteRowClick = (chuteCode: string) => {
    setSelectedChute((prev) => (prev === chuteCode ? null : chuteCode));
  };

  const handleChuteFlightClick = (
    info: DepartureFlightContainerInfo,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setSelectedFlightKey((prev) =>
      prev === info.flightRecord.id ? null : info.flightRecord.id
    );
    setMobileDetailFlightId(info.flightRecord.id);
  };

  const scrollTableBy = (deltaX: number) => {
    if (chutesTableScrollRef.current) {
      chutesTableScrollRef.current.scrollBy({
        left: deltaX,
        behavior: 'smooth',
      });
    }
  };

  return (
    <ChutesContainer data-testid="departures-chutes-section">
      <HeaderRow>
        <TitleBlock>
          <Title>Partidas ↑ · Esteiras Anel & Chutes</Title>
          <SubKicker>
            Fila de Voos por Chute · Malas, Carregadas, Inbound, Contentores
            (BY / BT / PRIO) e Bulk em Tempo Real
          </SubKicker>
        </TitleBlock>

        {selectedChute && (
          <ResetChuteBtn
            type="button"
            onClick={() => setSelectedChute(null)}
            data-testid="btn-reset-chute-filter"
          >
            <RotateCcw size={12} />
            <span>Mostrar Todos os Chutes</span>
          </ResetChuteBtn>
        )}
      </HeaderRow>

      {/* Card com as Esteiras Anel / Chutes (1 Chute em cada linha com os voos enfileirados) */}
      <ChutesQueueCard data-testid="departures-chutes-card">
        <ChutesCardHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <ChutesCardTitle>
              Esteiras Anel · Chutes de Partida (Voos Enfileirados na Sequência)
            </ChutesCardTitle>
            <ChutesCardHint>
              Toque na linha do Chute para exibir só este Chute · Toque num voo
              para ver Contentores (BY, BT, PRIO, Bulk) e Inbound em tempo real
            </ChutesCardHint>
          </div>

          {selectedChute && (
            <ResetChuteBtn
              type="button"
              onClick={() => setSelectedChute(null)}
            >
              <RotateCcw size={12} />
              <span>Ver Todos os Chutes</span>
            </ResetChuteBtn>
          )}
        </ChutesCardHeader>

        <ChutesLinesList>
          {displayedChuteGroups.map((group) => {
            const isChuteSelected = selectedChute === group.chute;
            return (
              <ChuteLineRow
                key={`chute-line-${group.chute}`}
                $selected={isChuteSelected}
                onClick={() => handleChuteRowClick(group.chute)}
                data-testid={`chute-row-${group.chute}`}
              >
                <ChuteLineLeft>
                  <ChuteNumberLabel $selected={isChuteSelected}>
                    Chute {group.chute} -
                  </ChuteNumberLabel>
                  <ChuteFlightsSequence>
                    {group.flights.map((info) => {
                      const isFlightSelected =
                        selectedFlightKey === info.flightRecord.id;
                      return (
                        <ChuteFlightChip
                          key={`chute-flight-${info.flightRecord.id}`}
                          type="button"
                          $active={isFlightSelected}
                          onClick={(e) => handleChuteFlightClick(info, e)}
                          data-testid={`chute-flight-chip-${info.flight}`}
                        >
                          <ArrowUp size={12} />
                          <span>
                            {info.flight} · {info.destination} ·{' '}
                            {info.departureTime}
                          </span>
                        </ChuteFlightChip>
                      );
                    })}
                  </ChuteFlightsSequence>
                </ChuteLineLeft>

                <ChuteFilterBadge>
                  {isChuteSelected ? 'Exibindo só este Chute' : 'Filtrar Chute'}
                </ChuteFilterBadge>
              </ChuteLineRow>
            );
          })}
        </ChutesLinesList>

        {liveSelectedFlightInfo && (
          <LiveFlightStatusPanel data-testid="chute-flight-live-status">
            <LiveFlightHeader>
              <LiveFlightTitleGroup>
                <MonospaceValue>
                  ↑ {liveSelectedFlightInfo.flight} · Destino:{' '}
                  {liveSelectedFlightInfo.destination} · Partida:{' '}
                  {liveSelectedFlightInfo.departureTime}
                </MonospaceValue>
                <LivePulseBadge>
                  <Clock size={12} />
                  <span>
                    TEMPO REAL · CHUTE {liveSelectedFlightInfo.chute} · STAND{' '}
                    {liveSelectedFlightInfo.stand}
                  </span>
                </LivePulseBadge>
              </LiveFlightTitleGroup>

              <CloseInlineBtn
                type="button"
                onClick={() => setSelectedFlightKey(null)}
              >
                <X size={13} />
                <span>Fechar</span>
              </CloseInlineBtn>
            </LiveFlightHeader>

            <LiveFlightGrid>
              <LiveMetricCell>
                <LiveMetricLabel>Voo / Destino (3 Letras)</LiveMetricLabel>
                <MonospaceValue>
                  {liveSelectedFlightInfo.flight} →{' '}
                  {liveSelectedFlightInfo.destination}
                </MonospaceValue>
              </LiveMetricCell>
              <LiveMetricCell>
                <LiveMetricLabel>Hora de Partida (BTD)</LiveMetricLabel>
                <MonospaceValue>
                  {liveSelectedFlightInfo.departureTime}
                </MonospaceValue>
              </LiveMetricCell>
              <LiveMetricCell>
                <LiveMetricLabel>Quantidade de Malas</LiveMetricLabel>
                <MonospaceValue $tone="delivered">
                  {liveSelectedFlightInfo.totalBags}
                </MonospaceValue>
              </LiveMetricCell>
              <LiveMetricCell>
                <LiveMetricLabel>Total de Carregadas</LiveMetricLabel>
                <MonospaceValue $tone="loaded">
                  <PackageCheck
                    size={13}
                    style={{ display: 'inline', marginRight: 4 }}
                  />
                  {liveSelectedFlightInfo.totalLoaded}
                </MonospaceValue>
              </LiveMetricCell>
              <LiveMetricCell>
                <LiveMetricLabel>Total de Inbound (BFF)</LiveMetricLabel>
                <MonospaceValue $tone="bff">
                  <Layers
                    size={13}
                    style={{ display: 'inline', marginRight: 4 }}
                  />
                  {liveSelectedFlightInfo.totalInbound}
                </MonospaceValue>
              </LiveMetricCell>
              <LiveMetricCell>
                <LiveMetricLabel>Total de Contentores</LiveMetricLabel>
                <MonospaceValue $tone="loaded">
                  <Box
                    size={13}
                    style={{ display: 'inline', marginRight: 4 }}
                  />
                  {liveSelectedFlightInfo.totalContainers} ULDs
                </MonospaceValue>
              </LiveMetricCell>
              <LiveMetricCell>
                <LiveMetricLabel>Tipos de Contentores / Bulk</LiveMetricLabel>
                <MonospaceValue>
                  {liveSelectedFlightInfo.containerTypesLabel}
                </MonospaceValue>
              </LiveMetricCell>
              <LiveMetricCell>
                <LiveMetricLabel>Malas em Bulk (Porão Solto)</LiveMetricLabel>
                <MonospaceValue $tone="onRoute">
                  {liveSelectedFlightInfo.bulkBags} malas
                </MonospaceValue>
              </LiveMetricCell>
            </LiveFlightGrid>

            <NomenclatureRow data-testid="nomenclature-card">
              <LiveMetricLabel>
                Nomenclaturas dos Contentores (BY: Local · BT: Inbound · PRIO:
                Prioritário · BULK) — Malas Carregadas / Previstas
              </LiveMetricLabel>
              <MonospaceValue>
                {liveSelectedFlightInfo.containerHeaderSummary}
              </MonospaceValue>

              <NomenclatureBadgesGroup data-testid="nomenclature-colored-tags">
                {liveSelectedFlightInfo.containerTags.map((tag) => (
                  <NomenclatureTag key={tag.id} $tone={tag.tone}>
                    {tag.displayText}
                  </NomenclatureTag>
                ))}
              </NomenclatureBadgesGroup>
            </NomenclatureRow>

            <LiveActionRow>
              <OpenModalBtn
                type="button"
                onClick={() =>
                  onSelectFlight(liveSelectedFlightInfo.flightRecord)
                }
              >
                <ExternalLink size={13} />
                <span>Abrir Detalhamento Completo e Cronologia de Bagagens</span>
              </OpenModalBtn>
            </LiveActionRow>
          </LiveFlightStatusPanel>
        )}
      </ChutesQueueCard>

      {/* Operational Section for Partidas Chutes, Bags, Inbound, Containers & Nomenclatures */}
      <SectionToolbar>
        <SectionLabel>
          Detalhamento de Voos por Chute · Contentores & Nomenclaturas{' '}
          {selectedChute ? `(Chute ${selectedChute})` : ''}
        </SectionLabel>
        <ScrollControls>
          <ScrollBtn
            type="button"
            onClick={() => scrollTableBy(-180)}
            aria-label="Rolar tabela de chutes para a esquerda"
          >
            <ChevronLeft size={14} />
            <span>Rolar</span>
          </ScrollBtn>
          <ScrollBtn
            type="button"
            onClick={() => scrollTableBy(180)}
            aria-label="Rolar tabela de chutes para a direita"
          >
            <span>Rolar</span>
            <ChevronRight size={14} />
          </ScrollBtn>
        </ScrollControls>
      </SectionToolbar>

      {/* Mobile Version (< 768px): 3-Column Flight List (Nome Voo, Chute, Hora) + Swipeable Chute Details in Column */}
      <MobileSectionWrapper data-testid="departures-mobile-list-and-swap">
        <MobileFlightListBox data-testid="departures-mobile-flight-list">
          <MobileFlightListHeader>
            <span>Voo (Nome)</span>
            <span>Chute</span>
            <span style={{ textAlign: 'right' }}>Hora (BTD)</span>
          </MobileFlightListHeader>
          <MobileFlightListScroll>
            {visibleFlightInfos.map((info) => {
              const isSelected =
                activeMobileFlightInfo?.flightRecord.id === info.flightRecord.id;
              return (
                <MobileFlightListItem
                  key={`mobile-dep-row-${info.flightRecord.id}`}
                  type="button"
                  $active={isSelected}
                  onClick={() => setMobileDetailFlightId(info.flightRecord.id)}
                  data-testid={`mobile-dep-list-item-${info.flight}`}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <ArrowUp size={13} />
                    <MonospaceValue
                      $tone={isSelected ? 'loaded' : 'default'}
                    >
                      {info.flight}
                    </MonospaceValue>
                  </span>
                  <MonospaceValue>Chute {info.chute}</MonospaceValue>
                  <span style={{ textAlign: 'right' }}>
                    <MonospaceValue>{info.departureTime}</MonospaceValue>
                  </span>
                </MobileFlightListItem>
              );
            })}
          </MobileFlightListScroll>
        </MobileFlightListBox>

        {activeMobileFlightInfo && (
          <MobileSwapCard
            data-testid="departures-mobile-chute-swap-card"
            onTouchStart={(e) => {
              if (e.touches.length > 0) {
                handleSwipeTouchStart(e.touches[0].clientX);
              }
            }}
            onTouchEnd={(e) => {
              if (e.changedTouches.length > 0) {
                handleSwipeTouchEnd(e.changedTouches[0].clientX);
              }
            }}
            onMouseDown={(e) => handleSwipeTouchStart(e.clientX)}
            onMouseUp={(e) => handleSwipeTouchEnd(e.clientX)}
          >
            <MobileSwapHeader>
              <SwapNavBtn
                type="button"
                onClick={() => handleSwapChute('prev')}
                data-testid="btn-swap-prev-chute"
                aria-label="Chute anterior"
              >
                <ChevronLeft size={15} />
                <span>
                  Chute {prevChuteGroup ? prevChuteGroup.chute : '—'}
                </span>
              </SwapNavBtn>

              <SwapCenterIndicator>
                <SwapChuteTitle data-testid="swap-active-chute-title">
                  CHUTE {activeMobileFlightInfo.chute} (
                  {activeSwipeChuteIndex + 1}/{allChuteGroups.length})
                </SwapChuteTitle>
                <SwapHintText>
                  Deslize ↔ esq./dir. para navegar entre Chutes
                </SwapHintText>
              </SwapCenterIndicator>

              <SwapNavBtn
                type="button"
                onClick={() => handleSwapChute('next')}
                data-testid="btn-swap-next-chute"
                aria-label="Próximo chute"
              >
                <span>
                  Chute {nextChuteGroup ? nextChuteGroup.chute : '—'}
                </span>
                <ChevronRight size={15} />
              </SwapNavBtn>
            </MobileSwapHeader>

            <SwapChutesPillBar>
              {allChuteGroups.map((grp) => (
                <SwapChutePill
                  key={`swap-pill-chute-${grp.chute}`}
                  type="button"
                  $active={grp.chute === activeMobileFlightInfo.chute}
                  onClick={() => handleSelectChuteInSwap(grp.chute)}
                  data-testid={`swap-pill-chute-${grp.chute}`}
                >
                  Chute {grp.chute} ({grp.flights.length})
                </SwapChutePill>
              ))}
            </SwapChutesPillBar>

            <MobileColumnDetailsList data-testid="departures-mobile-detail-column">
              <MobileColumnFieldRow>
                <MobileFieldLabel>Voo / Destino (3 Letras)</MobileFieldLabel>
                <MonospaceValue>
                  ↑ {activeMobileFlightInfo.flight} →{' '}
                  {activeMobileFlightInfo.destination}
                </MonospaceValue>
              </MobileColumnFieldRow>

              <MobileColumnFieldRow>
                <MobileFieldLabel>Chute (Esteira Anel)</MobileFieldLabel>
                <MonospaceValue $tone="loaded">
                  Chute {activeMobileFlightInfo.chute} · Stand{' '}
                  {activeMobileFlightInfo.stand}
                </MonospaceValue>
              </MobileColumnFieldRow>

              <MobileColumnFieldRow>
                <MobileFieldLabel>Hora de Partida (BTD)</MobileFieldLabel>
                <MonospaceValue>
                  {activeMobileFlightInfo.departureTime}
                </MonospaceValue>
              </MobileColumnFieldRow>

              <MobileColumnFieldRow>
                <MobileFieldLabel>Quantidade de Malas</MobileFieldLabel>
                <MonospaceValue $tone="delivered">
                  {activeMobileFlightInfo.totalBags} malas
                </MonospaceValue>
              </MobileColumnFieldRow>

              <MobileColumnFieldRow>
                <MobileFieldLabel>Total de Carregadas</MobileFieldLabel>
                <MonospaceValue $tone="loaded">
                  {activeMobileFlightInfo.totalLoaded} malas
                </MonospaceValue>
              </MobileColumnFieldRow>

              <MobileColumnFieldRow>
                <MobileFieldLabel>Total de Inbound (BFF)</MobileFieldLabel>
                <MonospaceValue $tone="bff">
                  {activeMobileFlightInfo.totalInbound} malas
                </MonospaceValue>
              </MobileColumnFieldRow>

              <MobileColumnFieldRow>
                <MobileFieldLabel>Total de Contentores</MobileFieldLabel>
                <MonospaceValue $tone="loaded">
                  {activeMobileFlightInfo.totalContainers} ULDs
                </MonospaceValue>
              </MobileColumnFieldRow>

              <MobileColumnFieldRow>
                <MobileFieldLabel>Tipos de Contentores / Bulk</MobileFieldLabel>
                <MonospaceValue>
                  {activeMobileFlightInfo.containerTypesLabel}
                </MonospaceValue>
              </MobileColumnFieldRow>

              <MobileColumnFieldRow>
                <MobileFieldLabel>Malas em Bulk (Porão Solto)</MobileFieldLabel>
                <MonospaceValue $tone="onRoute">
                  {activeMobileFlightInfo.bulkLoadedBags}/
                  {activeMobileFlightInfo.bulkBags} malas
                </MonospaceValue>
              </MobileColumnFieldRow>

              <MobileColumnFieldStack>
                <MobileFieldLabel>
                  Nomenclaturas dos Contentores (BY: Local · BT: Inbound · PRIO:
                  Prioritário · BULK) — Malas Carregadas / Previstas
                </MobileFieldLabel>
                <MonospaceValue>
                  {activeMobileFlightInfo.containerHeaderSummary}
                </MonospaceValue>
                <NomenclatureBadgesGroup>
                  {activeMobileFlightInfo.containerTags.map((tag) => (
                    <NomenclatureTag key={tag.id} $tone={tag.tone}>
                      {tag.displayText}
                    </NomenclatureTag>
                  ))}
                </NomenclatureBadgesGroup>
              </MobileColumnFieldStack>

              <OpenModalBtn
                type="button"
                style={{ width: '100%', justifyContent: 'center', minHeight: 44 }}
                onClick={() =>
                  onSelectFlight(activeMobileFlightInfo.flightRecord)
                }
              >
                <ExternalLink size={14} />
                <span>Abrir Detalhamento Completo e Cronologia</span>
              </OpenModalBtn>
            </MobileColumnDetailsList>
          </MobileSwapCard>
        )}
      </MobileSectionWrapper>

      <TableContainer
        ref={chutesTableScrollRef}
        className="table-scroll-x"
        data-testid="departures-chutes-scroll-table"
      >
        <Table
          $minWidth="980px"
          aria-label="Tabela de Chutes de Partida e Contentores"
        >
          <Thead>
            <tr>
              <Th $sticky>Voo</Th>
              <Th>Chute</Th>
              <Th>DES</Th>
              <Th>Partida</Th>
              <Th $align="right">Qtd. Malas</Th>
              <Th $align="right">Carregadas</Th>
              <Th $align="right">Inbound</Th>
              <Th $align="right">Contentores</Th>
              <Th>Tipo / Qtd. Contentores</Th>
              <Th>Nomenclaturas (Carregadas / Previstas)</Th>
            </tr>
          </Thead>
          <tbody>
            {visibleFlightInfos.length === 0 ? (
              <tr>
                <Td colSpan={10} $align="center">
                  Nenhum voo de partida ativo para o chute selecionado.
                </Td>
              </tr>
            ) : (
              visibleFlightInfos.map((info) => (
                <Tr
                  key={`chute-table-row-${info.flightRecord.id}`}
                  onClick={() => onSelectFlight(info.flightRecord)}
                >
                  <Td $sticky>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <ArrowUp size={14} />
                      <MonospaceValue>{info.flight}</MonospaceValue>
                    </span>
                  </Td>
                  <Td>
                    <MonospaceValue>Chute {info.chute}</MonospaceValue>
                  </Td>
                  <Td>
                    <MonospaceValue>{info.destination}</MonospaceValue>
                  </Td>
                  <Td>
                    <MonospaceValue>{info.departureTime}</MonospaceValue>
                  </Td>
                  <Td $align="right">
                    <MonospaceValue $tone="delivered">
                      {info.totalBags}
                    </MonospaceValue>
                  </Td>
                  <Td $align="right">
                    <MonospaceValue $tone="loaded">
                      {info.totalLoaded}
                    </MonospaceValue>
                  </Td>
                  <Td $align="right">
                    <MonospaceValue $tone="bff">
                      {info.totalInbound}
                    </MonospaceValue>
                  </Td>
                  <Td $align="right">
                    <MonospaceValue $tone="loaded">
                      {info.totalContainers}
                    </MonospaceValue>
                  </Td>
                  <Td>
                    <MonospaceValue>{info.containerHeaderSummary}</MonospaceValue>
                  </Td>
                  <Td>
                    <NomenclatureBadgesGroup>
                      {info.containerTags.map((tag) => (
                        <NomenclatureTag key={tag.id} $tone={tag.tone}>
                          {tag.displayText}
                        </NomenclatureTag>
                      ))}
                    </NomenclatureBadgesGroup>
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </TableContainer>
    </ChutesContainer>
  );
};
