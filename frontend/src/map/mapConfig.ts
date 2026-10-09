/**
 * MapLibre Configuration & Styles for AirShield.
 * Uses public OpenStreetMap tiles to guarantee 100% reliable rendering without API keys or watermarks.
 */

export const ROUTE_COLORS = {
  fastest: "#0284c7",     // Sky Blue - High contrast fastest arterial route
  safer: "#059669",       // Emerald 600 - High visibility clean green route
  other: "#64748b",       // Slate 500 - Muted candidate routes
  selected: "#0ea5e9",    // Active focus cyan
  pickup: "#2563eb",      // Blue 600
  drop: "#dc2626",        // Red 600
  station: "#d97706"      // Amber AQI station dot
};

export const ROUTE_WIDTHS = {
  fastest: 5,
  safer: 7,
  other: 3.5
};

export const MAP_STYLE: any = {
  version: 8,
  sources: {
    "osm-tiles": {
      type: "raster",
      tiles: [
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      ],
      tileSize: 256,
      attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors"
    }
  },
  layers: [
    {
      id: "osm-tiles-layer",
      type: "raster",
      source: "osm-tiles",
      minzoom: 0,
      maxzoom: 19
    }
  ]
};

export const DEFAULT_CENTER = {
  lat: 28.6139,
  lng: 77.2090, // Connaught Place, Delhi
  zoom: 11
};

