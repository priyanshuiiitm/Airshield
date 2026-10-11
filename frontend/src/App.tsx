import React, { useState, useEffect, useCallback, useRef } from "react";
import { Coordinate, LanguageCode, RecommendationResponse } from "./api/types";
import { useRecommendation } from "./hooks/useRecommendation";
import { useTripChoice } from "./hooks/useTripChoice";
import { Header } from "./components/Header";
import { MapView } from "./components/MapView";
import { LocationPicker } from "./components/LocationPicker";
import { RouteComparison } from "./components/RouteComparison";
import { DecisionCard } from "./components/DecisionCard";
import { TransparencyPanel } from "./components/TransparencyPanel";
import { LandingPage } from "./components/LandingPage";
import { OnboardingCarousel } from "./components/OnboardingCarousel";
import { RiderMode } from "./components/RiderMode";
import { BatchAnalytics } from "./components/BatchAnalytics";
import { SimpleDriverView } from "./components/SimpleDriverView";
import { DELHI_LOCATIONS, generateDynamicRoutes } from "./utils/delhiData";
import { Clock, Car, Shield, ChevronsLeft, ChevronRight, Navigation } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer } from "./animation/motion-config";
import { VoiceProvider, useVoice } from "./context/VoiceContext";
import { VoiceAssistantWidget } from "./components/VoiceAssistantWidget";
import { voiceScripts } from "./services/voiceScripts";

