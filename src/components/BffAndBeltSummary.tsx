import React, { useState } from 'react';
import styled from 'styled-components';
import {
  AlertTriangle,
  ArrowRightCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Layers,
  PackageCheck,
} from 'lucide-react';
import { BagCategory, DashboardTotals } from '../types/bagstogo';
import { MonospaceValue, SurfacePanel } from './ui/Primitives';

interface BffAndBeltSummaryProps {
  totals: DashboardTotals;
  fullChuteTime?: string;
  onSelectCategoryFilter?: (category: 'ALL' | BagCategory | 'BFF') => void;
}

const SectionWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xs};
`;

const CollapseHeaderBtn = styled.button`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 44px;
  padding: ${(props) => props.theme.spacing.xs} ${(props) => props.theme.spacing.sm};
  background-color: ${(props) => props.theme.colors.surface};
  border: 1px solid ${(props) => props.theme.colors.border};
  color: ${(props) => props.theme.colors.text};
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  text-align: left;

  &:hover {
    background-color: ${(props) => props.theme.colors.surfaceHover};
  }
`;

const CollapseRightBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: ${(props) => props.theme.colors.primary};
  white-space: nowrap;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${(props) => props.theme.spacing.xs};

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
    gap: ${(props) => props.theme.spacing.sm};
  }

  @media (min-width: 1200px) {
    grid-template-columns: repeat(5, 1fr);
  }
`;

const MetricButtonCard = styled.button<{
  $tone: 'onRoute' | 'delivered' | 'loaded' | 'missing' | 'bff';
}>`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
  min-height: 82px;
  padding: ${(props) => props.theme.spacing.sm};
  background-color: ${(props) => props.theme.colors.surface};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: ${(props) => props.theme.radii.lg};
  text-align: left;
  cursor: pointer;
  gap: 6px;
  transition: background-color 140ms ease;

  &:hover {
    background-color: ${(props) => props.theme.colors.surfaceHover};
  }
`;

const MetricHeader = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  color: ${(props) => props.theme.colors.textSecondary};
  font-size: 13px;
  font-weight: 600;
`;

const MetricMainRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: baseline;
  justify-content: space-between;
  width: 100%;
  gap: ${(props) => props.theme.spacing.xs};
`;

const MetricNumber = styled(MonospaceValue)`
  font-size: 26px;
  line-height: 1.1;

  @media (min-width: 768px) {
    font-size: 30px;
  }
`;

const MetricSubtext = styled.div`
  font-size: 12px;
  color: ${(props) => props.theme.colors.textMuted};
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
`;

const BeltStatusContainer = styled(SurfacePanel)`
  padding: ${(props) => props.theme.spacing.sm};
  gap: ${(props) => props.theme.spacing.xs};
`;

const BeltHeaderStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const BeltTitle = styled.h2`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: ${(props) => props.theme.colors.text};
`;

const BeltSubTitle = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${(props) => props.theme.colors.textSecondary};
`;

const BeltMetaText = styled.div`
  font-size: 12px;
  color: ${(props) => props.theme.colors.textMuted};
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
  margin-top: 2px;
`;

const ProgressTrack = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 10px;
  border-radius: ${(props) => props.theme.radii.sm};
  background-color: ${(props) => props.theme.colors.background};
  overflow: hidden;
  border: 1px solid ${(props) => props.theme.colors.border};
`;

const ProgressSegment = styled.div<{
  $widthPct: number;
  $tone: 'onRoute' | 'delivered' | 'loaded' | 'missing';
}>`
  width: ${(props) => `${Math.max(0, Math.min(100, props.$widthPct))}%`};
  height: 100%;
  background-color: ${(props) => {
    switch (props.$tone) {
      case 'onRoute':
        return props.theme.colors.onRouteText;
      case 'delivered':
        return props.theme.colors.deliveredText;
      case 'loaded':
        return props.theme.colors.loadedText;
      case 'missing':
        return props.theme.colors.missingText;
    }
  }};
  transition: width 200ms ease;
`;

const LegendGridTwoPerLine = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px ${(props) => props.theme.spacing.sm};
  padding-top: ${(props) => props.theme.spacing.xxs};
  font-size: 12px;
  color: ${(props) => props.theme.colors.textSecondary};

  @media (min-width: 1024px) {
    grid-template-columns: repeat(5, 1fr);
  }
