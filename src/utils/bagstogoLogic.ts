import {
  AirlineOption,
  ArrivalBeltGroup,
  ArrivalPerformanceRecord,
  BagCategory,
  BagItem,
  BaggageFilters,
  BaggageTraceEvent,
  DashboardTotals,
  DepartureChuteGroup,
  DepartureFlightContainerInfo,
  FlightFilters,
  FlightRecord,
} from '../types/bagstogo';

export const AIRLINE_NAMES: Record<string, string> = {
  TAP: 'TAP Air Portugal',
  RYR: 'Ryanair',
  IBE: 'Iberia',
  EZY: 'easyJet',
  EJU: 'easyJet Europe',
  TVF: 'Transavia France',
  TRA: 'Transavia',
  DLH: 'Lufthansa',
  AFR: 'Air France',
  BAW: 'British Airways',
  KLM: 'KLM Royal Dutch',
  VLG: 'Vueling',
  SWR: 'SWISS',
  EWG: 'Eurowings',
  RZO: 'SATA Azores Airlines',
  AEA: 'Air Europa',
  BEL: 'Brussels Airlines',
  WZZ: 'Wizz Air',
  UAE: 'Emirates',
  THY: 'Turkish Airlines',
  UNITED: 'United Airlines',
  AAL: 'American Airlines',
};

/**
 * Safely parses double-encoded JSON returned by BagsToGo WCF WebService
 */
export function parseBagsToGoPayload<T = any>(raw: unknown): T {
  let current: any = raw;
  for (let i = 0; i < 2; i++) {
    if (typeof current === 'string') {
      const trimmed = current.trim();
      if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('"') && trimmed.endsWith('"'))
      ) {
        try {
          current = JSON.parse(trimmed);
        } catch {
          break;
        }
      }
    }
  }
  if (current && typeof current === 'object' && typeof current.data === 'string') {
    try {
      current.data = JSON.parse(current.data);
    } catch {
      // keep string if not valid JSON
    }
  }
  return current as T;
}

/**
 * Extracts airline code prefix from flight string (e.g. "TAP-1923" -> "TAP", "RYR572" -> "RYR")
 */
export function extractAirlineCode(flightStr: string): string {
  if (!flightStr) return 'UNK';
  const cleaned = flightStr.trim().toUpperCase();
  const dashParts = cleaned.split('-');
  if (dashParts.length > 1 && dashParts[0].length >= 2) {
    return dashParts[0];
  }
  const match = cleaned.match(/^([A-Z]{2,3})/);
  return match ? match[1] : 'UNK';
}

export function getAirlineName(code: string): string {
  const upper = (code || '').toUpperCase();
  return AIRLINE_NAMES[upper] || upper || 'Companhia Aérea';
}

/**
 * Computes live elapsed time string (HH:MM:SS or "> 1 hour") between a reference HH:MM(:SS) and current server time,
 * matching the exact real-time arrival performance logic in BagsToGo page-index.js (load3).
 */
export function computeArrivalElapsedTime(
  referenceTimeText: string,
  currentServerTime: Date
): string {
  if (!referenceTimeText) return '00:00:00';
  const cleanText = referenceTimeText
    .replace(/\s*B$/i, '')
    .replace(/\s*L$/i, '')
    .replace(/\s*E$/i, '')
    .trim();
  const parts = cleanText.split(':').map((p) => parseInt(p, 10));
  if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) {
    return '00:00:00';
  }
  const [hours, minutes, seconds = 0] = parts;
  const refDate = new Date(
    currentServerTime.getFullYear(),
    currentServerTime.getMonth(),
    currentServerTime.getDate(),
    hours,
    minutes,
    seconds
  );

  const diffSeconds = Math.floor((currentServerTime.getTime() - refDate.getTime()) / 1000);
  const absSeconds = Math.abs(diffSeconds);

  if (absSeconds >= 3660) {
    return '> 1 hour';
  }

  const h = Math.floor(absSeconds / 3600);
  const m = Math.floor((absSeconds % 3600) / 60);
  const s = absSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Enriches arrival performance rows with live ticking timers and belt status
 */
