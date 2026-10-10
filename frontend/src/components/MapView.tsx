/**
 * MapView Component for AirShield.
 * Renders OpenStreetMap raster tiles, color-coded Red (High AQI) vs Blue (Lower AQI) routes,
 * on-map midpoint labels, interactive recommendation prompt, and isolated Green recommended path.
 */

import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { RouteDetail, Coordinate } from "../api/types";
import { MAP_STYLE, DEFAULT_CENTER, ROUTE_COLORS, ROUTE_WIDTHS } from "../map/mapConfig";
import { calculateBounds } from "../map/routeUtils";
import { STATUTORY_AQI_STATIONS } from "../utils/delhiData";
import { Radio, Check, Eye, Map, X } from "lucide-react";
import { uberIcons } from "../constants/uberAssets";

interface MapViewProps {
  routes: RouteDetail[];
  fastestRouteId?: string;
  selectedRouteId?: string | null;
  bufferMin?: number;
  pickup?: Coordinate;
  drop?: Coordinate;
  isMapPickingOrigin?: boolean;
  isMapPickingDestination?: boolean;
  onMapClick?: (coord: Coordinate) => void;
  onRouteClick?: (routeId: string) => void;
  onSelectRecommended?: () => void;
  onSelectFastest?: () => void;
  routeViewMode?: "all" | "safer" | "fastest";
  onViewModeChange?: (mode: "all" | "safer" | "fastest") => void;
}