const AppContent: React.FC = () => {
  const [viewMode, setViewMode] = useState<"onboarding" | "landing" | "simulator" | "rider" | "analytics" | "driver">("onboarding");
  const airshieldEnabled = true;
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Voice context integration
  const { isVoiceEnabled, speak, activeHighlightId, language, setLanguage } = useVoice();

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('a') || target.closest('[role="button"]')) {
        // Haptic feedback
      }
    };
    document.addEventListener("click", handleGlobalClick, { capture: true });
    return () => document.removeEventListener("click", handleGlobalClick, { capture: true });
  }, []);

  // Trip coordinates state
  const [pickup, setPickup] = useState<Coordinate>({ lat: 28.5474, lng: 77.1959 }); // Hauz Khas
  const [pickupName, setPickupName] = useState<string>("Hauz Khas (South Green Belt)");
  const [drop, setDrop] = useState<Coordinate>({ lat: 28.6515, lng: 77.1911 }); // Karol Bagh
  const [dropName, setDropName] = useState<string>("Karol Bagh (Market Corridor)");
  const [bufferMin, setBufferMin] = useState<number>(5.0);

  // Map interactive picking state
  const [isMapPickingOrigin, setIsMapPickingOrigin] = useState<boolean>(false);
  const [isMapPickingDestination, setIsMapPickingDestination] = useState<boolean>(false);

  // Route focus state
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [routeViewMode, setRouteViewMode] = useState<"all" | "safer" | "fastest">("all");

  // Recommendation & choice hooks
  const { isLoading, fetchRecommendation } = useRecommendation();
  const { isSubmitting, choiceSubmitted, submitChoice, resetChoice } = useTripChoice();

  // Toast Notification state
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);

  const showToast = useCallback((message: string, type: 'success'|'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Local fallback recommendation state (for instant zero-latency math engine)
  const [currentRecommendation, setCurrentRecommendation] = useState<RecommendationResponse>(() =>
    generateDynamicRoutes(pickup, drop, bufferMin)
  );

  // Handler to calculate routes using live API + dynamic IDW engine
  const handleCalculateRoutes = useCallback(
    async (pCoord = pickup, dCoord = drop, buf = bufferMin, triggerVoice: boolean = false) => {
      resetChoice();
      setRouteViewMode("all");

      // Immediately generate real-time local mathematical route solution
      const localResult = generateDynamicRoutes(pCoord, dCoord, buf);
      setCurrentRecommendation(localResult);
      setSelectedRouteId(localResult.recommendation.route_id);

      // Voice readout for evaluated routes if requested
      if (triggerVoice && isVoiceEnabled) {
        const fastest =
          localResult.routes.find((r) => r.route_id === "route_fastest") || localResult.routes[0];
        const safer =
          localResult.routes.find((r) => r.route_id === "route_safer") ||
          localResult.routes[1] ||
          localResult.routes[0];
        const pct = localResult.recommendation.exposure_reduction_percent || 24;
        speak(voiceScripts.routesEvaluated(fastest, safer, pct, language, localResult.classification), "decision-card-wrapper");
      }

      // Snap the visual routes to real streets using OSRM!
      fetch(`https://router.project-osrm.org/route/v1/driving/${pCoord.lng},${pCoord.lat};${dCoord.lng},${dCoord.lat}?alternatives=2&geometries=geojson`)
        .then(res => res.json())
        .then(data => {
            if (data.routes && data.routes.length >= 2) {
                const geom1 = data.routes[0].geometry.coordinates.map((c: any) => ({lng: c[0], lat: c[1]}));
                const geom2 = data.routes[1].geometry.coordinates.map((c: any) => ({lng: c[0], lat: c[1]}));
                const hasRoute3 = !!data.routes[2];
                const geom3 = hasRoute3 ? data.routes[2].geometry.coordinates.map((c: any) => ({lng: c[0], lat: c[1]})) : null;
                
                setCurrentRecommendation(prev => {
                    if (!prev) return prev;
                    const newRes = JSON.parse(JSON.stringify(prev));
                    if (newRes.routes[0]) newRes.routes[0].geometry = geom1;
                    if (newRes.routes[1]) newRes.routes[1].geometry = geom2;
                    if (hasRoute3 && geom3 && newRes.routes[2]) {
                        newRes.routes[2].geometry = geom3;
                    } else if (newRes.routes.length > 2) {
                        newRes.routes = newRes.routes.slice(0, 2);
                    }
                    return newRes;
                });
            }
        })
        .catch(err => console.error("OSRM fetch failed:", err));

      // Attempt AWS API call in background for cloud synchronization
      try {
        const apiRes = await fetchRecommendation({
          pickup: pCoord,
          drop: dCoord,
          buffer_min: buf,
          language,
          mode: "snapshot",
          worker_id: "delivery-worker-01",
          debug: true
        });
        if (apiRes) {
          setCurrentRecommendation(apiRes);
          setSelectedRouteId(apiRes.recommendation.route_id);
        }
      } catch (err) {
        console.warn("Backend API sync offline, running on local statutory IDW engine:", err);
      }
    },
    [pickup, drop, bufferMin, language, fetchRecommendation, resetChoice, isVoiceEnabled, speak]
  );

  // Initial calculation on mount
  useEffect(() => {
    handleCalculateRoutes(pickup, drop, bufferMin, false);
  }, []);

  // Announce simulator guidance upon entering simulator mode
  const prevViewModeRef = useRef<string>(viewMode);
  useEffect(() => {
    if (viewMode === "simulator" && prevViewModeRef.current !== "simulator" && isVoiceEnabled) {
      speak(voiceScripts.simulatorWelcome(language), "location-picker-card");
    }
    prevViewModeRef.current = viewMode;
  }, [viewMode, isVoiceEnabled, language, speak]);

  // Handle language change
  const handleLanguageChange = (lang: LanguageCode) => {
    setLanguage(lang);
    localStorage.setItem("airshield_lang", lang);
  };

  // Swap Origin and Destination
  const handleSwapLocations = () => {
    const oldP = pickup;
    const oldPName = pickupName;
    setPickup(drop);
    setPickupName(dropName);
    setDrop(oldP);
    setDropName(oldPName);
    handleCalculateRoutes(drop, oldP, bufferMin, true);
  };

  // GPS Device Geolocation
  const handleUseCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userCoord = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setPickup(userCoord);
          setPickupName(`My GPS Location (${userCoord.lat.toFixed(3)}, ${userCoord.lng.toFixed(3)})`);
          handleCalculateRoutes(userCoord, drop, bufferMin, true);
        },
        (err) => {
          console.warn("Geolocation permission denied or error:", err);
          showToast("Geolocation access denied. Using default location.", "error");
          // Fallback to Connaught Place
          const cp = DELHI_LOCATIONS[0];
          setPickup({ lat: cp.lat, lng: cp.lng });
          setPickupName(cp.name);
          handleCalculateRoutes({ lat: cp.lat, lng: cp.lng }, drop, bufferMin, true);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  // Map click handler when in pin picking mode
  const handleMapClick = (coord: Coordinate) => {
    if (isMapPickingOrigin) {
      setPickup(coord);
      setPickupName(`Map Point (${coord.lat.toFixed(3)}, ${coord.lng.toFixed(3)})`);
      setIsMapPickingOrigin(false);
      handleCalculateRoutes(coord, drop, bufferMin, true);
    } else if (isMapPickingDestination) {
      setDrop(coord);
      setDropName(`Map Point (${coord.lat.toFixed(3)}, ${coord.lng.toFixed(3)})`);
      setIsMapPickingDestination(false);
      handleCalculateRoutes(pickup, coord, bufferMin, true);
    }
  };

  const fastestRouteId = currentRecommendation?.decision?.fastest_route_id;

  const handleChoice = (choice: "safer" | "fastest") => {
    let chosenRoute: any = null;
    if (choice === "fastest") {
      const fId =
        fastestRouteId ||
        currentRecommendation?.routes.find((r) => r.route_id === "route_fastest")?.route_id ||
        currentRecommendation?.routes[0]?.route_id;
      if (fId) {
        setSelectedRouteId(fId);
        chosenRoute = currentRecommendation?.routes.find((r) => r.route_id === fId);
      }
      setRouteViewMode("fastest");
    } else {
      const sId =
        currentRecommendation?.routes.find((r) => r.route_id === "route_safer")?.route_id ||
        currentRecommendation?.recommendation?.route_id ||
        currentRecommendation?.routes[1]?.route_id ||
        currentRecommendation?.routes[0]?.route_id;
      if (sId) {
        setSelectedRouteId(sId);
        chosenRoute = currentRecommendation?.routes.find((r) => r.route_id === sId);
      }
      setRouteViewMode("safer");
    }

    if (currentRecommendation?.trip_id) {
      submitChoice(currentRecommendation.trip_id, choice);
      showToast(choice === "safer" ? "Cleaner route preference saved!" : "Fastest route preference saved!", "success");
    }

    // Voice feedback: confirms selection and recites 4 intermediate checkpoints
    if (chosenRoute && isVoiceEnabled) {
      speak(
        voiceScripts.routeSelectedWaypoints(choice, chosenRoute, pickupName, dropName, language),
        "map-section-wrapper"
      );
    }
  };

  // If AirShield is disabled, only show the fastest route
  const routes = currentRecommendation?.routes || [];
  const displayRoutes = airshieldEnabled ? routes : routes.filter(r => r.route_id === "route_fastest");
  if (viewMode === "onboarding") {
    return <OnboardingCarousel onComplete={() => setViewMode("landing")} />;
  }
  // Render Landing Page
  if (viewMode === "landing") {
    return <LandingPage onLaunchSimulator={() => setViewMode("simulator")} />;
  }

  // Render Clean Driver View (Mobile-First)
  if (viewMode === "driver" && currentRecommendation) {
    return (
      <div className="driver-wrapper">
        {/* Mode Toggle - Top Right */}
        <button
          className="mode-toggle-btn"
          onClick={() => setViewMode("landing")}
          title="Back to home"
        >
          <Car size={18} />
        </button>
        
        <SimpleDriverView
          recommendation={currentRecommendation}
          pickup={pickup}
          drop={drop}
          pickupName={pickupName}
          dropName={dropName}
          onSelectRoute={(rId) => {
            const choice = rId === fastestRouteId ? "fastest" : "safer";
            handleChoice(choice);
          }}
          selectedRouteId={selectedRouteId}
          onUpdatePickup={(coord, name) => {
            setPickup(coord);
            setPickupName(name);
            handleCalculateRoutes(coord, drop, bufferMin, true);
          }}
          onUpdateDrop={(coord, name) => {
            setDrop(coord);
            setDropName(name);
            handleCalculateRoutes(pickup, coord, bufferMin, true);
          }}
        />
      </div>
    );
  }

  // Render Rider Sunlight Handlebar View
  if (viewMode === "rider" && currentRecommendation) {
    return (
      <RiderMode
        recommendation={currentRecommendation}
        language={language}
        pickupName={pickupName}
        dropName={dropName}
        bufferMin={bufferMin}
        onExitRiderMode={() => setViewMode("simulator")}
        onSelectChoice={handleChoice}
        choiceSubmitted={choiceSubmitted}
      />
    );
  }

  // Render Batch Impact Evidence View
  if (viewMode === "analytics") {
    return (
      <BatchAnalytics
        language={language}
        onBackToSimulator={() => setViewMode("simulator")}
      />
    );
  }

  // Render Live Simulator Workspace
  return (
    <div className="app-layout">
      {/* Header */}
      <Header
        language={language}
        onLanguageChange={handleLanguageChange}
        onRefresh={() => handleCalculateRoutes(pickup, drop, bufferMin, true)}
        onBackToLanding={() => setViewMode("landing")}
        onOpenDriverView={() => setViewMode("driver")}
        onOpenAnalytics={() => setViewMode("analytics")}
        isLoading={isLoading}
      />
      


      {/* Main Content Area */}
      <main className="main-content">
        <div className={`content-split-layout ${viewMode === 'rider' ? 'rider-active-layout' : ''}`}>
          {/* Left Column: Location Controls & Decision */}
          {isSidebarCollapsed ? (
            <motion.button
              type="button"
              className="sidebar-expand-pill"
              onClick={() => setIsSidebarCollapsed(false)}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Expand route console"
            >
              <Navigation size={13} />
              <span>Route Console</span>
              <ChevronRight size={13} />
            </motion.button>
          ) : (
            <motion.div 
              className="left-controls-column"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <div className="sidebar-top-bar">
                <span className="sidebar-brand-mini">AIRSHIELD CONSOLE</span>
                <button
                  type="button"
                  className="btn-sidebar-collapse"
                  onClick={() => setIsSidebarCollapsed(true)}
                  title="Collapse console to view full map"
                >
                  <ChevronsLeft size={13} />
                  <span>Hide</span>
                </button>
              </div>

              <AnimatePresence mode="popLayout">
            {viewMode === "rider" && currentRecommendation ? (
              <motion.div
                key="rider-mode"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                style={{ flex: 1, overflowY: "auto" }}
              >
                <RiderMode
                  recommendation={currentRecommendation}
                  language={language}
                  pickupName={pickupName}
                  dropName={dropName}
                  bufferMin={bufferMin}
                  onExitRiderMode={() => setViewMode("simulator")}
                  onSelectChoice={handleChoice}
                  choiceSubmitted={choiceSubmitted}
                />
              </motion.div>
            ) : (
              <motion.div
                key="simulator-mode"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
              >
                {/* Origin & Destination Picker */}
                <div
                  id="location-picker-card"
                  className={activeHighlightId === "location-picker-card" ? "voice-spotlight-active" : ""}
                  style={{ borderRadius: "var(--radius-md)" }}
                >
                  <LocationPicker
                    pickup={pickup}
                    pickupName={pickupName}
                    drop={drop}
                    dropName={dropName}
                    bufferMin={bufferMin}
                    isMapPickingOrigin={isMapPickingOrigin}
                    isMapPickingDestination={isMapPickingDestination}
                    isLoading={isLoading}
                    language={language}
                    onSelectPickup={(c, name) => {
                      setPickup(c);
                      setPickupName(name);
                      handleCalculateRoutes(c, drop, bufferMin, true);
                    }}
                    onSelectDrop={(c, name) => {
                      setDrop(c);
                      setDropName(name);
                      handleCalculateRoutes(pickup, c, bufferMin, true);
                    }}
                    onSelectCorridor={(pCoord, pName, dCoord, dName) => {
                      setPickup(pCoord);
                      setPickupName(pName);
                      setDrop(dCoord);
                      setDropName(dName);
                      handleCalculateRoutes(pCoord, dCoord, bufferMin, true);
                    }}
                    onChangeBuffer={(buf) => {
                      setBufferMin(buf);
                      handleCalculateRoutes(pickup, drop, buf, true);
                    }}
                    onToggleMapPickOrigin={() => {
                      setIsMapPickingOrigin(!isMapPickingOrigin);
                      setIsMapPickingDestination(false);
                    }}
                    onToggleMapPickDestination={() => {
                      setIsMapPickingDestination(!isMapPickingDestination);
                      setIsMapPickingOrigin(false);
                    }}
                    onUseCurrentLocation={handleUseCurrentLocation}
                    onSwapLocations={handleSwapLocations}
                    onCalculateRoutes={() => handleCalculateRoutes(pickup, drop, bufferMin, true)}
                  />
                </div>

                {/* Decision & Action Card - Only show if AirShield is enabled! */}
                {airshieldEnabled ? (
                    currentRecommendation && (
                    <div
                      id="decision-card-wrapper"
                      className={activeHighlightId === "decision-card-wrapper" ? "voice-spotlight-active" : ""}
                      style={{ borderRadius: "var(--radius-md)" }}
                    >
                      <DecisionCard
                          recommendation={currentRecommendation}
                          language={language}
                          isSubmitting={isSubmitting}
                          choiceSubmitted={choiceSubmitted}
                          onSelectChoice={handleChoice}
                      />
                    </div>
                    )
                ) : (
                    <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', color: 'var(--text-muted)' }}><Clock size={20} /></div>
                        <h3 style={{ color: 'var(--text-primary)', margin: '0 0 6px 0', fontWeight: 600, fontSize: 15 }}>Standard Delivery Mode</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0, lineHeight: 1.5 }}>Showing standard fastest path without pollution mitigation.</p>
                    </div>
                )}

                {/* Side-by-Side Route Exposure Comparison */}
                {(airshieldEnabled && currentRecommendation) || isLoading ? (
                  <div
                    id="route-comparison-wrapper"
                    className={activeHighlightId === "route-comparison-wrapper" ? "voice-spotlight-active" : ""}
                    style={{ borderRadius: "var(--radius-md)" }}
                  >
                    <RouteComparison
                      recommendation={currentRecommendation}
                      selectedRouteId={selectedRouteId}
                      language={language}
                      onSelectRoute={(rId) => {
                        handleChoice(rId === fastestRouteId ? "fastest" : "safer");
                      }}
                      isLoading={isLoading}
                    />
                  </div>
                ) : null}

                {/* Courier Shift Health Dosimetry (Non-Monetary) */}
                <div className="shift-dosimetry-card">
                  <div className="dosimetry-header">
                    <span className="dosimetry-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Shield size={14} />
                      <span>Today's Shift Exposure Summary</span>
                    </span>
                    <span className="dosimetry-tag">Observed</span>
                  </div>
                  <div className="dosimetry-grid">
                    <div className="dosimetry-item">
                      <span className="dosimetry-val">4</span>
                      <span className="dosimetry-lbl">Trips Completed</span>
                    </div>
                    <div className="dosimetry-item">
                      <span className="dosimetry-val">2h 15m</span>
                      <span className="dosimetry-lbl">Transit Time</span>
                    </div>
                    <div className="dosimetry-item">
                      <span className="dosimetry-val">↓ 1,840</span>
                      <span className="dosimetry-lbl">Avoided (µg·min)</span>
                    </div>
                    <div className="dosimetry-item">
                      <span className="dosimetry-val">92%</span>
                      <span className="dosimetry-lbl">Adherence</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </motion.div>
          )}

          {/* Right Column: Dark Map Visualization */}
          <div
            id="map-section-wrapper"
            className={`right-map-column ${activeHighlightId === "map-section-wrapper" ? "voice-spotlight-active" : ""}`}
            style={{ borderRadius: "var(--radius-md)" }}
          >
            <section className="map-section" aria-label="Route Map">
              <MapView
                routes={displayRoutes}
                fastestRouteId={fastestRouteId}
                selectedRouteId={selectedRouteId}
                routeViewMode={routeViewMode}
                onViewModeChange={setRouteViewMode}
                bufferMin={bufferMin}
                pickup={pickup}
                drop={drop}
                isMapPickingOrigin={isMapPickingOrigin}
                isMapPickingDestination={isMapPickingDestination}
                onMapClick={handleMapClick}
                onRouteClick={(rId) => {
                  handleChoice(rId === fastestRouteId ? "fastest" : "safer");
                }}
                onSelectRecommended={() => {
                  handleChoice("safer");
                }}
                onSelectFastest={() => {
                  handleChoice("fastest");
                }}
                isRiderMode={viewMode === 'rider'}
                hidePromptCard={true}
              />
            </section>
          </div>
        </div>

        {/* Bottom Section: Full "How We Got This" Mathematical & Citation Transparency */}
        {airshieldEnabled && currentRecommendation && (
          <section className="transparency-section">
            <TransparencyPanel recommendation={currentRecommendation} language={language} />
          </section>
        )}
      </main>

      {/* Global Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%", scale: 0.9 }}
            animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
            exit={{ opacity: 0, y: 20, x: "-50%", scale: 0.9 }}
            className={`toast-notification ${toast.type}`}
            style={{
              position: "fixed",
              bottom: "24px",
              left: "50%",
              background: toast.type === "error" ? "#ef4444" : "#10b981",
              color: "#ffffff",
              padding: "12px 24px",
              borderRadius: "var(--radius-full)",
              fontWeight: 600,
              fontSize: "14px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            {toast.type === "error" ? "⚠️" : "✅"} {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <VoiceProvider>
      <AppContent />
      <VoiceAssistantWidget />
    </VoiceProvider>
  );
};

export default App;
