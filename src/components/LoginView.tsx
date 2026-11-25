import React, { useState } from 'react';
import styled from 'styled-components';
import { Eye, EyeOff, Lock, ShieldCheck, User } from 'lucide-react';
import { AgnosticButton, StyledInput, SurfacePanel } from './ui/Primitives';

interface LoginViewProps {
  onLoginSuccess: (authData: {
    token: string;
    location: string;
    username: string;
  }) => void;
}

const LoginWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: calc(100vh - 88px);
  padding: ${(props) => props.theme.spacing.sm};
`;

const LoginCard = styled(SurfacePanel)`
  width: 100%;
  max-width: 460px;
  padding: ${(props) => props.theme.spacing.md};
  gap: ${(props) => props.theme.spacing.md};

  @media (min-width: 768px) {
    padding: ${(props) => props.theme.spacing.lg};
  }
`;

const HeaderBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xs};
`;

const Title = styled.h1`
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: ${(props) => props.theme.colors.text};
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: ${(props) => props.theme.colors.textSecondary};
`;

const FormContainer = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.sm};
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xs};
`;

const FieldLabel = styled.label`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spacing.xs};
  font-size: 13px;
  font-weight: 600;
  color: ${(props) => props.theme.colors.text};
`;

const PasswordRow = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
`;

const ToggleVisibilityBtn = styled.button`
  position: absolute;
  right: ${(props) => props.theme.spacing.xs};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  min-width: 44px;
  background: transparent;
  border: none;
  color: ${(props) => props.theme.colors.textSecondary};
  cursor: pointer;

  &:hover {
    color: ${(props) => props.theme.colors.text};
  }
`;

const ErrorBanner = styled.div`
  padding: ${(props) => props.theme.spacing.sm};
  border-radius: ${(props) => props.theme.radii.md};
  background-color: ${(props) => props.theme.colors.missingBg};
  color: ${(props) => props.theme.colors.missingText};
  font-size: 13px;
  font-weight: 600;
`;

const HelperBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xs};
  padding: ${(props) => props.theme.spacing.sm};
  border-radius: ${(props) => props.theme.radii.md};
  background-color: ${(props) => props.theme.colors.background};
  border: 1px solid ${(props) => props.theme.colors.border};
`;

const HelperText = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: ${(props) => props.theme.colors.textSecondary};
`;

const ActionStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${(props) => props.theme.spacing.xs};
  margin-top: ${(props) => props.theme.spacing.xs};
`;

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const performLogin = async (userToSubmit: string, passToSubmit: string) => {
    setError('');
    if (!userToSubmit.trim() || !passToSubmit) {
      setError('Informe o utilizador e a palavra-passe para autenticar na API BagsToGo.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: userToSubmit.trim(),
          password: passToSubmit,
        }),
      });
      const rawText = await res.text();
      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        setError(
          `Resposta inesperada do servidor (HTTP ${res.status}). Verifique o serviço de API e tente novamente.`
        );
        return;
      }

      if (res.ok && data?.success && data?.token) {
        onLoginSuccess({
          token: data.token,
          location: data.location || 'OPO',
          username: data.username || userToSubmit.trim(),
        });
      } else {
        setError(
          data?.error || 'Falha na autenticação junto ao servidor BagsToGo.'
        );
      }
    } catch (err: any) {
      setError(err?.message || 'Erro de ligação ao serviço BagsToGo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(username, password);
  };

  return (
    <LoginWrapper>
      <LoginCard>
        <HeaderBlock>
          <Title>Acesso Operacional BagsToGo</Title>
          <Subtitle>
            Autenticação em tempo real integrada com{' '}
            <strong>bagstogo.ana.pt/bagstogo</strong>. As credenciais são utilizadas
            apenas para emitir o token da sessão e não são guardadas no dispositivo.
          </Subtitle>
        </HeaderBlock>

        {error && <ErrorBanner role="alert">{error}</ErrorBanner>}

        <FormContainer onSubmit={handleSubmit}>
          <FieldGroup>
            <FieldLabel htmlFor="login-username">
              <User size={15} />
              <span>Utilizador (Username)</span>
            </FieldLabel>
            <StyledInput
              id="login-username"
              type="text"
              autoComplete="off"
              placeholder="Digite o utilizador"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </FieldGroup>

          <FieldGroup>
            <FieldLabel htmlFor="login-password">
              <Lock size={15} />
              <span>Palavra-passe (Password)</span>
            </FieldLabel>
            <PasswordRow>
              <StyledInput
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="off"
                placeholder="Digite a palavra-passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <ToggleVisibilityBtn
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={
                  showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'
                }
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </ToggleVisibilityBtn>
            </PasswordRow>
          </FieldGroup>

          <ActionStack>
            <AgnosticButton
              type="submit"
              variant="primary"
              fullWidth
              isLoading={isLoading}
            >
              <ShieldCheck size={18} />
              <span>Entrar no Centro de Controle</span>
            </AgnosticButton>
          </ActionStack>
        </FormContainer>

        <HelperBox>
          <HelperText>
            <strong>Conexão Direta API:</strong> WebService BagsToGo ANA Aeroportos
            (Indicadores Next 15 Flights, Performance de Chegadas, BFF e Rastreio LPN).
          </HelperText>
        </HelperBox>
      </LoginCard>
    </LoginWrapper>
  );
};
