import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  ChevronRight,
  Layers,
  RotateCcw,
  ScanBarcode,
  ScanSearch,
  Search,
} from 'lucide-react';
import { AirlineOption, BagItem, BaggageFilters } from '../types/bagstogo';
import {
  extractBaggageLpnFromBarcode,
  filterBaggageList,
} from '../utils/bagstogoLogic';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import {
  AgnosticButton,
  MonospaceValue,
  SegmentedButton,
  SegmentedControlBar,
  StyledInput,
  StyledSelect,
  SurfacePanel,
} from './ui/Primitives';

interface BaggageSearchViewProps {
  bags: BagItem[];
  airlines: AirlineOption[];
  filters: BaggageFilters;
  onChangeFilters: (next: BaggageFilters) => void;
  onResetFilters: () => void;
  onSelectBagLpn: (lpn: string) => void;
}

const HeaderRow = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.sm};
`;

const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: ${(props) => props.theme.colors.text};
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${(props) => props.theme.colors.textSecondary};
`;

const SearchControlsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${(props) => props.theme.spacing.xs};

  @media (min-width: 768px) {
    grid-template-columns: 2fr 1.1fr auto auto auto;
    align-items: end;
    gap: ${(props) => props.theme.spacing.sm};
  }
`;

const FieldCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xxs};
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const SearchIconWrap = styled.span`
  position: absolute;
  right: 48px;
  display: inline-flex;
  color: ${(props) => props.theme.colors.textMuted};
  pointer-events: none;
`;

const InlineScanIconBtn = styled.button`
  position: absolute;
  right: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 38px;
  min-height: 38px;
  background-color: ${(props) => props.theme.colors.surface};
  color: ${(props) => props.theme.colors.primary};
  border: 1px solid ${(props) => props.theme.colors.border};
  cursor: pointer;
`;

const Label = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: ${(props) => props.theme.colors.textSecondary};
`;

const DesktopTableContainer = styled.div`
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

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
`;

const Th = styled.th`
  padding: ${(props) => props.theme.spacing.xs} 10px;
  text-align: left;
  font-size: 12px;
  font-weight: 700;
  color: ${(props) => props.theme.colors.textSecondary};
  background-color: ${(props) => props.theme.colors.surface};
  border-bottom: 1px solid ${(props) => props.theme.colors.border};
  white-space: nowrap;
`;

const Tr = styled.tr`
  border-bottom: 1px solid ${(props) => props.theme.colors.borderSubtle};
  cursor: pointer;

  &:hover {
    background-color: ${(props) => props.theme.colors.surfaceHover};
  }
`;

const Td = styled.td`
  padding: ${(props) => props.theme.spacing.xs} 10px;
  white-space: nowrap;
  height: 48px;
`;

const ActionLinkText = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
  color: ${(props) => props.theme.colors.primary};
`;

const EmptyCell = styled.td`
  text-align: center;
  padding: ${(props) => props.theme.spacing.md};
  color: ${(props) => props.theme.colors.textSecondary};
`;

const MobileBagCards = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xs};

  @media (min-width: 960px) {
    display: none;
  }
`;

const MobileBagCard = styled.button`
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: ${(props) => props.theme.spacing.sm};
  background-color: ${(props) => props.theme.colors.background};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: ${(props) => props.theme.radii.md};
  text-align: left;
  cursor: pointer;
  gap: ${(props) => props.theme.spacing.xs};
  min-height: 64px;
`;

const MobileRowBetween = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  font-size: 13px;
  color: ${(props) => props.theme.colors.textSecondary};
