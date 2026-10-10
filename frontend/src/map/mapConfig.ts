/**
 * MapLibre Configuration & Styles for AirShield.
 * Uses public OpenStreetMap tiles to guarantee 100% reliable rendering without API keys or watermarks.
 */

export const ROUTE_COLORS = {
  highAqi: "#dc2626",         // Crimson Red - High AQI / Heavy exposure corridor
  lowAqi: "#2563eb",          // Royal Blue - Lower AQI / Cleaner air corridor
  recommendedActive: "#10b981", // Neon Emerald - Active recommended guided path
  other: "#64748b",           // Slate 500 - Muted candidate routes
  pickup: "#3b82f6",          // Blue 600
  drop: "#ef4444",            // Red 600
  station: "#f59e0b"          // Amber AQI station dot
};

export const ROUTE_WIDTHS = {
  highAqi: 5.5,
  lowAqi: 5.5,
  recommendedActive: 7.5,
  other: 3.5
};

export const MAP_STYLE: any = {
  version: 8,
  sources: {
    "carto-dark": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
      ],
      tileSize: 256,
      attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors &copy; <a href=\"https://carto.com/attributions\">CARTO</a>"
    }
  },
  layers: [
    {
      id: "carto-dark-layer",
      type: "raster",
      source: "carto-dark",
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
