import React from 'react';
import styled from 'styled-components';
import {
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  Plane,
  ScanLine,
  X,
} from 'lucide-react';
import { BaggageDetailResponse } from '../types/bagstogo';
import { AgnosticButton, MonospaceValue } from './ui/Primitives';

interface BaggageTimelineModalProps {
  detail: BaggageDetailResponse | null;
  isLoading: boolean;
  onClose: () => void;
}

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${(props) => props.theme.spacing.sm};
  background-color: ${(props) => props.theme.colors.overlayBackdrop};
`;

const ModalCard = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  background-color: ${(props) => props.theme.colors.surface};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: ${(props) => props.theme.radii.lg};
  overflow: hidden;
`;

const ModalHeader = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: ${(props) => props.theme.spacing.sm} ${(props) => props.theme.spacing.md};
  border-bottom: 1px solid ${(props) => props.theme.colors.border};
  background-color: ${(props) => props.theme.colors.background};
`;

const ModalBody = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${(props) => props.theme.spacing.md};
  gap: ${(props) => props.theme.spacing.md};
  overflow-y: auto;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${(props) => props.theme.spacing.sm};

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const InfoPanel = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${(props) => props.theme.spacing.sm};
  background-color: ${(props) => props.theme.colors.background};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: ${(props) => props.theme.radii.md};
  gap: ${(props) => props.theme.spacing.xs};
`;

const InfoRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  padding: 4px 0;
  border-bottom: 1px solid ${(props) => props.theme.colors.borderSubtle};
`;

const TimelineList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xs};
`;

const TimelineStep = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: ${(props) => props.theme.spacing.sm};
  padding: ${(props) => props.theme.spacing.sm};
  background-color: ${(props) => props.theme.colors.background};
  border: 1px solid ${(props) => props.theme.colors.border};
  border-radius: ${(props) => props.theme.radii.md};
`;

const StepNumberCircle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: ${(props) => props.theme.colors.primarySurface};
  color: ${(props) => props.theme.colors.primary};
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
`;

const StepContent = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 4px;
`;

const StepTitleRow = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing.xs};
`;

const StepMetaRow = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: ${(props) => props.theme.spacing.sm};
  font-size: 12px;
  color: ${(props) => props.theme.colors.textSecondary};
