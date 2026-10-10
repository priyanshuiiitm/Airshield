import React, { useState } from "react";
import { Coordinate, RecommendationResponse } from "../api/types";
import { MapPin, Clock, Wind, ChevronDown, Info, Edit2, Check, Navigation, X } from "lucide-react";
import { MapView } from "./MapView";
import { motion, AnimatePresence } from "framer-motion";
import { DELHI_LOCATIONS } from "../utils/delhiData";

interface DriverViewProps {
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

export const DriverView: React.FC<DriverViewProps> = ({
  recommendation,
  pickup,
  drop,
  pickupName,
  dropName,
  onSelectRoute,
  selectedRouteId,
  onUpdatePickup,
  onUpdateDrop,
  onRecalculate,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [editingLocation, setEditingLocation] = useState<"pickup" | "drop" | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState<"pickup" | "drop" | null>(null);
  const [tempPickupLat, setTempPickupLat] = useState(pickup.lat.toString());
  const [tempPickupLng, setTempPickupLng] = useState(pickup.lng.toString());
  const [tempDropLat, setTempDropLat] = useState(drop.lat.toString());
  const [tempDropLng, setTempDropLng] = useState(drop.lng.toString());

  const handleUseGPS = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coord = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          if (showLocationPicker === "pickup") {
            onUpdatePickup(coord, `My Location (${coord.lat.toFixed(3)}, ${coord.lng.toFixed(3)})`);
          } else if (showLocationPicker === "drop") {
            onUpdateDrop(coord, `My Location (${coord.lat.toFixed(3)}, ${coord.lng.toFixed(3)})`);
          }
          setShowLocationPicker(null);
          onRecalculate();
        },
        () => alert("Unable to access location")
      );
    }
  };

  const handleSelectPreset = (location: typeof DELHI_LOCATIONS[0]) => {
    const coord = { lat: location.lat, lng: location.lng };
    if (showLocationPicker === "pickup") {
      onUpdatePickup(coord, location.name);
    } else if (showLocationPicker === "drop") {
      onUpdateDrop(coord, location.name);
    }
    setShowLocationPicker(null);
    onRecalculate();
  };

  const handleSavePickup = () => {
    const lat = parseFloat(tempPickupLat);
    const lng = parseFloat(tempPickupLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      onUpdatePickup({ lat, lng }, `Custom (${lat.toFixed(3)}, ${lng.toFixed(3)})`);
      setEditingLocation(null);
      onRecalculate();
    }
  };

  const handleSaveDrop = () => {
    const lat = parseFloat(tempDropLat);
    const lng = parseFloat(tempDropLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      onUpdateDrop({ lat, lng }, `Custom (${lat.toFixed(3)}, ${lng.toFixed(3)})`);
      setEditingLocation(null);
      onRecalculate();
    }
  };

  if (!recommendation) return null;

  const routes = recommendation.routes || [];
  const recommendedRoute = routes.find(
    (r) => r.route_id === recommendation.recommendation.route_id
  );
  const fastestRoute = routes.find(
    (r) => r.route_id === recommendation.decision?.fastest_route_id
  );

  const saferRoute = recommendedRoute || routes[0];
  const normalRoute = fastestRoute || routes[1];

  return (
    <div className="driver-view">
      {/* Map - Full screen background */}
      <div className="driver-map-container">
        <MapView
          routes={routes}
          fastestRouteId={recommendation.decision?.fastest_route_id}
          selectedRouteId={selectedRouteId}
          bufferMin={5}
          pickup={pickup}
          drop={drop}
          isMapPickingOrigin={false}
          isMapPickingDestination={false}
          onMapClick={() => {}}
          onRouteClick={onSelectRoute}
          onSelectRecommended={() => {
            if (recommendation.recommendation.route_id) {
              onSelectRoute(recommendation.recommendation.route_id);
            }
          }}
        />
      </div>

      {/* Trip Info Overlay - Top */}
      <div className="driver-trip-header">
        <div className="trip-locations">
          <div className="trip-point">
            <MapPin size={16} className="pickup-icon" />
            <span className="location-text">{pickupName}</span>
            <button
              className="btn-edit-location"
              onClick={() => setShowLocationPicker("pickup")}
            >
              <Edit2 size={14} />
            </button>
          </div>

          <div className="trip-divider" />

          <div className="trip-point">
            <MapPin size={16} className="drop-icon" />
            <span className="location-text">{dropName}</span>
            <button
              className="btn-edit-location"
              onClick={() => setShowLocationPicker("drop")}
            >
              <Edit2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Location Picker Modal */}
      <AnimatePresence>
        {showLocationPicker && (
          <motion.div
            className="location-picker-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLocationPicker(null)}
          >
            <motion.div
              className="location-picker-content"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="picker-header-modal">
                <h3 className="picker-title-modal">
                  {showLocationPicker === "pickup" ? "Set Pickup" : "Set Destination"}
                </h3>
                <button
                  className="btn-close-modal"
                  onClick={() => setShowLocationPicker(null)}
                >
                  <X size={20} />
                </button>
              </div>

              {/* GPS Option */}
              <button className="location-option gps-option" onClick={handleUseGPS}>
                <Navigation size={18} className="option-icon" />
                <div className="option-text">
                  <span className="option-title">Use Current Location</span>
                  <span className="option-subtitle">GPS</span>
                </div>
              </button>

              {/* Preset Locations */}
              <div className="preset-locations">
                <span className="preset-heading">Popular Locations</span>
                {DELHI_LOCATIONS.slice(0, 8).map((loc) => (
                  <button
                    key={loc.id}
                    className="location-option"
                    onClick={() => handleSelectPreset(loc)}
                  >
                    <MapPin size={16} className="option-icon" />
                    <div className="option-text">
                      <span className="option-title">{loc.name}</span>
                      <span className="option-subtitle">
                        {loc.lat.toFixed(3)}, {loc.lng.toFixed(3)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Custom Coordinates */}
              <div className="custom-coords-section">
                <span className="preset-heading">Custom Coordinates</span>
                <div className="coord-inputs">
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="Latitude"
                    value={
                      showLocationPicker === "pickup" ? tempPickupLat : tempDropLat
                    }
                    onChange={(e) =>
                      showLocationPicker === "pickup"
                        ? setTempPickupLat(e.target.value)
                        : setTempDropLat(e.target.value)
                    }
                    className="coord-input"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="Longitude"
                    value={
                      showLocationPicker === "pickup" ? tempPickupLng : tempDropLng
                    }
                    onChange={(e) =>
                      showLocationPicker === "pickup"
                        ? setTempPickupLng(e.target.value)
                        : setTempDropLng(e.target.value)
                    }
                    className="coord-input"
                  />
                </div>
                <button
                  className="btn-save"
                  onClick={() => {
                    if (showLocationPicker === "pickup") {
                      handleSavePickup();
                    } else {
                      handleSaveDrop();
                    }
                  }}
                >
                  <Check size={14} /> Apply Custom Location
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Route Selection Cards - Bottom */}
      <div className="driver-bottom-sheet">
        {/* Clean Air Impact Badge */}
        {saferRoute && normalRoute && (
          <div className="air-impact-badge">
            <Wind size={14} />
            <span>
              {Math.round(
                ((normalRoute.exposure_index - saferRoute.exposure_index) / normalRoute.exposure_index) * 100
              )}
              % cleaner air route available
            </span>
          </div>
        )}

        {/* Route Options */}
        <div className="route-options">
          {/* Safer Route */}
          {saferRoute && (
            <motion.button
              className="route-option-card safer-route"
              onClick={() => onSelectRoute(saferRoute.route_id)}
              whileTap={{ scale: 0.98 }}
            >
              <div className="route-option-header">
                <div className="route-badge safer">CLEANER AIR</div>
                <div className="route-time">
                  <Clock size={16} />
                  {Math.round(saferRoute.duration_minutes)} min
                </div>
              </div>
              <div className="route-metrics-simple">
                <div className="metric-simple">
                  <span className="metric-value">
                    {Math.round(saferRoute.exposure_index)}
                  </span>
                  <span className="metric-label">Exposure</span>
                </div>
                <div className="metric-simple">
                  <span className="metric-value">
                    {Math.round(saferRoute.distance_km * 10) / 10} km
                  </span>
                  <span className="metric-label">Distance</span>
                </div>
              </div>
            </motion.button>
          )}

          {/* Fastest Route */}
          {normalRoute && (
            <motion.button
              className="route-option-card fastest-route"
              onClick={() => onSelectRoute(normalRoute.route_id)}
              whileTap={{ scale: 0.98 }}
            >
              <div className="route-option-header">
                <div className="route-badge fastest">FASTEST</div>
                <div className="route-time">
                  <Clock size={16} />
                  {Math.round(normalRoute.duration_minutes)} min
                </div>
              </div>
              <div className="route-metrics-simple">
                <div className="metric-simple">
                  <span className="metric-value">
                    {Math.round(normalRoute.exposure_index)}
                  </span>
                  <span className="metric-label">Exposure</span>
                </div>
                <div className="metric-simple">
                  <span className="metric-value">
                    {Math.round(normalRoute.distance_km * 10) / 10} km
                  </span>
                  <span className="metric-label">Distance</span>
                </div>
              </div>
            </motion.button>
          )}
        </div>

        {/* Details Toggle */}
        <button
          className="details-toggle"
          onClick={() => setShowDetails(!showDetails)}
        >
          <Info size={14} />
          <span>How we calculated this</span>
          <ChevronDown
            size={16}
            style={{
              transform: showDetails ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }}
          />
        </button>

        {/* Expandable Details Panel */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              className="details-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="detail-content">
                <p className="detail-text">
                  We analyze real-time air quality from {42} monitoring
                  stations and calculate pollution exposure along each route.
                </p>
                <div className="detail-stats">
                  <div className="detail-stat">
                    <span className="stat-label">Stations Used</span>
                    <span className="stat-value">
                      {42}
                    </span>
                  </div>
                  <div className="detail-stat">
                    <span className="stat-label">Avg PM2.5</span>
                    <span className="stat-value">
                      {Math.round(saferRoute?.average_pm25 || 0)} µg/m³
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
