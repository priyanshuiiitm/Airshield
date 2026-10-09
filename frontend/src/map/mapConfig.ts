/**
 * MapLibre Configuration & Styles for AirShield.
 * Uses Carto Dark Matter raster tiles for an ultra-premium obsidian dark-mode aesthetic.
 */

export const ROUTE_COLORS = {
  fastest: "#38bdf8",     // Cyber Cyan - High visibility fastest route
  safer: "#10b981",       // Neon Emerald - Clean/Safer route
  other: "#64748b",       // Slate 500 - Muted candidate routes
  selected: "#22d3ee",    // Active focus cyan
  pickup: "#3b82f6",      // Neon Blue
  drop: "#ef4444",        // Crimson / Red
  station: "#f59e0b"      // Amber AQI station dot
};

export const ROUTE_WIDTHS = {
  fastest: 4.5,
  safer: 6.5,
  other: 3.5
};

export const MAP_STYLE: any = {
  version: 8,
  sources: {
    "carto-dark": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png"
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

