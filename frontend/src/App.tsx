import React, { useState, useEffect, useCallback } from "react";
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
import { RiderMode } from "./components/RiderMode";
import { BatchAnalytics } from "./components/BatchAnalytics";
import { SimpleDriverView } from "./components/SimpleDriverView";
import { DELHI_LOCATIONS, generateDynamicRoutes } from "./utils/delhiData";
import { Wind, Clock, Shield, Car } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer } from "./animation/motion-config";

export const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<"landing" | "simulator" | "rider" | "analytics" | "driver">("landing");
  const [airshieldEnabled, setAirshieldEnabled] = useState<boolean>(true);
  const [showEpisodeBanner, setShowEpisodeBanner] = useState<boolean>(true);
  const [language, setLanguage] = useState<LanguageCode>(() => {
    return (localStorage.getItem("airshield_lang") as LanguageCode) || "en";
  });

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
    async (pCoord = pickup, dCoord = drop, buf = bufferMin) => {
      resetChoice();
      setRouteViewMode("all");

      // Immediately generate real-time local mathematical route solution
      const localResult = generateDynamicRoutes(pCoord, dCoord, buf);
      setCurrentRecommendation(localResult);
      setSelectedRouteId(localResult.recommendation.route_id);

      // Snap the visual routes to real streets using OSRM!
      fetch(`https://router.project-osrm.org/route/v1/driving/${pCoord.lng},${pCoord.lat};${dCoord.lng},${dCoord.lat}?alternatives=2&geometries=geojson`)
        .then(res => res.json())
        .then(data => {
            if (data.routes && data.routes.length >= 2) {
                const geom1 = data.routes[0].geometry.coordinates.map((c: any) => ({lng: c[0], lat: c[1]}));
                const geom2 = data.routes[1].geometry.coordinates.map((c: any) => ({lng: c[0], lat: c[1]}));
                const geom3 = data.routes[2] ? data.routes[2].geometry.coordinates.map((c: any) => ({lng: c[0], lat: c[1]})) : geom2;
                
                setCurrentRecommendation(prev => {
                    const newRes = JSON.parse(JSON.stringify(prev)); // deep copy
                    if(newRes.routes[0]) newRes.routes[0].geometry = geom1;
                    if(newRes.routes[1]) newRes.routes[1].geometry = geom2;
                    if(newRes.routes[2]) newRes.routes[2].geometry = geom3;
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
    [pickup, drop, bufferMin, language, fetchRecommendation, resetChoice]
  );

  // Initial calculation on mount
  useEffect(() => {
    handleCalculateRoutes(pickup, drop, bufferMin);
  }, []);

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
    handleCalculateRoutes(drop, oldP, bufferMin);
  };

  // GPS Device Geolocation
  const handleUseCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userCoord = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setPickup(userCoord);
          setPickupName(`My GPS Location (${userCoord.lat.toFixed(3)}, ${userCoord.lng.toFixed(3)})`);
          handleCalculateRoutes(userCoord, drop, bufferMin);
        },
        (err) => {
          console.warn("Geolocation permission denied or error:", err);
          showToast("Geolocation access denied. Using default location.", "error");
          // Fallback to Connaught Place
          const cp = DELHI_LOCATIONS[0];
          setPickup({ lat: cp.lat, lng: cp.lng });
          setPickupName(cp.name);
          handleCalculateRoutes({ lat: cp.lat, lng: cp.lng }, drop, bufferMin);
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
      handleCalculateRoutes(coord, drop, bufferMin);
    } else if (isMapPickingDestination) {
      setDrop(coord);
      setDropName(`Map Point (${coord.lat.toFixed(3)}, ${coord.lng.toFixed(3)})`);
      setIsMapPickingDestination(false);
      handleCalculateRoutes(pickup, coord, bufferMin);
    }
  };

  const handleChoice = (choice: "safer" | "fastest") => {
    if (choice === "fastest") {
      const fId =
        currentRecommendation?.decision?.fastest_route_id ||
        currentRecommendation?.routes.find((r) => r.route_id === "route_fastest")?.route_id ||
        currentRecommendation?.routes[0]?.route_id;
      if (fId) setSelectedRouteId(fId);
      setRouteViewMode("fastest");
    } else {
      const sId =
        currentRecommendation?.recommendation?.route_id ||
        currentRecommendation?.routes.find((r) => r.route_id !== "route_fastest")?.route_id ||
        currentRecommendation?.routes[0]?.route_id;
      if (sId) setSelectedRouteId(sId);
      setRouteViewMode("safer");
    }
    if (currentRecommendation?.trip_id) {
      submitChoice(currentRecommendation.trip_id, choice);
      showToast(choice === "safer" ? "Cleaner route preference saved!" : "Fastest route preference saved!", "success");
    }
  };

  // If AirShield is disabled, only show the fastest route
  const routes = currentRecommendation?.routes || [];
  const displayRoutes = airshieldEnabled ? routes : routes.filter(r => r.route_id === "route_fastest");
  const fastestRouteId = currentRecommendation?.decision?.fastest_route_id;

  // Skip onboarding for now - go directly to landing

  // Render Landing Page
  if (viewMode === "landing") {
    return <LandingPage onLaunchSimulator={() => setViewMode("driver")} />;
  }

  // Render Clean Driver View (Mobile-First)
  if (viewMode === "driver" && currentRecommendation) {
    return (
      <div className="driver-wrapper">
        {/* Mode Toggle - Top Right */}
        <button
          className="mode-toggle-btn"
          onClick={() => setViewMode("simulator")}
          title="Switch to full view"
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
            setSelectedRouteId(rId);
            const choice = rId === currentRecommendation?.recommendation.route_id ? "safer" : "fastest";
            handleChoice(choice);
          }}
          selectedRouteId={selectedRouteId}
          onUpdatePickup={(coord, name) => {
            setPickup(coord);
            setPickupName(name);
          }}
          onUpdateDrop={(coord, name) => {
            setDrop(coord);
            setDropName(name);
          }}
          onRecalculate={() => handleCalculateRoutes(pickup, drop, bufferMin)}
        />
      </div>
    );
  }

  // Render Rider Sunlight Handlebar View
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
        onRefresh={() => handleCalculateRoutes(pickup, drop, bufferMin)}
        onBackToLanding={() => setViewMode("landing")}
        onOpenRiderMode={() => setViewMode("rider")}
        onOpenAnalytics={() => setViewMode("analytics")}
        onOpenDriverView={() => setViewMode("driver")}
        isLoading={isLoading}
      />
      
      {/* Demo Controls Bar */}
      <div className="demo-controls-bar">
          <div className="demo-controls-left">
              <span className="demo-mode-label">Mode</span>
              <label className={`demo-toggle ${airshieldEnabled ? "active" : "inactive"}`}>
                  <input type="checkbox" checked={airshieldEnabled} onChange={() => setAirshieldEnabled(!airshieldEnabled)} />
                  <span>
                      {airshieldEnabled ? "AirShield Protection Active" : "Standard Direct Routing"}
                  </span>
              </label>
          </div>
          <button
              className="btn-demo-analytics"
              onClick={() => setViewMode("analytics")}
          >
              150-Trip Batch Analytics →
          </button>
      </div>

      {/* Seasonal Stubble Episode Banner */}
      {showEpisodeBanner && (
        <div className="seasonal-episode-banner animate-slide-up">
          <div className="episode-banner-content">
            <span className="episode-icon"><Wind size={14} /></span>
            <div className="episode-text-group">
              <span className="episode-badge">ADVISORY</span>
              <span className="episode-message">
                Active seasonal transboundary particulate smoke over Delhi NCR.
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn-close-episode"
            onClick={() => setShowEpisodeBanner(false)}
            title="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="main-content">
        <div className={`content-split-layout ${viewMode === 'rider' ? 'rider-active-layout' : ''}`}>
          {/* Left Column: Location Controls & Decision */}
          <motion.div 
            className="left-controls-column"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
          >
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
                handleCalculateRoutes(c, drop, bufferMin);
              }}
              onSelectDrop={(c, name) => {
                setDrop(c);
                setDropName(name);
                handleCalculateRoutes(pickup, c, bufferMin);
              }}
              onChangeBuffer={(buf) => {
                setBufferMin(buf);
                handleCalculateRoutes(pickup, drop, buf);
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
              onCalculateRoutes={() => handleCalculateRoutes(pickup, drop, bufferMin)}
            />

            {/* Decision & Action Card - Only show if AirShield is enabled! */}
            {airshieldEnabled ? (
                currentRecommendation && (
                <DecisionCard
                    recommendation={currentRecommendation}
                    language={language}
                    isSubmitting={isSubmitting}
                    choiceSubmitted={choiceSubmitted}
                    onSelectChoice={handleChoice}
                />
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
              <RouteComparison
                recommendation={currentRecommendation}
                selectedRouteId={selectedRouteId}
                language={language}
                onSelectRoute={(rId) => {
                  setSelectedRouteId(rId);
                  if (rId === fastestRouteId) {
                    setRouteViewMode("fastest");
                  } else {
                    setRouteViewMode("safer");
                  }
                }}
                isLoading={isLoading}
              />
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

          {/* Right Column: Dark Map Visualization */}
          <div className="right-map-column">
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
                  setSelectedRouteId(rId);
                  if (rId === fastestRouteId) {
                    setRouteViewMode("fastest");
                  } else {
                    setRouteViewMode("safer");
                  }
                }}
                onSelectRecommended={() => {
                  setRouteViewMode("safer");
                  if (currentRecommendation?.recommendation?.route_id) {
                    setSelectedRouteId(currentRecommendation.recommendation.route_id);
                  }
                }}
                onSelectFastest={() => {
                  setRouteViewMode("fastest");
                  if (fastestRouteId) {
                    setSelectedRouteId(fastestRouteId);
                  }
                }}
                isRiderMode={viewMode === 'rider'}
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

export default App;
