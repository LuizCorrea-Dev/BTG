import crypto from 'crypto';
import express from 'express';
import {
  BagCategory,
  BagItem,
  BaggageDetailResponse,
  DashboardSnapshot,
  FlightDetailResponse,
  SorterChuteStatus,
} from '../src/types/bagstogo';
import {
  buildAirlineOptions,
  buildUnifiedFlights,
  enrichArrivalPerformanceRow,
  normalizeBagItem,
  normalizeBaggageTraceEvents,
  parseBagsToGoPayload,
} from '../src/utils/bagstogoLogic';

const BAGSTOGO_BASE =
  'https://bagstogo.ana.pt/bagstogo/WebService/BagsToGo.Frontend.BagsToGo.svc';
const BAGSTOGO_LOGIN_URL = `${BAGSTOGO_BASE}/login`;
const BAGSTOGO_INDICATORS_URL = `${BAGSTOGO_BASE}/indicators`;

export const ALLOWED_AIRPORTS = new Set(['OPO', 'LIS', 'FAO', 'FNC', 'PDL']);
const MAX_CACHE_ENTRIES = 100;
const BAGS_CACHE_TTL_MS = 15_000;
const SNAPSHOT_CACHE_TTL_MS = 60_000;

export class UpstreamError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'UpstreamError';
    this.status = status;
  }
}

export function isAuthError(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return status === 401 || status === 403;
}

export function sanitizeAirport(value: unknown): string {
  const code = String(value || 'OPO').trim().toUpperCase();
  return ALLOWED_AIRPORTS.has(code) ? code : 'OPO';
}

export function isValidLpn(value: string): boolean {
  return /^[A-Za-z0-9]{4,20}$/.test(value);
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Bounded in-memory caches keyed by SHA-256(token):airport
const tokenBagsCache = new Map<string, { timestamp: number; bags: BagItem[] }>();
const tokenSnapshotCache = new Map<
  string,
  { timestamp: number; snapshot: DashboardSnapshot }
>();

function pruneCache<T extends { timestamp: number }>(
  cache: Map<string, T>,
  ttlMs: number
): void {
  const now = Date.now();
  for (const [k, v] of cache.entries()) {
    if (now - v.timestamp > ttlMs) {
      cache.delete(k);
    }
  }
}

function setBoundedCache<T extends { timestamp: number }>(
  cache: Map<string, T>,
  key: string,
  value: T,
  ttlMs: number
): void {
  pruneCache(cache, ttlMs);
  if (cache.has(key)) {
    cache.delete(key);
  }
  while (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) {
      cache.delete(oldestKey);
    } else {
      break;
    }
  }
  cache.set(key, value);
}

export function clearTokenCache(tokenHash: string): void {
  const prefix = `${tokenHash}:`;
  for (const k of tokenBagsCache.keys()) {
    if (k.startsWith(prefix)) tokenBagsCache.delete(k);
  }
  for (const k of tokenSnapshotCache.keys()) {
    if (k.startsWith(prefix)) tokenSnapshotCache.delete(k);
  }
}

setInterval(() => {
  pruneCache(tokenBagsCache, BAGS_CACHE_TTL_MS);
  pruneCache(tokenSnapshotCache, SNAPSHOT_CACHE_TTL_MS);
}, 60_000).unref();

export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message: string;
}): express.RequestHandler {
  const hits = new Map<string, number[]>();
  const MAX_TRACKED_IPS = 5000;

  setInterval(() => {
    const cutoff = Date.now() - options.windowMs;
    for (const [ip, timestamps] of hits.entries()) {
      const recent = timestamps.filter((t) => t > cutoff);
      if (recent.length === 0) {
        hits.delete(ip);
      } else {
        hits.set(ip, recent);
      }
    }
  }, 60_000).unref();

  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const cutoff = now - options.windowMs;
    const recent = (hits.get(ip) || []).filter((t) => t > cutoff);

    if (recent.length >= options.maxRequests) {
      res.status(429).json({ error: options.message });
      return;
    }

    recent.push(now);
    if (!hits.has(ip) && hits.size >= MAX_TRACKED_IPS) {
      const oldestIp = hits.keys().next().value;
      if (oldestIp !== undefined) hits.delete(oldestIp);
    }
    hits.set(ip, recent);
    next();
  };
}

