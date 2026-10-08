/**
 * MapLibre Configuration & Styles for AirShield.
 * Uses public Carto Light tiles to guarantee fast, reliable rendering without secret tokens.
 */

export const ROUTE_COLORS = {
  fastest: "#334155", // Slate 700 - Neutral dark
  safer: "#059669",   // Emerald 600 - High contrast clean green
  other: "#94a3b8",   // Slate 400 - Muted grey
  pickup: "#2563eb",  // Blue 600
  drop: "#dc2626"     // Red 600
};

export const ROUTE_WIDTHS = {
  fastest: 4,
  safer: 6,
  other: 3
};

export const MAP_STYLE: any = {
  version: 8,
  sources: {
    "carto-light": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}@2x.png"
      ],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap &copy; CARTO"
    }
  },
  layers: [
    {
      id: "carto-light-layer",
      type: "raster",
      source: "carto-light",
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
