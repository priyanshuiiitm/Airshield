import React, { useState } from "react";
import { Coordinate, RecommendationResponse } from "../api/types";
import { MapPin, Navigation, X } from "lucide-react";
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
  onRecalculate: () => void;
}

export const SimpleDriverView: React.FC<SimpleDriverViewProps> = ({
  recommendation,
  pickup,
  drop,
  pickupName,
  dropName,
  onSelectRoute,
  onUpdatePickup,
  onUpdateDrop,
  onRecalculate,
}) => {
  const [showPicker, setShowPicker] = useState<"pickup" | "drop" | null>(null);
  const [mapPicking, setMapPicking] = useState<"pickup" | "drop" | null>(null);

  const handleUseGPS = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coord = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          if (showPicker === "pickup") {
            onUpdatePickup(coord, "My Location");
          } else if (showPicker === "drop") {
            onUpdateDrop(coord, "My Location");
          }
          setShowPicker(null);
          onRecalculate();
        },
        () => alert("Location access denied")
      );
    }
  };

  const handleSelectLocation = (location: typeof DELHI_LOCATIONS[0]) => {
    const coord = { lat: location.lat, lng: location.lng };
    if (showPicker === "pickup") {
      onUpdatePickup(coord, location.name);
    } else {
      onUpdateDrop(coord, location.name);
    }
    setShowPicker(null);
    onRecalculate();
  };

  if (!recommendation) return null;

  const routes = recommendation.routes || [];

  if (routes.length === 0) {
    return (
      <div className="simple-driver-view">
        <div className="empty-routes-state" style={{ height: "100%", justifyContent: "center" }}>
          <h3>0 Routes Available</h3>
          <p>No valid paths found between these locations.</p>
          <button className="simple-route-btn" style={{ marginTop: 20 }} onClick={() => setShowPicker("pickup")}>
            Change Locations
          </button>
        </div>
      </div>
    );
  }

  const saferRoute = routes.find((r) => r.route_id === recommendation.recommendation.route_id) || routes[0];
  const fastestRoute = routes.find((r) => r.route_id === recommendation.decision?.fastest_route_id) || routes[1];

  return (
    <div className="simple-driver-view">
      {/* Map Background */}
      <div className="simple-map">
        <MapView
          routes={routes}
          fastestRouteId={recommendation.decision?.fastest_route_id}
          selectedRouteId={null}
          bufferMin={5}
          pickup={pickup}
          drop={drop}
          isMapPickingOrigin={mapPicking === "pickup"}
          isMapPickingDestination={mapPicking === "drop"}
          onMapClick={(lngLat) => {
            if (mapPicking === "pickup") {
              onUpdatePickup({ lat: lngLat[1], lng: lngLat[0] }, "Custom Pin");
              setMapPicking(null);
              onRecalculate();
            } else if (mapPicking === "drop") {
              onUpdateDrop({ lat: lngLat[1], lng: lngLat[0] }, "Custom Pin");
              setMapPicking(null);
              onRecalculate();
            }
          }}
          onRouteClick={() => {}}
          onSelectRecommended={() => {}}
        />
      </div>

      {mapPicking && (
        <div style={{ position: "absolute", top: 120, left: 16, right: 16, background: "#10b981", color: "#fff", padding: "12px 16px", borderRadius: 12, textAlign: "center", zIndex: 10, fontWeight: 600, boxShadow: "0 4px 12px rgba(16, 185, 129, 0.4)" }}>
          Tap anywhere on map to set {mapPicking === "pickup" ? "Pickup" : "Destination"}
        </div>
      )}

      {/* Top Card - Locations */}
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

      {/* Bottom Card - Routes */}
      <div className="simple-bottom-card">
        {/* Cleaner Route */}
        {saferRoute && (
          <button
            className="simple-route-btn safer"
            onClick={() => onSelectRoute(saferRoute.route_id)}
          >
            <div className="simple-route-header">
              <span className="simple-route-label">Cleaner Air</span>
              <span className="simple-route-time">{Math.round(saferRoute.duration_minutes)} min</span>
            </div>
            <div className="simple-route-detail">
              {Math.round(saferRoute.distance_km * 10) / 10} km • {Math.round(saferRoute.exposure_index)} exposure
            </div>
          </button>
        )}

        {/* Fastest Route */}
        {fastestRoute && (
          <button
            className="simple-route-btn"
            onClick={() => onSelectRoute(fastestRoute.route_id)}
          >
            <div className="simple-route-header">
              <span className="simple-route-label">Fastest</span>
              <span className="simple-route-time">{Math.round(fastestRoute.duration_minutes)} min</span>
            </div>
            <div className="simple-route-detail">
              {Math.round(fastestRoute.distance_km * 10) / 10} km • {Math.round(fastestRoute.exposure_index)} exposure
            </div>
          </button>
        )}
      </div>

      {/* Location Picker Modal */}
      {showPicker && (
        <div className="simple-modal" onClick={() => setShowPicker(null)}>
          <div className="simple-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="simple-modal-header">
              <span className="simple-modal-title">
                {showPicker === "pickup" ? "Pickup Location" : "Destination"}
              </span>
              <button className="simple-close-btn" onClick={() => setShowPicker(null)}>
                <X size={20} />
              </button>
            </div>

            <button className="simple-loc-item gps" onClick={handleUseGPS}>
              <Navigation size={18} />
              <span>Use Current Location</span>
            </button>

            <button
              className="simple-loc-item"
              onClick={() => {
                setMapPicking(showPicker);
                setShowPicker(null);
              }}
              style={{ borderColor: "#3b82f6", color: "#3b82f6", background: "#eff6ff" }}
            >
              <MapPin size={18} />
              <span>Choose on Map</span>
            </button>

            {DELHI_LOCATIONS.slice(0, 6).map((loc) => (
              <button key={loc.id} className="simple-loc-item" onClick={() => handleSelectLocation(loc)}>
                <MapPin size={18} />
                <span>{loc.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
