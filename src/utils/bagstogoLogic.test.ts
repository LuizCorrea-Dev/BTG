import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildUnifiedFlights,
  calculateDashboardTotals,
  computeArrivalElapsedTime,
  computeDepartureContainerBreakdown,
  enrichArrivalPerformanceRow,
  extractAirlineCode,
  extractBaggageLpnFromBarcode,
  filterBaggageList,
  filterFlights,
  getSwipedGroupIndex,
  groupArrivalsByBelt,
  groupDeparturesByChute,
  normalizeBagItem,
  normalizeBaggageTraceEvents,
  parseBagsToGoPayload,
} from './bagstogoLogic';

test('parseBagsToGoPayload parses double-encoded JSON strings from BagsToGo WCF API', () => {
  const doubleEncoded = JSON.stringify(
    JSON.stringify({
      success: true,
      location: 'OPO',
      data: JSON.stringify([{ Flight: 'TAP-1923', Total_OnRoute: 4 }]),
    })
  );
  const parsed = parseBagsToGoPayload(doubleEncoded);
  assert.equal(parsed.success, true);
  assert.equal(parsed.location, 'OPO');
  assert.equal(Array.isArray(parsed.data), true);
  assert.equal(parsed.data[0].Flight, 'TAP-1923');
});

test('extractAirlineCode extracts ICAO prefix from flight codes', () => {
  assert.equal(extractAirlineCode('TAP-1923'), 'TAP');
  assert.equal(extractAirlineCode('RYR-572'), 'RYR');
  assert.equal(extractAirlineCode('IBE1152'), 'IBE');
});

test('computeArrivalElapsedTime computes live elapsed HH:MM:SS or > 1 hour accurately', () => {
  const serverTime = new Date(2026, 10, 25, 9, 20, 0); // 09:20:00
  assert.equal(computeArrivalElapsedTime('09:17 B', serverTime), '00:03:00');
  assert.equal(computeArrivalElapsedTime('07:30 L', serverTime), '> 1 hour');
});

test('buildUnifiedFlights merges departures, BFF metrics, and arrivals with direction markers', () => {
  const next15 = [
    {
      flightId: 874598,
      Flight: 'TAP-1923',
      'STD/ETD': '10:30',
      Stand: 'S33',
      Chute: '9',
      Total_OnRoute: 4,
      Total_Delivered: 40,
      Total_Loaded: 40,
      Total_Missing: 4,
      Destino: 'LIS',
      DeliveredGate: 'G33',
    },
  ];
  const flightList = [
    {
      flightId: 874598,
      Flight: 'TAP-1923',
      BFF_OnRoute: 2,
      BFF_Delivered: 8,
      BFF_Loaded: 8,
      BFF_Missing: 0,
      Terminal1_OnRoute: 2,
      Terminal1_Delivered: 32,
      Terminal1_Loaded: 32,
      Terminal1_Missing: 4,
    },
  ];
  const serverTime = new Date(2026, 10, 25, 9, 20, 0);
  const arrivals = [
    enrichArrivalPerformanceRow(
      {
        ordering: 1,
        Flight: 'RYR-572',
        Orig: 'MAD',
        BTA: '09:17 B',
        Stand: 'S36',
        Belt: '3',
        time_firstBag: '00:02:54',
        firstBag: '00:00:00',
        time_lastBag: '00:00:00',
        lastBag: '00:00:00',
      },
      0,
      'OPO',
      serverTime
    ),
  ];

  const unified = buildUnifiedFlights(next15, flightList, arrivals, 'OPO', '2026-11-25');
  assert.equal(unified.length, 2);
  assert.equal(unified[0].direction, 'departure');
  assert.equal(unified[0].bffTotal, 18); // 2 + 8 + 8
  assert.equal(unified[0].gate, 'G33');
  assert.equal(unified[1].direction, 'arrival');
  assert.equal(unified[1].timeToFirstBag, '00:03:00');
});