`;

export const BaggageSearchView: React.FC<BaggageSearchViewProps> = ({
  bags,
  airlines,
  filters,
  onChangeFilters,
  onResetFilters,
  onSelectBagLpn,
}) => {
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const matchedBags = useMemo(
    () => filterBaggageList(bags, filters),
    [bags, filters]
  );

  const counts = useMemo(() => {
    return bags.reduce(
      (acc, b) => {
        acc.total += 1;
        if (b.category === 'OnRoute') acc.onRoute += 1;
        if (b.category === 'Delivered') acc.delivered += 1;
        if (b.category === 'Loaded') acc.loaded += 1;
        if (b.category === 'Missing') acc.missing += 1;
        if (b.isBff) acc.bff += 1;
        return acc;
      },
      { total: 0, onRoute: 0, delivered: 0, loaded: 0, missing: 0, bff: 0 }
    );
  }, [bags]);

  const handleDirectTraceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = extractBaggageLpnFromBarcode(filters.query);
    if (normalized.length >= 3) {
      if (normalized !== filters.query) {
        onChangeFilters({ ...filters, query: normalized });
      }
      onSelectBagLpn(normalized);
    }
  };

  const handleBarcodeScanSuccess = (
    normalizedLpn: string,
    openTimeline: boolean
  ) => {
    onChangeFilters({ ...filters, query: normalizedLpn });
    setIsScannerOpen(false);
    if (openTimeline && normalizedLpn.length >= 3) {
      onSelectBagLpn(normalizedLpn);
    }
  };

  return (
    <SurfacePanel>
      <HeaderRow>
        <TitleBlock>
          <Title>
            Busca e Identificação de Bagagem em Tempo Real (LPN Parcial ou Completo)
          </Title>
          <Subtitle>
            Pesquise por qualquer parte do código da etiqueta (ex: 4 últimos ou 6
            últimos dígitos), código LPN completo de 10 dígitos, número do voo ou
            contentor ULD, com filtros de status instantâneos.
          </Subtitle>
        </TitleBlock>

        {/* Real-Time Status Filter Tabs */}
        <SegmentedControlBar role="group" aria-label="Filtros de Status da Bagagem">
          <SegmentedButton
            type="button"
            $active={filters.status === 'ALL' && !filters.onlyBff}
            onClick={() =>
              onChangeFilters({ ...filters, status: 'ALL', onlyBff: false })
            }
          >
            Todas ({counts.total})
          </SegmentedButton>
          <SegmentedButton
            type="button"
            $active={filters.status === 'OnRoute'}
            onClick={() =>
              onChangeFilters({ ...filters, status: 'OnRoute', onlyBff: false })
            }
          >
            On Route ({counts.onRoute})
          </SegmentedButton>
          <SegmentedButton
            type="button"
            $active={filters.status === 'Delivered'}
            onClick={() =>
              onChangeFilters({ ...filters, status: 'Delivered', onlyBff: false })
            }
          >
            Delivered ({counts.delivered})
          </SegmentedButton>
          <SegmentedButton
            type="button"
            $active={filters.status === 'Loaded'}
            onClick={() =>
              onChangeFilters({ ...filters, status: 'Loaded', onlyBff: false })
            }
          >
            Loaded ({counts.loaded})
          </SegmentedButton>
          <SegmentedButton
            type="button"
            $active={filters.status === 'Missing'}
            onClick={() =>
              onChangeFilters({ ...filters, status: 'Missing', onlyBff: false })
            }
          >
            Missing ({counts.missing})
          </SegmentedButton>
          <SegmentedButton
            type="button"
            $active={filters.onlyBff}
            onClick={() =>
              onChangeFilters({
                ...filters,
                onlyBff: !filters.onlyBff,
              })
            }
          >
            <Layers size={14} />
            <span>BFF ({counts.bff})</span>
          </SegmentedButton>
        </SegmentedControlBar>
      </HeaderRow>

      <form onSubmit={handleDirectTraceSubmit}>
        <SearchControlsGrid>
          <FieldCol>
            <Label htmlFor="baggage-lpn-search">
              Código da Bagagem (Parte ou Código LPN Completo / Voo / Contentor)
            </Label>
            <InputWrapper>
              <StyledInput
                id="baggage-lpn-search"
                type="text"
                placeholder="Ex: 0047577592, 577592, 81335, TAP-1923, AKH..."
                style={{ paddingRight: 84 }}
                value={filters.query}
                onChange={(e) =>
                  onChangeFilters({ ...filters, query: e.target.value })
                }
              />
              <SearchIconWrap>
                <Search size={16} />
              </SearchIconWrap>
              <InlineScanIconBtn
                type="button"
                onClick={() => setIsScannerOpen(true)}
                aria-label="Abrir scanner de código de barras da bagagem"
                title="Escanear código de barras da etiqueta de bagagem"
                data-testid="btn-inline-barcode-scanner"
              >
                <ScanBarcode size={17} />
              </InlineScanIconBtn>
            </InputWrapper>
          </FieldCol>

          <FieldCol>
            <Label htmlFor="baggage-airline-filter">Companhia Aérea</Label>
            <StyledSelect
              id="baggage-airline-filter"
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
          </FieldCol>

          <AgnosticButton
            type="button"
            variant="secondary"
            onClick={() => setIsScannerOpen(true)}
            data-testid="btn-open-barcode-scanner"
          >
            <ScanBarcode size={17} />
            <span>Escanear Código de Barras</span>
          </AgnosticButton>

          <AgnosticButton
            type="submit"
            variant="primary"
            disabled={filters.query.trim().length < 3}
          >
            <ScanSearch size={17} />
            <span>Rastrear LPN na API</span>
          </AgnosticButton>

          <AgnosticButton
            type="button"
            variant="outline"
            onClick={onResetFilters}
          >
            <RotateCcw size={16} />
            <span>Limpar</span>
          </AgnosticButton>
        </SearchControlsGrid>
      </form>

      <DesktopTableContainer>
        <Table aria-label="Resultados da Busca de Bagagens em Tempo Real">
          <thead>
            <tr>
              <Th>Código LPN</Th>
              <Th>Voo</Th>
              <Th>DES</Th>
              <Th>BTD</Th>
              <Th>Status Tempo Real</Th>
              <Th>Última Leitura</Th>
              <Th>Chute</Th>
              <Th>Entrega / Previsto</Th>
              <Th>Contentor ULD</Th>
              <Th>Cronologia</Th>
            </tr>
          </thead>
          <tbody>
            {matchedBags.length === 0 ? (
              <tr>
                <EmptyCell colSpan={10}>
                  Nenhuma bagagem encontrada no filtro atual. Se digitou um código
                  LPN específico de 6 ou 10 dígitos, clique em{' '}
                  <strong>Rastrear LPN na API</strong> para consultar o histórico
                  direto no servidor BagsToGo.
                </EmptyCell>
              </tr>
            ) : (
              matchedBags.map((bag) => (
                <Tr
                  key={`${bag.lpn}-${bag.flightId}-${bag.category}`}
                  onClick={() => onSelectBagLpn(bag.lpn)}
                >
                  <Td>
                    <MonospaceValue $tone="loaded">{bag.lpn}</MonospaceValue>
                  </Td>
                  <Td>
                    <MonospaceValue>{bag.flight}</MonospaceValue>
                  </Td>
                  <Td>
                    <MonospaceValue>{bag.destination}</MonospaceValue>
                  </Td>
                  <Td>
                    <MonospaceValue>{bag.btd}</MonospaceValue>
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
                    <ActionLinkText>
                      <span>Cronologia</span>
                      <ChevronRight size={15} />
                    </ActionLinkText>
                  </Td>
                </Tr>
              ))
            )}
          </tbody>
        </Table>
      </DesktopTableContainer>

      {/* Mobile Touch Cards for Baggage Search */}
      <MobileBagCards>
        {matchedBags.map((bag) => (
          <MobileBagCard
            key={`mob-${bag.lpn}-${bag.flightId}-${bag.category}`}
            type="button"
            onClick={() => onSelectBagLpn(bag.lpn)}
          >
            <MobileRowBetween>
              <MonospaceValue $tone="loaded">LPN {bag.lpn}</MonospaceValue>
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
                {bag.category}
              </MonospaceValue>
            </MobileRowBetween>
            <MobileRowBetween>
              <span>
                Voo: <strong>{bag.flight}</strong> ({bag.destination}) · Chute{' '}
                <strong>{bag.chute}</strong>
              </span>
              <ChevronRight size={16} />
            </MobileRowBetween>
            <MobileRowBetween>
              <span>Leitura: {bag.lastSeen}</span>
              <span>ULD: {bag.loadedAt || '—'}</span>
            </MobileRowBetween>
          </MobileBagCard>
        ))}
      </MobileBagCards>

      {isScannerOpen && (
        <BarcodeScannerModal
          activeBags={bags}
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={handleBarcodeScanSuccess}
        />
      )}
    </SurfacePanel>
  );
};