export async function fetchIndicator(
  indicatorId: string,
  token: string,
  extraParams: Record<string, string | number | boolean> = {},
  timeoutMs = 9000
): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const qs = new URLSearchParams({
      indicatorId,
      token,
      ...Object.fromEntries(
        Object.entries(extraParams).map(([k, v]) => [k, String(v)])
      ),
    });
    const res = await fetch(`${BAGSTOGO_INDICATORS_URL}?${qs.toString()}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new UpstreamError(
        `HTTP ${res.status} on indicator ${indicatorId}`,
        res.status
      );
    }
    const raw = await res.json();
    return parseBagsToGoPayload(raw);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFlightBagsForCategories(
  flightId: number,
  token: string,
  airport: string
): Promise<BagItem[]> {
  const categories: Array<{ col: string; cat: BagCategory }> = [
    { col: 'Total_OnRoute', cat: 'OnRoute' },
    { col: 'Total_Delivered', cat: 'Delivered' },
    { col: 'Total_Loaded', cat: 'Loaded' },
    { col: 'Total_Missing', cat: 'Missing' },
  ];

  const results = await Promise.allSettled(
    categories.map(async ({ col, cat }) => {
      const resp = await fetchIndicator(
        'popupDashboard',
        token,
        { flightId, column: col },
        6000
      );
      const list = Array.isArray(resp?.data) ? resp.data : [];
      return list.map((item: any) => normalizeBagItem(item, cat, airport));
    })
  );

  const bagMap = new Map<string, BagItem>();
  for (const r of results) {
    if (r.status === 'fulfilled') {
      for (const bag of r.value) {
        if (!bag.lpn) continue;
        const key = `${bag.lpn}-${bag.category}`;
        if (!bagMap.has(key)) {
          bagMap.set(key, bag);
        }
      }
    }
  }
  return Array.from(bagMap.values());
}

export async function buildLiveDashboardSnapshot(
  token: string,
  airport = 'OPO'
): Promise<DashboardSnapshot> {
  const safeAirport = sanitizeAirport(airport);
  const tokenHash = hashToken(token);
  const cacheKey = `${tokenHash}:${safeAirport}`;

  const results = await Promise.allSettled([
    fetchIndicator('getHour', token),
    fetchIndicator('next15flights', token),
    fetchIndicator('flightList', token, { airline: '000' }),
    fetchIndicator('next15flightsArrivals', token),
    fetchIndicator('infoLineArrivals', token),
    fetchIndicator('airlines', token),
    fetchIndicator('sorter', token),
    fetchIndicator('timeOfFullChute', token),
  ]);

  for (const r of results) {
    if (r.status === 'rejected' && isAuthError(r.reason)) {
      throw r.reason;
    }
  }
  if (results.every((r) => r.status === 'rejected')) {
    throw new UpstreamError('Falha ao comunicar com a API BagsToGo.', 502);
  }

  const [
    hourRes,
    next15Res,
    flightListRes,
    arrivalsRes,
    infoLineArrRes,
    airlinesRes,
    sorterRes,
    fullChuteRes,
  ] = results;

  const rawHour =
    hourRes.status === 'fulfilled' && hourRes.value?.hour
      ? String(hourRes.value.hour)
      : new Date().toISOString();
  const serverDateObj = new Date(rawHour);
  const validServerDate = Number.isNaN(serverDateObj.getTime())
    ? new Date()
    : serverDateObj;
  const dateStr = validServerDate.toISOString().slice(0, 10);

  const next15Departures =
    next15Res.status === 'fulfilled' && Array.isArray(next15Res.value?.data)
      ? next15Res.value.data
      : [];

  const flightListAll =
    flightListRes.status === 'fulfilled' && Array.isArray(flightListRes.value?.data)
      ? flightListRes.value.data
      : [];

  const rawArrivals =
    arrivalsRes.status === 'fulfilled' && Array.isArray(arrivalsRes.value?.data)
      ? arrivalsRes.value.data
      : [];

  const infoLines =
    infoLineArrRes.status === 'fulfilled' && Array.isArray(infoLineArrRes.value?.data)
      ? infoLineArrRes.value.data
      : [];

  const arrivalsPerformance = rawArrivals.map((row: any, idx: number) =>
    enrichArrivalPerformanceRow(row, idx, safeAirport, validServerDate, infoLines)
  );

  // Optional demo fallback for arrivals belt sequences when explicitly enabled
  if (process.env.ENABLE_DEMO_FALLBACK === 'true') {
    const supplementalArrivals = [
      {
        Flight: 'TAP-1924',
        Orig: 'LIS',
        BTA: `${String(validServerDate.getHours()).padStart(2, '0')}:${String(
          Math.max(0, validServerDate.getMinutes() - 4)
        ).padStart(2, '0')} B`,
        Stand: 'S35',
        Belt: '1',
        firstBag: '00:00:00',
        lastBag: '00:00:00',
        time_firstBag: '00:04:12',
        time_lastBag: '00:00:00',
      },
      {
        Flight: 'KLM-1571',
        Orig: 'AMS',
        BTA: `${String(validServerDate.getHours()).padStart(2, '0')}:${String(
          Math.max(0, validServerDate.getMinutes() - 11)
        ).padStart(2, '0')} B`,
        Stand: 'S33',
        Belt: '1',
        firstBag: '00:00:00',
        lastBag: '00:00:00',
        time_firstBag: '00:11:05',
        time_lastBag: '00:00:00',
      },
      {
        Flight: 'TAP-1702',
        Orig: 'FNC',
        BTA: `${String(validServerDate.getHours()).padStart(2, '0')}:${String(
          Math.max(0, validServerDate.getMinutes() - 16)
        ).padStart(2, '0')} B`,
        Stand: 'S34',
        Belt: '2',
        firstBag: `${String(validServerDate.getHours()).padStart(2, '0')}:${String(
          Math.max(0, validServerDate.getMinutes() - 5)
        ).padStart(2, '0')}:12`,
        lastBag: '00:00:00',
        time_firstBag: '00:11:12',
        time_lastBag: '00:05:18',
      },
      {
        Flight: 'AFR-1528',
        Orig: 'CDG',
        BTA: `${String(validServerDate.getHours()).padStart(2, '0')}:${String(
          Math.max(0, validServerDate.getMinutes() - 22)
        ).padStart(2, '0')} B`,
        Stand: 'S64',
        Belt: '3',
        firstBag: `${String(validServerDate.getHours()).padStart(2, '0')}:${String(
          Math.max(0, validServerDate.getMinutes() - 10)
        ).padStart(2, '0')}:23`,
        lastBag: `${String(validServerDate.getHours()).padStart(2, '0')}:${String(
          Math.max(0, validServerDate.getMinutes() - 1)
        ).padStart(2, '0')}:56`,
        time_firstBag: '00:12:23',
        time_lastBag: '00:08:33',
      },
      {
        Flight: 'TAP-214',
        Orig: 'EWR',
        BTA: `${String(validServerDate.getHours()).padStart(2, '0')}:${String(
          Math.max(0, validServerDate.getMinutes() - 26)
        ).padStart(2, '0')} B`,
        Stand: 'S73',
        Belt: '4',
        firstBag: `${String(validServerDate.getHours()).padStart(2, '0')}:${String(
          Math.max(0, validServerDate.getMinutes() - 12)
        ).padStart(2, '0')}:35`,
        lastBag: '00:00:00',
        time_firstBag: '00:13:35',
        time_lastBag: '00:04:58',
      },
    ];

    const existingArrivalCodes = new Set(
      arrivalsPerformance.map((a: { flight: string }) => a.flight.toUpperCase())
    );
    for (const sup of supplementalArrivals) {
      if (
        arrivalsPerformance.length < 6 &&
        !existingArrivalCodes.has(sup.Flight.toUpperCase())
      ) {
        arrivalsPerformance.push(
          enrichArrivalPerformanceRow(
            sup,
            arrivalsPerformance.length,
            safeAirport,
            validServerDate,
            infoLines
          )
        );
        existingArrivalCodes.add(sup.Flight.toUpperCase());
      }
    }
  }

  const flights = buildUnifiedFlights(
    next15Departures,
    flightListAll,
    arrivalsPerformance,
    safeAirport,
    dateStr
  );

  let rawAirlinesList: Array<{ id: string; Name: string }> = [];
  if (airlinesRes.status === 'fulfilled' && airlinesRes.value?.airlines) {
    const parsedAirlines = parseBagsToGoPayload(airlinesRes.value.airlines);
    if (Array.isArray(parsedAirlines)) {
      rawAirlinesList = parsedAirlines;
    }
  }
  const airlines = buildAirlineOptions(flights, rawAirlinesList);

  const sorterChutes: SorterChuteStatus[] =
    sorterRes.status === 'fulfilled' && Array.isArray(sorterRes.value?.data)
      ? sorterRes.value.data.map((s: any) => ({
          id: Number(s.id || 0),
          hour: String(s.hour || ''),
          red: Number(s.red || 0),
          orange: Number(s.orange || 0),
          date: String(s.Date || ''),
          isFull: Number(s.red || 0) > 0 || Boolean(s.Date),
        }))
      : [];

  const fullChuteTime =
    fullChuteRes.status === 'fulfilled' &&
    Array.isArray(fullChuteRes.value?.data) &&
    fullChuteRes.value.data[0]?.value
      ? String(fullChuteRes.value.data[0].value)
      : '00:00:00';

  // Fetch or refresh active bags index from top active departure flights (cache for 15s)
  const cachedBags = tokenBagsCache.get(cacheKey);
  const isBagsFresh =
    cachedBags && Date.now() - cachedBags.timestamp <= BAGS_CACHE_TTL_MS;
  let activeBags: BagItem[] = isBagsFresh ? cachedBags.bags : [];

  if (!isBagsFresh) {
    const departureFlightsWithBags = flights
      .filter(
        (f) =>
          f.direction === 'departure' &&
          f.flightId &&
          f.onRoute + f.delivered + f.loaded + f.missing > 0
      )
      .slice(0, 6);

    const bagLists = await Promise.allSettled(
      departureFlightsWithBags.map((f) =>
        fetchFlightBagsForCategories(f.flightId, token, safeAirport)
      )
    );

    const mergedBags: BagItem[] = [];
    const seenKeys = new Set<string>();
    for (const res of bagLists) {
      if (res.status === 'fulfilled') {
        for (const b of res.value) {
          const compositeKey = `${b.lpn}-${b.category}`;
          if (b.lpn && !seenKeys.has(compositeKey)) {
            seenKeys.add(compositeKey);
            mergedBags.push(b);
          }
        }
      }
    }
    if (mergedBags.length > 0) {
      activeBags = mergedBags;
      setBoundedCache(
        tokenBagsCache,
        cacheKey,
        { timestamp: Date.now(), bags: activeBags },
        BAGS_CACHE_TTL_MS
      );
    }
  }

  const locations = [
    { Airport: 'OPO', AirportName: 'OPO — Aeroporto Francisco Sá Carneiro (Porto)' },
    { Airport: 'LIS', AirportName: 'LIS — Aeroporto Humberto Delgado (Lisboa)' },
    { Airport: 'FAO', AirportName: 'FAO — Aeroporto Gago Coutinho (Faro)' },
    { Airport: 'FNC', AirportName: 'FNC — Aeroporto Cristiano Ronaldo (Madeira)' },
    { Airport: 'PDL', AirportName: 'PDL — Aeroporto João Paulo II (Ponta Delgada)' },
  ];

  const snapshot: DashboardSnapshot = {
    serverTime: validServerDate.toISOString(),
    airport: safeAirport,
    locations,
    flights,
    arrivalsPerformance,
    airlines,
    activeBags,
    sorterChutes,
    fullChuteTime,
    lastUpdated: new Date().toISOString(),
  };

  setBoundedCache(
    tokenSnapshotCache,
    cacheKey,
    { timestamp: Date.now(), snapshot },
    SNAPSHOT_CACHE_TTL_MS
  );
  return snapshot;
}

export function createOriginValidator(port: number) {
  const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  const allowedOrigins = new Set(
    (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean)
  );
  if (process.env.VERCEL_URL) {
    allowedOrigins.add(`https://${process.env.VERCEL_URL.trim()}`);
  }

  return (origin: string | undefined, hostHeader: string | undefined): boolean => {
    if (!origin) return false;
    if (
      hostHeader &&
      (origin === `http://${hostHeader}` || origin === `https://${hostHeader}`)
    ) {
      return true;
    }
    if (allowedOrigins.has(origin)) {
      return true;
    }
    if (
      !isProd &&
      (origin === `http://localhost:${port}` || origin === `http://127.0.0.1:${port}`)
    ) {
      return true;
    }
    return false;
  };
}

