import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import {
  buildLiveDashboardSnapshot,
  clearTokenCache,
  createApiApp,
  createOriginValidator,
  hashToken,
  isAuthError,
  sanitizeAirport,
} from './lib/apiApp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MAX_WS_PER_IP = 5;

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const PORT = Number(process.env.PORT) || 3000;
  const HOST = process.env.HOST || (isProd ? '0.0.0.0' : '127.0.0.1');

  const app = createApiApp({ port: PORT });
  const server = http.createServer(app);
  const isAllowedOrigin = createOriginValidator(PORT);

  // Real-Time WebSocket Server (/ws)
  const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 });
  const wsConnectionsByIp = new Map<string, number>();

  server.on('upgrade', (request, socket, head) => {
    let pathname = '';
    try {
      pathname = new URL(request.url || '/', 'http://localhost').pathname;
    } catch {
      socket.destroy();
      return;
    }

    if (pathname !== '/ws') {
      return;
    }

    const origin = request.headers.origin;
    if (origin && !isAllowedOrigin(origin, request.headers.host)) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }

    const ip = request.socket?.remoteAddress || 'unknown';
    const currentCount = wsConnectionsByIp.get(ip) || 0;
    if (currentCount >= MAX_WS_PER_IP) {
      socket.write('HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wsConnectionsByIp.set(ip, (wsConnectionsByIp.get(ip) || 0) + 1);
      (wss as any).emit('connection', ws, request, ip);
    });
  });

  interface ClientSession {
    ws: WebSocket;
    token: string;
    airport: string;
    intervalId?: ReturnType<typeof setInterval>;
  }

  const clients = new Set<ClientSession>();

  wss.on(
    'connection',
    (ws: WebSocket, _request: http.IncomingMessage, clientIp = 'unknown') => {
      const session: ClientSession = {
        ws,
        token: '',
        airport: 'OPO',
      };
      clients.add(session);

      let released = false;
      const cleanup = () => {
        if (session.intervalId) {
          clearInterval(session.intervalId);
          session.intervalId = undefined;
        }
        clients.delete(session);
        if (!released) {
          released = true;
          const count = wsConnectionsByIp.get(clientIp) || 0;
          if (count <= 1) {
            wsConnectionsByIp.delete(clientIp);
          } else {
            wsConnectionsByIp.set(clientIp, count - 1);
          }
        }
      };

      const startPolling = () => {
        if (session.intervalId) clearInterval(session.intervalId);
        session.intervalId = setInterval(async () => {
          if (!session.token || ws.readyState !== WebSocket.OPEN) return;
          try {
            const snapshot = await buildLiveDashboardSnapshot(
              session.token,
              session.airport
            );
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: 'dashboard_update',
                  payload: snapshot,
                })
              );
            }
          } catch (err: unknown) {
            if (isAuthError(err)) {
              clearTokenCache(hashToken(session.token));
              cleanup();
              if (ws.readyState === WebSocket.OPEN) {
                ws.close(4001, 'Sessão expirada ou inválida');
              }
            }
          }
        }, 6000);
      };

      ws.on('message', async (raw) => {
        try {
          const msg = JSON.parse(String(raw));
          if (!msg || typeof msg !== 'object') return;

          if (
            msg.type === 'subscribe' &&
            typeof msg.token === 'string' &&
            msg.token.trim().length > 0 &&
            msg.token.trim().length <= 512
          ) {
            session.token = msg.token.trim();
            session.airport = sanitizeAirport(msg.airport);
            startPolling();
            try {
              const snapshot = await buildLiveDashboardSnapshot(
                session.token,
                session.airport
              );
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(
                  JSON.stringify({
                    type: 'dashboard_update',
                    payload: snapshot,
                  })
                );
              }
            } catch (err: unknown) {
              if (isAuthError(err)) {
                clearTokenCache(hashToken(session.token));
                cleanup();
                if (ws.readyState === WebSocket.OPEN) {
                  ws.close(4001, 'Sessão expirada ou inválida');
                }
              }
            }
          } else if (msg.type === 'change_airport' && msg.airport) {
            session.airport = sanitizeAirport(msg.airport);
            if (session.token) {
              try {
                const snapshot = await buildLiveDashboardSnapshot(
                  session.token,
                  session.airport
                );
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(
                    JSON.stringify({
                      type: 'dashboard_update',
                      payload: snapshot,
                    })
                  );
                }
              } catch (err: unknown) {
                if (isAuthError(err)) {
                  clearTokenCache(hashToken(session.token));
                  cleanup();
                  if (ws.readyState === WebSocket.OPEN) {
                    ws.close(4001, 'Sessão expirada ou inválida');
                  }
                }
              }
            }
          }
        } catch {
          // ignore malformed message
        }
      });

      ws.on('close', cleanup);
      ws.on('error', cleanup);
    }
  );

  // Mount Vite in dev or static files in production
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, HOST, () => {
    console.log(`BagsToGo Operational Server running on http://${HOST}:${PORT}`);
  });
}

startServer();