test('filterFlights and calculateDashboardTotals filter and sum metrics in real time', () => {
  const sampleFlights = buildUnifiedFlights(
    [
      {
        flightId: 1,
        Flight: 'TAP-1923',
        Destino: 'LIS',
        'STD/ETD': '10:30',
        Stand: 'S33',
        Chute: '9',
        Total_OnRoute: 4,
        Total_Delivered: 40,
        Total_Loaded: 38,
        Total_Missing: 2,
      },
      {
        flightId: 2,
        Flight: 'IBE-1152',
        Destino: 'MAD',
        'STD/ETD': '11:15',
        Stand: 'S22',
        Chute: '5',
        Total_OnRoute: 6,
        Total_Delivered: 20,
        Total_Loaded: 20,
        Total_Missing: 0,
      },
    ],
    [],
    [],
    'OPO',
    '2026-11-25'
  );

  const tapOnly = filterFlights(sampleFlights, {
    searchQuery: '1923',
    date: '2026-11-25',
    airport: 'OPO',
    airline: 'TAP',
    direction: 'departure',
  });
  assert.equal(tapOnly.length, 1);
  assert.equal(tapOnly[0].flight, 'TAP-1923');

  const totals = calculateDashboardTotals(sampleFlights);
  assert.equal(totals.onRoute, 10);
  assert.equal(totals.delivered, 60);
  assert.equal(totals.loaded, 58);
  assert.equal(totals.missing, 2);
});

test('filterBaggageList supports partial LPN code search and real-time status filters', () => {
  const bags = [
    normalizeBagItem(
      {
        flightId: 874598,
        LPN: '0047577592',
        FLight: 'TAP-1923',
        std: '10:30',
        Destino: 'LIS',
        lastSeen: 'BPM (QUEUE)',
        Chute: '9',
        Status: 'Delivered On Time',
        TerminalID: 'Terminal1',
        LoadedAt: 'AKH20418TP',
      },
      'Loaded'
    ),
    normalizeBagItem(
      {
        flightId: 874598,
        LPN: '0047581335',
        FLight: 'TAP-1923',
        std: '10:30',
        Destino: 'LIS',
        lastSeen: 'SC 21 - HBS',
        Chute: '9',
        Status: 'On Time',
        TerminalID: 'BFF',
        LoadedAt: null,
      },
      'OnRoute'
    ),
  ];

  // Partial 6-digit LPN search
  const matchedPartial = filterBaggageList(bags, {
    query: '577592',
    status: 'ALL',
    airline: 'ALL',
    onlyBff: false,
  });
  assert.equal(matchedPartial.length, 1);
  assert.equal(matchedPartial[0].lpn, '0047577592');

  // Filter by status OnRoute and BFF
  const matchedOnRouteBff = filterBaggageList(bags, {
    query: '',
    status: 'OnRoute',
    airline: 'ALL',
    onlyBff: true,
  });
  assert.equal(matchedOnRouteBff.length, 1);
  assert.equal(matchedOnRouteBff[0].lpn, '0047581335');
});

test('normalizeBaggageTraceEvents formats chronological baggage movement steps', () => {
  const raw = [
    {
      Std: '2026-11-25',
      Airline: 'TAP',
      FlightNr: '1923',
      Destino: 'LIS',
      TagNumber: '0047577592',
      Data: '2026-11-25 06:20:57',
      TipoEvento: 'RECEPCAO DE BSM',
      Scanner: '',
      Chute: '',
      Comentario: 'LOCAL',
      Terminal: null,
    },
    {
      Std: '2026-11-25',
      Airline: 'TAP',
      FlightNr: '1923',
      Destino: 'LIS',
      TagNumber: '0047577592',
      Data: '2026-11-25 06:26:09',
      TipoEvento: 'LEITURA',
      Scanner: '21',
      Chute: '9',
      Comentario: '',
      Terminal: 1,
    },
  ];
  const events = normalizeBaggageTraceEvents(raw);
  assert.equal(events.length, 2);
  assert.equal(events[0].stepNumber, 1);
  assert.equal(events[0].event, 'RECEPCAO DE BSM');
  assert.equal(events[1].scanner, '21');
  assert.equal(events[1].chute, '9');
});