`;

export const BffAndBeltSummary: React.FC<BffAndBeltSummaryProps> = ({
  totals,
  fullChuteTime = '00:00:00',
}) => {
  const [cardsCollapsed, setCardsCollapsed] = useState(false);

  const denom = Math.max(
    1,
    totals.onRoute + totals.delivered + totals.loaded + totals.missing
  );
  const onRoutePct = (totals.onRoute / denom) * 100;
  const deliveredPct = (totals.delivered / denom) * 100;
  const loadedPct = (totals.loaded / denom) * 100;
  const missingPct = (totals.missing / denom) * 100;

  const toggleCollapse = () => {
    setCardsCollapsed((prev) => !prev);
  };

  return (
    <SectionWrapper>
      <CollapseHeaderBtn
        type="button"
        onClick={toggleCollapse}
        aria-expanded={!cardsCollapsed}
      >
        <span>
          Indicadores Gerais ({totals.onRoute} A Caminho · {totals.delivered}{' '}
          Entregues · {totals.bffTotal} BFF)
        </span>
        <CollapseRightBadge>
          <span>{cardsCollapsed ? 'Mostrar Cards' : 'Recolher Cards'}</span>
          {cardsCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </CollapseRightBadge>
      </CollapseHeaderBtn>

      {!cardsCollapsed && (
        <SummaryGrid>
          <MetricButtonCard
            type="button"
            $tone="onRoute"
            onClick={toggleCollapse}
            aria-label={`A Caminho On Route: ${totals.onRoute} malas`}
          >
            <MetricHeader>
              <span>A Caminho · On Route</span>
              <ArrowRightCircle size={16} />
            </MetricHeader>
            <MetricMainRow>
              <MetricNumber $tone="onRoute">{totals.onRoute}</MetricNumber>
              <MetricSubtext>
                Em trânsito nas esteiras · BFF: {totals.bffOnRoute}
              </MetricSubtext>
            </MetricMainRow>
          </MetricButtonCard>

          <MetricButtonCard
            type="button"
            $tone="delivered"
            onClick={toggleCollapse}
            aria-label={`Entregue Delivered: ${totals.delivered} malas`}
          >
            <MetricHeader>
              <span>Entregue · Delivered</span>
              <CheckCircle2 size={16} />
            </MetricHeader>
            <MetricMainRow>
              <MetricNumber $tone="delivered">{totals.delivered}</MetricNumber>
              <MetricSubtext>
                Entregues no Chute/Tapete · BFF: {totals.bffDelivered}
              </MetricSubtext>
            </MetricMainRow>
          </MetricButtonCard>

          <MetricButtonCard
            type="button"
            $tone="loaded"
            onClick={toggleCollapse}
            aria-label={`Carregado Loaded: ${totals.loaded} malas`}
          >
            <MetricHeader>
              <span>Carregado · Loaded</span>
              <PackageCheck size={16} />
            </MetricHeader>
            <MetricMainRow>
              <MetricNumber $tone="loaded">{totals.loaded}</MetricNumber>
              <MetricSubtext>
                Confirmadas BPM/Contentor · BFF: {totals.bffLoaded}
              </MetricSubtext>
            </MetricMainRow>
          </MetricButtonCard>

          <MetricButtonCard
            type="button"
            $tone="missing"
            onClick={toggleCollapse}
            aria-label={`Ausente Missing: ${totals.missing} malas`}
          >
            <MetricHeader>
              <span>Ausente · Missing</span>
              <AlertTriangle size={16} />
            </MetricHeader>
            <MetricMainRow>
              <MetricNumber $tone="missing">{totals.missing}</MetricNumber>
              <MetricSubtext>
                Pendentes de entrega · BFF: {totals.bffMissing}
              </MetricSubtext>
            </MetricMainRow>
          </MetricButtonCard>

          <MetricButtonCard
            type="button"
            $tone="bff"
            onClick={toggleCollapse}
            aria-label={`Malas no BFF: ${totals.bffTotal} malas`}
          >
            <MetricHeader>
              <span>Malas no BFF (Partidas/Chegadas)</span>
              <Layers size={16} />
            </MetricHeader>
            <MetricMainRow>
              <MetricNumber $tone="bff">{totals.bffTotal}</MetricNumber>
              <MetricSubtext>
                OR: {totals.bffOnRoute} · DEL: {totals.bffDelivered} · LD:{' '}
                {totals.bffLoaded}
              </MetricSubtext>
            </MetricMainRow>
          </MetricButtonCard>
        </SummaryGrid>
      )}

      <BeltStatusContainer aria-label="Status de Carregamento das Esteiras">
        <BeltHeaderStack>
          <BeltTitle>Status de Carregamento das Esteiras</BeltTitle>
          <BeltSubTitle>(On Route · Delivered · Loaded · Missing)</BeltSubTitle>
          <BeltMetaText>
            Partidas ↑: {totals.departuresCount} · Chegadas ↓:{' '}
            {totals.arrivalsCount} · Tempo Chute Cheia: {fullChuteTime}
          </BeltMetaText>
        </BeltHeaderStack>

        <ProgressTrack>
          <ProgressSegment $widthPct={onRoutePct} $tone="onRoute" />
          <ProgressSegment $widthPct={deliveredPct} $tone="delivered" />
          <ProgressSegment $widthPct={loadedPct} $tone="loaded" />
          <ProgressSegment $widthPct={missingPct} $tone="missing" />
        </ProgressTrack>

        <LegendGridTwoPerLine>
          <span>
            On Route (A caminho):{' '}
            <MonospaceValue $tone="onRoute">{totals.onRoute}</MonospaceValue>
          </span>
          <span>
            Delivered (Entregue):{' '}
            <MonospaceValue $tone="delivered">{totals.delivered}</MonospaceValue>
          </span>
          <span>
            Loaded (Carregado):{' '}
            <MonospaceValue $tone="loaded">{totals.loaded}</MonospaceValue>
          </span>
          <span>
            Missing (Ausente):{' '}
            <MonospaceValue $tone="missing">{totals.missing}</MonospaceValue>
          </span>
          <span>
            Malas no BFF:{' '}
            <MonospaceValue $tone="bff">{totals.bffTotal}</MonospaceValue>
          </span>
        </LegendGridTwoPerLine>
      </BeltStatusContainer>
    </SectionWrapper>
  );
};
