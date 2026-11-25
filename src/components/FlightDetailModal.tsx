import React, { useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  MoveHorizontal,
  Search,
  X,
} from 'lucide-react';
import {
  BagCategory,
  BagItem,
  FlightDetailResponse,
  FlightRecord,
} from '../types/bagstogo';
import { computeDepartureContainerBreakdown } from '../utils/bagstogoLogic';
import {
  MonospaceValue,
  SegmentedButton,
  SegmentedControlBar,
  StyledInput,
} from './ui/Primitives';

interface FlightDetailModalProps {
  flight: FlightRecord | null;
  detail: FlightDetailResponse | null;
  isLoading: boolean;
  onClose: () => void;
  onSelectBagLpn: (lpn: string) => void;
}

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  background-color: ${(props) => props.theme.colors.overlayBackdrop};

  @media (min-width: 768px) {
    padding: ${(props) => props.theme.spacing.sm};
  }
`;

const ModalContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 1180px;
  max-height: 95vh;
  background-color: ${(props) => props.theme.colors.surface};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: ${(props) => props.theme.radii.lg};
  overflow: hidden;
  min-width: 0;
`;

/* Compact Header Bar ("o header deste card deve ser menor ele ocupa muito a tela") */
const HeaderBar = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 12px;
  background-color: ${(props) => props.theme.colors.background};
  border-bottom: 1px solid ${(props) => props.theme.colors.border};
  flex-shrink: 0;
`;

const HeaderLeft = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 12px;
  min-width: 0;
  flex: 1;
`;

const HeaderTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: ${(props) => props.theme.colors.text};
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
`;

const HeaderMeta = styled.span`
  font-size: 11px;
  color: ${(props) => props.theme.colors.textSecondary};
  line-height: 1.3;
`;

const CompactCloseBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 28px;
  padding: 3px 10px;
  background-color: ${(props) => props.theme.colors.surface};
  color: ${(props) => props.theme.colors.text};
  border: 1px solid ${(props) => props.theme.colors.border};
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background-color: ${(props) => props.theme.colors.surfaceHover};
  }
`;

const BodyScroll = styled.div`
  display: flex;
  flex-direction: column;
  padding: 10px 12px;
  gap: 10px;
  overflow-y: auto;
  overflow-x: hidden;
  min-width: 0;
  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
  }

  @media (min-width: 768px) {
    padding: ${(props) => props.theme.spacing.sm};
    gap: ${(props) => props.theme.spacing.sm};
  }
`;

const ZoneBreakdownGrid = styled.div<{ $cols?: number }>`
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(${(props) => props.$cols || 3}, 1fr);
  }
`;

const ZoneCard = styled.div`
  display: flex;
  flex-direction: column;
  padding: 8px 10px;
  background-color: ${(props) => props.theme.colors.background};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: ${(props) => props.theme.radii.md};
  gap: 6px;
`;

const ZoneTitle = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${(props) => props.theme.colors.textSecondary};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ZoneMetricsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  font-size: 11px;
`;

/* 3-Line Container Nomenclature Card inside Flight Detail Modal */
const NomenclatureCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 8px 10px;
  background-color: ${(props) => props.theme.colors.background};
  border: 1px solid ${(props) => props.theme.colors.border};
  gap: 6px;
  width: 100%;
`;

const NomenclatureCardLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${(props) => props.theme.colors.textSecondary};
`;

const NomenclatureBadgesRow = styled.div`
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
  font-size: 11px;
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

const TelemetryStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(5, 1fr);
  }
`;

const TelemetryItem = styled.div`
  display: flex;
  flex-direction: column;
  padding: 6px 10px;
  background-color: ${(props) => props.theme.colors.background};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: ${(props) => props.theme.radii.md};
  font-size: 11px;
`;

const TableToolbarRow = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const DragHintBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: ${(props) => props.theme.colors.primary};
`;

const ScrollBtnGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

const ScrollBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 28px;
  padding: 3px 8px;
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

const TableWrapper = styled.div<{ $isDragging?: boolean }>`
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x pan-y;
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: ${(props) => props.theme.radii.md};
  background-color: ${(props) => props.theme.colors.background};
  cursor: ${(props) => (props.$isDragging ? 'grabbing' : 'grab')};
  user-select: ${(props) => (props.$isDragging ? 'none' : 'auto')};
`;

const Table = styled.table`
  width: 100%;
  min-width: 820px;
  border-collapse: collapse;
  font-size: 12px;
`;

const Th = styled.th<{ $sticky?: boolean }>`
  padding: 8px 10px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  color: ${(props) => props.theme.colors.tableHeaderText};
  background-color: ${(props) => props.theme.colors.tableHeaderBg};
  border-bottom: 1px solid ${(props) => props.theme.colors.border};
  white-space: nowrap;
  ${(props) =>
    props.$sticky
      ? `
    position: sticky;
    left: 0;
    z-index: 2;
    box-shadow: 1px 0 0 ${props.theme.colors.border};
  `
      : ''}
`;

const Tr = styled.tr`
  border-bottom: 1px solid ${(props) => props.theme.colors.borderSubtle};
  cursor: pointer;

  &:hover {
    background-color: ${(props) => props.theme.colors.surfaceHover};
  }
`;

