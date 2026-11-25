import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ThemeProvider } from 'styled-components';
import { darkTheme, GlobalThemeStyle, lightTheme } from './theme/theme';
import {
  BagCategory,
  BaggageDetailResponse,
  BaggageFilters,
  DashboardSnapshot,
  FlightDetailResponse,
  FlightFilters,
  FlightRecord,
} from './types/bagstogo';
import {
  calculateDashboardTotals,
  filterFlights,
} from './utils/bagstogoLogic';
import { AppShell, MainViewport } from './components/ui/Primitives';
import { ActiveTab, TopBar } from './components/TopBar';
import { LoginView } from './components/LoginView';
import { BffAndBeltSummary } from './components/BffAndBeltSummary';
import { Next15FlightsView } from './components/Next15FlightsView';
import { ArrivalsPerformanceView } from './components/ArrivalsPerformanceView';
import { DeparturesChutesView } from './components/DeparturesChutesView';
import { BaggageSearchView } from './components/BaggageSearchView';
import { FlightDetailModal } from './components/FlightDetailModal';
import { BaggageTimelineModal } from './components/BaggageTimelineModal';

export default function App() {
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Ephemeral session state (never persisted in localStorage/cookies per user requirement)
  const [authToken, setAuthToken] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [sessionAirport, setSessionAirport] = useState<string>('OPO');
  const [wsConnected, setWsConnected] = useState<boolean>(false);

  // Live Dashboard Snapshot
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(false);

  // Filters for Next 15 Flights
  const [flightFilters, setFlightFilters] = useState<FlightFilters>({
    searchQuery: '',
    date: '',
    airport: 'ALL',
    airline: 'ALL',
    direction: 'all',
  });

  // Filters for Real-Time Baggage Search
  const [baggageFilters, setBaggageFilters] = useState<BaggageFilters>({
    query: '',
    status: 'ALL',
    airline: 'ALL',
    onlyBff: false,
  });

  // Selected Flight Detail Modal State
  const [selectedFlight, setSelectedFlight] = useState<FlightRecord | null>(null);
  const [flightDetail, setFlightDetail] = useState<FlightDetailResponse | null>(
    null
  );
  const [isFlightDetailLoading, setIsFlightDetailLoading] =
    useState<boolean>(false);

  // Selected Baggage Chronology Modal State
  const [baggageDetail, setBaggageDetail] =
    useState<BaggageDetailResponse | null>(null);
  const [isBaggageDetailLoading, setIsBaggageDetailLoading] =
    useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);

  // Sync dark mode class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', themeMode === 'dark');
  }, [themeMode]);

  const handleLogout = useCallback(() => {
    setAuthToken('');
    setUsername('');
    setSnapshot(null);
    setSelectedFlight(null);
    setFlightDetail(null);
    setBaggageDetail(null);
  }, []);

  const fetchDashboardRest = useCallback(
    async (token: string, airportCode: string) => {
      if (!token) return;
      try {
        const res = await fetch(
          `/api/dashboard?airport=${encodeURIComponent(airportCode)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (res.status === 401) {
          handleLogout();
          return;
        }
        if (res.ok) {
          const data: DashboardSnapshot = await res.json();
          setSnapshot(data);
        }
      } catch {
        // silent fallback if offline
      } finally {
        setIsInitialLoading(false);
      }
    },
    [handleLogout]
  );

  // Connect WebSocket for instant real-time updates, with automatic REST polling fallback (e.g. Vercel serverless)
  useEffect(() => {
    if (!authToken) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setWsConnected(false);
      return;
    }

    let disposed = false;
    let pollIntervalId: ReturnType<typeof setInterval> | null = null;
    let ws: WebSocket | null = null;

    const stopRestPolling = () => {
      if (pollIntervalId !== null) {
        clearInterval(pollIntervalId);
        pollIntervalId = null;
      }
    };

    const startRestPollingFallback = () => {
      if (disposed || pollIntervalId !== null) return;
      pollIntervalId = setInterval(() => {
        fetchDashboardRest(authToken, sessionAirport);
      }, 6000);
    };

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (disposed) {
          ws?.close();
          return;
        }
        stopRestPolling();
        setWsConnected(true);
        ws?.send(
          JSON.stringify({
            type: 'subscribe',
            token: authToken,
            airport: sessionAirport,
          })
        );
      };

      ws.onmessage = (event) => {
        if (disposed) return;
        try {
          const msg = JSON.parse(String(event.data));
          if (msg.type === 'dashboard_update' && msg.payload) {
            setSnapshot(msg.payload);
            setIsInitialLoading(false);
          }
        } catch {
          // ignore invalid json
        }
      };

      ws.onerror = () => {
        if (disposed) return;
        setWsConnected(false);
        startRestPollingFallback();
      };

      ws.onclose = (event) => {
        if (disposed) return;
        setWsConnected(false);
        if (event.code === 4001) {
          handleLogout();
          return;
        }
        startRestPollingFallback();
      };
    } catch {
      setWsConnected(false);
      startRestPollingFallback();
    }

    return () => {
      disposed = true;
      stopRestPolling();
      if (ws) {
        ws.close();
      }
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
    };
  }, [authToken, sessionAirport, fetchDashboardRest, handleLogout]);

  const handleLoginSuccess = (authData: {
    token: string;
    location: string;
    username: string;
  }) => {
    setAuthToken(authData.token);
    setSessionAirport(authData.location || 'OPO');
    setUsername(authData.username);
    setIsInitialLoading(true);
    fetchDashboardRest(authData.token, authData.location || 'OPO');
  };

  const handleToggleFullScreen = () => {
    setIsFullScreen((prev) => !prev);
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    } catch {
      // ignore iframe fullscreen restriction
    }
  };

  const handleSelectFlight = async (flight: FlightRecord) => {
    setSelectedFlight(flight);
    setFlightDetail(null);
    setIsFlightDetailLoading(true);
    try {
      const res = await fetch(
        `/api/flight/${flight.flightId}?airport=${encodeURIComponent(
          flight.airport
        )}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      if (res.ok) {
        const data: FlightDetailResponse = await res.json();
        setFlightDetail(data);
      }
    } catch {
      // keep fallback flight summary
    } finally {
      setIsFlightDetailLoading(false);
    }
  };

  const handleSelectBagLpn = async (lpn: string) => {
    if (!lpn) return;
    setBaggageDetail(null);
    setIsBaggageDetailLoading(true);
    try {
      const res = await fetch(
        `/api/baggage/trace?lpn=${encodeURIComponent(lpn)}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      if (res.ok) {
        const data: BaggageDetailResponse = await res.json();
        setBaggageDetail(data);
      }
    } catch {
      // ignore
    } finally {
      setIsBaggageDetailLoading(false);
    }
  };

  const handleCategoryCardClick = (cat: 'ALL' | BagCategory | 'BFF') => {
    setActiveTab('baggage');
    if (cat === 'BFF') {
      setBaggageFilters((prev) => ({
        ...prev,
        status: 'ALL',
        onlyBff: true,
      }));
    } else {
      setBaggageFilters((prev) => ({
        ...prev,
        status: cat,
        onlyBff: false,
      }));
    }
  };

  const filteredFlights = useMemo(() => {
    return filterFlights(snapshot?.flights || [], flightFilters);
  }, [snapshot?.flights, flightFilters]);

  const dashboardTotals = useMemo(() => {
    return calculateDashboardTotals(filteredFlights);
  }, [filteredFlights]);

  const [isLandscapeMobile, setIsLandscapeMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth > window.innerHeight && window.innerWidth <= 1024;
  });

  useEffect(() => {
    const checkOrientation = () => {
      const landscape =
        window.innerWidth > window.innerHeight && window.innerWidth <= 1024;
      setIsLandscapeMobile((prev) => {
        if (!prev && landscape) {
          setActiveTab((currentTab) =>
            currentTab === 'departures' ? 'departures' : 'arrivals'
          );
        }
        return landscape;
      });
    };

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab === 'departures') {
      setFlightFilters((prev) => ({ ...prev, direction: 'departure' }));
    } else if (tab === 'dashboard') {
      setFlightFilters((prev) => ({ ...prev, direction: 'all' }));
    }
  };

  const handleChangeFlightFilters = (
    updater: FlightFilters | ((prev: FlightFilters) => FlightFilters)
  ) => {
    setFlightFilters((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next.direction === 'arrival') {
        setActiveTab('arrivals');
      } else if (next.direction === 'departure') {
        setActiveTab('departures');
      }
      return next;
    });
  };

  const activeTheme = themeMode === 'dark' ? darkTheme : lightTheme;
  const showOnlyLandscapeArrivalsTable =
    Boolean(authToken) && isLandscapeMobile && activeTab === 'arrivals';
  const showOnlyLandscapeDeparturesTable =
    Boolean(authToken) && isLandscapeMobile && activeTab === 'departures';
  const isBaggageTab = Boolean(authToken) && activeTab === 'baggage';

  return (
    <ThemeProvider theme={activeTheme}>
      <GlobalThemeStyle />
      <AppShell $lockViewport={isBaggageTab}>
        <TopBar
          serverTimeIso={snapshot?.serverTime || new Date().toISOString()}
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          themeMode={themeMode}
          onToggleTheme={() =>
            setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'))
          }
          isAuthenticated={Boolean(authToken)}
          username={username}
          airport={sessionAirport}
          wsConnected={wsConnected}
          isFullScreen={isFullScreen}
          onToggleFullScreen={handleToggleFullScreen}
          onRefresh={() => fetchDashboardRest(authToken, sessionAirport)}
          onLogout={handleLogout}
        />

        {!authToken ? (
          <LoginView onLoginSuccess={handleLoginSuccess} />
        ) : showOnlyLandscapeArrivalsTable ? (
          <MainViewport $isFullScreen={true}>
            <ArrivalsPerformanceView
              arrivals={snapshot?.arrivalsPerformance || []}
              serverTimeIso={snapshot?.serverTime || new Date().toISOString()}
              isLandscapeMobile={true}
              onSelectArrivalFlight={handleSelectFlight}
            />
          </MainViewport>
        ) : showOnlyLandscapeDeparturesTable ? (
          <MainViewport $isFullScreen={true}>
            <DeparturesChutesView
              flights={snapshot?.flights || []}
              isLandscapeMobile={true}
              onSelectFlight={handleSelectFlight}
            />
          </MainViewport>
        ) : (
          <MainViewport $isFullScreen={isFullScreen} $lockViewport={isBaggageTab}>
            {/* Real-Time Totals, Malas no BFF & Belt Loading Status (only on main Voos dashboard tab) */}
            {activeTab === 'dashboard' && (
              <BffAndBeltSummary
                totals={dashboardTotals}
                fullChuteTime={snapshot?.fullChuteTime || '00:00:00'}
                onSelectCategoryFilter={handleCategoryCardClick}
              />
            )}

            {isInitialLoading && !snapshot ? (
              <div style={{ padding: 48, textAlign: 'center', fontSize: 15 }}>
                A sincronizar dados em tempo real com{' '}
                <strong>bagstogo.ana.pt/bagstogo</strong>...
              </div>
            ) : activeTab === 'dashboard' ? (
              <Next15FlightsView
                flights={filteredFlights}
                totals={dashboardTotals}
                filters={flightFilters}
                airports={snapshot?.locations || []}
                airlines={snapshot?.airlines || []}
                onChangeFilters={handleChangeFlightFilters}
                onResetFilters={() =>
                  setFlightFilters({
                    searchQuery: '',
                    date: '',
                    airport: 'ALL',
                    airline: 'ALL',
                    direction: 'all',
                  })
                }
                onSelectFlight={handleSelectFlight}
              />
            ) : activeTab === 'departures' ? (
              <>
                <DeparturesChutesView
                  flights={snapshot?.flights || []}
                  isLandscapeMobile={false}
                  onSelectFlight={handleSelectFlight}
                />
                <Next15FlightsView
                  flights={filteredFlights}
                  totals={dashboardTotals}
                  filters={flightFilters}
                  airports={snapshot?.locations || []}
                  airlines={snapshot?.airlines || []}
                  onChangeFilters={handleChangeFlightFilters}
                  onResetFilters={() =>
                    setFlightFilters({
                      searchQuery: '',
                      date: '',
                      airport: 'ALL',
                      airline: 'ALL',
                      direction: 'departure',
                    })
                  }
                  onSelectFlight={handleSelectFlight}
                />
              </>
            ) : activeTab === 'arrivals' ? (
              <ArrivalsPerformanceView
                arrivals={snapshot?.arrivalsPerformance || []}
                serverTimeIso={snapshot?.serverTime || new Date().toISOString()}
                isLandscapeMobile={false}
                onSelectArrivalFlight={handleSelectFlight}
              />
            ) : (
              <BaggageSearchView
                bags={snapshot?.activeBags || []}
                airlines={snapshot?.airlines || []}
                filters={baggageFilters}
                onChangeFilters={setBaggageFilters}
                onResetFilters={() =>
                  setBaggageFilters({
                    query: '',
                    status: 'ALL',
                    airline: 'ALL',
                    onlyBff: false,
                  })
                }
                onSelectBagLpn={handleSelectBagLpn}
              />
            )}
          </MainViewport>
        )}

        {/* Modal 1: Complete Flight Detail & Bag List */}
        {selectedFlight && (
          <FlightDetailModal
            flight={selectedFlight}
            detail={flightDetail}
            isLoading={isFlightDetailLoading}
            onClose={() => {
              setSelectedFlight(null);
              setFlightDetail(null);
            }}
            onSelectBagLpn={handleSelectBagLpn}
          />
        )}

        {/* Modal 2: Step-by-Step Chronology of Baggage Movement */}
        {(baggageDetail || isBaggageDetailLoading) && (
          <BaggageTimelineModal
            detail={baggageDetail}
            isLoading={isBaggageDetailLoading}
            onClose={() => {
              setBaggageDetail(null);
              setIsBaggageDetailLoading(false);
            }}
          />
        )}
      </AppShell>
    </ThemeProvider>
  );
}
