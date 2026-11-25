import React, { useState } from 'react';
import styled from 'styled-components';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import {
  AirlineOption,
  AirportLocation,
  DashboardTotals,
  FlightFilters,
  FlightRecord,
} from '../types/bagstogo';
import {
  AgnosticButton,
  MonospaceValue,
  SegmentedButton,
  StyledInput,
  StyledSelect,
  SurfacePanel,
} from './ui/Primitives';

interface Next15FlightsViewProps {
  flights: FlightRecord[];
  totals: DashboardTotals;
  filters: FlightFilters;
  airports: AirportLocation[];
  airlines: AirlineOption[];
  onChangeFilters: (next: FlightFilters) => void;
  onResetFilters: () => void;
  onSelectFlight: (flight: FlightRecord) => void;
}

const TopStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xs};
`;

const HeaderTopLine = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.xs};
`;

const SectionTitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: ${(props) => props.theme.colors.text};
`;

const SectionSubKicker = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${(props) => props.theme.colors.primary};
`;

const SectionSubtitle = styled.p`
  margin: 2px 0 0 0;
  font-size: 12px;
  color: ${(props) => props.theme.colors.textSecondary};
`;

const FilterToggleBtn = styled.button<{ $open?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 40px;
  padding: 6px 12px;
  background-color: ${(props) =>
    props.$open ? props.theme.colors.primary : props.theme.colors.background};
  color: ${(props) =>
    props.$open ? props.theme.colors.textInverse : props.theme.colors.text};
  border: 1px solid ${(props) => props.theme.colors.border};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
`;

const FullRowDirectionBar = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  width: 100%;
  gap: 4px;
  background-color: ${(props) => props.theme.colors.background};
  border: 1px solid ${(props) => props.theme.colors.border};
  padding: 4px;
`;

const FullRowDirectionBtn = styled(SegmentedButton)`
  width: 100%;
  min-height: 40px;
  padding: 6px 8px;
  font-size: 12px;
`;

const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${(props) => props.theme.spacing.xs};
  padding: ${(props) => props.theme.spacing.sm};
  background-color: ${(props) => props.theme.colors.background};
  border: 1px solid ${(props) => props.theme.colors.border};

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: ${(props) => props.theme.spacing.sm};
  }

  @media (min-width: 1200px) {
    grid-template-columns: 2fr 1.1fr 1.2fr 1.4fr auto;
    align-items: end;
  }
`;

const FilterField = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xxs};
`;

const FilterLabel = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: ${(props) => props.theme.colors.textSecondary};
`;

const DesktopTableWrapper = styled.div`
  display: none;
  width: 100%;
  overflow-x: auto;
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: ${(props) => props.theme.radii.md};
  background-color: ${(props) => props.theme.colors.background};

  @media (min-width: 960px) {
    display: block;
  }
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
`;

const TableHead = styled.thead`
  background-color: ${(props) => props.theme.colors.tableHeaderBg};
  border-bottom: 1px solid ${(props) => props.theme.colors.border};
`;

const Th = styled.th<{ $align?: 'left' | 'right' | 'center' }>`
  padding: ${(props) => props.theme.spacing.xs} ${(props) => props.theme.spacing.sm};
  text-align: ${(props) => props.$align || 'left'};
  font-size: 12px;
  font-weight: 700;
  color: ${(props) => props.theme.colors.tableHeaderText};
  white-space: nowrap;
`;

const Tr = styled.tr<{ $highlight?: boolean }>`
  border-bottom: 1px solid ${(props) => props.theme.colors.borderSubtle};
  background-color: ${(props) =>
    props.$highlight ? props.theme.colors.missingBg : 'transparent'};
  cursor: pointer;
  transition: background-color 120ms ease;

  &:hover {
    background-color: ${(props) => props.theme.colors.surfaceHover};
  }
`;

const Td = styled.td<{ $align?: 'left' | 'right' | 'center' }>`
  padding: ${(props) => props.theme.spacing.xs} ${(props) => props.theme.spacing.sm};
  text-align: ${(props) => props.$align || 'left'};
  color: ${(props) => props.theme.colors.text};
  white-space: nowrap;
  height: 48px;
`;

const DirectionIndicator = styled.span<{ $dir: 'departure' | 'arrival' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 700;
  color: ${(props) =>
    props.$dir === 'departure'
      ? props.theme.colors.departureText
      : props.theme.colors.arrivalText};
`;

