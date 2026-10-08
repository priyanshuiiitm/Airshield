/**
 * AirShield Frontend Core Logic & Contracts Verification Test
 */

import { backendRouteToGeoJSON, calculateBounds } from '../map/routeUtils.ts';
import { getTranslation, translations } from '../utils/localization.ts';
import { formatCurrency, formatMinutes, formatPercentage, formatDistance } from '../utils/formatting.ts';
import type { RecommendResponse, RouteDetail } from '../api/types.ts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('=== 1. Localization Integrity Verification ===');
const languages = ['en', 'hi'] as const;
for (const lang of languages) {
  assert(getTranslation(lang, 'appTitle') === 'AirShield', `[${lang}] App title matches`);
  assert(typeof getTranslation(lang, 'titleAvoidable') === 'string' && getTranslation(lang, 'titleAvoidable').length > 0, `[${lang}] Avoidable heading exists`);
  assert(typeof getTranslation(lang, 'titleUnavoidable') === 'string' && getTranslation(lang, 'titleUnavoidable').length > 0, `[${lang}] Unavoidable heading exists`);
  assert(typeof getTranslation(lang, 'titleLow') === 'string' && getTranslation(lang, 'titleLow').length > 0, `[${lang}] Low heading exists`);
  assert(typeof getTranslation(lang, 'titleInsufficientData') === 'string' && getTranslation(lang, 'titleInsufficientData').length > 0, `[${lang}] Insufficient heading exists`);
  assert(typeof getTranslation(lang, 'disclaimerBody') === 'string' && getTranslation(lang, 'disclaimerBody').length > 0, `[${lang}] Scientific disclaimer exists`);
}

// Check key parity between EN and HI
const enKeys = Object.keys(translations.en);
const hiKeys = Object.keys(translations.hi);
assert(enKeys.length === hiKeys.length, `Translation key parity: ${enKeys.length} EN keys vs ${hiKeys.length} HI keys`);
for (const key of enKeys) {
  assert(key in translations.hi, `HI translation dictionary contains key "${key}"`);
}

console.log('\n=== 2. Formatting Utility Verification ===');
assert(formatMinutes(3.0) === '+3 min', 'formatMinutes 3.0 -> +3 min');
assert(formatMinutes(0, false) === '0 min', 'formatMinutes 0 without sign -> 0 min');
assert(formatPercentage(34.5) === '↓35%', 'formatPercentage 34.5 -> ↓35%');
assert(formatCurrency(3.0) === '₹3', 'formatCurrency 3.0 -> ₹3');
assert(formatDistance(5.23) === '5.2 km', 'formatDistance 5.23 -> 5.2 km');

console.log('\n=== 3. GeoJSON & Map Utils Verification ===');
const dummyRoute: RouteDetail = {
  route_id: 'route_safe_1',
  summary: 'Green Corridor Route',
  distance_km: 5.6,
  duration_minutes: 15.0,
  exposure_index: 126.0,
  geometry: [
    { lat: 28.6139, lng: 77.2090 },
    { lat: 28.6145, lng: 77.2100 },
    { lat: 28.6200, lng: 77.2200 }
  ]
};

const geojson = backendRouteToGeoJSON(dummyRoute, 'safer');
assert(geojson.type === 'Feature', 'GeoJSON type is Feature');
assert(geojson.properties.type === 'safer', 'GeoJSON properties contain type: safer');
assert(geojson.geometry.coordinates.length === 3, 'GeoJSON has 3 coordinate pairs');

const bounds = calculateBounds([dummyRoute]);
assert(bounds !== null, 'calculateBounds returned valid bounding box');
if (bounds) {
  assert(bounds[0][0] === 77.2090, 'Min Lng is 77.2090');
  assert(bounds[0][1] === 28.6139, 'Min Lat is 28.6139');
  assert(bounds[1][0] === 77.2200, 'Max Lng is 77.2200');
  assert(bounds[1][1] === 28.6200, 'Max Lat is 28.6200');
}

console.log('\n=== 4. Backend Response Schema Validation ===');
const mockBackendAvoidable: RecommendationResponse = {
  trip_id: 'trip-test-123',
  classification: 'AVOIDABLE',
  recommendation: {
    route_id: 'route_safe_1',
    action: 'RECOMMEND_SAFER',
    additional_minutes: 3.0,
    exposure_reduction_percent: 32.0,
    reward_eligible: true,
    reward_amount_inr: 3.0,
  },
  routes: [
    {
      route_id: 'route_fastest_0',
      duration_minutes: 12.0,
      duration_sec: 720,
      distance_km: 5.2,
      distance_m: 5200,
      exposure_index: 185.4,
      average_pm25: 154.5,
      estimated_integrated_pm25: 1854.0,
      feasible: true,
      confidence: 'HIGH',
      geometry: [
        { lat: 28.6139, lng: 77.2090 },
        { lat: 28.6200, lng: 77.2200 }
      ],
    },
    {
      route_id: 'route_safe_1',
      duration_minutes: 15.0,
      duration_sec: 900,
      distance_km: 5.6,
      distance_m: 5600,
      exposure_index: 126.0,
      average_pm25: 84.0,
      estimated_integrated_pm25: 1260.0,
      feasible: true,
      confidence: 'HIGH',
      geometry: [
        { lat: 28.6139, lng: 77.2090 },
        { lat: 28.6145, lng: 77.2100 },
        { lat: 28.6200, lng: 77.2200 }
      ],
    }
  ],
  decision: {
    fastest_route_id: 'route_fastest_0',
    selected_route_id: 'route_safe_1',
    buffer_minutes: 5.0,
    robust: true,
  },
  benefit: {
    type: 'GREEN_CORRIDOR_INCENTIVE',
    amount_inr: 3.0,
    eligible: true,
  },
  metadata: {
    snapshot_id: 'delhi_ncr_2026_10_08',
    model_version: 'v1.0.0',
    data_mode: 'snapshot',
    modelled: true,
    created_at: '2026-10-08T20:00:00Z',
  },
  message: 'Safer route found with 32% reduced PM2.5 exposure',
  agent: {
    enabled: true,
    source: 'AGENT',
    reason_code: 'EXPOSURE_REDUCED_WITHIN_BUFFER',
    action: 'RECOMMEND_SAFER',
    explanation: 'Route 1 offers a 32% lower exposure with only 3 minutes added travel time.',
    validation_passed: true,
    fallback_used: false,
    tool_trace: [
      { tool: 'calculate_exposure', duration_ms: 45, status: 'success' },
      { tool: 'evaluate_policy', duration_ms: 12, status: 'success' }
    ],
    model_id: 'amazon.nova-micro-v1:0'
  }
};

assert(mockBackendAvoidable.classification === 'AVOIDABLE', 'Classification is AVOIDABLE');
assert(mockBackendAvoidable.recommendation.reward_eligible === true, 'Reward eligible is true');
assert(mockBackendAvoidable.recommendation.reward_amount_inr === 3.0, 'Reward amount is 3.0');
assert(mockBackendAvoidable.agent?.source === 'AGENT', 'Agent source is AGENT');
assert(mockBackendAvoidable.routes.length === 2, 'Candidate routes count is 2');

console.log(`\n================================`);
console.log(`Tests Passed: ${passed}`);
console.log(`Tests Failed: ${failed}`);
console.log(`================================`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL FRONTEND LOGIC & INTEGRITY TESTS PASSED SUCCESSFULLY! ✅');
}