test('groupArrivalsByBelt and groupDeparturesByChute group flights per belt/chute with BY/BT/PRIO/BULK nomenclatures', () => {
  const serverTime = new Date(2026, 10, 25, 10, 0, 0);
  const arrivals = [
    enrichArrivalPerformanceRow(
      { Flight: 'TAP-1924', Orig: 'LIS', BTA: '09:50 B', Stand: 'S35', Belt: '1' },
      0,
      'OPO',
      serverTime
    ),
    enrichArrivalPerformanceRow(
      { Flight: 'KLM-1571', Orig: 'AMS', BTA: '09:45 B', Stand: 'S33', Belt: '1' },
      1,
      'OPO',
      serverTime
    ),
    enrichArrivalPerformanceRow(
      { Flight: 'RYR-3013', Orig: 'CTA', BTA: '09:55 B', Stand: 'S12', Belt: '4' },
      2,
      'OPO',
      serverTime
    ),
  ];

  const beltGroups = groupArrivalsByBelt(arrivals);
  assert.equal(beltGroups.length, 2);
  assert.equal(beltGroups[0].belt, '1');
  assert.equal(beltGroups[0].flights.length, 2);
  assert.equal(beltGroups[0].flights[0].flight, 'TAP-1924');
  assert.equal(beltGroups[0].flights[1].flight, 'KLM-1571');
  assert.equal(beltGroups[1].belt, '4');

  const departures = buildUnifiedFlights(
    [
      {
        flightId: 101,
        Flight: 'TAP-1923',
        Destino: 'LIS',
        'STD/ETD': '10:30',
        Stand: 'S33',
        Chute: '09',
        Total_OnRoute: 5,
        Total_Delivered: 45,
        Total_Loaded: 40,
        Total_Missing: 0,
      },
      {
        flightId: 102,
        Flight: 'RZO-171',
        Destino: 'PDL',
        'STD/ETD': '12:40',
        Stand: 'S32',
        Chute: '9',
        Total_OnRoute: 2,
        Total_Delivered: 30,
        Total_Loaded: 25,
        Total_Missing: 0,
      },
    ],
    [],
    [],
    'OPO',
    '2026-11-25'
  );

  const chuteGroups = groupDeparturesByChute(departures);
  assert.equal(chuteGroups.length, 1);
  assert.equal(chuteGroups[0].chute, '09');
  assert.equal(chuteGroups[0].flights.length, 2);

  const firstDep = computeDepartureContainerBreakdown(departures[0]);
  assert.equal(firstDep.destination, 'LIS');
  assert.equal(firstDep.departureTime, '10:30');
  assert.equal(firstDep.totalBags, 50);
  assert.equal(firstDep.totalLoaded, 40);
  assert.ok(firstDep.totalInbound > 0);
  assert.ok(firstDep.totalContainers >= 3);
  assert.ok(firstDep.containerHeaderSummary.includes('Tipo: ULD AKH'));
  assert.ok(firstDep.containerHeaderSummary.includes('Contentores'));
  assert.equal(firstDep.containerTags.length, 4);
  assert.ok(firstDep.containerTags[0].displayText.includes('malas'));
  assert.ok(firstDep.containerTags[3].displayText.includes('Carrinho BULK'));

  // Circular swipe navigation between Chutes / Belts
  assert.equal(getSwipedGroupIndex(0, 4, 'next'), 1);
  assert.equal(getSwipedGroupIndex(3, 4, 'next'), 0);
  assert.equal(getSwipedGroupIndex(0, 4, 'prev'), 3);
  assert.equal(getSwipedGroupIndex(2, 4, 'prev'), 1);

  // Barcode LPN extraction (IATA 10-digit ITF/Code128, AIM symbology prefix, ULD, partial tag)
  assert.equal(extractBaggageLpnFromBarcode('0047577592'), '0047577592');
  assert.equal(extractBaggageLpnFromBarcode(']I10047577592'), '0047577592');
  assert.equal(extractBaggageLpnFromBarcode('LPN: 3016625418'), '3016625418');
  assert.equal(extractBaggageLpnFromBarcode('AKH20418TP'), 'AKH20418TP');
  assert.equal(extractBaggageLpnFromBarcode('577592'), '577592');
});




