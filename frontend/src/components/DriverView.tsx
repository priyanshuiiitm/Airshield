import React, { useState } from "react";
import { Coordinate, RecommendationResponse } from "../api/types";
import { MapPin, Clock, Wind, ChevronDown, Info } from "lucide-react";
import { MapView } from "./MapView";
import { motion, AnimatePresence } from "framer-motion";

interface DriverViewProps {
  recommendation: RecommendationResponse | null;
  pickup: Coordinate;
  drop: Coordinate;
  pickupName: string;
  dropName: string;
  onSelectRoute: (routeId: string) => void;
  selectedRouteId: string | null;
}

export const DriverView: React.FC<DriverViewProps> = ({
  recommendation,
  pickup,
  drop,
  pickupName,
  dropName,
  onSelectRoute,
  selectedRouteId,
}) => {
  const [showDetails, setShowDetails] = useState(false);

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
          </div>
          <div className="trip-divider" />
          <div className="trip-point">
            <MapPin size={16} className="drop-icon" />
            <span className="location-text">{dropName}</span>
          </div>
        </div>
      </div>

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