export function createApiApp(options: { port?: number } = {}): express.Express {
  const app = express();
  const port = options.port ?? (Number(process.env.PORT) || 3000);
  const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  const isAllowedOrigin = createOriginValidator(port);

  app.disable('x-powered-by');
  if (process.env.VERCEL || process.env.TRUST_PROXY === '1') {
    app.set('trust proxy', 1);
  }

  app.use(express.json({ limit: '16kb' }));

  // Security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader(
      'Permissions-Policy',
      'camera=(self), microphone=(), geolocation=()'
    );
    if (isProd) {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains'
      );
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' ws: wss:; media-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
      );
    }
    next();
  });

  // Restricted CORS allowlist (same-origin + ALLOWED_ORIGINS + VERCEL_URL)
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const host = req.headers.host;
    if (origin) {
      if (isAllowedOrigin(origin, host)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Vary', 'Origin');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header(
          'Access-Control-Allow-Headers',
          'Origin, X-Requested-With, Content-Type, Accept, Authorization'
        );
      } else if (req.method === 'OPTIONS') {
        res.sendStatus(403);
        return;
      }
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  const apiLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 120,
    message: 'Limite de requisições excedido. Aguarde um momento.',
  });

  const loginLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
    message: 'Muitas tentativas de autenticação. Tente novamente em alguns minutos.',
  });

  app.use('/api', apiLimiter);

  // Healthcheck endpoint for deploy verification
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      runtime: process.env.VERCEL ? 'vercel-serverless' : 'node',
    });
  });

  // 1. Login Endpoint -> Authenticates against BagsToGo WebService
  app.post('/api/login', loginLimiter, async (req, res) => {
    try {
      const rawUsername = String(req.body?.username || '').trim();
      const password = String(req.body?.password || '');

      if (!rawUsername || !password) {
        res.status(400).json({
          success: false,
          error: 'Por favor, informe o utilizador e a palavra-passe.',
        });
        return;
      }

      if (rawUsername.length > 128 || password.length > 256) {
        res.status(400).json({
          success: false,
          error: 'Credenciais excedem o tamanho máximo permitido.',
        });
        return;
      }

      const cleanUsername = rawUsername.replace(/@ana\.pt$/i, '');

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);
      let upstreamRes: Response;
      try {
        upstreamRes = await fetch(BAGSTOGO_LOGIN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            username: cleanUsername,
            password,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      if (!upstreamRes.ok) {
        console.error(`[login] Upstream HTTP ${upstreamRes.status}`);
        res.status(502).json({
          success: false,
          error: 'Falha ao comunicar com a API BagsToGo.',
        });
        return;
      }

      const rawData = await upstreamRes.json();
      const parsed = parseBagsToGoPayload(rawData);

      if (parsed && parsed.success && parsed.token) {
        res.json({
          success: true,
          token: parsed.token,
          location: sanitizeAirport(parsed.location),
          locations: Array.isArray(parsed.locations)
            ? parsed.locations
            : [{ Airport: 'OPO', AirportName: 'AEROPORTO DO PORTO' }],
          username: cleanUsername,
        });
      } else {
        res.status(401).json({
          success: false,
          error: parsed?.error || 'Credenciais inválidas na API BagsToGo.',
        });
      }
    } catch (error: unknown) {
      console.error(
        '[login] Upstream request error:',
        error instanceof Error ? error.message : 'unknown'
      );
      res.status(502).json({
        success: false,
        error: 'Falha ao comunicar com a API BagsToGo.',
      });
    }
  });

  // Helper to extract Bearer token strictly from Authorization header
  function getRequestToken(req: express.Request): string {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token.length > 0 && token.length <= 512) {
        return token;
      }
    }
    return '';
  }

  // 2. Dashboard Snapshot Endpoint
  app.get('/api/dashboard', async (req, res) => {
    const token = getRequestToken(req);
    const airport = sanitizeAirport(req.query.airport);
    if (!token) {
      res.status(401).json({ error: 'Token de autenticação não fornecido.' });
      return;
    }
    const tokenHash = hashToken(token);
    const cacheKey = `${tokenHash}:${airport}`;
    try {
      const snapshot = await buildLiveDashboardSnapshot(token, airport);
      res.json(snapshot);
    } catch (error: unknown) {
      if (isAuthError(error)) {
        clearTokenCache(tokenHash);
        res.status(401).json({ error: 'Sessão expirada ou token inválido.' });
        return;
      }
      const cached = tokenSnapshotCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp <= SNAPSHOT_CACHE_TTL_MS) {
        res.json(cached.snapshot);
        return;
      }
      console.error(
        '[dashboard] Error fetching snapshot:',
        error instanceof Error ? error.message : 'unknown'
      );
      res.status(502).json({
        error: 'Erro ao obter dados do dashboard BagsToGo.',
      });
    }
  });

  // 3. Detailed Flight & Bags Chronology Endpoint
  app.get('/api/flight/:flightId', async (req, res) => {
    const token = getRequestToken(req);
    const flightId = Number(req.params.flightId);
    const airport = sanitizeAirport(req.query.airport);

    if (!token) {
      res.status(401).json({ error: 'Token de autenticação não fornecido.' });
      return;
    }
    if (!Number.isInteger(flightId) || flightId <= 0) {
      res.status(400).json({ error: 'ID de voo inválido.' });
      return;
    }

    const tokenHash = hashToken(token);
    const cacheKey = `${tokenHash}:${airport}`;

    try {
      const [detailsRes, messagesRes, leadTimesRes, expectedRes, summaryRes, bags] =
        await Promise.all([
          fetchIndicator('flightDetails', token, { flightId }).catch((e) => {
            if (isAuthError(e)) throw e;
            return null;
          }),
          fetchIndicator('messages', token, { flightId }).catch((e) => {
            if (isAuthError(e)) throw e;
            return null;
          }),
          fetchIndicator('leadTimes', token, { flightId }).catch((e) => {
            if (isAuthError(e)) throw e;
            return null;
          }),
          fetchIndicator('expectedAtChute', token, { flightId }).catch((e) => {
            if (isAuthError(e)) throw e;
            return null;
          }),
          fetchIndicator('summary', token, { flightId }).catch((e) => {
            if (isAuthError(e)) throw e;
            return null;
          }),
          fetchFlightBagsForCategories(flightId, token, airport).catch(() => []),
        ]);

      const rawDetailsRow =
        Array.isArray(detailsRes?.data) && detailsRes.data.length > 0
          ? detailsRes.data[0]
          : null;

      let flightRecord = null;
      if (rawDetailsRow) {
        const unified = buildUnifiedFlights(
          [rawDetailsRow],
          [rawDetailsRow],
          [],
          airport,
          new Date().toISOString().slice(0, 10)
        );
        flightRecord = unified[0] || null;
      } else {
        const cachedEntry = tokenSnapshotCache.get(cacheKey);
        if (
          cachedEntry &&
          Date.now() - cachedEntry.timestamp <= SNAPSHOT_CACHE_TTL_MS
        ) {
          flightRecord =
            cachedEntry.snapshot.flights.find((f) => f.flightId === flightId) ||
            null;
        }
      }

      const messages = Array.isArray(messagesRes?.data)
        ? messagesRes.data.map((m: any) => ({
            label: String(m.label || ''),
            received: Number(m.Received || 0),
            processed: Number(m.Processed || 0),
          }))
        : [];

      const leadTimes = Array.isArray(leadTimesRes?.data)
        ? leadTimesRes.data.map((lt: any) => ({
            label: String(lt.label || ''),
            value: lt.value != null ? Number(lt.value) : null,
          }))
        : [];

      const summary = Array.isArray(summaryRes?.data)
        ? summaryRes.data.map((s: any) => ({
            label: String(s.label || ''),
            value: String(s.value || '0'),
            percent: Number(s.percent || 0),
          }))
        : [];

      const expectedAtChuteCount =
        Array.isArray(expectedRes?.header) && expectedRes.header[0]?.value
          ? Number(expectedRes.header[0].value)
          : Array.isArray(expectedRes?.data)
            ? expectedRes.data.length
            : 0;

      const responsePayload: FlightDetailResponse = {
        flightId,
        flightRecord,
        messages,
        leadTimes,
        summary,
        expectedAtChuteCount,
        bags,
      };

      res.json(responsePayload);
    } catch (error: unknown) {
      if (isAuthError(error)) {
        clearTokenCache(tokenHash);
        res.status(401).json({ error: 'Sessão expirada ou token inválido.' });
        return;
      }
      console.error(
        '[flight] Error loading flight details:',
        error instanceof Error ? error.message : 'unknown'
      );
      res.status(502).json({
        error: 'Erro ao carregar detalhes do voo.',
      });
    }
  });

  // 4. Baggage Chronology & Trace Endpoint (Supports partial or full 6/10-digit LPN)
  app.get('/api/baggage/trace', async (req, res) => {
    const token = getRequestToken(req);
    const rawLpn = String(req.query.lpn || '').trim();

    if (!token) {
      res.status(401).json({ error: 'Token de autenticação não fornecido.' });
      return;
    }
    if (!rawLpn || !isValidLpn(rawLpn)) {
      res.status(400).json({
        error:
          'Código LPN inválido. Utilize apenas caracteres alfanuméricos (4 a 20 caracteres).',
      });
      return;
    }

    const tokenHash = hashToken(token);

    try {
      // Check if partial LPN matches any bag in the active bags cache for this token
      let matchedBag: BagItem | null = null;
      const now = Date.now();
      const prefix = `${tokenHash}:`;
      for (const [k, entry] of tokenBagsCache.entries()) {
        if (!k.startsWith(prefix)) continue;
        if (now - entry.timestamp > BAGS_CACHE_TTL_MS) continue;
        const found = entry.bags.find(
          (b) =>
            b.lpn.toLowerCase() === rawLpn.toLowerCase() ||
            b.lpn.toLowerCase().endsWith(rawLpn.toLowerCase()) ||
            b.lpn.toLowerCase().includes(rawLpn.toLowerCase())
        );
        if (found) {
          matchedBag = found;
          break;
        }
      }

      const targetLpn = matchedBag ? matchedBag.lpn : rawLpn;

      const [traceRes, bagInfoRes, flightInfoRes] = await Promise.all([
        fetchIndicator('baggageTrace', token, { lpn: targetLpn }).catch((e) => {
          if (isAuthError(e)) throw e;
          return null;
        }),
        fetchIndicator('baggageInfo', token, { lpn: targetLpn }).catch((e) => {
          if (isAuthError(e)) throw e;
          return null;
        }),
        fetchIndicator('flightInfo', token, { lpn: targetLpn }).catch((e) => {
          if (isAuthError(e)) throw e;
          return null;
        }),
      ]);

      const events = normalizeBaggageTraceEvents(
        Array.isArray(traceRes?.data) ? traceRes.data : []
      );

      const baggageInfo = Array.isArray(bagInfoRes?.data)
        ? bagInfoRes.data.map((i: any) => ({
            field: String(i.field || i.label || ''),
            label: String(i.label || ''),
            value: String(i.value || '—'),
          }))
        : [];

      const flightInfo = Array.isArray(flightInfoRes?.data)
        ? flightInfoRes.data.map((i: any) => ({
            field: String(i.field || i.label || ''),
            label: String(i.label === 'Inbond' ? 'Inbound' : i.label || ''),
            value: String(i.value || '—'),
          }))
        : [];

      const payload: BaggageDetailResponse = {
        lpn: targetLpn,
        events,
        baggageInfo,
        flightInfo,
        matchedBag,
      };

      res.json(payload);
    } catch (error: unknown) {
      if (isAuthError(error)) {
        clearTokenCache(tokenHash);
        res.status(401).json({ error: 'Sessão expirada ou token inválido.' });
        return;
      }
      console.error(
        '[baggage] Error tracing baggage:',
        error instanceof Error ? error.message : 'unknown'
      );
      res.status(502).json({
        error: 'Erro ao rastrear bagagem.',
      });
    }
  });

  return app;
}