const TotalsFooterRow = styled.tr`
  background-color: ${(props) => props.theme.colors.surface};
  border-top: 2px solid ${(props) => props.theme.colors.border};
  font-weight: 700;
`;

/* Mobile & Tablet Touch-First Flight Cards */
const MobileCardsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xs};

  @media (min-width: 960px) {
    display: none;
  }
`;

const MobileFlightCard = styled.button`
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 12px;
  background-color: ${(props) => props.theme.colors.background};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: ${(props) => props.theme.radii.md};
  text-align: left;
  cursor: pointer;
  gap: 8px;
  min-height: 64px;
`;

const MobileCardTop = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  white-space: nowrap;
`;

const MobileTopLeft = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  white-space: nowrap;
`;

const MobileMetaLine = styled.div`
  font-size: 12px;
  color: ${(props) => props.theme.colors.textSecondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const MobileCardMetrics = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding-top: 8px;
  border-top: 1px solid ${(props) => props.theme.colors.borderSubtle};
`;

const MobileMetricItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex-shrink: 0;
  gap: 2px;
`;

const MobileMetricLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${(props) => props.theme.colors.textSecondary};
  white-space: nowrap;
  line-height: 1.2;
`;

const EmptyBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${(props) => props.theme.spacing.lg};
  text-align: center;
  gap: ${(props) => props.theme.spacing.xs};
  color: ${(props) => props.theme.colors.textSecondary};
`;

export const Next15FlightsView: React.FC<Next15FlightsViewProps> = ({
  flights,
  totals,
  filters,
  airports,
  airlines,
  onChangeFilters,
  onResetFilters,
  onSelectFlight,
}) => {
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <SurfacePanel>
      <TopStack>
        <HeaderTopLine>
          <SectionTitleBlock>
            <SectionTitle>Next 15 Flights</SectionTitle>
            <SectionSubKicker>Monitoramento em Tempo Real</SectionSubKicker>
            <SectionSubtitle>
              Toque em qualquer linha de voo para abrir o detalhamento e a
              cronologia de cada bagagem.
            </SectionSubtitle>
          </SectionTitleBlock>

          <FilterToggleBtn
            type="button"
            $open={filtersOpen}
            onClick={() => setFiltersOpen((prev) => !prev)}
            aria-expanded={filtersOpen}
          >
            <SlidersHorizontal size={15} />
            <span>Filtros</span>
            {filtersOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </FilterToggleBtn>
        </HeaderTopLine>

        {/* Full-Row Direction Filter: Todos | Partidas ↑ | Chegadas ↓ */}
        <FullRowDirectionBar
          role="group"
          aria-label="Filtro de Chegadas ou Partidas"
        >
          <FullRowDirectionBtn
            type="button"
            $active={filters.direction === 'all'}
            onClick={() => onChangeFilters({ ...filters, direction: 'all' })}
          >
            Todos ({flights.length})
          </FullRowDirectionBtn>
          <FullRowDirectionBtn
            type="button"
            $active={filters.direction === 'departure'}
            onClick={() =>
              onChangeFilters({ ...filters, direction: 'departure' })
            }
          >
            <ArrowUp size={14} />
            <span>Partidas ↑</span>
          </FullRowDirectionBtn>
          <FullRowDirectionBtn
            type="button"
            $active={filters.direction === 'arrival'}
            onClick={() => onChangeFilters({ ...filters, direction: 'arrival' })}
          >
            <ArrowDown size={14} />
            <span>Chegadas ↓</span>
          </FullRowDirectionBtn>
        </FullRowDirectionBar>
      </TopStack>

      {/* Collapsible Search & Filter Controls (4 fields + Limpar button) */}
      {filtersOpen && (
        <FilterGrid>
          <FilterField>
            <FilterLabel htmlFor="filter-flight-search">
              Buscar Voo (Número do Voo, Destino/Origem, Stand ou Chute)
            </FilterLabel>
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <StyledInput
                id="filter-flight-search"
                type="text"
                placeholder="Ex: TAP-1923, RYR-572, LIS, MAD..."
                value={filters.searchQuery}
                onChange={(e) =>
                  onChangeFilters({ ...filters, searchQuery: e.target.value })
                }
              />
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  right: '14px',
                  pointerEvents: 'none',
                  opacity: 0.6,
                }}
              />
            </div>
          </FilterField>

          <FilterField>
            <FilterLabel htmlFor="filter-flight-date">
              Data Operacional
            </FilterLabel>
            <StyledInput
              id="filter-flight-date"
              type="date"
              value={filters.date}
              onChange={(e) =>
                onChangeFilters({ ...filters, date: e.target.value })
              }
            />
          </FilterField>

          <FilterField>
            <FilterLabel htmlFor="filter-airport">Aeroporto</FilterLabel>
            <StyledSelect
              id="filter-airport"
              value={filters.airport}
              onChange={(e) =>
                onChangeFilters({ ...filters, airport: e.target.value })
              }
            >
              <option value="ALL">Todos os Aeroportos</option>
              {airports.map((ap) => (
                <option key={ap.Airport} value={ap.Airport}>
                  {ap.AirportName}
                </option>
              ))}
            </StyledSelect>
          </FilterField>

          <FilterField>
            <FilterLabel htmlFor="filter-airline">Companhia Aérea</FilterLabel>
            <StyledSelect
              id="filter-airline"
              value={filters.airline}
              onChange={(e) =>
                onChangeFilters({ ...filters, airline: e.target.value })
              }
            >
              {airlines.map((al) => (
                <option key={al.code} value={al.code}>
                  {al.name}
                </option>
              ))}
            </StyledSelect>
          </FilterField>

          <AgnosticButton
            type="button"
            variant="outline"
            onClick={onResetFilters}
            ariaLabel="Limpar filtros de voo"
          >
            <RotateCcw size={16} />
            <span>Limpar</span>
          </AgnosticButton>
        </FilterGrid>
      )}

      {flights.length === 0 ? (
        <EmptyBox>
          <strong>Nenhum voo encontrado para os filtros selecionados.</strong>
          <span>
            Experimente limpar a busca ou selecionar todas as companhias aéreas.
          </span>
        </EmptyBox>
      ) : (
        <>
          {/* Desktop & Operational Control Center Full Data Grid */}
          <DesktopTableWrapper>
            <StyledTable aria-label="Tabela Next 15 Flights">
              <TableHead>
                <tr>
                  <Th>Mov.</Th>
                  <Th>Voo</Th>
                  <Th>DES / ORI</Th>
                  <Th>BTD / BTA</Th>
                  <Th>Stand</Th>
                  <Th>Chute</Th>
                  <Th>Portão</Th>
                  <Th $align="right">A caminho</Th>
                  <Th $align="right">Entregue</Th>
                  <Th $align="right">Carregado</Th>
                  <Th $align="right">Ausente</Th>
                  <Th $align="right">Malas BFF</Th>
                  <Th $align="center">Detalhe</Th>
                </tr>
              </TableHead>
              <tbody>
                {flights.map((f) => (
                  <Tr
                    key={f.id}
                    $highlight={f.missing > 0}
                    onClick={() => onSelectFlight(f)}
                    tabIndex={0}
                    role="button"
                    aria-label={`Abrir detalhes do voo ${f.flight} para ${f.destinationOrOrigin}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectFlight(f);
                      }
                    }}
                  >
                    <Td>
                      <DirectionIndicator $dir={f.direction}>
                        {f.direction === 'departure' ? (
                          <>
                            <ArrowUp size={15} aria-label="Partida" />
                            <span>Partida</span>
                          </>
                        ) : (
                          <>
                            <ArrowDown size={15} aria-label="Chegada" />
                            <span>Chegada</span>
                          </>
                        )}
                      </DirectionIndicator>
                    </Td>
                    <Td>
                      <MonospaceValue>{f.flight}</MonospaceValue>
                    </Td>
                    <Td>
                      <MonospaceValue>{f.destinationOrOrigin}</MonospaceValue>
                    </Td>
                    <Td>
                      <MonospaceValue>{f.btdOrBta}</MonospaceValue>
                    </Td>
                    <Td>
                      <MonospaceValue>{f.stand || '—'}</MonospaceValue>
                    </Td>
                    <Td>
                      <MonospaceValue>{f.chuteOrBelt || '—'}</MonospaceValue>
                    </Td>
                    <Td>
                      <MonospaceValue>{f.gate || '—'}</MonospaceValue>
                    </Td>
                    <Td $align="right">
                      <MonospaceValue $tone="onRoute">{f.onRoute}</MonospaceValue>
                    </Td>
                    <Td $align="right">
                      <MonospaceValue $tone="delivered">
                        {f.delivered}
                      </MonospaceValue>
                    </Td>
                    <Td $align="right">
                      <MonospaceValue $tone="loaded">{f.loaded}</MonospaceValue>
                    </Td>
                    <Td $align="right">
                      <MonospaceValue
                        $tone={f.missing > 0 ? 'missing' : 'default'}
                      >
                        {f.missing}
                      </MonospaceValue>
                    </Td>
                    <Td $align="right">
                      <MonospaceValue $tone="bff">{f.bffTotal}</MonospaceValue>
                    </Td>
                    <Td $align="center">
                      <ChevronRight size={17} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
              <tfoot>
                <TotalsFooterRow>
                  <Td colSpan={7}>
                    TOTAIS EM TEMPO REAL ({flights.length}{' '}
                    {flights.length === 1 ? 'voo' : 'voos'})
                  </Td>
                  <Td $align="right">
                    <MonospaceValue $tone="onRoute">
                      {totals.onRoute}
                    </MonospaceValue>
                  </Td>
                  <Td $align="right">
                    <MonospaceValue $tone="delivered">
                      {totals.delivered}
                    </MonospaceValue>
                  </Td>
                  <Td $align="right">
                    <MonospaceValue $tone="loaded">{totals.loaded}</MonospaceValue>
                  </Td>
                  <Td $align="right">
                    <MonospaceValue $tone="missing">
                      {totals.missing}
                    </MonospaceValue>
                  </Td>
                  <Td $align="right">
                    <MonospaceValue $tone="bff">{totals.bffTotal}</MonospaceValue>
                  </Td>
                  <Td />
                </TotalsFooterRow>
              </tfoot>
            </StyledTable>
          </DesktopTableWrapper>

          {/* Mobile & Tablet Touch-First Ergonomic Cards (Single-Line Metrics without Text Wrap) */}
          <MobileCardsList>
            {flights.map((f) => (
              <MobileFlightCard
                key={f.id}
                type="button"
                onClick={() => onSelectFlight(f)}
              >
                <MobileCardTop>
                  <MobileTopLeft>
                    <DirectionIndicator $dir={f.direction}>
                      {f.direction === 'departure' ? (
                        <ArrowUp size={16} />
                      ) : (
                        <ArrowDown size={16} />
                      )}
                    </DirectionIndicator>
                    <MonospaceValue>{f.flight}</MonospaceValue>
                    <span>·</span>
                    <MonospaceValue>{f.destinationOrOrigin}</MonospaceValue>
                    <span>·</span>
                    <MonospaceValue>{f.btdOrBta}</MonospaceValue>
                  </MobileTopLeft>
                  <ChevronRight size={18} />
                </MobileCardTop>

                <MobileMetaLine>
                  Stand: <strong>{f.stand || '—'}</strong> · Chute:{' '}
                  <strong>{f.chuteOrBelt || '—'}</strong> · Portão:{' '}
                  <strong>{f.gate || '—'}</strong>
                </MobileMetaLine>

                <MobileCardMetrics>
                  <MobileMetricItem>
                    <MobileMetricLabel>A caminho</MobileMetricLabel>
                    <MonospaceValue $tone="onRoute">{f.onRoute}</MonospaceValue>
                  </MobileMetricItem>
                  <MobileMetricItem>
                    <MobileMetricLabel>Entregue</MobileMetricLabel>
                    <MonospaceValue $tone="delivered">
                      {f.delivered}
                    </MonospaceValue>
                  </MobileMetricItem>
                  <MobileMetricItem>
                    <MobileMetricLabel>Carregado</MobileMetricLabel>
                    <MonospaceValue $tone="loaded">{f.loaded}</MonospaceValue>
                  </MobileMetricItem>
                  <MobileMetricItem>
                    <MobileMetricLabel>Ausente</MobileMetricLabel>
                    <MonospaceValue $tone="missing">{f.missing}</MonospaceValue>
                  </MobileMetricItem>
                  <MobileMetricItem>
                    <MobileMetricLabel>BFF</MobileMetricLabel>
                    <MonospaceValue $tone="bff">{f.bffTotal}</MonospaceValue>
                  </MobileMetricItem>
                </MobileCardMetrics>
              </MobileFlightCard>
            ))}
          </MobileCardsList>
        </>
      )}
    </SurfacePanel>
  );
};
