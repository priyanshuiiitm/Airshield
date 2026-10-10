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
import { DELHI_LOCATIONS, generateDynamicRoutes } from "./utils/delhiData";
import { Wind, Clock, Shield } from "lucide-react";

export const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<"landing" | "simulator" | "rider" | "analytics">("landing");
  const [airshieldEnabled, setAirshieldEnabled] = useState<boolean>(true);
  const [showEpisodeBanner, setShowEpisodeBanner] = useState<boolean>(true);
  const [language, setLanguage] = useState<LanguageCode>(() => {
    return (localStorage.getItem("airshield_lang") as LanguageCode) || "en";
  });

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

  // Recommendation & choice hooks
  const { isLoading, fetchRecommendation } = useRecommendation();
  const { isSubmitting, choiceSubmitted, submitChoice, resetChoice } = useTripChoice();

  // Local fallback recommendation state (for instant zero-latency math engine)
  const [currentRecommendation, setCurrentRecommendation] = useState<RecommendationResponse>(() =>
    generateDynamicRoutes(pickup, drop, bufferMin)
  );

    // Handler to calculate routes using live API + dynamic IDW engine
  const handleCalculateRoutes = useCallback(
    async (pCoord = pickup, dCoord = drop, buf = bufferMin) => {
      resetChoice();

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
    if (currentRecommendation?.trip_id) {
      submitChoice(currentRecommendation.trip_id, choice);
    }
  };

  // If AirShield is disabled, only show the fastest route
  const routes = currentRecommendation?.routes || [];
  const displayRoutes = airshieldEnabled ? routes : routes.filter(r => r.route_id === "route_fastest");
  const fastestRouteId = currentRecommendation?.decision?.fastest_route_id;

  // Render Landing Page
  if (viewMode === "landing") {
    return <LandingPage onLaunchSimulator={() => setViewMode("simulator")} />;
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
        onRefresh={() => handleCalculateRoutes(pickup, drop, bufferMin)}
        onBackToLanding={() => setViewMode("landing")}
        onOpenRiderMode={() => setViewMode("rider")}
        onOpenAnalytics={() => setViewMode("analytics")}
        isLoading={isLoading}
      />
      
      {/* Demo Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 28px', backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mode</span>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 8, backgroundColor: airshieldEnabled ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)', padding: '6px 14px', borderRadius: 9999, border: `1px solid ${airshieldEnabled ? 'rgba(255,255,255,0.2)' : 'var(--border-subtle)'}`, transition: 'all 0.2s' }}>
                  <input type="checkbox" checked={airshieldEnabled} onChange={() => setAirshieldEnabled(!airshieldEnabled)} style={{ cursor: 'pointer', accentColor: '#ffffff' }} />
                  <span style={{ color: airshieldEnabled ? '#ffffff' : 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>
                      {airshieldEnabled ? "AirShield Protection Active" : "Standard Direct Routing"}
                  </span>
              </label>
          </div>
          <button
              onClick={() => setViewMode("analytics")}
              style={{ backgroundColor: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
          >
              150-Trip Batch Analytics →
          </button>
      </div>

      {/* Seasonal Stubble Episode Banner */}
      {showEpisodeBanner && (
        <div className="seasonal-episode-banner animate-slide-up">
          <div className="episode-banner-content">
            <span className="episode-icon"><Wind size={15} /></span>
            <div className="episode-text-group">
              <span className="episode-badge">SEASONAL INVERSION LAYER</span>
              <span className="episode-message">
                North-Western transboundary particulate smoke and boundary inversion layer active over Delhi NCR.
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
        <div className="content-split-layout">
          {/* Left Column: Location Controls & Decision */}
          <div className="left-controls-column">
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
            {airshieldEnabled && currentRecommendation && (
              <RouteComparison
                recommendation={currentRecommendation}
                selectedRouteId={selectedRouteId}
                language={language}
                onSelectRoute={(rId) => setSelectedRouteId(rId)}
              />
            )}

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
          </div>

          {/* Right Column: Dark Map Visualization */}
          <div className="right-map-column">
            <section className="map-section" aria-label="Route Map">
              <MapView
                routes={displayRoutes}
                fastestRouteId={fastestRouteId}
                selectedRouteId={selectedRouteId}
                bufferMin={bufferMin}
                pickup={pickup}
                drop={drop}
                isMapPickingOrigin={isMapPickingOrigin}
                isMapPickingDestination={isMapPickingDestination}
                onMapClick={handleMapClick}
                onRouteClick={(rId) => setSelectedRouteId(rId)}
                onSelectRecommended={() => {
                  if (currentRecommendation?.recommendation?.route_id) {
                    setSelectedRouteId(currentRecommendation.recommendation.route_id);
                  }
                }}
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
    </div>
  );
};

export default App;
