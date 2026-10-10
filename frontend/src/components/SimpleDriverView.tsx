import React, { useState, useEffect } from "react";
import { Coordinate, RecommendationResponse } from "../api/types";
import { MapPin, Navigation, X, Search, Loader2 } from "lucide-react";
import { MapView } from "./MapView";
import { DELHI_LOCATIONS } from "../utils/delhiData";

interface SimpleDriverViewProps {
  recommendation: RecommendationResponse | null;
  pickup: Coordinate;
  drop: Coordinate;
  pickupName: string;
  dropName: string;
  onSelectRoute: (routeId: string) => void;
  selectedRouteId: string | null;
  onUpdatePickup: (coord: Coordinate, name: string) => void;
  onUpdateDrop: (coord: Coordinate, name: string) => void;
}

export const SimpleDriverView: React.FC<SimpleDriverViewProps> = ({
  recommendation,
  pickup,
  drop,
  pickupName,
  dropName,
  onSelectRoute,
  selectedRouteId,
  onUpdatePickup,
  onUpdateDrop,
}) => {
  const [showPicker, setShowPicker] = useState<"pickup" | "drop" | null>(null);
  const [mapPicking, setMapPicking] = useState<"pickup" | "drop" | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!showPicker) {
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [showPicker]);

  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    const delay = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5&countrycodes=in`);
        const data = await res.json();
        setSearchResults(data || []);
      } catch (err) {
        console.error("Geocoding failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 600);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const handleUseGPS = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coord = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          if (showPicker === "pickup") onUpdatePickup(coord, "My Location");
          else if (showPicker === "drop") onUpdateDrop(coord, "My Location");
          setShowPicker(null);
        },
        () => alert("Location access denied")
      );
    }
  };

  const handleSelectPreset = (loc: typeof DELHI_LOCATIONS[0]) => {
    const coord = { lat: loc.lat, lng: loc.lng };
    if (showPicker === "pickup") onUpdatePickup(coord, loc.name);
    else onUpdateDrop(coord, loc.name);
    setShowPicker(null);
  };

  const handleMapClick = (coord: Coordinate) => {
    if (mapPicking === "pickup") {
      onUpdatePickup(coord, `Pin (${coord.lat.toFixed(3)}, ${coord.lng.toFixed(3)})`);
      setMapPicking(null);
    } else if (mapPicking === "drop") {
      onUpdateDrop(coord, `Pin (${coord.lat.toFixed(3)}, ${coord.lng.toFixed(3)})`);
      setMapPicking(null);
    }
  };

  if (!recommendation) return null;

  const routes = recommendation.routes || [];
  const saferRoute = routes.find((r) => r.route_id === recommendation.recommendation?.route_id) ?? routes[0];
  const fastestRoute = routes.find((r) => r.route_id === recommendation.decision?.fastest_route_id) ?? routes[1];
  const showFastest = fastestRoute && fastestRoute.route_id !== saferRoute?.route_id;

  return (
    <div className="simple-driver-view">
      {/* Map */}
      <div className="simple-map">
        <MapView
          routes={routes}
          fastestRouteId={recommendation.decision?.fastest_route_id}
          selectedRouteId={selectedRouteId}
          bufferMin={5}
          pickup={pickup}
          drop={drop}
          isMapPickingOrigin={mapPicking === "pickup"}
          isMapPickingDestination={mapPicking === "drop"}
          hidePromptCard={true}
          onMapClick={handleMapClick}
          onRouteClick={onSelectRoute}
          onSelectRecommended={() => { if (saferRoute) onSelectRoute(saferRoute.route_id); }}
        />
      </div>

      {/* Top: location inputs */}
      {!mapPicking && (
        <div className="simple-top-card">
          <button className="simple-location-btn" onClick={() => setShowPicker("pickup")}>
            <div className="simple-loc-icon pickup" />
            <span className="simple-loc-text">{pickupName}</span>
          </button>
          <div className="simple-divider" />
          <button className="simple-location-btn" onClick={() => setShowPicker("drop")}>
            <div className="simple-loc-icon drop" />
            <span className="simple-loc-text">{dropName}</span>
          </button>
        </div>
      )}

      {/* Map pick hint */}
      {mapPicking && (
        <div className="map-pick-hint">
          <span>Tap map to set {mapPicking === "pickup" ? "pickup" : "destination"}</span>
          <button onClick={() => setMapPicking(null)}>Cancel</button>
        </div>
      )}

      {/* Bottom: route options */}
      {!mapPicking && (
        <div className="simple-bottom-card">
          {saferRoute && (
            <button
              className={`simple-route-btn safer${selectedRouteId === saferRoute.route_id ? " selected" : ""}`}
              onClick={() => onSelectRoute(saferRoute.route_id)}
            >
              <div className="simple-route-header">
                <span className="simple-route-label">Cleaner Air</span>
                <span className="simple-route-time">{Math.round(saferRoute.duration_minutes)} min</span>
              </div>
              <div className="simple-route-detail">
                {saferRoute.distance_km.toFixed(1)} km · {Math.round(saferRoute.average_pm25)} µg/m³
              </div>
            </button>
          )}

          {showFastest && fastestRoute && (
            <button
              className={`simple-route-btn${selectedRouteId === fastestRoute.route_id ? " selected" : ""}`}
              onClick={() => onSelectRoute(fastestRoute.route_id)}
            >
              <div className="simple-route-header">
                <span className="simple-route-label">Fastest</span>
                <span className="simple-route-time">{Math.round(fastestRoute.duration_minutes)} min</span>
              </div>
              <div className="simple-route-detail">
                {fastestRoute.distance_km.toFixed(1)} km · {Math.round(fastestRoute.average_pm25)} µg/m³
              </div>
            </button>
          )}
        </div>
      )}

      {/* Location picker modal */}
      {showPicker && (
        <div className="simple-modal" onClick={() => setShowPicker(null)}>
          <div className="simple-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="simple-modal-header">
              <span className="simple-modal-title">
                {showPicker === "pickup" ? "Set Pickup" : "Set Destination"}
              </span>
              <button className="simple-close-btn" onClick={() => setShowPicker(null)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "0 16px", marginBottom: 12 }}>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <Search size={16} style={{ position: "absolute", left: 12, color: "#9ca3af" }} />
                <input
                  type="text"
                  placeholder="Search location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 12px 12px 36px",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    fontSize: 15,
                    outline: "none",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                  }}
                  autoFocus
                />
                {isSearching && (
                  <Loader2 size={16} className="animate-spin" style={{ position: "absolute", right: 12, color: "#9ca3af" }} />
                )}
              </div>
            </div>

            <div style={{ maxHeight: "50vh", overflowY: "auto", paddingBottom: 20 }}>
              {searchResults.length > 0 ? (
                searchResults.map((res: any, idx) => (
                  <button
                    key={idx}
                    className="simple-loc-item"
                    onClick={() => {
                      const coord = { lat: parseFloat(res.lat), lng: parseFloat(res.lon) };
                      if (showPicker === "pickup") onUpdatePickup(coord, res.display_name.split(",")[0]);
                      else onUpdateDrop(coord, res.display_name.split(",")[0]);
                      setShowPicker(null);
                    }}
                  >
                    <MapPin size={18} />
                    <span style={{ textAlign: "left" }}>
                      <strong style={{ display: "block", fontSize: 15 }}>{res.display_name.split(",")[0]}</strong>
                      <small style={{ color: "#6b7280", fontSize: 12 }}>{res.display_name.split(",").slice(1,3).join(", ")}</small>
                    </span>
                  </button>
                ))
              ) : (
                <>
                  <button className="simple-loc-item gps" onClick={handleUseGPS}>
              <Navigation size={18} />
              <span>Use Current Location</span>
            </button>

            <button
              className="simple-loc-item"
              style={{ borderColor: "#3b82f6", color: "#3b82f6" }}
              onClick={() => { setMapPicking(showPicker); setShowPicker(null); }}
            >
              <MapPin size={18} style={{ color: "#3b82f6" }} />
              <span>Pin on Map</span>
            </button>

            <div className="simple-loc-section-label">Popular in Delhi</div>
            {DELHI_LOCATIONS.slice(0, 7).map((loc) => (
              <button key={loc.id} className="simple-loc-item" onClick={() => handleSelectPreset(loc)}>
                <MapPin size={18} />
                <span>{loc.name}</span>
              </button>
            ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