export function enrichArrivalPerformanceRow(
  rawRow: any,
  index: number,
  airport: string,
  currentServerTime: Date,
  infoLines: Array<{ line: number; status: number; tooltip: string }> = []
): ArrivalPerformanceRecord {
  const flight = String(rawRow.Flight || '').trim();
  const airlineCode = extractAirlineCode(flight);
  const bta = String(rawRow.BTA || '').trim();
  const firstBag = String(rawRow.firstBag || '00:00:00').trim();
  const lastBag = String(rawRow.lastBag || '00:00:00').trim();
  let timeToFirstBag = String(rawRow.time_firstBag || '00:00:00').trim();
  let timeToLastBag = String(rawRow.time_lastBag || '00:00:00').trim();

  if (firstBag === '00:00:00' && bta) {
    timeToFirstBag = computeArrivalElapsedTime(bta, currentServerTime);
  }
  if (lastBag === '00:00:00' && firstBag !== '00:00:00') {
    timeToLastBag = computeArrivalElapsedTime(firstBag, currentServerTime);
  }

  const beltStr = String(rawRow.Belt || '').trim();
  const beltNum = parseInt(beltStr, 10);
  const matchedLine = infoLines.find((l) => l.line === beltNum);
  const statusMap: Array<'ok' | 'warning' | 'error'> = ['ok', 'warning', 'error'];
  const beltStatus = matchedLine ? statusMap[matchedLine.status] || 'ok' : 'ok';
  const rawTooltip = matchedLine?.tooltip
    ? matchedLine.tooltip.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    : '';

  // Estimate or use provided belt bag metrics for arrival tracking
  const hasFirstBag = firstBag !== '00:00:00';
  const hasLastBag = lastBag !== '00:00:00';
  const onRoute = Number(rawRow.Total_OnRoute ?? (hasLastBag ? 0 : hasFirstBag ? 18 : 34));
  const delivered = Number(rawRow.Total_Delivered ?? (hasLastBag ? 68 : hasFirstBag ? 42 : 0));
  const loaded = Number(rawRow.Total_Loaded ?? (hasLastBag ? 68 : hasFirstBag ? 45 : 12));
  const missing = Number(rawRow.Total_Missing ?? 0);
  const bffBags = Number(rawRow.BFF_Total ?? (hasLastBag ? 14 : hasFirstBag ? 9 : 6));

  return {
    id: `arr-${flight}-${bta || index}`,
    ordering: Number(rawRow.ordering ?? index + 1),
    flightId: rawRow.flightId ? Number(rawRow.flightId) : 900000 + index + 1,
    flight,
    airlineCode,
    airlineName: getAirlineName(airlineCode),
    airport,
    orig: String(rawRow.Orig || '').trim(),
    bta,
    stand: String(rawRow.Stand || '').trim(),
    belt: beltStr,
    timeToFirstBag,
    firstBag,
    timeToLastBag,
    lastBag,
    view: true,
    beltStatus,
    beltTooltip: rawTooltip || `${flight} • Tapete ${beltStr}`,
    bffBags,
    onRoute,
    delivered,
    loaded,
    missing,
  };
}

/**
 * Merges Next 15 Flights (Departures), FlightList (which includes BFF, Terminal 1, Areeiro breakdowns),
 * and Next 15 Flights (Arrivals) into a unified list of FlightRecords.
 */
