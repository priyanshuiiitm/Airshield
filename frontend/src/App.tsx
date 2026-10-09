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
import { DELHI_LOCATIONS, generateDynamicRoutes } from "./utils/delhiData";

export const App: React.FC = () => {
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

  const routes = currentRecommendation?.routes || [];
  const fastestRouteId = currentRecommendation?.decision?.fastest_route_id;

  return (
    <div className="app-layout">
      {/* Header */}
      <Header
        language={language}
        onLanguageChange={handleLanguageChange}
        onRefresh={() => handleCalculateRoutes(pickup, drop, bufferMin)}
        isLoading={isLoading}
      />

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

            {/* Decision & Action Card */}
            {currentRecommendation && (
              <DecisionCard
                recommendation={currentRecommendation}
                language={language}
                isSubmitting={isSubmitting}
                choiceSubmitted={choiceSubmitted}
                onSelectChoice={handleChoice}
              />
            )}

            {/* Side-by-Side Route Exposure Comparison */}
            {currentRecommendation && (
              <RouteComparison
                recommendation={currentRecommendation}
                selectedRouteId={selectedRouteId}
                language={language}
                onSelectRoute={(rId) => setSelectedRouteId(rId)}
              />
            )}
          </div>

          {/* Right Column: Dark Map Visualization */}
          <div className="right-map-column">
            <section className="map-section" aria-label="Route Map">
              <MapView
                routes={routes}
                fastestRouteId={fastestRouteId}
                selectedRouteId={selectedRouteId}
                pickup={pickup}
                drop={drop}
                isMapPickingOrigin={isMapPickingOrigin}
                isMapPickingDestination={isMapPickingDestination}
                onMapClick={handleMapClick}
                onRouteClick={(rId) => setSelectedRouteId(rId)}
              />
            </section>
          </div>
        </div>

        {/* Bottom Section: Full "How We Got This" Mathematical & Citation Transparency */}
        {currentRecommendation && (
          <section className="transparency-section">
            <TransparencyPanel recommendation={currentRecommendation} language={language} />
          </section>
        )}
      </main>
    </div>
  );
};

export default App;
