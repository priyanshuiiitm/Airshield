import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { RouteDetail, Coordinate } from "../api/types";
import { MAP_STYLE, DEFAULT_CENTER, ROUTE_COLORS, ROUTE_WIDTHS } from "../map/mapConfig";
import { backendRouteToGeoJSON, calculateBounds } from "../map/routeUtils";
import { STATUTORY_AQI_STATIONS } from "../utils/delhiData";
import { Radio } from "lucide-react";

interface MapViewProps {
  routes: RouteDetail[];
  fastestRouteId?: string;
  selectedRouteId?: string | null;
  pickup?: Coordinate;
  drop?: Coordinate;
  isMapPickingOrigin?: boolean;
  isMapPickingDestination?: boolean;
  onMapClick?: (coord: Coordinate) => void;
  onRouteClick?: (routeId: string) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  routes,
  fastestRouteId,
  selectedRouteId,
  pickup,
  drop,
  isMapPickingOrigin = false,
  isMapPickingDestination = false,
  onMapClick,
  onRouteClick
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const stationMarkersRef = useRef<maplibregl.Marker[]>([]);
  const [showStations, setShowStations] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    try {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: MAP_STYLE,
        center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat],
        zoom: DEFAULT_CENTER.zoom,
        attributionControl: false
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

      map.on("load", () => {
        setIsMapLoaded(true);
      });

      // Map click handler for picking origin/destination
      map.on("click", (e) => {
        if (onMapClick) {
          onMapClick({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        }
      });

      map.on("error", (e) => {
        console.warn("MapLibre internal error:", e);
      });

      mapRef.current = map;
    } catch (err: any) {
      console.error("Failed to initialize MapLibre:", err);
      setMapError("Map visualization is currently unavailable on this device.");
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Set cursor style when picking pins
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const canvas = map.getCanvas();
    if (isMapPickingOrigin || isMapPickingDestination) {
      canvas.style.cursor = "crosshair";
    } else {
      canvas.style.cursor = "";
    }
  }, [isMapPickingOrigin, isMapPickingDestination]);

  // Render Live Statutory AQI Stations Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    // Clear old station markers
    stationMarkersRef.current.forEach((m) => m.remove());
    stationMarkersRef.current = [];

    if (!showStations) return;