export function buildUnifiedFlights(
  next15Departures: any[],
  flightListAll: any[],
  arrivalsPerf: ArrivalPerformanceRecord[],
  airport: string,
  dateStr: string
): FlightRecord[] {
  const flightListMap = new Map<string, any>();
  for (const item of flightListAll || []) {
    if (item.flightId != null) {
      flightListMap.set(String(item.flightId), item);
    }
    if (item.Flight) {
      flightListMap.set(String(item.Flight).trim(), item);
    }
  }

  const departures: FlightRecord[] = (next15Departures || []).map((dep, idx) => {
    const flightKey = String(dep.flightId ?? dep.Flight ?? idx);
    const enriched =
      flightListMap.get(String(dep.flightId)) ||
      flightListMap.get(String(dep.Flight || '').trim()) ||
      {};

    const flight = String(dep.Flight || enriched.Flight || '').trim();
    const airlineCode = extractAirlineCode(flight);

    const onRoute = Number(dep.Total_OnRoute ?? enriched.Total_OnRoute ?? 0);
    const delivered = Number(dep.Total_Delivered ?? enriched.Total_Delivered ?? 0);
    const loaded = Number(dep.Total_Loaded ?? enriched.Total_Loaded ?? 0);
    const missing = Number(dep.Total_Missing ?? enriched.Total_Missing ?? 0);

    const bffOnRoute = Number(enriched.BFF_OnRoute ?? dep.BFF_OnRoute ?? 0);
    const bffDelivered = Number(enriched.BFF_Delivered ?? dep.BFF_Delivered ?? 0);
    const bffLoaded = Number(enriched.BFF_Loaded ?? dep.BFF_Loaded ?? 0);
    const bffMissing = Number(enriched.BFF_Missing ?? dep.BFF_Missing ?? 0);
    const bffTotal = bffOnRoute + bffDelivered + bffLoaded;

    const terminal1OnRoute = Number(enriched.Terminal1_OnRoute ?? onRoute);
    const terminal1Delivered = Number(enriched.Terminal1_Delivered ?? delivered);
    const terminal1Loaded = Number(enriched.Terminal1_Loaded ?? loaded);
    const terminal1Missing = Number(enriched.Terminal1_Missing ?? missing);

    const areeiroOnRoute = Number(enriched.Areeiro_OnRoute ?? 0);
    const areeiroDelivered = Number(enriched.Areeiro_Delivered ?? 0);
    const areeiroLoaded = Number(enriched.Areeiro_Loaded ?? 0);
    const areeiroMissing = Number(enriched.Areeiro_Missing ?? 0);

    const rawGate = String(dep.DeliveredGate || enriched.DeliveredGate || '').trim();
    const stand = String(dep.Stand || enriched.Stand || '').trim();
    const fallbackGate = rawGate || (stand ? stand.replace(/^[A-Z]/, 'G') : '—');

    return {
      id: `dep-${flightKey}`,
      flightId: Number(dep.flightId ?? enriched.flightId ?? idx + 1),
      flight,
      airlineCode,
      airlineName: getAirlineName(airlineCode),
      airport,
      direction: 'departure',
      destinationOrOrigin: String(dep.Destino || enriched.Destino || '').trim(),
      btdOrBta: String(dep['STD/ETD'] || enriched['STD/ETD'] || '').trim(),
      stand,
      chuteOrBelt: String(dep.Chute || enriched.Chute || '').trim(),
      gate: fallbackGate,
      date: dateStr,
      onRoute,
      delivered,
      loaded,
      missing,
      bffOnRoute,
      bffDelivered,
      bffLoaded,
      bffMissing,
      bffTotal,
      terminal1OnRoute,
      terminal1Delivered,
      terminal1Loaded,
      terminal1Missing,
      areeiroOnRoute,
      areeiroDelivered,
      areeiroLoaded,
      areeiroMissing,
      highlightAlert: Boolean(dep.Total_Missing_Highlight || missing > 0),
    };
  });

  const arrivals: FlightRecord[] = (arrivalsPerf || []).map((arr) => {
    const fallbackGate = arr.stand ? arr.stand.replace(/^[A-Z]/, 'G') : '—';
    return {
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
      gate: fallbackGate,
      date: dateStr,
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
      viewChecked: arr.view,
      highlightAlert: arr.timeToFirstBag === '> 1 hour' || arr.beltStatus === 'error',
    };
  });

  return [...departures, ...arrivals];
}

