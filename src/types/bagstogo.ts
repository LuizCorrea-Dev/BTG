export type FlightDirection = 'departure' | 'arrival';

export type BagCategory = 'OnRoute' | 'Delivered' | 'Loaded' | 'Missing';

export interface AirportLocation {
  Airport: string;
  AirportName: string;
}

export interface AirlineOption {
  id: string;
  code: string;
  name: string;
}

export interface FlightRecord {
  id: string;
  flightId: number;
  flight: string;
  airlineCode: string;
  airlineName: string;
  airport: string;
  direction: FlightDirection;
  destinationOrOrigin: string;
  btdOrBta: string;
  stand: string;
  chuteOrBelt: string;
  gate: string;
  date: string;
  // Totals (Belt / Conveyor Loading Status)
  onRoute: number;
  delivered: number;
  loaded: number;
  missing: number;
  // BFF Specific breakdown
  bffOnRoute: number;
  bffDelivered: number;
  bffLoaded: number;
  bffMissing: number;
  bffTotal: number;
  // Terminal 1 breakdown
  terminal1OnRoute: number;
  terminal1Delivered: number;
  terminal1Loaded: number;
  terminal1Missing: number;
  // Areeiro breakdown
  areeiroOnRoute: number;
  areeiroDelivered: number;
  areeiroLoaded: number;
  areeiroMissing: number;
  // Arrival performance specific fields (for direction === 'arrival')
  timeToFirstBag?: string;
  firstBag?: string;
  timeToLastBag?: string;
  lastBag?: string;
  beltStatus?: 'ok' | 'warning' | 'error';
  beltTooltip?: string;
  viewChecked?: boolean;
  highlightAlert?: boolean;
}

export interface ArrivalPerformanceRecord {
  id: string;
  ordering: number;
  flightId?: number;
  flight: string;
  airlineCode: string;
  airlineName: string;
  airport: string;
  orig: string;
  bta: string;
  stand: string;
  belt: string;
  timeToFirstBag: string;
  firstBag: string;
  timeToLastBag: string;
  lastBag: string;
  view: boolean;
  beltStatus: 'ok' | 'warning' | 'error';
  beltTooltip: string;
  // Belt / BFF indicators on arrivals
  bffBags: number;
  onRoute: number;
  delivered: number;
  loaded: number;
  missing: number;
}

export interface BagItem {
  lpn: string;
  flightId: number;
  flight: string;
  airlineCode: string;
  airport: string;
  destination: string;
  btd: string;
  lastSeen: string;
  chute: string;
  expectedAtChute: string;
  status: string;
  statusStyle: 'success' | 'warning' | 'error' | 'info';
  category: BagCategory;
  terminalId: string;
  isBff: boolean;
  firstRead: string | null;
  lastDelivery: string | null;
  lastBpm: string | null;
  loadedAt: string | null;
}

export interface BaggageTraceEvent {
  stepNumber: number;
  std: string;
  tagNumber: string;
  airline: string;
  flightNr: string;
  event: string;
  destination: string;
  eventDate: string;
  scanner: string;
  chute: string;
  comments: string;
  terminal: string | number | null;
  bagId?: number;
}

export interface BaggageDetailResponse {
  lpn: string;
  events: BaggageTraceEvent[];
  baggageInfo: Array<{ field: string; label: string; value: string }>;
  flightInfo: Array<{ field: string; label: string; value: string }>;
  matchedBag?: BagItem | null;
}

export interface FlightDetailResponse {
  flightId: number;
  flightRecord: FlightRecord | null;
  messages: Array<{ label: string; received: number; processed: number }>;
  leadTimes: Array<{ label: string; value: number | null }>;
  summary: Array<{ label: string; value: string; percent: number }>;
  expectedAtChuteCount: number;
  bags: BagItem[];
}

export interface SorterChuteStatus {
  id: number;
  hour: string;
  red: number;
  orange: number;
  date: string;
  isFull: boolean;
}

export interface DashboardTotals {
  onRoute: number;
  delivered: number;
  loaded: number;
  missing: number;
  totalBags: number;
  bffTotal: number;
  bffOnRoute: number;
  bffDelivered: number;
  bffLoaded: number;
  bffMissing: number;
  departuresCount: number;
  arrivalsCount: number;
}

export interface FlightFilters {
  searchQuery: string;
  date: string;
  airport: string;
  airline: string;
  direction: 'all' | 'departure' | 'arrival';
}

export interface BaggageFilters {
  query: string;
  status: 'ALL' | BagCategory;
  airline: string;
  onlyBff: boolean;
}

export interface DashboardSnapshot {
  serverTime: string;
  airport: string;
  locations: AirportLocation[];
  flights: FlightRecord[];
  arrivalsPerformance: ArrivalPerformanceRecord[];
  airlines: AirlineOption[];
  activeBags: BagItem[];
  sorterChutes: SorterChuteStatus[];
  fullChuteTime: string;
  lastUpdated: string;
}

export interface ArrivalBeltGroup {
  belt: string;
  flights: ArrivalPerformanceRecord[];
}

export interface DepartureContainerTag {
  id: string;
  codeLabel: string;
  unitTypeLabel: string;
  loadedBags: number;
  expectedBags: number;
  tone: 'by' | 'bt' | 'prio' | 'bulk';
  displayText: string;
}

export interface DepartureFlightContainerInfo {
  flightRecord: FlightRecord;
  flight: string;
  destination: string;
  departureTime: string;
  chute: string;
  stand: string;
  gate: string;
  totalBags: number;
  totalLoaded: number;
  totalOnRoute: number;
  totalDelivered: number;
  totalMissing: number;
  totalInbound: number;
  totalContainers: number;
  containerUnitType: string;
  containerHeaderSummary: string;
  containerTypesLabel: string;
  bulkBags: number;
  bulkLoadedBags: number;
  byCount: number;
  btCount: number;
  prioCount: number;
  nomenclatureText: string;
  nomenclatureBadges: string[];
  containerTags: DepartureContainerTag[];
}

export interface DepartureChuteGroup {
  chute: string;
  flights: DepartureFlightContainerInfo[];
}