const Td = styled.td<{ $sticky?: boolean }>`
  padding: 6px 10px;
  white-space: nowrap;
  height: 40px;
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

export const FlightDetailModal: React.FC<FlightDetailModalProps> = ({
  flight,
  detail,
  isLoading,
  onClose,
  onSelectBagLpn,
}) => {
  const [bagFilter, setBagFilter] = useState<'ALL' | BagCategory | 'BFF'>('ALL');
  const [bagSearch, setBagSearch] = useState('');

  // Horizontal drag-to-scroll state for the LPN table
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{
    isDown: boolean;
    startX: number;
    scrollLeft: number;
    movedDistance: number;
  }>({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    movedDistance: 0,
  });

  const activeFlight = detail?.flightRecord || flight;
  const bags = detail?.bags || [];

  const departureContainerInfo = useMemo(() => {
    if (!activeFlight || activeFlight.direction !== 'departure') return null;
    return computeDepartureContainerBreakdown(activeFlight);
  }, [activeFlight]);

  const filteredBags = useMemo(() => {
    const q = bagSearch.trim().toLowerCase();
    return bags.filter((b: BagItem) => {
      if (bagFilter === 'BFF' && !b.isBff) return false;
      if (
        bagFilter !== 'ALL' &&
        bagFilter !== 'BFF' &&
        b.category !== bagFilter
      ) {
        return false;
      }
      if (q) {
        const matchLpn = b.lpn.toLowerCase().includes(q);
        const matchLastSeen = b.lastSeen.toLowerCase().includes(q);
        const matchUld = (b.loadedAt || '').toLowerCase().includes(q);
        if (!matchLpn && !matchLastSeen && !matchUld) return false;
      }
      return true;
    });
  }, [bags, bagFilter, bagSearch]);

  if (!activeFlight) return null;

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tableScrollRef.current) return;
    dragStateRef.current = {
      isDown: true,
      startX: e.pageX - tableScrollRef.current.offsetLeft,
      scrollLeft: tableScrollRef.current.scrollLeft,
      movedDistance: 0,
    };
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.isDown || !tableScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - tableScrollRef.current.offsetLeft;
    const walk = x - dragStateRef.current.startX;
    dragStateRef.current.movedDistance = Math.abs(walk);
    tableScrollRef.current.scrollLeft = dragStateRef.current.scrollLeft - walk;
  };

  const handleMouseUpOrLeave = () => {
    dragStateRef.current.isDown = false;
    setIsDragging(false);
  };

  const handleRowClick = (lpn: string) => {
    // Only open LPN chronology if user clicked rather than dragged horizontally
    if (dragStateRef.current.movedDistance > 8) {
      dragStateRef.current.movedDistance = 0;
      return;
    }
    onSelectBagLpn(lpn);
  };

  const scrollTableBy = (deltaX: number) => {
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollBy({ left: deltaX, behavior: 'smooth' });
    }
  };

  return (
    <Backdrop
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhamento do Voo ${activeFlight.flight}`}
    >
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <HeaderBar data-testid="flight-detail-compact-header">
          <HeaderLeft>
            <HeaderTitle>
              {activeFlight.direction === 'departure' ? (
                <ArrowUp size={15} />
              ) : (
                <ArrowDown size={15} />
              )}
              <span>
                Voo <MonospaceValue>{activeFlight.flight}</MonospaceValue> ·{' '}
                {activeFlight.direction === 'departure' ? 'Destino' : 'Origem'}{' '}
                <MonospaceValue>
                  {activeFlight.destinationOrOrigin}
                </MonospaceValue>
              </span>
            </HeaderTitle>
            <HeaderMeta>
              {activeFlight.airlineName} · BTD/BTA:{' '}
              <strong>{activeFlight.btdOrBta}</strong> · Stand:{' '}
              <strong>{activeFlight.stand || '—'}</strong> · Chute/Tapete:{' '}
              <strong>{activeFlight.chuteOrBelt || '—'}</strong> · Portão:{' '}
              <strong>{activeFlight.gate || '—'}</strong>
            </HeaderMeta>
          </HeaderLeft>

          <CompactCloseBtn
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes do voo"
            data-testid="btn-close-flight-modal"
          >
            <X size={14} />
            <span>Fechar</span>
          </CompactCloseBtn>
        </HeaderBar>

        <BodyScroll>
          {/* 1. Breakdown by Zone: TOTAL, TERMINAL 1, (AREEIRO only if > 0), BFF */}
          {(() => {
            const areeiroSum =
              activeFlight.areeiroOnRoute +
              activeFlight.areeiroDelivered +
              activeFlight.areeiroLoaded +
              activeFlight.areeiroMissing;
            const showAreeiro = areeiroSum > 0;
            return (
              <ZoneBreakdownGrid $cols={showAreeiro ? 4 : 3}>
                <ZoneCard>
                  <ZoneTitle>
                    <span>TOTAL DO VOO</span>
                    <MonospaceValue>
                      {activeFlight.onRoute + activeFlight.delivered} malas
                    </MonospaceValue>
                  </ZoneTitle>
                  <ZoneMetricsRow>
                    <div>
                      <div>On Route</div>
                      <MonospaceValue $tone="onRoute">
                        {activeFlight.onRoute}
                      </MonospaceValue>
                    </div>
                    <div>
                      <div>Delivered</div>
                      <MonospaceValue $tone="delivered">
                        {activeFlight.delivered}
                      </MonospaceValue>
                    </div>
                    <div>
                      <div>Loaded</div>
                      <MonospaceValue $tone="loaded">
                        {activeFlight.loaded}
                      </MonospaceValue>
                    </div>
                    <div>
                      <div>Missing</div>
                      <MonospaceValue $tone="missing">
                        {activeFlight.missing}
                      </MonospaceValue>
                    </div>
                  </ZoneMetricsRow>
                </ZoneCard>

                <ZoneCard>
                  <ZoneTitle>
                    <span>TERMINAL 1</span>
                    <MonospaceValue>
                      {activeFlight.terminal1OnRoute +
                        activeFlight.terminal1Delivered}
                    </MonospaceValue>
                  </ZoneTitle>
                  <ZoneMetricsRow>
                    <div>
                      <div>On Route</div>
                      <MonospaceValue $tone="onRoute">
                        {activeFlight.terminal1OnRoute}
                      </MonospaceValue>
                    </div>
                    <div>
                      <div>Delivered</div>
                      <MonospaceValue $tone="delivered">
                        {activeFlight.terminal1Delivered}
                      </MonospaceValue>
                    </div>
                    <div>
                      <div>Loaded</div>
                      <MonospaceValue $tone="loaded">
                        {activeFlight.terminal1Loaded}
                      </MonospaceValue>
                    </div>
                    <div>
                      <div>Missing</div>
                      <MonospaceValue $tone="missing">
                        {activeFlight.terminal1Missing}
                      </MonospaceValue>
                    </div>
                  </ZoneMetricsRow>
                </ZoneCard>

                {showAreeiro && (
                  <ZoneCard>
                    <ZoneTitle>
                      <span>AREEIRO</span>
                      <MonospaceValue>
                        {activeFlight.areeiroOnRoute +
                          activeFlight.areeiroDelivered}
                      </MonospaceValue>
                    </ZoneTitle>
                    <ZoneMetricsRow>
                      <div>
                        <div>On Route</div>
                        <MonospaceValue $tone="onRoute">
                          {activeFlight.areeiroOnRoute}
                        </MonospaceValue>
                      </div>
                      <div>
                        <div>Delivered</div>
                        <MonospaceValue $tone="delivered">
                          {activeFlight.areeiroDelivered}
                        </MonospaceValue>
                      </div>
                      <div>
                        <div>Loaded</div>
                        <MonospaceValue $tone="loaded">
                          {activeFlight.areeiroLoaded}
                        </MonospaceValue>
                      </div>
                      <div>
                        <div>Missing</div>
                        <MonospaceValue $tone="missing">
                          {activeFlight.areeiroMissing}
                        </MonospaceValue>
                      </div>
                    </ZoneMetricsRow>
                  </ZoneCard>
                )}

                <ZoneCard>
                  <ZoneTitle>
                    <span>
                      <Layers
                        size={12}
                        style={{ display: 'inline', marginRight: 4 }}
                      />
                      MALAS NO BFF
                    </span>
                    <MonospaceValue $tone="bff">
                      {activeFlight.bffTotal} malas
                    </MonospaceValue>
                  </ZoneTitle>
                  <ZoneMetricsRow>
                    <div>
                      <div>On Route</div>
                      <MonospaceValue $tone="onRoute">
                        {activeFlight.bffOnRoute}
                      </MonospaceValue>
                    </div>
                    <div>
                      <div>Delivered</div>
                      <MonospaceValue $tone="delivered">
                        {activeFlight.bffDelivered}
                      </MonospaceValue>
                    </div>
                    <div>
                      <div>Loaded</div>
                      <MonospaceValue $tone="loaded">
                        {activeFlight.bffLoaded}
                      </MonospaceValue>
                    </div>
                    <div>
                      <div>Missing</div>
                      <MonospaceValue $tone="missing">
                        {activeFlight.bffMissing}
                      </MonospaceValue>
                    </div>
                  </ZoneMetricsRow>
                </ZoneCard>
              </ZoneBreakdownGrid>
            );
          })()}

          {/* 1b. Departure Container Type, Quantity & 3rd-Line Colored Tags (Carregadas / Previstas) */}
          {departureContainerInfo && (
            <NomenclatureCard data-testid="modal-nomenclature-card">
              <NomenclatureCardLabel>
                Nomenclaturas dos Contentores (BY: Local · BT: Inbound · PRIO:
                Prioritário · BULK) — Malas Carregadas / Previstas
              </NomenclatureCardLabel>
              <MonospaceValue>
                {departureContainerInfo.containerHeaderSummary}
              </MonospaceValue>
              <NomenclatureBadgesRow>
                {departureContainerInfo.containerTags.map((tag) => (
                  <NomenclatureTag key={tag.id} $tone={tag.tone}>
                    {tag.displayText}
                  </NomenclatureTag>
                ))}
              </NomenclatureBadgesRow>
            </NomenclatureCard>
          )}

          {/* 2. Arrivals Performance Metrics OR Departures BSM / Summary Indicators */}
          {activeFlight.direction === 'arrival' ? (
            <TelemetryStrip>
              <TelemetryItem>
                <span style={{ opacity: 0.75 }}>Tapete / Belt</span>
                <MonospaceValue>{activeFlight.chuteOrBelt}</MonospaceValue>
              </TelemetryItem>
              <TelemetryItem>
                <span style={{ opacity: 0.75 }}>Time to 1st Bag</span>
                <MonospaceValue $tone="onRoute">
                  <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />
                  {activeFlight.timeToFirstBag || '00:00:00'}
                </MonospaceValue>
              </TelemetryItem>
              <TelemetryItem>
                <span style={{ opacity: 0.75 }}>1st Bag</span>
                <MonospaceValue $tone="delivered">
                  {activeFlight.firstBag || '00:00:00'}
                </MonospaceValue>
              </TelemetryItem>
              <TelemetryItem>
                <span style={{ opacity: 0.75 }}>Time to last Bag</span>
                <MonospaceValue $tone="loaded">
                  {activeFlight.timeToLastBag || '00:00:00'}
                </MonospaceValue>
              </TelemetryItem>
              <TelemetryItem>
                <span style={{ opacity: 0.75 }}>Last Bag</span>
                <MonospaceValue $tone="delivered">
                  {activeFlight.lastBag || '00:00:00'}
                </MonospaceValue>
              </TelemetryItem>
            </TelemetryStrip>
          ) : detail &&
            (detail.messages.length > 0 || detail.summary.length > 0) ? (
            <TelemetryStrip>
              {detail.messages.slice(0, 2).map((m) => (
                <TelemetryItem key={m.label}>
                  <span style={{ opacity: 0.75 }}>Mensagens {m.label}</span>
                  <MonospaceValue>
                    {m.processed} proc / {m.received} rec
                  </MonospaceValue>
                </TelemetryItem>
              ))}
              {detail.summary.slice(0, 3).map((s) => (
                <TelemetryItem key={s.label}>
                  <span style={{ opacity: 0.75 }}>{s.label}</span>
                  <MonospaceValue>
                    {s.value} ({s.percent}%)
                  </MonospaceValue>
                </TelemetryItem>
              ))}
            </TelemetryStrip>
          ) : null}

          {/* 3. Bag List & Interactive Chronology Trigger with Drag-to-Scroll */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <div>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
                  Bagagens do Voo & Cronologia Individual ({filteredBags.length}{' '}
                  {filteredBags.length === 1 ? 'bagagem' : 'bagagens'})
                </h4>
              </div>

              <SegmentedControlBar>
                <SegmentedButton
                  type="button"
                  $active={bagFilter === 'ALL'}
                  onClick={() => setBagFilter('ALL')}
                >
                  Todas ({bags.length})
                </SegmentedButton>
                <SegmentedButton
                  type="button"
                  $active={bagFilter === 'OnRoute'}
                  onClick={() => setBagFilter('OnRoute')}
                >
                  On Route
                </SegmentedButton>
                <SegmentedButton
                  type="button"
                  $active={bagFilter === 'Delivered'}
                  onClick={() => setBagFilter('Delivered')}
                >
                  Delivered
                </SegmentedButton>
                <SegmentedButton
                  type="button"
                  $active={bagFilter === 'Loaded'}
                  onClick={() => setBagFilter('Loaded')}
                >
                  Loaded
                </SegmentedButton>
                <SegmentedButton
                  type="button"
                  $active={bagFilter === 'Missing'}
                  onClick={() => setBagFilter('Missing')}
                >
                  Missing
                </SegmentedButton>
              </SegmentedControlBar>
            </div>

            <TableToolbarRow>
              <div
                style={{
                  position: 'relative',
                  flex: '1 1 240px',
                  maxWidth: 420,
                }}
              >
                <StyledInput
                  type="text"
                  placeholder="Filtrar por código LPN, Scanner ou Contentor ULD..."
                  value={bagSearch}
                  onChange={(e) => setBagSearch(e.target.value)}
                />
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: 15,
                    opacity: 0.6,
                    pointerEvents: 'none',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <DragHintBadge>
                  <MoveHorizontal size={13} />
                  <span>Arraste para o lado ↔</span>
                </DragHintBadge>
                <ScrollBtnGroup>
                  <ScrollBtn
                    type="button"
                    onClick={() => scrollTableBy(-220)}
                    aria-label="Rolar tabela LPN para a esquerda"
                    data-testid="btn-scroll-lpn-left"
                  >
                    <ChevronLeft size={14} />
                    <span>Rolar</span>
                  </ScrollBtn>
                  <ScrollBtn
                    type="button"
                    onClick={() => scrollTableBy(220)}
                    aria-label="Rolar tabela LPN para a direita"
                    data-testid="btn-scroll-lpn-right"
                  >
                    <span>Rolar</span>
                    <ChevronRight size={14} />
                  </ScrollBtn>
                </ScrollBtnGroup>
              </div>
            </TableToolbarRow>

            {isLoading ? (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 13 }}>
                A sincronizar lista de bagagens em tempo real com a API
                BagsToGo...
              </div>
            ) : filteredBags.length === 0 ? (
              <div
                style={{
                  padding: 20,
                  textAlign: 'center',
                  opacity: 0.75,
                  fontSize: 13,
                }}
              >
                Nenhuma bagagem encontrada neste filtro para o voo{' '}
                {activeFlight.flight}.
              </div>
            ) : (
              <TableWrapper
                ref={tableScrollRef}
                className="table-scroll-x"
                $isDragging={isDragging}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                data-testid="flight-lpn-scroll-table"
              >
                <Table aria-label="Lista de bagagens do voo">
                  <thead>
                    <tr>
                      <Th $sticky>Código LPN</Th>
                      <Th>Status Esteira</Th>
                      <Th>Última Leitura (Last Seen)</Th>
                      <Th>Chute</Th>
                      <Th>Previsto / Entrega</Th>
                      <Th>Contentor ULD</Th>
                      <Th>Terminal</Th>
                      <Th>Cronologia</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBags.map((bag) => (
                      <Tr
                        key={`${bag.lpn}-${bag.category}`}
                        onClick={() => handleRowClick(bag.lpn)}
                      >
                        <Td $sticky>
                          <MonospaceValue $tone="loaded">
                            {bag.lpn}
                          </MonospaceValue>
                        </Td>
                        <Td>
                          <MonospaceValue
                            $tone={
                              bag.category === 'OnRoute'
                                ? 'onRoute'
                                : bag.category === 'Delivered'
                                  ? 'delivered'
                                  : bag.category === 'Loaded'
                                    ? 'loaded'
                                    : 'missing'
                            }
                          >
                            {bag.category} · {bag.status}
                          </MonospaceValue>
                        </Td>
                        <Td>
                          <MonospaceValue>{bag.lastSeen}</MonospaceValue>
                        </Td>
                        <Td>
                          <MonospaceValue>{bag.chute}</MonospaceValue>
                        </Td>
                        <Td>
                          <MonospaceValue>{bag.expectedAtChute}</MonospaceValue>
                        </Td>
                        <Td>
                          <MonospaceValue>{bag.loadedAt || '—'}</MonospaceValue>
                        </Td>
                        <Td>
                          <MonospaceValue>{bag.terminalId}</MonospaceValue>
                        </Td>
                        <Td>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontWeight: 600,
                            }}
                          >
                            <span>Ver Cronologia</span>
                            <ChevronRight size={14} />
                          </span>
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrapper>
            )}
          </div>
        </BodyScroll>
      </ModalContainer>
    </Backdrop>
  );
};
