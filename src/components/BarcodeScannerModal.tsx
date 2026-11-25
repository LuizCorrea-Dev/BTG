import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
} from 'html5-qrcode';
import {
  Camera,
  CheckCircle2,
  ImageUp,
  RefreshCw,
  ScanBarcode,
  X,
} from 'lucide-react';
import { BagItem } from '../types/bagstogo';
import { extractBaggageLpnFromBarcode } from '../utils/bagstogoLogic';
import { AgnosticButton, MonospaceValue, StyledInput } from './ui/Primitives';

interface BarcodeScannerModalProps {
  activeBags?: BagItem[];
  onClose: () => void;
  onScanSuccess: (normalizedLpn: string, openTimeline: boolean) => void;
}

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 90;
  background-color: ${(props) => props.theme.colors.overlayBackdrop};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
`;

const ModalDialog = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 560px;
  max-height: 94vh;
  background-color: ${(props) => props.theme.colors.background};
  border: 1px solid ${(props) => props.theme.colors.primary};
  overflow: hidden;
`;

const ModalHeader = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background-color: ${(props) => props.theme.colors.surface};
  border-bottom: 1px solid ${(props) => props.theme.colors.border};
  gap: 8px;
`;

const HeaderTitleGroup = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  min-width: 0;
`;

const HeaderTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: ${(props) => props.theme.colors.text};
`;

const CloseBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 36px;
  padding: 4px 10px;
  background-color: ${(props) => props.theme.colors.background};
  color: ${(props) => props.theme.colors.text};
  border: 1px solid ${(props) => props.theme.colors.border};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
`;

const ModalBody = styled.div`
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 12px;
  overflow-y: auto;
`;

const CameraViewportBox = styled.div`
  position: relative;
  width: 100%;
  min-height: 240px;
  background-color: ${(props) => props.theme.colors.surface};
  border: 1px solid ${(props) => props.theme.colors.border};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

const ReaderMount = styled.div`
  width: 100%;
  min-height: 240px;

  & video {
    width: 100% !important;
    height: auto !important;
    max-height: 300px;
    object-fit: cover;
  }
`;

const ReticleOverlay = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
`;

const ReticleBox = styled.div`
  width: 84%;
  max-width: 360px;
  height: 104px;
  border: 2px solid ${(props) => props.theme.colors.primary};
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const LaserLine = styled.div`
  width: 92%;
  height: 2px;
  background-color: ${(props) => props.theme.colors.onRouteText};
`;

const ReticleHint = styled.span`
  margin-top: 8px;
  padding: 3px 8px;
  background-color: ${(props) => props.theme.colors.surface};
  border: 1px solid ${(props) => props.theme.colors.border};
  color: ${(props) => props.theme.colors.text};
  font-size: 11px;
  font-weight: 600;
  text-align: center;
`;

const CameraToolbar = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const ToolBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  padding: 8px 12px;
  background-color: ${(props) => props.theme.colors.surface};
  color: ${(props) => props.theme.colors.text};
  border: 1px solid ${(props) => props.theme.colors.border};
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  flex: 1;
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const StatusMessage = styled.div<{ $tone?: 'info' | 'error' | 'success' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid
    ${(props) => {
      if (props.$tone === 'error') return props.theme.colors.missingText;
      if (props.$tone === 'success') return props.theme.colors.deliveredText;
      return props.theme.colors.border;
    }};
  background-color: ${(props) => {
    if (props.$tone === 'error') return props.theme.colors.missingBg;
    if (props.$tone === 'success') return props.theme.colors.deliveredBg;
    return props.theme.colors.surface;
  }};
  color: ${(props) => {
    if (props.$tone === 'error') return props.theme.colors.missingText;
    if (props.$tone === 'success') return props.theme.colors.deliveredText;
    return props.theme.colors.textSecondary;
  }};
`;

const LaserScannerBox = styled.form`
  display: flex;
  flex-direction: column;
  padding: 10px;
  background-color: ${(props) => props.theme.colors.surface};
  border: 1px solid ${(props) => props.theme.colors.border};
  gap: 8px;
`;

const SectionLabel = styled.label`
  font-size: 11px;
  font-weight: 700;
  color: ${(props) => props.theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const InputActionRow = styled.div`
  display: flex;
  flex-direction: row;
  gap: 8px;
`;

const QuickTagsRow = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 6px;
`;

const QuickTagChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 32px;
  padding: 4px 8px;
  background-color: ${(props) => props.theme.colors.background};
  color: ${(props) => props.theme.colors.loadedText};
  border: 1px solid ${(props) => props.theme.colors.border};
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
`;

const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
];

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  activeBags = [],
  onClose,
  onScanSuccess,
}) => {
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>(
    'environment'
  );
  const [cameraActive, setCameraActive] = useState(false);
  const [statusText, setStatusText] = useState(
    'A iniciar leitor óptico para etiquetas IATA (ITF / Code 128 / Code 39 / QR)...'
  );
  const [statusTone, setStatusTone] = useState<'info' | 'error' | 'success'>(
    'info'
  );
  const [manualBarcode, setManualBarcode] = useState('');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasTriggeredRef = useRef(false);

  const handleDecodedValue = (rawValue: string) => {
    const normalized = extractBaggageLpnFromBarcode(rawValue);
    if (!normalized || normalized.length < 3) return;
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;

    setStatusTone('success');
    setStatusText(`Código de barras lido com sucesso: LPN ${normalized}`);

    onScanSuccess(normalized, true);
  };

  useEffect(() => {
    let isMounted = true;
    const elementId = 'bagstogo-html5-barcode-reader';

    const startScanner = async () => {
      try {
        if (html5QrCodeRef.current) {
          try {
            if (html5QrCodeRef.current.isScanning) {
              await html5QrCodeRef.current.stop();
            }
            html5QrCodeRef.current.clear();
          } catch {
            // ignore cleanup warning
          }
        }

        const scanner = new Html5Qrcode(elementId, {
          formatsToSupport: SUPPORTED_FORMATS,
          verbose: false,
        });
        html5QrCodeRef.current = scanner;

        await scanner.start(
          { facingMode },
          {
            fps: 12,
            qrbox: { width: 280, height: 110 },
            aspectRatio: 1.777,
          },
          (decodedText) => {
            if (!isMounted) return;
            handleDecodedValue(decodedText);
          },
          () => {
            // frame without barcode
          }
        );

        if (isMounted) {
          setCameraActive(true);
          setStatusTone('info');
          setStatusText(
            'Posicione o código de barras da etiqueta LPN dentro da mira óptica.'
          );
        }
      } catch {
        if (isMounted) {
          setCameraActive(false);
          setStatusTone('info');
          setStatusText(
            'Câmera ao vivo indisponível neste dispositivo. Utilize "Fotografar / Imagem da Etiqueta" ou o leitor óptico manual abaixo.'
          );
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      const instance = html5QrCodeRef.current;
      if (instance) {
        if (instance.isScanning) {
          instance
            .stop()
            .then(() => instance.clear())
            .catch(() => {});
        } else {
          try {
            instance.clear();
          } catch {
            // ignore
          }
        }
      }
    };
  }, [facingMode]);

  const handleImageFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatusTone('info');
    setStatusText('A processar código de barras da imagem da etiqueta...');

    try {
      // 1. Try native BarcodeDetector first if available in browser
      const BarcodeDetectorCtor = (window as any).BarcodeDetector;
      if (BarcodeDetectorCtor) {
        try {
          const detector = new BarcodeDetectorCtor({
            formats: [
              'itf',
              'code_128',
              'code_39',
              'ean_13',
              'ean_8',
              'codabar',
              'qr_code',
              'data_matrix',
            ],
          });
          const bitmap = await createImageBitmap(file);
          const results = await detector.detect(bitmap);
          if (Array.isArray(results) && results.length > 0 && results[0].rawValue) {
            handleDecodedValue(String(results[0].rawValue));
            return;
          }
        } catch {
          // fallback to Html5Qrcode.scanFile
        }
      }

      // 2. Decode with Html5Qrcode
      const tempId = 'bagstogo-html5-barcode-reader';
      let scanner = html5QrCodeRef.current;
      if (scanner && scanner.isScanning) {
        await scanner.stop();
        setCameraActive(false);
      }
      if (!scanner) {
        scanner = new Html5Qrcode(tempId, {
          formatsToSupport: SUPPORTED_FORMATS,
          verbose: false,
        });
        html5QrCodeRef.current = scanner;
      }

      const decodedText = await scanner.scanFile(file, true);
      handleDecodedValue(decodedText);
    } catch {
      setStatusTone('error');
      setStatusText(
        'Não foi possível identificar um código de barras nítido na imagem. Tente aproximar a etiqueta ou utilize o coletor óptico abaixo.'
      );
    } finally {
      e.target.value = '';
    }
  };

  const handleManualLaserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = extractBaggageLpnFromBarcode(manualBarcode);
    if (normalized.length >= 3) {
      handleDecodedValue(normalized);
    }
  };

  const sampleBags = activeBags.slice(0, 4);

  return (
    <Backdrop onClick={onClose} data-testid="barcode-scanner-modal">
      <ModalDialog
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Scanner de Código de Barras da Bagagem"
      >
        <ModalHeader>
          <HeaderTitleGroup>
            <ScanBarcode size={18} />
            <HeaderTitle>
              Scanner de Código de Barras da Bagagem (IATA LPN / ULD)
            </HeaderTitle>
          </HeaderTitleGroup>
          <CloseBtn
            type="button"
            onClick={onClose}
            data-testid="btn-close-barcode-scanner"
          >
            <X size={14} />
            <span>Fechar</span>
          </CloseBtn>
        </ModalHeader>

        <ModalBody>
          <CameraViewportBox>
            <ReaderMount id="bagstogo-html5-barcode-reader" />
            {cameraActive && (
              <ReticleOverlay>
                <ReticleBox>
                  <LaserLine />
                </ReticleBox>
                <ReticleHint>
                  Alinhe o código de barras da etiqueta de bagagem (10 dígitos
                  LPN)
                </ReticleHint>
              </ReticleOverlay>
            )}
          </CameraViewportBox>

          <CameraToolbar>
            <ToolBtn
              type="button"
              onClick={() =>
                setFacingMode((prev) =>
                  prev === 'environment' ? 'user' : 'environment'
                )
              }
              data-testid="btn-switch-camera"
            >
              <RefreshCw size={15} />
              <span>
                Alternar Câmera (
                {facingMode === 'environment' ? 'Traseira' : 'Frontal'})
              </span>
            </ToolBtn>

            <ToolBtn
              type="button"
              onClick={() => fileInputRef.current?.click()}
              data-testid="btn-upload-barcode-photo"
            >
              <Camera size={15} />
              <ImageUp size={15} />
              <span>Fotografar / Imagem da Etiqueta</span>
            </ToolBtn>

            <HiddenFileInput
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageFileChange}
              data-testid="input-barcode-image-file"
            />
          </CameraToolbar>

          <StatusMessage $tone={statusTone} data-testid="barcode-scanner-status">
            {statusTone === 'success' ? (
              <CheckCircle2 size={16} />
            ) : (
              <ScanBarcode size={16} />
            )}
            <span>{statusText}</span>
          </StatusMessage>

          {/* Coletor Óptico / Leitor Laser (Zebra / Motorola / Honeywell HID) */}
          <LaserScannerBox onSubmit={handleManualLaserSubmit}>
            <SectionLabel htmlFor="laser-barcode-input">
              Leitor Laser / Coletor Óptico (Zebra · Motorola · Honeywell) ou
              Leitura Direta
            </SectionLabel>
            <InputActionRow>
              <StyledInput
                id="laser-barcode-input"
                data-testid="input-laser-barcode"
                type="text"
                autoFocus
                placeholder="Dispare o leitor laser ou digite o código de barras LPN..."
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
              />
              <AgnosticButton
                type="submit"
                variant="primary"
                disabled={manualBarcode.trim().length < 3}
                data-testid="btn-confirm-barcode-scan"
              >
                <ScanBarcode size={16} />
                <span>Ler Etiqueta</span>
              </AgnosticButton>
            </InputActionRow>

            {sampleBags.length > 0 && (
              <>
                <SectionLabel>
                  Etiquetas Ativas no Pátio (Toque para Simular Leitura do
                  Scanner):
                </SectionLabel>
                <QuickTagsRow>
                  {sampleBags.map((b) => (
                    <QuickTagChip
                      key={`sample-scan-${b.lpn}`}
                      type="button"
                      onClick={() => handleDecodedValue(b.lpn)}
                      data-testid={`quick-scan-tag-${b.lpn}`}
                    >
                      <ScanBarcode size={12} />
                      <MonospaceValue $tone="loaded">{b.lpn}</MonospaceValue>
                    </QuickTagChip>
                  ))}
                </QuickTagsRow>
              </>
            )}
          </LaserScannerBox>
        </ModalBody>
      </ModalDialog>
    </Backdrop>
  );
};
