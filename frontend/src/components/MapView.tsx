/**
 * MapView Component for AirShield (Phase 5).
 * Renders MapLibre GL map with color-coded route lines (Fastest = neutral dark, Safer = green, Other = grey)
 * and fitBounds auto-centering.
 */

import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { RouteDetail, Coordinate } from "../api/types";
import { MAP_STYLE, DEFAULT_CENTER, ROUTE_COLORS, ROUTE_WIDTHS } from "../map/mapConfig";
import { backendRouteToGeoJSON, calculateBounds } from "../map/routeUtils";

interface MapViewProps {
  routes: RouteDetail[];
  fastestRouteId?: string;
  selectedRouteId?: string | null;
  pickup?: Coordinate;
  drop?: Coordinate;
  onRouteClick?: (routeId: string) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  routes,
  fastestRouteId,
  selectedRouteId,
  pickup,
  drop,
  onRouteClick
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
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

  // Update routes & markers when props change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add Pickup Marker (Blue)
    if (pickup) {
      const el = document.createElement("div");
      el.className = "map-marker pickup-marker";
      el.innerHTML = `<div class="marker-dot pickup-dot"></div>`;
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([pickup.lng, pickup.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }

    // Add Drop Marker (Red)
    if (drop) {
      const el = document.createElement("div");
      el.className = "map-marker drop-marker";
      el.innerHTML = `<div class="marker-dot drop-dot"></div>`;
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
        padding: { top: 40, bottom: 40, left: 40, right: 40 },
        duration: 800,
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
      
      {/* Route Legend */}
      {routes.length > 0 && (
        <div className="map-legend">
          <div className="legend-item">
            <span className="legend-line" style={{ backgroundColor: ROUTE_COLORS.fastest }}></span>
            <span className="legend-label">Fastest</span>
          </div>
          {selectedRouteId && selectedRouteId !== fastestRouteId && (
            <div className="legend-item">
              <span className="legend-line" style={{ backgroundColor: ROUTE_COLORS.safer, height: 4 }}></span>
              <span className="legend-label">Safer</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