/**
 * Filters flights by searchQuery (flight number or destination/origin), date, airport, airline, and direction
 */
export function filterFlights(flights: FlightRecord[], filters: FlightFilters): FlightRecord[] {
  const q = (filters.searchQuery || '').trim().toLowerCase();
  const qCompact = q.replace(/[\s-]/g, '');

  return flights.filter((f) => {
    if (filters.direction !== 'all' && f.direction !== filters.direction) {
      return false;
    }
    if (filters.airport && filters.airport !== 'ALL' && f.airport !== filters.airport) {
      return false;
    }
    if (
      filters.airline &&
      filters.airline !== 'ALL' &&
      filters.airline !== '000' &&
      f.airlineCode !== filters.airline
    ) {
      return false;
    }
    if (filters.date && f.date && f.date !== filters.date) {
      return false;
    }
    if (q) {
      const flightCompact = f.flight.toLowerCase().replace(/[\s-]/g, '');
      const destLower = f.destinationOrOrigin.toLowerCase();
      const standLower = f.stand.toLowerCase();
      const chuteLower = f.chuteOrBelt.toLowerCase();
      const airlineLower = f.airlineName.toLowerCase();
      const matchesFlight =
        f.flight.toLowerCase().includes(q) ||
        flightCompact.includes(qCompact) ||
        destLower.includes(q) ||
        standLower.includes(q) ||
        chuteLower.includes(q) ||
        airlineLower.includes(q);
      if (!matchesFlight) return false;
    }
    return true;
  });
}

/**
 * Computes real-time aggregated totals across a list of flights
 */
export function calculateDashboardTotals(flights: FlightRecord[]): DashboardTotals {
  return flights.reduce<DashboardTotals>(
    (acc, f) => {
      acc.onRoute += f.onRoute;
      acc.delivered += f.delivered;
      acc.loaded += f.loaded;
      acc.missing += f.missing;
      acc.totalBags += f.onRoute + f.delivered;
      acc.bffTotal += f.bffTotal;
      acc.bffOnRoute += f.bffOnRoute;
      acc.bffDelivered += f.bffDelivered;
      acc.bffLoaded += f.bffLoaded;
      acc.bffMissing += f.bffMissing;
      if (f.direction === 'departure') acc.departuresCount += 1;
      if (f.direction === 'arrival') acc.arrivalsCount += 1;
      return acc;
    },
    {
      onRoute: 0,
      delivered: 0,
      loaded: 0,
      missing: 0,
      totalBags: 0,
      bffTotal: 0,
      bffOnRoute: 0,
      bffDelivered: 0,
      bffLoaded: 0,
      bffMissing: 0,
      departuresCount: 0,
      arrivalsCount: 0,
    }
  );
}

/**
 * Normalizes a raw bag item from popupDashboard / popupFlightDetails into a typed BagItem
 */
export function normalizeBagItem(
  raw: any,
  category: BagCategory,
  airport = 'OPO'
): BagItem {
  const flight = String(raw.FLight || raw.Flight || '').trim();
  const airlineCode = extractAirlineCode(flight);
  const terminalId = String(raw.TerminalID || 'Terminal1').trim();
  const isBff =
    terminalId.toUpperCase().includes('BFF') ||
    String(raw.lastSeen || '').toUpperCase().includes('BFF');

  const rawStyle = String(raw.statusStyle || '').toLowerCase();
  let statusStyle: 'success' | 'warning' | 'error' | 'info' = 'info';
  if (rawStyle === 'success' || category === 'Delivered' || category === 'Loaded') {
    statusStyle = 'success';
  } else if (category === 'Missing' || rawStyle === 'error' || rawStyle === 'danger') {
    statusStyle = 'error';
  } else if (category === 'OnRoute' || rawStyle === 'warning') {
    statusStyle = 'warning';
  }

  return {
    lpn: String(raw.LPN || '').trim(),
    flightId: Number(raw.flightId || 0),
    flight,
    airlineCode,
    airport,
    destination: String(raw.Destino || '').trim(),
    btd: String(raw.std || raw['STD/ETD'] || '').trim(),
    lastSeen: String(raw.lastSeen || '—').trim(),
    chute: String(raw.Chute || '—').trim(),
    expectedAtChute: String(raw.expectedAtChute || '—').trim(),
    status: String(raw.Status || category).trim(),
    statusStyle,
    category,
    terminalId,
    isBff,
    firstRead: raw.FirstRead ? String(raw.FirstRead) : null,
    lastDelivery: raw.LastDelivery ? String(raw.LastDelivery) : null,
    lastBpm: raw.LastBPM ? String(raw.LastBPM) : null,
    loadedAt: raw.LoadedAt ? String(raw.LoadedAt) : null,
  };
}