export const MapView: React.FC<MapViewProps> = ({
  routes,
  fastestRouteId,
  selectedRouteId,
  bufferMin = 5,
  pickup,
  drop,
  isMapPickingOrigin = false,
  isMapPickingDestination = false,
  onMapClick,
  onRouteClick,
  onSelectRecommended,
  onSelectFastest,
  routeViewMode,
  onViewModeChange
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const stationMarkersRef = useRef<maplibregl.Marker[]>([]);
  const routeLabelMarkersRef = useRef<maplibregl.Marker[]>([]);

  const [showStations, setShowStations] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Route view mode: "all" (Red vs Blue), "safer" (Isolated Green), or "fastest" (Isolated Blue)
  const [internalViewMode, setInternalViewMode] = useState<"all" | "safer" | "fastest">("all");
  const effectiveViewMode = routeViewMode !== undefined ? routeViewMode : internalViewMode;

  const setEffectiveViewMode = (mode: "all" | "safer" | "fastest") => {
    setInternalViewMode(mode);
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
  };

  const [showPrompt, setShowPrompt] = useState(true);

  // Re-trigger popup prompt whenever the trip origin, destination, or routes are recalculated
  useEffect(() => {
    setEffectiveViewMode("all");
    setShowPrompt(true);
  }, [pickup?.lat, pickup?.lng, drop?.lat, drop?.lng, routes]);

  // Determine fastest route
  const fastestRoute =
    routes.find((r) => r.route_id === fastestRouteId) ||
    [...routes].sort((a, b) => a.duration_minutes - b.duration_minutes)[0];

  // Determine recommended (safer) route
  const recommendedRoute =
    routes.find((r) => r.route_id === (selectedRouteId || fastestRouteId)) ||
    routes.find((r) => r.route_id === fastestRouteId) ||
    routes[0];

  // Determine highest AQI route (Red) vs lower AQI route (Blue)
  const sortedByAqi = [...routes].sort((a, b) => b.average_pm25 - a.average_pm25);
  const highestAqiRouteId = sortedByAqi.length > 0 ? sortedByAqi[0].route_id : undefined;
  const lowerAqiRouteId = sortedByAqi.length > 1 ? sortedByAqi[1].route_id : undefined;

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
            <div class="popup-time">Updated: ${station.last_updated_mins_ago}m ago</div>
            <div class="popup-src">Source: ${station.source}</div>
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

  // Update routes & route labels
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    // Clear origin/destination markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Clear route label markers
    routeLabelMarkersRef.current.forEach((m) => m.remove());
    routeLabelMarkersRef.current = [];

    // Add Pickup Marker (Uber Target Icon)
    if (pickup) {
      const el = document.createElement("div");
      el.className = "map-marker uber-pickup-pin";
      el.innerHTML = `
        <div class="marker-pin-outer" style="display:flex;align-items:center;justify-content:center;background:#09090b;border:2px solid #ffffff;border-radius:50%;width:28px;height:28px;box-shadow:0 4px 14px rgba(0,0,0,0.8);">
          <img src="${uberIcons.target}" alt="Pickup" style="width:14px;height:14px;object-fit:contain;filter:brightness(0) invert(1);" />
        </div>
        <div class="marker-tooltip">Pickup Origin</div>
      `;
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([pickup.lng, pickup.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }

    // Add Drop Marker (Uber Point Icon)
    if (drop) {
      const el = document.createElement("div");
      el.className = "map-marker uber-drop-pin";
      el.innerHTML = `
        <div class="marker-pin-outer" style="display:flex;align-items:center;justify-content:center;background:#ffffff;border:2px solid #09090b;border-radius:50%;width:28px;height:28px;box-shadow:0 4px 14px rgba(0,0,0,0.8);">
          <img src="${uberIcons.point}" alt="Drop" style="width:14px;height:14px;object-fit:contain;" />
        </div>
        <div class="marker-tooltip">Destination Drop</div>
      `;
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([drop.lng, drop.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }

    // Helper to update GeoJSON layer
    const updateSourceAndLayer = (
      sourceId: string,
      layerId: string,
      features: any[],
      color: string,
      width: number
    ) => {
      const data = { type: "FeatureCollection", features };
      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(data as any);
      } else if (features.length > 0) {
        map.addSource(sourceId, { type: "geojson", data: data as any, lineMetrics: true });
        
        const isRedRoute = sourceId === "source-routes-red";
        
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
            "line-opacity": 0.95,
            // Apply a stunning gradient ONLY to the red route to simulate a pollution heatmap
            ...(isRedRoute ? {
              "line-gradient": [
                "interpolate",
                ["linear"],
                ["line-progress"],
                0, "#fbbf24", // Yellow (Moderate)
                0.5, "#dc2626", // Red (Severe)
                1, "#fbbf24"  // Yellow (Moderate)
              ]
            } : {})
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

    // Prepare features based on effectiveViewMode
    const greenFeatures: any[] = [];
    const redFeatures: any[] = [];
    const blueFeatures: any[] = [];

    if (effectiveViewMode === "safer" && recommendedRoute) {
      // ONLY show the single recommended route in Green
      greenFeatures.push({
        type: "Feature",
        properties: { route_id: recommendedRoute.route_id },
        geometry: {
          type: "LineString",
          coordinates: recommendedRoute.geometry.map((pt) => [pt.lng, pt.lat])
        }
      });

      // Add single Green on-map midpoint badge
      const midIdx = Math.floor(recommendedRoute.geometry.length / 2);
      const midPt = recommendedRoute.geometry[midIdx];
      if (midPt) {
        const el = document.createElement("div");
        el.className = "route-onmap-badge badge-green";
        el.innerHTML = `<span>Recommended Path (${recommendedRoute.average_pm25} µg/m³ • ${recommendedRoute.duration_minutes}m)</span>`;
        const m = new maplibregl.Marker({ element: el })
          .setLngLat([midPt.lng, midPt.lat])
          .addTo(map);
        routeLabelMarkersRef.current.push(m);
      }
    } else if (effectiveViewMode === "fastest" && fastestRoute) {
      // ONLY show the single fastest route in Royal Blue
      blueFeatures.push({
        type: "Feature",
        properties: { route_id: fastestRoute.route_id },
        geometry: {
          type: "LineString",
          coordinates: fastestRoute.geometry.map((pt) => [pt.lng, pt.lat])
        }
      });

      // Add single Blue on-map midpoint badge
      const midIdx = Math.floor(fastestRoute.geometry.length / 2);
      const midPt = fastestRoute.geometry[midIdx];
      if (midPt) {
        const el = document.createElement("div");
        el.className = "route-onmap-badge badge-blue";
        el.innerHTML = `<span>Fastest Route (${fastestRoute.average_pm25} µg/m³ • ${fastestRoute.duration_minutes}m)</span>`;
        const m = new maplibregl.Marker({ element: el })
          .setLngLat([midPt.lng, midPt.lat])
          .addTo(map);
        routeLabelMarkersRef.current.push(m);
      }
    } else {
      // Show both routes: Higher AQI in RED, Lower AQI in BLUE
      routes.forEach((r) => {
        const isHighAqi = r.route_id === highestAqiRouteId;
        const feature = {
          type: "Feature",
          properties: { route_id: r.route_id },
          geometry: {
            type: "LineString",
            coordinates: r.geometry.map((pt) => [pt.lng, pt.lat])
          }
        };

        if (isHighAqi) {
          redFeatures.push(feature);
        } else {
          blueFeatures.push(feature);
        }

        // Add on-map midpoint badge
        const midIdx = Math.floor(r.geometry.length / 2);
        const midPt = r.geometry[midIdx];
        if (midPt) {
          const el = document.createElement("div");
          el.className = `route-onmap-badge ${isHighAqi ? "badge-red" : "badge-blue"}`;
          el.innerHTML = isHighAqi
            ? `<span>Higher Exposure (${r.average_pm25} µg/m³ • ${r.duration_minutes}m)</span>`
            : `<span>Lower Exposure (${r.average_pm25} µg/m³ • ${r.duration_minutes}m)</span>`;
          el.onclick = () => onRouteClick && onRouteClick(r.route_id);
          const m = new maplibregl.Marker({ element: el })
            .setLngLat([midPt.lng, midPt.lat])
            .addTo(map);
          routeLabelMarkersRef.current.push(m);
        }
      });
    }

    // 1. Red Route Layer (High AQI)
    updateSourceAndLayer(
      "source-routes-red",
      "layer-routes-red",
      redFeatures,
      ROUTE_COLORS.highAqi,
      ROUTE_WIDTHS.highAqi
    );

    // 2. Blue Route Layer (Lower AQI / Fastest Route)
    updateSourceAndLayer(
      "source-routes-blue",
      "layer-routes-blue",
      blueFeatures,
      ROUTE_COLORS.lowAqi,
      effectiveViewMode === "fastest" ? 7.5 : ROUTE_WIDTHS.lowAqi
    );

    // 3. Green Route Layer (Active Recommended)
    updateSourceAndLayer(
      "source-routes-green",
      "layer-routes-green",
      greenFeatures,
      ROUTE_COLORS.recommendedActive,
      ROUTE_WIDTHS.recommendedActive
    );

    // Auto-fit bounds
    const targetRoutes =
      effectiveViewMode === "fastest" && fastestRoute
        ? [fastestRoute]
        : effectiveViewMode === "safer" && recommendedRoute
        ? [recommendedRoute]
        : routes;

    const bounds = calculateBounds(targetRoutes, pickup, drop);
    if (bounds) {
      map.fitBounds(bounds, {
        padding: { top: 70, bottom: 70, left: 70, right: 70 },
        duration: 900,
        maxZoom: 15
      });
    }
  }, [
    routes,
    fastestRouteId,
    selectedRouteId,
    highestAqiRouteId,
    lowerAqiRouteId,
    effectiveViewMode,
    fastestRoute,
    recommendedRoute,
    pickup,
    drop,
    isMapLoaded,
    onRouteClick
  ]);

  const handleApplyRecommendation = () => {
    setEffectiveViewMode("safer");
    setShowPrompt(false);
    if (onSelectRecommended) {
      onSelectRecommended();
    }
  };

  const handleApplyFastest = () => {
    setEffectiveViewMode("fastest");
    setShowPrompt(false);
    if (onSelectFastest) {
      onSelectFastest();
    }
  };

  const handleShowBoth = () => {
    setEffectiveViewMode("all");
    setShowPrompt(false);
  };

  if (mapError) {
    return (
      <div className="map-fallback-card" role="alert">
        <div className="map-fallback-icon"><Map size={24} /></div>
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
          <Radio size={13} style={{ color: "#ffffff" }} />
          <span>Live Sensors</span>
        </button>

        {effectiveViewMode !== "all" && (
          <button
            type="button"
            className="map-pill-btn active-both-btn"
            onClick={handleShowBoth}
            title="View alternative routes"
          >
            <Eye size={13} style={{ color: "#ffffff" }} />
            <span>Show Both Routes</span>
          </button>
        )}
      </div>

      {/* Floating Interactive Recommendation Prompt Card (Sleek OG Minimalist) */}
      {showPrompt && effectiveViewMode === "all" && routes.length >= 2 && (
        <div className="recommendation-prompt-card animate-slide-up" role="region" aria-label="Route Advisory">
          <div className="prompt-header">
            <div className="prompt-tag-row">
              <span className="prompt-tag">CLEANER CORRIDOR AVAILABLE</span>
              <button
                type="button"
                className="prompt-close-btn"
                onClick={() => setShowPrompt(false)}
                title="Dismiss"
              >
                <X size={13} />
              </button>
            </div>
            <p className="prompt-question">
              Lower inhalation route within your +{bufferMin}m buffer.
            </p>
          </div>

          <div className="prompt-action-row">
            <button
              type="button"
              className="btn-apply-rec"
              onClick={handleApplyRecommendation}
            >
              <Check size={13} />
              <span>Take Clean Path</span>
            </button>
            <button
              type="button"
              className="btn-apply-fastest"
              onClick={handleApplyFastest}
            >
              <span>Fastest</span>
            </button>
            <button
              type="button"
              className="btn-dismiss-rec"
              onClick={() => setShowPrompt(false)}
            >
              <span>Compare</span>
            </button>
          </div>
        </div>
      )}

      {/* Route Legend */}
      {routes.length > 0 && (
        <div className="map-legend">
          {effectiveViewMode === "safer" ? (
            <div className="legend-item">
              <span className="legend-line line-green" style={{ backgroundColor: ROUTE_COLORS.recommendedActive }}></span>
              <span className="legend-label">Recommended Clean Path</span>
            </div>
          ) : effectiveViewMode === "fastest" ? (
            <div className="legend-item">
              <span className="legend-line line-blue" style={{ backgroundColor: ROUTE_COLORS.lowAqi }}></span>
              <span className="legend-label">Fastest Direct Path</span>
            </div>
          ) : (
            <>
              <div className="legend-item">
                <span className="legend-line line-red" style={{ backgroundColor: ROUTE_COLORS.highAqi }}></span>
                <span className="legend-label">Higher Exposure Corridor</span>
              </div>
              <div className="legend-item">
                <span className="legend-line line-blue" style={{ backgroundColor: ROUTE_COLORS.lowAqi }}></span>
                <span className="legend-label">Lower Exposure Path</span>
              </div>
            </>
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
