import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import {
  ArrowDown,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Filter,
  RotateCcw,
  Square,
  X,
} from 'lucide-react';
import { ArrivalPerformanceRecord, FlightRecord } from '../types/bagstogo';
import {
  computeArrivalElapsedTime,
  getSwipedGroupIndex,
  groupArrivalsByBelt,
  normalizeBeltCode,
} from '../utils/bagstogoLogic';
import { MonospaceValue, SurfacePanel } from './ui/Primitives';

interface ArrivalsPerformanceViewProps {
  arrivals: ArrivalPerformanceRecord[];
  serverTimeIso: string;
  isLandscapeMobile?: boolean;
  onSelectArrivalFlight?: (flight: FlightRecord) => void;
}

const ArrivalsContainer = styled(SurfacePanel)`
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
`;

const LandscapeWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xs};
  width: 100%;
  min-width: 0;
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
  color: ${(props) => props.theme.colors.arrivalText};
`;

const ViewToggleBtn = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.xs};
  min-height: 40px;
  padding: 6px 12px;
  border-radius: ${(props) => props.theme.radii.md};
  border: 1px solid ${(props) => props.theme.colors.border};
  background-color: ${(props) =>
    props.$active ? props.theme.colors.primary : props.theme.colors.background};
  color: ${(props) =>
    props.$active ? props.theme.colors.textInverse : props.theme.colors.text};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
`;

/* Belts Card (1 Belt per line: "1 - vooX  vooY  vooZ") */
const BeltsCard = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${(props) => props.theme.colors.border};
  background-color: ${(props) => props.theme.colors.background};
  width: 100%;
  min-width: 0;
`;

const BeltsCardHeader = styled.div`
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

const BeltsCardTitle = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${(props) => props.theme.colors.text};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const BeltsCardHint = styled.span`
  font-size: 11px;
  color: ${(props) => props.theme.colors.textSecondary};
`;

const ResetBeltBtn = styled.button`
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

const BeltsLinesList = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const BeltLineRow = styled.div<{ $selected?: boolean }>`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid ${(props) => props.theme.colors.borderSubtle};
  background-color: ${(props) =>
    props.$selected
      ? props.theme.colors.arrivalBg
      : props.theme.colors.background};
  cursor: pointer;
  gap: 10px;
  min-height: 44px;
  transition: background-color 120ms ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: ${(props) =>
      props.$selected
        ? props.theme.colors.arrivalBg
        : props.theme.colors.surfaceHover};
  }
`;

const BeltLineLeft = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: nowrap;
  gap: 8px;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
`;

const BeltNumberLabel = styled.span<{ $selected?: boolean }>`
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 700;
  color: ${(props) =>
    props.$selected
      ? props.theme.colors.arrivalText
      : props.theme.colors.primary};
  white-space: nowrap;
  flex-shrink: 0;
`;

const BeltFlightsSequence = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: nowrap;
  gap: 6px;
`;

const BeltFlightChip = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
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

const BeltFilterBadge = styled.span`
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

/* Live Real-Time Status Panel when clicking a Flight in the Belts Card */
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
  background-color: ${(props) => props.theme.colors.arrivalBg};
  color: ${(props) => props.theme.colors.arrivalText};
  border: 1px solid ${(props) => props.theme.colors.arrivalText};
  font-size: 11px;
  font-weight: 700;
`;

const LiveFlightGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;

  @media (min-width: 640px) {
    grid-template-columns: repeat(5, 1fr);
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
  white-space: nowrap;
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

/* Real-Time Performance Block */
const PerformanceSection = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${(props) => props.theme.colors.border};
  background-color: ${(props) => props.theme.colors.background};
  min-width: 0;
  width: 100%;
`;

const PerformanceBanner = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background-color: ${(props) => props.theme.colors.arrivalBg};
  border-bottom: 1px solid ${(props) => props.theme.colors.border};
  gap: 8px;
`;

const PerformanceBannerTitle = styled.span`
  font-size: 15px;
  font-weight: 700;
  color: ${(props) => props.theme.colors.arrivalText};
  letter-spacing: 0.01em;
`;

const PerformanceLiveTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  color: ${(props) => props.theme.colors.textSecondary};
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
  display: inline-flex;
  align-items: center;
  gap: 4px;
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

  &:active {
    background-color: ${(props) => props.theme.colors.surfaceHover};
  }
`;

const TableContainer = styled.div`
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x pan-y;
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: ${(props) => props.theme.radii.md};
  background-color: ${(props) => props.theme.colors.background};
`;

const Table = styled.table<{ $minWidth?: string }>`
  width: 100%;
  min-width: ${(props) => props.$minWidth || '640px'};
  border-collapse: collapse;
  font-size: 13px;
`;

const Thead = styled.thead`
  background-color: ${(props) => props.theme.colors.surface};
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
  color: ${(props) => props.theme.colors.textSecondary};
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
    background-color: ${props.theme.colors.surface};
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

const CheckboxBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  min-height: 36px;
  background: transparent;
  border: none;
  color: ${(props) => props.theme.colors.primary};
  cursor: pointer;
`;

const HeaderCheckboxWrap = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
`;

const DesktopOnlyTableContainer = styled(TableContainer)`
  display: none;

  @media (min-width: 768px) {
    display: block;
  }
`;

const DesktopOnlyScrollControls = styled(ScrollControls)`
  display: none;

  @media (min-width: 768px) {
    display: inline-flex;
  }