`;

export const BaggageTimelineModal: React.FC<BaggageTimelineModalProps> = ({
  detail,
  isLoading,
  onClose,
}) => {
  if (!detail && !isLoading) return null;

  return (
    <Backdrop onClick={onClose} role="dialog" aria-modal="true" aria-label="Cronologia da Bagagem">
      <ModalCard onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
              Cronologia de Movimentação da Bagagem · LPN{' '}
              <MonospaceValue $tone="loaded">{detail?.lpn || '...'}</MonospaceValue>
            </h3>
            <span style={{ fontSize: 12, opacity: 0.75 }}>
              Rastreamento oficial BagsToGo (BSM · Scanners HBS · Chute · BPM/ULD)
            </span>
          </div>
          <AgnosticButton
            type="button"
            variant="outline"
            onClick={onClose}
            ariaLabel="Fechar cronologia de bagagem"
          >
            <X size={18} />
            <span>Fechar</span>
          </AgnosticButton>
        </ModalHeader>

        <ModalBody>
          {isLoading ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              A consultar histórico cronológico na API BagsToGo...
            </div>
          ) : detail ? (
            <>
              <InfoGrid>
                <InfoPanel>
                  <strong style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Package size={16} />
                    <span>Identificação da Bagagem (Baggage Info)</span>
                  </strong>
                  {detail.baggageInfo.length > 0 ? (
                    detail.baggageInfo.map((item, idx) => (
                      <InfoRow key={idx}>
                        <span style={{ opacity: 0.75 }}>{item.label}</span>
                        <MonospaceValue>{item.value || '—'}</MonospaceValue>
                      </InfoRow>
                    ))
                  ) : detail.matchedBag ? (
                    <>
                      <InfoRow>
                        <span>LPN</span>
                        <MonospaceValue>{detail.matchedBag.lpn}</MonospaceValue>
                      </InfoRow>
                      <InfoRow>
                        <span>Última Leitura</span>
                        <MonospaceValue>{detail.matchedBag.lastSeen}</MonospaceValue>
                      </InfoRow>
                      <InfoRow>
                        <span>Status</span>
                        <MonospaceValue>{detail.matchedBag.status}</MonospaceValue>
                      </InfoRow>
                      <InfoRow>
                        <span>Contentor / ULD</span>
                        <MonospaceValue>{detail.matchedBag.loadedAt || '—'}</MonospaceValue>
                      </InfoRow>
                    </>
                  ) : (
                    <span style={{ fontSize: 13, opacity: 0.7 }}>
                      Sem metadados adicionais para este código LPN.
                    </span>
                  )}
                </InfoPanel>

                <InfoPanel>
                  <strong style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Plane size={16} />
                    <span>Dados do Voo (Flight Info)</span>
                  </strong>
                  {detail.flightInfo.length > 0 ? (
                    detail.flightInfo.slice(0, 6).map((item, idx) => (
                      <InfoRow key={idx}>
                        <span style={{ opacity: 0.75 }}>{item.label}</span>
                        <MonospaceValue>{item.value || '—'}</MonospaceValue>
                      </InfoRow>
                    ))
                  ) : detail.matchedBag ? (
                    <>
                      <InfoRow>
                        <span>Voo</span>
                        <MonospaceValue>{detail.matchedBag.flight}</MonospaceValue>
                      </InfoRow>
                      <InfoRow>
                        <span>Destino</span>
                        <MonospaceValue>{detail.matchedBag.destination}</MonospaceValue>
                      </InfoRow>
                      <InfoRow>
                        <span>BTD</span>
                        <MonospaceValue>{detail.matchedBag.btd}</MonospaceValue>
                      </InfoRow>
                      <InfoRow>
                        <span>Chute</span>
                        <MonospaceValue>{detail.matchedBag.chute}</MonospaceValue>
                      </InfoRow>
                    </>
                  ) : (
                    <span style={{ fontSize: 13, opacity: 0.7 }}>
                      Informação de voo não associada.
                    </span>
                  )}
                </InfoPanel>
              </InfoGrid>

              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 15, fontWeight: 700 }}>
                  Linha do Tempo de Eventos ({detail.events.length}{' '}
                  {detail.events.length === 1 ? 'registo' : 'registos'})
                </h4>

                {detail.events.length === 0 ? (
                  <InfoPanel>
                    <span>
                      Nenhum evento cronológico encontrado para o código LPN{' '}
                      <MonospaceValue>{detail.lpn}</MonospaceValue>.
                    </span>
                  </InfoPanel>
                ) : (
                  <TimelineList>
                    {detail.events.map((ev) => (
                      <TimelineStep key={`${ev.stepNumber}-${ev.eventDate}`}>
                        <StepNumberCircle>{ev.stepNumber}</StepNumberCircle>
                        <StepContent>
                          <StepTitleRow>
                            <strong style={{ fontSize: 14 }}>{ev.event}</strong>
                            <MonospaceValue $tone="loaded">
                              <Clock
                                size={13}
                                style={{ display: 'inline', marginRight: 4 }}
                              />
                              {ev.eventDate}
                            </MonospaceValue>
                          </StepTitleRow>
                          <StepMetaRow>
                            <span>
                              Voo:{' '}
                              <MonospaceValue>
                                {ev.airline}-{ev.flightNr}
                              </MonospaceValue>{' '}
                              ({ev.destination})
                            </span>
                            {ev.scanner && (
                              <span>
                                <ScanLine
                                  size={13}
                                  style={{ display: 'inline', marginRight: 3 }}
                                />
                                Scanner: <MonospaceValue>{ev.scanner}</MonospaceValue>
                              </span>
                            )}
                            {ev.chute && (
                              <span>
                                <MapPin
                                  size={13}
                                  style={{ display: 'inline', marginRight: 3 }}
                                />
                                Chute: <MonospaceValue>{ev.chute}</MonospaceValue>
                              </span>
                            )}
                            {ev.terminal != null && (
                              <span>
                                Terminal: <MonospaceValue>{ev.terminal}</MonospaceValue>
                              </span>
                            )}
                            {ev.comments && (
                              <span>
                                <CheckCircle2
                                  size={13}
                                  style={{ display: 'inline', marginRight: 3 }}
                                />
                                Obs: <MonospaceValue>{ev.comments}</MonospaceValue>
                              </span>
                            )}
                          </StepMetaRow>
                        </StepContent>
                      </TimelineStep>
                    ))}
                  </TimelineList>
                )}
              </div>
            </>
          ) : null}
        </ModalBody>
      </ModalCard>
    </Backdrop>
  );
};