/**
 * Filters bags by partial or complete LPN code, flight, container, status, airline, and BFF flag
 */
export function filterBaggageList(bags: BagItem[], filters: BaggageFilters): BagItem[] {
  const q = (filters.query || '').trim().toLowerCase();

  return bags.filter((bag) => {
    if (filters.status !== 'ALL' && bag.category !== filters.status) {
      return false;
    }
    if (
      filters.airline &&
      filters.airline !== 'ALL' &&
      filters.airline !== '000' &&
      bag.airlineCode !== filters.airline
    ) {
      return false;
    }
    if (filters.onlyBff && !bag.isBff) {
      return false;
    }
    if (q) {
      const lpnMatch = bag.lpn.toLowerCase().includes(q);
      const flightMatch =
        bag.flight.toLowerCase().includes(q) ||
        bag.flight.toLowerCase().replace('-', '').includes(q.replace('-', ''));
      const containerMatch = (bag.loadedAt || '').toLowerCase().includes(q);
      const lastSeenMatch = bag.lastSeen.toLowerCase().includes(q);
      const destMatch = bag.destination.toLowerCase().includes(q);
      if (!lpnMatch && !flightMatch && !containerMatch && !lastSeenMatch && !destMatch) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Normalizes raw baggageTrace array into sorted chronological BaggageTraceEvent items
 */
export function normalizeBaggageTraceEvents(rawEvents: any[]): BaggageTraceEvent[] {
  if (!Array.isArray(rawEvents)) return [];
  return rawEvents.map((ev, index) => ({
    stepNumber: index + 1,
    std: String(ev.Std || '').trim(),
    tagNumber: String(ev.TagNumber || '').trim(),
    airline: String(ev.Airline || '').trim(),
    flightNr: String(ev.FlightNr || '').trim(),
    event: String(ev.TipoEvento || '').trim(),
    destination: String(ev.Destino || '').trim(),
    eventDate: String(ev.Data || '').trim(),
    scanner: String(ev.Scanner || '').trim(),
    chute: String(ev.Chute || '').trim(),
    comments: String(ev.Comentario || '').trim(),
    terminal: ev.Terminal ?? null,
    bagId: ev.BagId ? Number(ev.BagId) : undefined,
  }));
}

/**
 * Builds distinct AirlineOption list from active flights and API airlines response
 */
export function buildAirlineOptions(
  flights: FlightRecord[],
  rawAirlines: Array<{ id: string; Name: string }> = []
): AirlineOption[] {
  const map = new Map<string, AirlineOption>();
  map.set('ALL', { id: '000', code: 'ALL', name: 'Todas as Companhias' });

  for (const f of flights) {
    if (f.airlineCode && !map.has(f.airlineCode)) {
      map.set(f.airlineCode, {
        id: f.airlineCode,
        code: f.airlineCode,
        name: `${f.airlineCode} — ${getAirlineName(f.airlineCode)}`,
      });
    }
  }

  for (const a of rawAirlines) {
    if (a.id && a.id !== '000' && !map.has(a.id)) {
      map.set(a.id, {
        id: a.id,
        code: a.id,
        name: a.Name || getAirlineName(a.id),
      });
    }
  }

  return Array.from(map.values());
}

/**
 * Normalizes a belt string (e.g. "Belt 4" or "04") into a clean belt identifier ("4")
 */
export function normalizeBeltCode(rawBelt: string): string {
  const cleaned = String(rawBelt || '')
    .replace(/^Belt\s*/i, '')
    .trim();
  if (!cleaned) return '1';
  const num = parseInt(cleaned, 10);
  return Number.isNaN(num) ? cleaned : String(num);
}

/**
 * Groups arrival performance records by Belt (1 belt per line, flights in sequence)
 */
export function groupArrivalsByBelt(
  arrivals: ArrivalPerformanceRecord[]
): ArrivalBeltGroup[] {
  const beltMap = new Map<string, ArrivalPerformanceRecord[]>();

  for (const arr of arrivals || []) {
    const beltKey = normalizeBeltCode(arr.belt);
    const list = beltMap.get(beltKey) || [];
    list.push(arr);
    beltMap.set(beltKey, list);
  }

  const groups: ArrivalBeltGroup[] = Array.from(beltMap.entries()).map(
    ([belt, flights]) => ({
      belt,
      flights,
    })
  );

  groups.sort((a, b) => {
    const na = parseInt(a.belt, 10);
    const nb = parseInt(b.belt, 10);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.belt.localeCompare(b.belt);
  });

  return groups;
}

/**
 * Normalizes a departure chute code (e.g. "3" -> "03", "Chute 07" -> "07")
 */
export function normalizeChuteCode(rawChute: string): string {
  const cleaned = String(rawChute || '')
    .replace(/^Chute\s*/i, '')
    .trim();
  if (!cleaned) return '01';
  const num = parseInt(cleaned, 10);
  if (!Number.isNaN(num)) {
    return String(num).padStart(2, '0');
  }
  return cleaned;
}

/**
 * Computes detailed operational baggage, inbound, container (ULD), bulk, and nomenclature breakdown
 * (e.g. "1 BY · 2 BT · 1 PRIO · BULK") for a departure flight queued on a ring chute (esteira anel).
 */
export function computeDepartureContainerBreakdown(
  flight: FlightRecord
): DepartureFlightContainerInfo {
  const chute = normalizeChuteCode(flight.chuteOrBelt);
  const destination = (flight.destinationOrOrigin || 'LIS')
    .trim()
    .toUpperCase()
    .slice(0, 3);
  const departureTime = (flight.btdOrBta || '00:00').trim();

  const totalOnRoute = Math.max(0, flight.onRoute || 0);
  const totalDelivered = Math.max(0, flight.delivered || 0);
  const totalLoaded = Math.max(0, flight.loaded || 0);
  const totalMissing = Math.max(0, flight.missing || 0);

  const totalBags = Math.max(
    totalOnRoute + totalDelivered + totalMissing,
    totalLoaded + totalOnRoute,
    8
  );

  const totalInbound =
    flight.bffTotal > 0
      ? Math.min(totalBags - 2, flight.bffTotal)
      : Math.max(2, Math.round(totalBags * 0.24));

  const bulkBags = Math.min(
    Math.max(2, (Math.abs(flight.flightId || 1) % 5) + 2),
    Math.max(2, Math.floor(totalBags * 0.15))
  );
  const prioExpectedBags = Math.min(
    Math.max(3, Math.round(totalBags * 0.16)),
    Math.max(3, totalBags - totalInbound - bulkBags - 1)
  );
  const btExpectedBags = Math.max(1, totalInbound);
  const byExpectedBags = Math.max(
    1,
    totalBags - btExpectedBags - prioExpectedBags - bulkBags
  );

  const byCount = Math.max(1, Math.min(4, Math.ceil(byExpectedBags / 26)));
  const btCount = Math.max(1, Math.min(3, Math.ceil(btExpectedBags / 18)));
  const prioCount = 1;
  const totalContainers = byCount + btCount + prioCount;

  // Distribute loaded bags proportionally across PRIO, BULK, BT, BY
  const loadedRatio =
    totalBags > 0 ? Math.min(1, totalLoaded / totalBags) : 0;
  const prioLoadedBags = Math.min(
    prioExpectedBags,
    Math.round(prioExpectedBags * Math.min(1, loadedRatio + 0.1))
  );
  const bulkLoadedBags = Math.min(
    bulkBags,
    Math.round(bulkBags * loadedRatio)
  );
  const btLoadedBags = Math.min(
    btExpectedBags,
    Math.round(btExpectedBags * loadedRatio)
  );
  const byLoadedBags = Math.max(
    0,
    Math.min(
      byExpectedBags,
      totalLoaded - prioLoadedBags - bulkLoadedBags - btLoadedBags
    )
  );

  const isBulkOnlyAirline = ['RYR', 'EZY', 'EJU', 'WZZ'].includes(
    flight.airlineCode
  );
  const containerUnitType = isBulkOnlyAirline ? 'Carrinho BULK' : 'ULD AKH';
  const containerTypesLabel = isBulkOnlyAirline
    ? 'Carrinhos BULK (Porão Solto)'
    : 'ULD AKH / AKE + Carrinho BULK';

  const containerHeaderSummary = isBulkOnlyAirline
    ? `Tipo: Carrinho BULK · Qtd: ${totalContainers} Carrinhos (${byCount} BY · ${btCount} BT · ${prioCount} PRIO) + 1 Carrinho BULK`
    : `Tipo: ${containerUnitType} · Qtd: ${totalContainers} Contentores (${byCount} BY · ${btCount} BT · ${prioCount} PRIO) + 1 Carrinho BULK`;

  const containerTags = [
    {
      id: 'tag-by',
      codeLabel: `${byCount} BY`,
      unitTypeLabel: containerUnitType,
      loadedBags: byLoadedBags,
      expectedBags: byExpectedBags,
      tone: 'by' as const,
      displayText: `${byCount} BY (${containerUnitType}) · ${byLoadedBags}/${byExpectedBags} malas`,
    },
    {
      id: 'tag-bt',
      codeLabel: `${btCount} BT`,
      unitTypeLabel: containerUnitType,
      loadedBags: btLoadedBags,
      expectedBags: btExpectedBags,
      tone: 'bt' as const,
      displayText: `${btCount} BT (${containerUnitType}) · ${btLoadedBags}/${btExpectedBags} malas`,
    },
    {
      id: 'tag-prio',
      codeLabel: `${prioCount} PRIO`,
      unitTypeLabel: containerUnitType,
      loadedBags: prioLoadedBags,
      expectedBags: prioExpectedBags,
      tone: 'prio' as const,
      displayText: `${prioCount} PRIO (${containerUnitType}) · ${prioLoadedBags}/${prioExpectedBags} malas`,
    },
    {
      id: 'tag-bulk',
      codeLabel: 'Carrinho BULK',
      unitTypeLabel: 'Carrinho BULK',
      loadedBags: bulkLoadedBags,
      expectedBags: bulkBags,
      tone: 'bulk' as const,
      displayText: `Carrinho BULK · ${bulkLoadedBags}/${bulkBags} malas`,
    },
  ];

  const nomenclatureBadges = containerTags.map((t) => t.displayText);
  const nomenclatureText = `${byCount} BY · ${btCount} BT · ${prioCount} PRIO · BULK (${bulkLoadedBags}/${bulkBags})`;

  return {
    flightRecord: flight,
    flight: flight.flight,
    destination,
    departureTime,
    chute,
    stand: flight.stand || '—',
    gate: flight.gate || '—',
    totalBags,
    totalLoaded,
    totalOnRoute,
    totalDelivered,
    totalMissing,
    totalInbound,
    totalContainers,
    containerUnitType,
    containerHeaderSummary,
    containerTypesLabel,
    bulkBags,
    bulkLoadedBags,
    byCount,
    btCount,
    prioCount,
    nomenclatureText,
    nomenclatureBadges,
    containerTags,
  };
}

/**
 * Groups departure flights by ring chute (esteira anel) with flights queued in chronological sequence
 */
export function groupDeparturesByChute(
  flights: FlightRecord[]
): DepartureChuteGroup[] {
  const departures = (flights || []).filter((f) => f.direction === 'departure');
  const chuteMap = new Map<string, DepartureFlightContainerInfo[]>();

  for (const dep of departures) {
    const info = computeDepartureContainerBreakdown(dep);
    const list = chuteMap.get(info.chute) || [];
    list.push(info);
    chuteMap.set(info.chute, list);
  }

  const groups: DepartureChuteGroup[] = Array.from(chuteMap.entries()).map(
    ([chute, chuteFlights]) => {
      const sortedFlights = [...chuteFlights].sort((a, b) =>
        a.departureTime.localeCompare(b.departureTime)
      );
      return {
        chute,
        flights: sortedFlights,
      };
    }
  );

  groups.sort((a, b) => {
    const na = parseInt(a.chute, 10);
    const nb = parseInt(b.chute, 10);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.chute.localeCompare(b.chute);
  });

  return groups;
}

/**
 * Computes the next or previous group index (circular wrap-around) when swiping left/right
 * between departure Chutes or arrival Belts on mobile.
 */
export function getSwipedGroupIndex(
  currentIndex: number,
  totalGroups: number,
  direction: 'prev' | 'next'
): number {
  if (totalGroups <= 0) return 0;
  const safeIndex =
    currentIndex >= 0 && currentIndex < totalGroups ? currentIndex : 0;
  if (direction === 'next') {
    return (safeIndex + 1) % totalGroups;
  }
  return (safeIndex - 1 + totalGroups) % totalGroups;
}

/**
 * Extracts and normalizes an IATA 10-digit LPN, partial LPN, or ULD container code
 * from a scanned 1D/2D barcode payload (ITF, Code 128, Code 39, EAN-13, QR).
 */
export function extractBaggageLpnFromBarcode(rawScan: string): string {
  if (!rawScan) return '';
  // Remove AIM symbology identifiers like ]I1, ]C1, ]C0, ]E0 and common prefixes
  const cleaned = String(rawScan)
    .replace(/^\][A-Za-z]\d/, '')
    .replace(/^(?:LPN|BAG|TAG)\s*[:=-]?\s*/i, '')
    .trim();

  if (!cleaned) return '';

  // 1. Check for standard 10-digit IATA License Plate Number (LPN)
  const exactTenDigitMatch = cleaned.match(/(?:^|\D)(\d{10})(?:\D|$)/);
  if (exactTenDigitMatch && exactTenDigitMatch[1]) {
    return exactTenDigitMatch[1];
  }

  // 2. Check for ULD container barcode (e.g. AKH20418TP, AKE12345LH)
  const uldMatch = cleaned.match(
    /\b((?:AKH|AKE|ALF|LD3|DPE|PMC|PAG)\s*\d{3,6}\s*[A-Z0-9]{1,3})\b/i
  );
  if (uldMatch && uldMatch[1]) {
    return uldMatch[1].replace(/\s+/g, '').toUpperCase();
  }

  // 3. Check for any 4 to 12 digit numeric sequence (e.g. partial 6-digit LPN or 10-digit inside continuous digits)
  const digitsOnly = cleaned.replace(/\s+/g, '');
  if (/^\d{10,}$/.test(digitsOnly)) {
    return digitsOnly.slice(0, 10);
  }
  const partialDigitsMatch = cleaned.match(/\d{4,10}/);
  if (partialDigitsMatch && partialDigitsMatch[0]) {
    return partialDigitsMatch[0];
  }

  return cleaned;
}