`;

/* Mobile-First (< 768px): Compact Flight List (Voo, Belt/Chute, Hora) + Swipeable Belt Details in Column */
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
  grid-template-columns: 1.4fr 1fr 0.9fr;
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
  grid-template-columns: 1.4fr 1fr 0.9fr;
  align-items: center;
  width: 100%;
  min-height: 44px;
  padding: 8px 12px;
  text-align: left;
  background-color: ${(props) =>
    props.$active
      ? props.theme.colors.arrivalBg
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

const SwapBeltTitle = styled.span`
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

const SwapBeltsPillBar = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  overflow-x: auto;
  background-color: ${(props) => props.theme.colors.background};
  border-bottom: 1px solid ${(props) => props.theme.colors.borderSubtle};
`;

const SwapBeltPill = styled.button<{ $active?: boolean }>`
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

const MobileFieldLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${(props) => props.theme.colors.textSecondary};
  line-height: 1.3;
`;

export const ArrivalsPerformanceView: React.FC<ArrivalsPerformanceViewProps> = ({
  arrivals,
  serverTimeIso,
  isLandscapeMobile = false,
  onSelectArrivalFlight,
}) => {
  const [nowDate, setNowDate] = useState<Date>(() => {
    const d = new Date(serverTimeIso);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  });
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [onlyCheckedView, setOnlyCheckedView] = useState(false);

  // Selected Belt filter ("se clicar na linha de uma belt ele exibe só esta belt")
  const [selectedBelt, setSelectedBelt] = useState<string | null>(null);

  // Selected Flight in Belt for live real-time inline status ("se clicar em algum voo ele exibe os status atuais e alimentado em tempo real")
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);

  // Active flight selected in the mobile "Lista de Voos de Chegadas & Chutes / Belts" list & swipe card
  const [mobileDetailArrivalId, setMobileDetailArrivalId] = useState<
    string | null
  >(null);
  const swipeTouchStartXRef = useRef<number | null>(null);

  const flightsTableScrollRef = useRef<HTMLDivElement | null>(null);
  const perfTableScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const d = new Date(serverTimeIso);
    if (!Number.isNaN(d.getTime())) {
      setNowDate(d);
    }
  }, [serverTimeIso]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowDate((prev) => new Date(prev.getTime() + 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const allBeltGroups = useMemo(() => {
    return groupArrivalsByBelt(arrivals);
  }, [arrivals]);

  const displayedBeltGroups = useMemo(() => {
    if (!selectedBelt) return allBeltGroups;
    return allBeltGroups.filter((g) => g.belt === selectedBelt);
  }, [allBeltGroups, selectedBelt]);

  // Live selected flight object (updated in real time whenever arrivals or nowDate ticks)
  const liveSelectedArrival = useMemo(() => {
    if (!selectedFlightId) return null;
    return (
      arrivals.find(
        (a) => a.id === selectedFlightId || a.flight === selectedFlightId
      ) || null
    );
  }, [arrivals, selectedFlightId]);

  const toggleRowView = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => ({
      ...prev,
      [id]: !(prev[id] ?? true),
    }));
  };

  const allChecked =
    arrivals.length > 0 &&
    arrivals.every((arr) => selectedIds[arr.id] ?? true);

  const toggleAllView = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextVal = !allChecked;
    const nextMap: Record<string, boolean> = {};
    arrivals.forEach((arr) => {
      nextMap[arr.id] = nextVal;
    });
    setSelectedIds(nextMap);
  };

  const visibleArrivals = useMemo(() => {
    return arrivals.filter((arr) => {
      if (selectedBelt && normalizeBeltCode(arr.belt) !== selectedBelt) {
        return false;
      }
      const isChecked = selectedIds[arr.id] ?? true;
      return onlyCheckedView ? isChecked : true;
    });
  }, [arrivals, selectedBelt, selectedIds, onlyCheckedView]);

  // Flatten displayedBeltGroups for the mobile list so flights are grouped in Belt sequence (Belt 1, Belt 2, ...)
  const mobileOrderedArrivals = useMemo(() => {
    const visibleSet = new Set(visibleArrivals.map((a) => a.id));
    const list: ArrivalPerformanceRecord[] = [];
    for (const grp of displayedBeltGroups) {
      for (const fl of grp.flights) {
        if (visibleSet.has(fl.id)) {
          list.push(fl);
        }
      }
    }
    return list.length > 0 ? list : visibleArrivals;
  }, [displayedBeltGroups, visibleArrivals]);

  // Active arrival flight for the mobile list + vertical column swap card
  const activeMobileArrival = useMemo(() => {
    if (mobileOrderedArrivals.length === 0) return null;
    if (mobileDetailArrivalId) {
      const found = mobileOrderedArrivals.find(
        (arr) =>
          arr.id === mobileDetailArrivalId ||
          arr.flight === mobileDetailArrivalId
      );
      if (found) return found;
    }
    return mobileOrderedArrivals[0];
  }, [mobileOrderedArrivals, mobileDetailArrivalId]);

  // Active Belt index in allBeltGroups for left/right swipe navigation between Belts
  const activeSwipeBeltIndex = useMemo(() => {
    if (allBeltGroups.length === 0) return 0;
    const targetBelt =
      selectedBelt ||
      (activeMobileArrival
        ? normalizeBeltCode(activeMobileArrival.belt)
        : allBeltGroups[0].belt);
    const idx = allBeltGroups.findIndex((g) => g.belt === targetBelt);
    return idx >= 0 ? idx : 0;
  }, [allBeltGroups, selectedBelt, activeMobileArrival]);

  const prevBeltGroup = useMemo(() => {
    if (allBeltGroups.length === 0) return null;
    const idx = getSwipedGroupIndex(
      activeSwipeBeltIndex,
      allBeltGroups.length,
      'prev'
    );
    return allBeltGroups[idx];
  }, [allBeltGroups, activeSwipeBeltIndex]);

  const nextBeltGroup = useMemo(() => {
    if (allBeltGroups.length === 0) return null;
    const idx = getSwipedGroupIndex(
      activeSwipeBeltIndex,
      allBeltGroups.length,
      'next'
    );
    return allBeltGroups[idx];
  }, [allBeltGroups, activeSwipeBeltIndex]);

  const handleSwapBelt = (direction: 'prev' | 'next') => {
    if (allBeltGroups.length === 0) return;
    const nextIdx = getSwipedGroupIndex(
      activeSwipeBeltIndex,
      allBeltGroups.length,
      direction
    );
    const targetGroup = allBeltGroups[nextIdx];
    if (!targetGroup) return;
    if (selectedBelt) {
      setSelectedBelt(targetGroup.belt);
    }
    if (targetGroup.flights.length > 0) {
      setMobileDetailArrivalId(targetGroup.flights[0].id);
    }
  };

  const handleSelectBeltInSwap = (beltCode: string) => {
    const group = allBeltGroups.find((g) => g.belt === beltCode);
    if (!group) return;
    if (selectedBelt) {
      setSelectedBelt(group.belt);
    }
    if (group.flights.length > 0) {
      setMobileDetailArrivalId(group.flights[0].id);
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
      handleSwapBelt(deltaX < 0 ? 'next' : 'prev');
    }
  };

  const scrollContainerBy = (
    ref: React.RefObject<HTMLDivElement | null>,
    deltaX: number
  ) => {
    if (ref.current) {
      ref.current.scrollBy({ left: deltaX, behavior: 'smooth' });
    }
  };

  const handleRowClick = (arr: ArrivalPerformanceRecord) => {
    if (!onSelectArrivalFlight) return;
    onSelectArrivalFlight({
      id: arr.id,
      flightId: arr.flightId || 900000 + arr.ordering,
      flight: arr.flight,
      airlineCode: arr.airlineCode,
      airlineName: arr.airlineName,
      airport: arr.airport,
      direction: 'arrival',
      destinationOrOrigin: arr.orig,
      btdOrBta: arr.bta,
      stand: arr.stand,
      chuteOrBelt: `Belt ${arr.belt}`,
      gate: arr.stand ? arr.stand.replace(/^[A-Z]/, 'G') : '—',
      date: nowDate.toISOString().slice(0, 10),
      onRoute: arr.onRoute,
      delivered: arr.delivered,
      loaded: arr.loaded,
      missing: arr.missing,
      bffOnRoute: Math.max(0, arr.bffBags - Math.floor(arr.bffBags * 0.7)),
      bffDelivered: Math.floor(arr.bffBags * 0.7),
      bffLoaded: arr.bffBags,
      bffMissing: 0,
      bffTotal: arr.bffBags,
      terminal1OnRoute: arr.onRoute,
      terminal1Delivered: arr.delivered,
      terminal1Loaded: arr.loaded,
      terminal1Missing: arr.missing,
      areeiroOnRoute: 0,
      areeiroDelivered: 0,
      areeiroLoaded: 0,
      areeiroMissing: 0,
      timeToFirstBag: arr.timeToFirstBag,
      firstBag: arr.firstBag,
      timeToLastBag: arr.timeToLastBag,
      lastBag: arr.lastBag,
      beltStatus: arr.beltStatus,
      beltTooltip: arr.beltTooltip,
    });
  };

  const handleBeltRowClick = (beltCode: string) => {
    setSelectedBelt((prev) => (prev === beltCode ? null : beltCode));
  };

  const handleBeltFlightClick = (
    arr: ArrivalPerformanceRecord,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setSelectedFlightId((prev) => (prev === arr.id ? null : arr.id));
    setMobileDetailArrivalId(arr.id);
  };

  const renderBeltsQueueCard = () => {
    const liveFirst =
      liveSelectedArrival && liveSelectedArrival.firstBag === '00:00:00'
        ? computeArrivalElapsedTime(liveSelectedArrival.bta, nowDate)
        : liveSelectedArrival?.timeToFirstBag || '00:00:00';
    const liveLast =
      liveSelectedArrival &&
      liveSelectedArrival.lastBag === '00:00:00' &&
      liveSelectedArrival.firstBag !== '00:00:00'
        ? computeArrivalElapsedTime(liveSelectedArrival.firstBag, nowDate)
        : liveSelectedArrival?.timeToLastBag || '00:00:00';

    return (
      <BeltsCard data-testid="arrivals-belts-card">
        <BeltsCardHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <BeltsCardTitle>
              Belts de Chegada (Tapetes · Voos na Sequência)
            </BeltsCardTitle>
            <BeltsCardHint>
              Toque na linha da Belt para filtrar só esta Belt · Toque num voo
              para ver status em tempo real
            </BeltsCardHint>
          </div>

          {selectedBelt && (
            <ResetBeltBtn
              type="button"
              onClick={() => setSelectedBelt(null)}
              data-testid="btn-reset-belt-filter"
            >
              <RotateCcw size={12} />
              <span>Mostrar Todas as Belts</span>
            </ResetBeltBtn>
          )}
        </BeltsCardHeader>

        <BeltsLinesList>
          {displayedBeltGroups.map((group) => {
            const isBeltSelected = selectedBelt === group.belt;
            return (
              <BeltLineRow
                key={`belt-line-${group.belt}`}
                $selected={isBeltSelected}
                onClick={() => handleBeltRowClick(group.belt)}
                data-testid={`belt-row-${group.belt}`}
              >
                <BeltLineLeft>
                  <BeltNumberLabel $selected={isBeltSelected}>
                    {group.belt} -
                  </BeltNumberLabel>
                  <BeltFlightsSequence>
                    {group.flights.map((arr) => {
                      const isFlightSelected = selectedFlightId === arr.id;
                      return (
                        <BeltFlightChip
                          key={`belt-flight-${arr.id}`}
                          type="button"
                          $active={isFlightSelected}
                          onClick={(e) => handleBeltFlightClick(arr, e)}
                          data-testid={`belt-flight-chip-${arr.flight}`}
                        >
                          <ArrowDown size={12} />
                          <span>{arr.flight}</span>
                        </BeltFlightChip>
                      );
                    })}
                  </BeltFlightsSequence>
                </BeltLineLeft>

                <BeltFilterBadge>
                  {isBeltSelected ? 'Exibindo só esta Belt' : 'Filtrar Belt'}
                </BeltFilterBadge>
              </BeltLineRow>
            );
          })}
        </BeltsLinesList>

        {liveSelectedArrival && (
          <LiveFlightStatusPanel data-testid="belt-flight-live-status">
            <LiveFlightHeader>
              <LiveFlightTitleGroup>
                <MonospaceValue>
                  ↓ {liveSelectedArrival.flight} · Origem:{' '}
                  {liveSelectedArrival.orig} · BTA: {liveSelectedArrival.bta}
                </MonospaceValue>
                <LivePulseBadge>
                  <Clock size={12} />
                  <span>STATUS EM TEMPO REAL · BELT {liveSelectedArrival.belt}</span>
                </LivePulseBadge>
              </LiveFlightTitleGroup>

              <CloseInlineBtn
                type="button"
                onClick={() => setSelectedFlightId(null)}
              >
                <X size={13} />
                <span>Fechar</span>
              </CloseInlineBtn>
            </LiveFlightHeader>

            <LiveFlightGrid>
              <LiveMetricCell>
                <LiveMetricLabel>Stand / Belt</LiveMetricLabel>
                <MonospaceValue>
                  {liveSelectedArrival.stand} · Belt {liveSelectedArrival.belt}
                </MonospaceValue>
              </LiveMetricCell>
              <LiveMetricCell>
                <LiveMetricLabel>Time to 1st Bag</LiveMetricLabel>
                <MonospaceValue
                  $tone={liveFirst === '> 1 hour' ? 'missing' : 'onRoute'}
                >
                  {liveFirst}
                </MonospaceValue>
              </LiveMetricCell>
              <LiveMetricCell>
                <LiveMetricLabel>1st Bag</LiveMetricLabel>
                <MonospaceValue
                  $tone={
                    liveSelectedArrival.firstBag !== '00:00:00'
                      ? 'delivered'
                      : 'default'
                  }
                >
                  {liveSelectedArrival.firstBag}
                </MonospaceValue>
              </LiveMetricCell>
              <LiveMetricCell>
                <LiveMetricLabel>Time to last Bag</LiveMetricLabel>
                <MonospaceValue
                  $tone={liveLast === '> 1 hour' ? 'missing' : 'loaded'}
                >
                  {liveLast}
                </MonospaceValue>
              </LiveMetricCell>
              <LiveMetricCell>
                <LiveMetricLabel>Last Bag</LiveMetricLabel>
                <MonospaceValue
                  $tone={
                    liveSelectedArrival.lastBag !== '00:00:00'
                      ? 'delivered'
                      : 'default'
                  }
                >
                  {liveSelectedArrival.lastBag}
                </MonospaceValue>
              </LiveMetricCell>
              <LiveMetricCell>
                <LiveMetricLabel>A Caminho (On Route)</LiveMetricLabel>
                <MonospaceValue $tone="onRoute">
                  {liveSelectedArrival.onRoute}
                </MonospaceValue>
              </LiveMetricCell>
              <LiveMetricCell>
                <LiveMetricLabel>Entregue (Delivered)</LiveMetricLabel>
                <MonospaceValue $tone="delivered">
                  {liveSelectedArrival.delivered}
                </MonospaceValue>
              </LiveMetricCell>
              <LiveMetricCell>
                <LiveMetricLabel>Carregado (Loaded)</LiveMetricLabel>
                <MonospaceValue $tone="loaded">
                  {liveSelectedArrival.loaded}
                </MonospaceValue>
              </LiveMetricCell>
              <LiveMetricCell>
                <LiveMetricLabel>Ausente (Missing)</LiveMetricLabel>
                <MonospaceValue $tone="missing">
                  {liveSelectedArrival.missing}
                </MonospaceValue>
              </LiveMetricCell>
              <LiveMetricCell>
                <LiveMetricLabel>Malas no BFF</LiveMetricLabel>
                <MonospaceValue $tone="bff">
                  {liveSelectedArrival.bffBags}
                </MonospaceValue>
              </LiveMetricCell>
            </LiveFlightGrid>

            <LiveActionRow>
              <OpenModalBtn
                type="button"
                onClick={() => handleRowClick(liveSelectedArrival)}
              >
                <ExternalLink size={13} />
                <span>Abrir Detalhamento e Cronologia de Bagagens</span>
              </OpenModalBtn>
            </LiveActionRow>
          </LiveFlightStatusPanel>
        )}
      </BeltsCard>
    );
  };

  // When mobile or tablet is rotated horizontally (landscape):
  // Display the Belts list at the top ("ao mudar para horizontal deve exibir isso no topo uma lista de belts com os voos na sequência")
  // followed by the Performance table (Flight | Time to1st Bag | 1st Bag | Time to last Bag | Last Bag | View)
  if (isLandscapeMobile) {
    return (
      <LandscapeWrapper data-testid="arrivals-landscape-only-table">
        {renderBeltsQueueCard()}

        <PerformanceSection>
          <TableContainer className="table-scroll-x">
            <Table
              $minWidth="520px"
              aria-label="Tabela Horizontal Performance de Chegadas"
            >
              <Thead>
                <tr>
                  <Th $sticky>Flight</Th>
                  <Th>Time to1st Bag</Th>
                  <Th>1st Bag</Th>
                  <Th>Time to last Bag</Th>
                  <Th>Last Bag</Th>
                  <Th $align="center">
                    <HeaderCheckboxWrap
                      type="button"
                      onClick={toggleAllView}
                      aria-label="Selecionar todos View"
                    >
                      <span>View</span>
                      {allChecked ? (
                        <CheckSquare size={15} />
                      ) : (
                        <Square size={15} />
                      )}
                    </HeaderCheckboxWrap>
                  </Th>
                </tr>
              </Thead>
              <tbody>
                {visibleArrivals.length === 0 ? (
                  <tr>
                    <Td colSpan={6} $align="center">
                      Nenhum voo de chegada ativo no momento.
                    </Td>
                  </tr>
                ) : (
                  visibleArrivals.map((arr) => {
                    const isChecked = selectedIds[arr.id] ?? true;
                    const liveTimeToFirst =
                      arr.firstBag === '00:00:00'
                        ? computeArrivalElapsedTime(arr.bta, nowDate)
                        : arr.timeToFirstBag;
                    const liveTimeToLast =
                      arr.lastBag === '00:00:00' && arr.firstBag !== '00:00:00'
                        ? computeArrivalElapsedTime(arr.firstBag, nowDate)
                        : arr.timeToLastBag;

                    return (
                      <Tr key={arr.id} onClick={() => handleRowClick(arr)}>
                        <Td $sticky>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <ArrowDown size={14} />
                            <MonospaceValue>{arr.flight}</MonospaceValue>
                          </span>
                        </Td>
                        <Td>
                          <MonospaceValue
                            $tone={
                              liveTimeToFirst === '> 1 hour'
                                ? 'missing'
                                : 'onRoute'
                            }
                          >
                            {liveTimeToFirst}
                          </MonospaceValue>
                        </Td>
                        <Td>
                          <MonospaceValue
                            $tone={
                              arr.firstBag !== '00:00:00'
                                ? 'delivered'
                                : 'default'
                            }
                          >
                            {arr.firstBag}
                          </MonospaceValue>
                        </Td>
                        <Td>
                          <MonospaceValue
                            $tone={
                              liveTimeToLast === '> 1 hour'
                                ? 'missing'
                                : 'loaded'
                            }
                          >
                            {liveTimeToLast}
                          </MonospaceValue>
                        </Td>
                        <Td>
                          <MonospaceValue
                            $tone={
                              arr.lastBag !== '00:00:00'
                                ? 'delivered'
                                : 'default'
                            }
                          >
                            {arr.lastBag}
                          </MonospaceValue>
                        </Td>
                        <Td $align="center">
                          <CheckboxBtn
                            type="button"
                            onClick={(e) => toggleRowView(arr.id, e)}
                            aria-label={`Alternar visualização do voo ${arr.flight}`}
                          >
                            {isChecked ? (
                              <CheckSquare size={18} />
                            ) : (
                              <Square size={18} />
                            )}
                          </CheckboxBtn>
                        </Td>
                      </Tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </TableContainer>
        </PerformanceSection>
      </LandscapeWrapper>
    );
  }

  return (
    <ArrivalsContainer data-testid="arrivals-vertical-session">
      <HeaderRow>
        <TitleBlock>
          <Title>Chegadas ↓</Title>
          <SubKicker>
            Detalhe de Performance em Tempo Real (First Bag / Last Bag)
          </SubKicker>
        </TitleBlock>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {selectedBelt && (
            <ViewToggleBtn
              type="button"
              $active={true}
              onClick={() => setSelectedBelt(null)}
            >
              <Filter size={14} />
              <span>Belt {selectedBelt} (Limpar)</span>
            </ViewToggleBtn>
          )}
          <ViewToggleBtn
            type="button"
            $active={onlyCheckedView}
            onClick={() => setOnlyCheckedView((prev) => !prev)}
          >
            {onlyCheckedView ? <CheckSquare size={15} /> : <Square size={15} />}
            <span>Filtrar Marcados (View)</span>
          </ViewToggleBtn>
        </div>
      </HeaderRow>

      {/* Card com as Belts (1 - vooX vooY vooZ) um belt em cada linha */}
      {renderBeltsQueueCard()}

      {/* Real-Time Performance Section (Time to1st Bag, 1st Bag, Time to last Bag, Last Bag, View) */}
      <PerformanceSection data-testid="arrivals-performance-card">
        <PerformanceBanner>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <PerformanceBannerTitle>
              Performance {selectedBelt ? `· Belt ${selectedBelt}` : ''}
            </PerformanceBannerTitle>
            <PerformanceLiveTag>
              <Clock size={12} />
              <span>Tempo Real</span>
            </PerformanceLiveTag>
          </div>
          <ScrollControls>
            <ScrollBtn
              type="button"
              onClick={() => scrollContainerBy(perfTableScrollRef, -160)}
              aria-label="Rolar tabela de performance para a esquerda"
            >
              <ChevronLeft size={14} />
              <span>Rolar</span>
            </ScrollBtn>
            <ScrollBtn
              type="button"
              onClick={() => scrollContainerBy(perfTableScrollRef, 160)}
              aria-label="Rolar tabela de performance para a direita"
            >
              <span>Rolar</span>
              <ChevronRight size={14} />
            </ScrollBtn>
          </ScrollControls>
        </PerformanceBanner>

        <TableContainer
          ref={perfTableScrollRef}
          className="table-scroll-x"
          data-testid="performance-scroll-table"
        >
          <Table $minWidth="440px" aria-label="Tabela Performance Tempo Real">
            <Thead>
              <tr>
                <Th $sticky>Flight</Th>
                <Th>Time to1st Bag</Th>
                <Th>1st Bag</Th>
                <Th>Time to last Bag</Th>
                <Th>Last Bag</Th>
                <Th $align="center">
                  <HeaderCheckboxWrap
                    type="button"
                    onClick={toggleAllView}
                    aria-label="Selecionar todos View"
                  >
                    <span>View</span>
                    {allChecked ? (
                      <CheckSquare size={15} />
                    ) : (
                      <Square size={15} />
                    )}
                  </HeaderCheckboxWrap>
                </Th>
              </tr>
            </Thead>
            <tbody>
              {visibleArrivals.length === 0 ? (
                <tr>
                  <Td colSpan={6} $align="center">
                    Nenhum voo de chegada ativo no momento para o filtro selecionado.
                  </Td>
                </tr>
              ) : (
                visibleArrivals.map((arr) => {
                  const isChecked = selectedIds[arr.id] ?? true;
                  const liveTimeToFirst =
                    arr.firstBag === '00:00:00'
                      ? computeArrivalElapsedTime(arr.bta, nowDate)
                      : arr.timeToFirstBag;
                  const liveTimeToLast =
                    arr.lastBag === '00:00:00' && arr.firstBag !== '00:00:00'
                      ? computeArrivalElapsedTime(arr.firstBag, nowDate)
                      : arr.timeToLastBag;

                  return (
                    <Tr
                      key={`perf-${arr.id}`}
                      onClick={() => handleRowClick(arr)}
                    >
                      <Td $sticky>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <ArrowDown size={14} />
                          <MonospaceValue>{arr.flight}</MonospaceValue>
                        </span>
                      </Td>
                      <Td>
                        <MonospaceValue
                          $tone={
                            liveTimeToFirst === '> 1 hour'
                              ? 'missing'
                              : 'onRoute'
                          }
                        >
                          {liveTimeToFirst}
                        </MonospaceValue>
                      </Td>
                      <Td>
                        <MonospaceValue
                          $tone={
                            arr.firstBag !== '00:00:00'
                              ? 'delivered'
                              : 'default'
                          }
                        >
                          {arr.firstBag}
                        </MonospaceValue>
                      </Td>
                      <Td>
                        <MonospaceValue
                          $tone={
                            liveTimeToLast === '> 1 hour' ? 'missing' : 'loaded'
                          }
                        >
                          {liveTimeToLast}
                        </MonospaceValue>
                      </Td>
                      <Td>
                        <MonospaceValue
                          $tone={
                            arr.lastBag !== '00:00:00' ? 'delivered' : 'default'
                          }
                        >
                          {arr.lastBag}
                        </MonospaceValue>
                      </Td>
                      <Td $align="center">
                        <CheckboxBtn
                          type="button"
                          onClick={(e) => toggleRowView(arr.id, e)}
                          aria-label={`Alternar visualização do voo ${arr.flight}`}
                        >
                          {isChecked ? (
                            <CheckSquare size={18} />
                          ) : (
                            <Square size={18} />
                          )}
                        </CheckboxBtn>
                      </Td>
                    </Tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </TableContainer>
      </PerformanceSection>

      {/* Arrivals Flights & Belts/Chutes Section */}
      <SectionToolbar>
        <SectionLabel>
          Lista de Voos de Chegadas & Chutes / Belts{' '}
          {selectedBelt ? `(Belt ${selectedBelt})` : ''}
        </SectionLabel>
        <DesktopOnlyScrollControls>
          <ScrollBtn
            type="button"
            onClick={() => scrollContainerBy(flightsTableScrollRef, -180)}
            aria-label="Rolar tabela de chegadas para a esquerda"
            data-testid="btn-scroll-arrivals-left"
          >
            <ChevronLeft size={14} />
            <span>Rolar</span>
          </ScrollBtn>
          <ScrollBtn
            type="button"
            onClick={() => scrollContainerBy(flightsTableScrollRef, 180)}
            aria-label="Rolar tabela de chegadas para a direita"
            data-testid="btn-scroll-arrivals-right"
          >
            <span>Rolar</span>
            <ChevronRight size={14} />
          </ScrollBtn>
        </DesktopOnlyScrollControls>
      </SectionToolbar>

      {/* Mobile Version (< 768px): 3-Column Flight List (Nome Voo, Belt/Chute, Hora) + Swipeable Belt Details in Column */}
      <MobileSectionWrapper data-testid="arrivals-mobile-list-and-swap">
        <MobileFlightListBox data-testid="arrivals-mobile-flight-list">
          <MobileFlightListHeader>
            <span>Voo (Nome)</span>
            <span>Belt / Chute</span>
            <span style={{ textAlign: 'right' }}>Hora (BTA)</span>
          </MobileFlightListHeader>
          <MobileFlightListScroll>
            {mobileOrderedArrivals.map((arr) => {
              const isSelected = activeMobileArrival?.id === arr.id;
              return (
                <MobileFlightListItem
                  key={`mobile-arr-row-${arr.id}`}
                  type="button"
                  $active={isSelected}
                  onClick={() => setMobileDetailArrivalId(arr.id)}
                  data-testid={`mobile-arr-list-item-${arr.flight}`}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <ArrowDown size={13} />
                    <MonospaceValue
                      $tone={isSelected ? 'delivered' : 'default'}
                    >
                      {arr.flight}
                    </MonospaceValue>
                  </span>
                  <MonospaceValue>
                    Belt {normalizeBeltCode(arr.belt)}
                  </MonospaceValue>
                  <span style={{ textAlign: 'right' }}>
                    <MonospaceValue>{arr.bta}</MonospaceValue>
                  </span>
                </MobileFlightListItem>
              );
            })}
          </MobileFlightListScroll>
        </MobileFlightListBox>

        {activeMobileArrival &&
          (() => {
            const activeBeltCode = normalizeBeltCode(activeMobileArrival.belt);
            const isChecked = selectedIds[activeMobileArrival.id] ?? true;
            const liveTimeToFirst =
              activeMobileArrival.firstBag === '00:00:00'
                ? computeArrivalElapsedTime(activeMobileArrival.bta, nowDate)
                : activeMobileArrival.timeToFirstBag;
            const liveTimeToLast =
              activeMobileArrival.lastBag === '00:00:00' &&
              activeMobileArrival.firstBag !== '00:00:00'
                ? computeArrivalElapsedTime(
                    activeMobileArrival.firstBag,
                    nowDate
                  )
                : activeMobileArrival.timeToLastBag;

            return (
              <MobileSwapCard
                data-testid="arrivals-mobile-belt-swap-card"
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
                    onClick={() => handleSwapBelt('prev')}
                    data-testid="btn-swap-prev-belt"
                    aria-label="Belt anterior"
                  >
                    <ChevronLeft size={15} />
                    <span>
                      Belt {prevBeltGroup ? prevBeltGroup.belt : '—'}
                    </span>
                  </SwapNavBtn>

                  <SwapCenterIndicator>
                    <SwapBeltTitle data-testid="swap-active-belt-title">
                      BELT {activeBeltCode} ({activeSwipeBeltIndex + 1}/
                      {allBeltGroups.length})
                    </SwapBeltTitle>
                    <SwapHintText>
                      Deslize ↔ esq./dir. para navegar entre Belts
                    </SwapHintText>
                  </SwapCenterIndicator>

                  <SwapNavBtn
                    type="button"
                    onClick={() => handleSwapBelt('next')}
                    data-testid="btn-swap-next-belt"
                    aria-label="Próxima belt"
                  >
                    <span>
                      Belt {nextBeltGroup ? nextBeltGroup.belt : '—'}
                    </span>
                    <ChevronRight size={15} />
                  </SwapNavBtn>
                </MobileSwapHeader>

                <SwapBeltsPillBar>
                  {allBeltGroups.map((grp) => (
                    <SwapBeltPill
                      key={`swap-pill-belt-${grp.belt}`}
                      type="button"
                      $active={grp.belt === activeBeltCode}
                      onClick={() => handleSelectBeltInSwap(grp.belt)}
                      data-testid={`swap-pill-belt-${grp.belt}`}
                    >
                      Belt {grp.belt} ({grp.flights.length})
                    </SwapBeltPill>
                  ))}
                </SwapBeltsPillBar>

                <MobileColumnDetailsList data-testid="arrivals-mobile-detail-column">
                  <MobileColumnFieldRow>
                    <MobileFieldLabel>Voo (Flight) / Origem (Ori)</MobileFieldLabel>
                    <MonospaceValue>
                      ↓ {activeMobileArrival.flight} · Origem{' '}
                      {activeMobileArrival.orig}
                    </MonospaceValue>
                  </MobileColumnFieldRow>

                  <MobileColumnFieldRow>
                    <MobileFieldLabel>Belt / Chute (Tapete)</MobileFieldLabel>
                    <MonospaceValue $tone="delivered">
                      Belt {activeBeltCode}
                    </MonospaceValue>
                  </MobileColumnFieldRow>

                  <MobileColumnFieldRow>
                    <MobileFieldLabel>Hora Chegada (BTA)</MobileFieldLabel>
                    <MonospaceValue>{activeMobileArrival.bta}</MonospaceValue>
                  </MobileColumnFieldRow>

                  <MobileColumnFieldRow>
                    <MobileFieldLabel>Stand</MobileFieldLabel>
                    <MonospaceValue>{activeMobileArrival.stand}</MonospaceValue>
                  </MobileColumnFieldRow>

                  <MobileColumnFieldRow>
                    <MobileFieldLabel>Time to 1st Bag</MobileFieldLabel>
                    <MonospaceValue
                      $tone={
                        liveTimeToFirst === '> 1 hour' ? 'missing' : 'onRoute'
                      }
                    >
                      <Clock
                        size={12}
                        style={{ display: 'inline', marginRight: 4 }}
                      />
                      {liveTimeToFirst}
                    </MonospaceValue>
                  </MobileColumnFieldRow>

                  <MobileColumnFieldRow>
                    <MobileFieldLabel>1st Bag (Primeira Mala)</MobileFieldLabel>
                    <MonospaceValue
                      $tone={
                        activeMobileArrival.firstBag !== '00:00:00'
                          ? 'delivered'
                          : 'default'
                      }
                    >
                      {activeMobileArrival.firstBag}
                    </MonospaceValue>
                  </MobileColumnFieldRow>

                  <MobileColumnFieldRow>
                    <MobileFieldLabel>Time to last Bag</MobileFieldLabel>
                    <MonospaceValue
                      $tone={
                        liveTimeToLast === '> 1 hour' ? 'missing' : 'loaded'
                      }
                    >
                      {liveTimeToLast}
                    </MonospaceValue>
                  </MobileColumnFieldRow>

                  <MobileColumnFieldRow>
                    <MobileFieldLabel>Last Bag (Última Mala)</MobileFieldLabel>
                    <MonospaceValue
                      $tone={
                        activeMobileArrival.lastBag !== '00:00:00'
                          ? 'delivered'
                          : 'default'
                      }
                    >
                      {activeMobileArrival.lastBag}
                    </MonospaceValue>
                  </MobileColumnFieldRow>

                  <MobileColumnFieldRow>
                    <MobileFieldLabel>
                      Status Malas (A Caminho / Entregue / BFF)
                    </MobileFieldLabel>
                    <MonospaceValue>
                      OR: {activeMobileArrival.onRoute} · DEL:{' '}
                      {activeMobileArrival.delivered} · BFF:{' '}
                      {activeMobileArrival.bffBags}
                    </MonospaceValue>
                  </MobileColumnFieldRow>

                  <MobileColumnFieldRow>
                    <MobileFieldLabel>View (Exibir na Performance)</MobileFieldLabel>
                    <CheckboxBtn
                      type="button"
                      onClick={(e) => toggleRowView(activeMobileArrival.id, e)}
                      aria-label={`Alternar visualização do voo ${activeMobileArrival.flight}`}
                    >
                      {isChecked ? (
                        <CheckSquare size={18} />
                      ) : (
                        <Square size={18} />
                      )}
                    </CheckboxBtn>
                  </MobileColumnFieldRow>

                  <OpenModalBtn
                    type="button"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      minHeight: 44,
                    }}
                    onClick={() => handleRowClick(activeMobileArrival)}
                  >
                    <ExternalLink size={14} />
                    <span>Abrir Detalhamento Completo e Cronologia</span>
                  </OpenModalBtn>
                </MobileColumnDetailsList>
              </MobileSwapCard>
            );
          })()}
      </MobileSectionWrapper>

      <DesktopOnlyTableContainer
        ref={flightsTableScrollRef}
        className="table-scroll-x"
        data-testid="arrivals-flights-scroll-table"
      >
        <Table $minWidth="760px" aria-label="Tabela de Performance de Chegadas">
          <Thead>
            <tr>
              <Th $sticky>Flight</Th>
              <Th>Ori</Th>
              <Th>BTA</Th>
              <Th>Stand</Th>
              <Th>Belt</Th>
              <Th>Time to1st Bag</Th>
              <Th>1st Bag</Th>
              <Th>Time to last Bag</Th>
              <Th>Last Bag</Th>
              <Th $align="center">View</Th>
            </tr>
          </Thead>
          <tbody>
            {visibleArrivals.length === 0 ? (
              <tr>
                <Td colSpan={10} $align="center">
                  Nenhum voo de chegada ativo no momento para o filtro selecionado.
                </Td>
              </tr>
            ) : (
              visibleArrivals.map((arr) => {
                const isChecked = selectedIds[arr.id] ?? true;
                const liveTimeToFirst =
                  arr.firstBag === '00:00:00'
                    ? computeArrivalElapsedTime(arr.bta, nowDate)
                    : arr.timeToFirstBag;
                const liveTimeToLast =
                  arr.lastBag === '00:00:00' && arr.firstBag !== '00:00:00'
                    ? computeArrivalElapsedTime(arr.firstBag, nowDate)
                    : arr.timeToLastBag;

                return (
                  <Tr key={arr.id} onClick={() => handleRowClick(arr)}>
                    <Td $sticky>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <ArrowDown size={14} />
                        <MonospaceValue>{arr.flight}</MonospaceValue>
                      </span>
                    </Td>
                    <Td>
                      <MonospaceValue>{arr.orig}</MonospaceValue>
                    </Td>
                    <Td>
                      <MonospaceValue>{arr.bta}</MonospaceValue>
                    </Td>
                    <Td>
                      <MonospaceValue>{arr.stand}</MonospaceValue>
                    </Td>
                    <Td>
                      <MonospaceValue>{arr.belt}</MonospaceValue>
                    </Td>
                    <Td>
                      <MonospaceValue
                        $tone={
                          liveTimeToFirst === '> 1 hour' ? 'missing' : 'onRoute'
                        }
                      >
                        <Clock
                          size={13}
                          style={{ display: 'inline', marginRight: 4 }}
                        />
                        {liveTimeToFirst}
                      </MonospaceValue>
                    </Td>
                    <Td>
                      <MonospaceValue
                        $tone={
                          arr.firstBag !== '00:00:00' ? 'delivered' : 'default'
                        }
                      >
                        {arr.firstBag}
                      </MonospaceValue>
                    </Td>
                    <Td>
                      <MonospaceValue
                        $tone={
                          liveTimeToLast === '> 1 hour' ? 'missing' : 'loaded'
                        }
                      >
                        {liveTimeToLast}
                      </MonospaceValue>
                    </Td>
                    <Td>
                      <MonospaceValue
                        $tone={
                          arr.lastBag !== '00:00:00' ? 'delivered' : 'default'
                        }
                      >
                        {arr.lastBag}
                      </MonospaceValue>
                    </Td>
                    <Td $align="center">
                      <CheckboxBtn
                        type="button"
                        onClick={(e) => toggleRowView(arr.id, e)}
                        aria-label={`Alternar visualização do voo ${arr.flight}`}
                      >
                        {isChecked ? (
                          <CheckSquare size={18} />
                        ) : (
                          <Square size={18} />
                        )}
                      </CheckboxBtn>
                    </Td>
                  </Tr>
                );
              })
            )}
          </tbody>
        </Table>
      </DesktopOnlyTableContainer>
    </ArrivalsContainer>
  );
};