    STATUTORY_AQI_STATIONS.forEach((station) => {
      const el = document.createElement("div");
      el.className = "station-map-pin";
      const colorClass =
        station.pm25 < 100 ? "pin-good" : station.pm25 < 180 ? "pin-poor" : "pin-severe";

      el.innerHTML = `
        <div class="station-pulse-dot ${colorClass}">
          <span class="station-val">${Math.round(station.pm25)}</span>
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: 18, closeButton: false }).setHTML(`
        <div class="station-popup-card">
          <div class="popup-header">
            <strong>${station.name}</strong>
            <span class="popup-op">${station.operator}</span>
          </div>
          <div class="popup-body">
            <div class="popup-pm">PM2.5: <strong>${station.pm25} µg/m³</strong></div>
            <div class="popup-time">🕒 Updated: ${station.last_updated_mins_ago}m ago</div>
            <div class="popup-src">📡 ${station.source}</div>
          </div>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([station.lng, station.lat])
        .setPopup(popup)
        .addTo(map);

      stationMarkersRef.current.push(marker);
    });
  }, [isMapLoaded, showStations]);

  // Update routes & markers when props change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    // Clear old origin/destination markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add Pickup Marker (Neon Blue)
    if (pickup) {
      const el = document.createElement("div");
      el.className = "map-marker pickup-marker-glow";
      el.innerHTML = `
        <div class="marker-pin-outer">
          <div class="marker-dot pickup-dot"></div>
          <div class="marker-pulse-ring blue-ring"></div>
        </div>
        <div class="marker-tooltip">Pickup Origin</div>
      `;
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([pickup.lng, pickup.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }

    // Add Drop Marker (Neon Red)
    if (drop) {
      const el = document.createElement("div");
      el.className = "map-marker drop-marker-glow";
      el.innerHTML = `
        <div class="marker-pin-outer">
          <div class="marker-dot drop-dot"></div>
          <div class="marker-pulse-ring red-ring"></div>
        </div>
        <div class="marker-tooltip">Destination Drop</div>
      `;
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([drop.lng, drop.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }

    // Categorize routes
    const otherFeatures: any[] = [];
    let fastestFeature: any = null;
    let saferFeature: any = null;

    routes.forEach((r) => {
      if (r.route_id === selectedRouteId && selectedRouteId !== fastestRouteId) {
        saferFeature = backendRouteToGeoJSON(r, "safer");
      } else if (r.route_id === fastestRouteId) {
        fastestFeature = backendRouteToGeoJSON(r, "fastest");
      } else {
        otherFeatures.push(backendRouteToGeoJSON(r, "other"));
      }
    });

    const updateSourceAndLayer = (
      sourceId: string,
      layerId: string,
      data: any,
      color: string,
      width: number
    ) => {
      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(data);
      } else if (data.features && data.features.length > 0) {
        map.addSource(sourceId, { type: "geojson", data });
        map.addLayer({
          id: layerId,
          type: "line",
          source: sourceId,
          layout: {
            "line-join": "round",
            "line-cap": "round"
          },
          paint: {
            "line-color": color,
            "line-width": width,
            "line-opacity": 0.95
          }
        });

        map.on("click", layerId, (e) => {
          const rId = e.features?.[0]?.properties?.route_id;
          if (rId && onRouteClick) {
            onRouteClick(rId);
          }
        });
      }
    };

    // 1. Other routes layer
    updateSourceAndLayer(
      "source-routes-other",
      "layer-routes-other",
      { type: "FeatureCollection", features: otherFeatures },
      ROUTE_COLORS.other,
      ROUTE_WIDTHS.other
    );

    // 2. Fastest route layer
    updateSourceAndLayer(
      "source-routes-fastest",
      "layer-routes-fastest",
      { type: "FeatureCollection", features: fastestFeature ? [fastestFeature] : [] },
      ROUTE_COLORS.fastest,
      ROUTE_WIDTHS.fastest
    );

    // 3. Safer route layer
    updateSourceAndLayer(
      "source-routes-safer",
      "layer-routes-safer",
      { type: "FeatureCollection", features: saferFeature ? [saferFeature] : [] },
      ROUTE_COLORS.safer,
      ROUTE_WIDTHS.safer
    );

    // Fit Bounds
    const bounds = calculateBounds(routes, pickup, drop);
    if (bounds) {
      map.fitBounds(bounds, {
        padding: { top: 60, bottom: 60, left: 60, right: 60 },
        duration: 900,
        maxZoom: 15
      });
    }
  }, [routes, fastestRouteId, selectedRouteId, pickup, drop, isMapLoaded, onRouteClick]);

  if (mapError) {
    return (
      <div className="map-fallback-card" role="alert">
        <div className="map-fallback-icon">🗺️</div>
        <p className="map-fallback-text">{mapError}</p>
      </div>
    );
  }

  return (
    <div className="map-view-wrapper">
      <div ref={mapContainerRef} className="map-container" data-testid="map-container" />

      {/* Top Map Action Bar */}
      <div className="map-overlay-controls">
        <button
          type="button"
          className={`map-pill-btn ${showStations ? "active" : ""}`}
          onClick={() => setShowStations(!showStations)}
          title="Toggle live DPCC/CPCB monitoring stations overlay"
        >
          <Radio size={14} className="text-amber" />
          <span>Live AQI Sensors</span>
        </button>
      </div>

      {/* Route Legend */}
      {routes.length > 0 && (
        <div className="map-legend">
          <div className="legend-item">
            <span className="legend-line" style={{ backgroundColor: ROUTE_COLORS.fastest }}></span>
            <span className="legend-label">Fastest (Direct Arterial)</span>
          </div>
          {selectedRouteId && selectedRouteId !== fastestRouteId && (
            <div className="legend-item">
              <span className="legend-line line-glow-emerald" style={{ backgroundColor: ROUTE_COLORS.safer, height: 4.5 }}></span>
              <span className="legend-label">Safer (Green Corridor)</span>
            </div>
          )}
          <div className="legend-item">
            <span className="legend-dot dot-amber"></span>
            <span className="legend-label">Statutory CAAQMS Stations</span>
          </div>
        </div>
      )}
    </div>
  );
};
