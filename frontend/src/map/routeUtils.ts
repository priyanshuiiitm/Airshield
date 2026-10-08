/**
 * Route Geometry & GeoJSON Normalization Utilities.
 */

import { RouteDetail, Coordinate } from "../api/types";

export interface GeoJSONFeature {
  type: "Feature";
  properties: {
    route_id: string;
    type: "fastest" | "safer" | "other";
    duration_min: number;
    exposure_index: number;
  };
  geometry: {
    type: "LineString";
    coordinates: [number, number][]; // [lng, lat]
  };
}

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

/**
 * Convert backend RouteDetail into MapLibre GeoJSON Feature.
 */
export function backendRouteToGeoJSON(
  route: RouteDetail,
  type: "fastest" | "safer" | "other"
): GeoJSONFeature {
  return {
    type: "Feature",
    properties: {
      route_id: route.route_id,
      type,
      duration_min: route.duration_minutes,
      exposure_index: route.exposure_index
    },
    geometry: {
      type: "LineString",
      coordinates: route.geometry.map((pt) => [pt.lng, pt.lat])
    }
  };
}

/**
 * Calculate bounding box for MapLibre fitBounds across all routes and coordinates.
 */
export function calculateBounds(
  routes: RouteDetail[],
  pickup?: Coordinate,
  drop?: Coordinate
): [[number, number], [number, number]] | null {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  let hasPoints = false;

  const addPoint = (lat: number, lng: number) => {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    hasPoints = true;
  };

  if (pickup) addPoint(pickup.lat, pickup.lng);
  if (drop) addPoint(drop.lat, drop.lng);

  for (const r of routes) {
    for (const pt of r.geometry) {
      addPoint(pt.lat, pt.lng);
    }
  }

  if (!hasPoints) return null;

  return [
    [minLng, minLat],
    [maxLng, maxLat]
  ];
}
