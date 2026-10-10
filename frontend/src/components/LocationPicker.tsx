import React, { useState } from "react";
import { motion } from "framer-motion";
import { fadeInUp, tapScale } from "../animation/motion-config";
import { Coordinate, LanguageCode } from "../api/types";
import { DELHI_LOCATIONS } from "../utils/delhiData";
import { MapPin, Navigation, ArrowUpDown, Clock, Crosshair, Sparkles, CheckCircle2 } from "lucide-react";

interface LocationPickerProps {
  pickup: Coordinate;
  pickupName: string;
  drop: Coordinate;
  dropName: string;
  bufferMin: number;
  isMapPickingOrigin: boolean;
  isMapPickingDestination: boolean;
  isLoading: boolean;
  language: LanguageCode;
  onSelectPickup: (coord: Coordinate, name: string) => void;
  onSelectDrop: (coord: Coordinate, name: string) => void;
  onChangeBuffer: (mins: number) => void;
  onToggleMapPickOrigin: () => void;
  onToggleMapPickDestination: () => void;
  onUseCurrentLocation: () => void;
  onSwapLocations: () => void;
  onCalculateRoutes: () => void;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  pickup,
  pickupName,
  drop,
  dropName,
  bufferMin,
  isMapPickingOrigin,
  isMapPickingDestination,
  isLoading,
  language,
  onSelectPickup,
  onSelectDrop,
  onChangeBuffer,
  onToggleMapPickOrigin,
  onToggleMapPickDestination,
  onUseCurrentLocation,
  onSwapLocations,
  onCalculateRoutes
}) => {
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customPickupLat, setCustomPickupLat] = useState(pickup.lat.toFixed(4));
  const [customPickupLng, setCustomPickupLng] = useState(pickup.lng.toFixed(4));
  const [customDropLat, setCustomDropLat] = useState(drop.lat.toFixed(4));
  const [customDropLng, setCustomDropLng] = useState(drop.lng.toFixed(4));

  const handleCustomApply = () => {
    const pLat = parseFloat(customPickupLat);
    const pLng = parseFloat(customPickupLng);
    const dLat = parseFloat(customDropLat);
    const dLng = parseFloat(customDropLng);

    if (!isNaN(pLat) && !isNaN(pLng)) {
      onSelectPickup({ lat: pLat, lng: pLng }, `Custom (${pLat.toFixed(3)}, ${pLng.toFixed(3)})`);
    }
    if (!isNaN(dLat) && !isNaN(dLng)) {
      onSelectDrop({ lat: dLat, lng: dLng }, `Custom (${dLat.toFixed(3)}, ${dLng.toFixed(3)})`);
    }
  };

  return (
    <motion.div 
      className="location-picker-card" 
      data-testid="location-picker"
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      style={{
        background: "var(--bg-card)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        boxShadow: "var(--shadow-xl)"
      }}
    >
      <div className="picker-header">
        <div className="picker-title-group">
          <div className="live-dot-pulse"></div>
          <h2 className="picker-title">
            {language === "hi" ? "स्थान चुनें और मार्ग खोजें" : "Trip Route Planner"}
          </h2>
        </div>
        <button
          type="button"
          className={`custom-coords-toggle ${isCustomMode ? "active" : ""}`}
          onClick={() => setIsCustomMode(!isCustomMode)}
        >
          {isCustomMode ? "Landmarks" : "Custom Lat/Lng"}
        </button>
      </div>

      {!isCustomMode ? (
        <div className="picker-inputs-flow">
          {/* Origin Picker */}
          <div className="input-group">
            <div className="input-label-row">
              <span className="input-indicator pickup-indicator"></span>
              <label className="input-label">
                {language === "hi" ? "पिकअप स्थान (प्रारंभिक बिंदु)" : "Pickup Origin"}
              </label>
            </div>
            <div className="input-wrapper">
              <MapPin className="input-icon text-blue" size={18} />
              <select
                className="select-field"
                value={
                  DELHI_LOCATIONS.find(
                    (l) => Math.abs(l.lat - pickup.lat) < 0.005 && Math.abs(l.lng - pickup.lng) < 0.005
                  )?.id || "custom"
                }
                onChange={(e) => {
                  const loc = DELHI_LOCATIONS.find((l) => l.id === e.target.value);
                  if (loc) {
                    onSelectPickup({ lat: loc.lat, lng: loc.lng }, loc.name);
                    setCustomPickupLat(loc.lat.toFixed(4));
                    setCustomPickupLng(loc.lng.toFixed(4));
                  }
                }}
              >
                <option value="custom" disabled>
                  📍 {pickupName}
                </option>
                {DELHI_LOCATIONS.map((loc) => (
                  <option key={`p-${loc.id}`} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={`icon-action-btn ${isMapPickingOrigin ? "active-pinning" : ""}`}
                title="Click on map to select Pickup location"
                onClick={onToggleMapPickOrigin}
              >
                <Crosshair size={16} />
              </button>
            </div>
          </div>

          {/* Quick Swap & GPS Action Row */}
          <div className="picker-middle-actions">
            <button
              type="button"
              className="quick-action-pill"
              onClick={onUseCurrentLocation}
              title="Detect your device GPS location in Delhi NCR"
            >
              <Navigation size={13} className="text-cyan" />
              <span>{language === "hi" ? "मेरा GPS स्थान" : "Use GPS"}</span>
            </button>

            <motion.button
              type="button"
              className="swap-btn"
              onClick={onSwapLocations}
              title="Swap Origin and Destination"
              whileHover={{ rotate: 180, scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              <ArrowUpDown size={15} />
            </motion.button>
          </div>

          {/* Destination Picker */}
          <div className="input-group">
            <div className="input-label-row">
              <span className="input-indicator drop-indicator"></span>
              <label className="input-label">
                {language === "hi" ? "गंतव्य स्थान (ड्रॉप)" : "Destination (Drop-off)"}
              </label>
            </div>
            <div className="input-wrapper">
              <MapPin className="input-icon text-red" size={18} />
              <select
                className="select-field"
                value={
                  DELHI_LOCATIONS.find(
                    (l) => Math.abs(l.lat - drop.lat) < 0.005 && Math.abs(l.lng - drop.lng) < 0.005
                  )?.id || "custom"
                }
                onChange={(e) => {
                  const loc = DELHI_LOCATIONS.find((l) => l.id === e.target.value);
                  if (loc) {
                    onSelectDrop({ lat: loc.lat, lng: loc.lng }, loc.name);
                    setCustomDropLat(loc.lat.toFixed(4));
                    setCustomDropLng(loc.lng.toFixed(4));
                  }
                }}
              >
                <option value="custom" disabled>
                  🎯 {dropName}
                </option>
                {DELHI_LOCATIONS.map((loc) => (
                  <option key={`d-${loc.id}`} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={`icon-action-btn ${isMapPickingDestination ? "active-pinning" : ""}`}
                title="Click on map to select Drop destination"
                onClick={onToggleMapPickDestination}
              >
                <Crosshair size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Custom Coordinates Form */
        <div className="custom-coords-grid">
          <div className="coord-field-block">
            <span className="coord-title text-blue">📍 Pickup Lat / Lng</span>
            <div className="coord-inputs-row">
              <input
                type="text"
                className="text-input"
                placeholder="28.6304"
                value={customPickupLat}
                onChange={(e) => setCustomPickupLat(e.target.value)}
              />
              <input
                type="text"
                className="text-input"
                placeholder="77.2177"
                value={customPickupLng}
                onChange={(e) => setCustomPickupLng(e.target.value)}
              />
            </div>
          </div>

          <div className="coord-field-block">
            <span className="coord-title text-red">🎯 Drop Lat / Lng</span>
            <div className="coord-inputs-row">
              <input
                type="text"
                className="text-input"
                placeholder="28.5474"
                value={customDropLat}
                onChange={(e) => setCustomDropLat(e.target.value)}
              />
              <input
                type="text"
                className="text-input"
                placeholder="77.1959"
                value={customDropLng}
                onChange={(e) => setCustomDropLng(e.target.value)}
              />
            </div>
          </div>

          <button type="button" className="btn-apply-coords" onClick={handleCustomApply}>
            <CheckCircle2 size={15} /> Apply Coordinates
          </button>
        </div>
      )}

      {/* Map Clicking Pin Status Notice */}
      {(isMapPickingOrigin || isMapPickingDestination) && (
        <div className="map-picking-banner">
          <Crosshair size={16} className="animate-spin text-cyan" />
          <span>
            {isMapPickingOrigin
              ? "🎯 Click anywhere on the map to set Origin (Pickup)"
              : "🎯 Click anywhere on the map to set Destination (Drop)"}
          </span>
        </div>
      )}

      {/* Delivery Buffer Selector & Trigger */}
      <div className="buffer-and-action-row">
        <div className="buffer-selector">
          <div className="buffer-label">
            <Clock size={14} className="text-amber" />
            <span>{language === "hi" ? "स्वीकार्य समय बफर:" : "Allowed Buffer:"}</span>
          </div>
          <div className="buffer-chips">
            {[2, 5, 8, 10].map((mins) => (
              <button
                key={mins}
                type="button"
                className={`buffer-chip ${bufferMin === mins ? "active" : ""}`}
                onClick={() => onChangeBuffer(mins)}
              >
                +{mins}m
              </button>
            ))}
          </div>
        </div>

        <motion.button
          type="button"
          className="btn-compute-routes"
          disabled={isLoading}
          onClick={onCalculateRoutes}
          whileHover={!isLoading ? { scale: 1.02, boxShadow: "var(--shadow-glow-emerald)" } : {}}
          whileTap={!isLoading ? tapScale : {}}
          style={!isLoading ? { background: "var(--gradient-aurora-success)", color: "#000" } : {}}
        >
          <Sparkles size={17} className={!isLoading ? "" : "text-emerald"} />
          <span style={!isLoading ? { fontWeight: "bold" } : {}}>{isLoading ? "Analyzing Air..." : "Compute Cleanest Routes"}</span>
        </motion.button>
      </div>

      {/* Popular Corridor Presets */}
      <div className="preset-corridors">
        <span className="preset-label">
          {language === "hi" ? "त्वरित हॉटस्पॉट परिदृश्य:" : "Popular Corridors:"}
        </span>
        <div className="preset-chips-scroll">
          <button
            type="button"
            className="preset-chip"
            onClick={() => {
              const p = DELHI_LOCATIONS.find((l) => l.id === "hauz_khas")!;
              const d = DELHI_LOCATIONS.find((l) => l.id === "karol_bagh")!;
              onSelectPickup({ lat: p.lat, lng: p.lng }, p.name);
              onSelectDrop({ lat: d.lat, lng: d.lng }, d.name);
            }}
          >
            🌿 Hauz Khas → Karol Bagh
          </button>
          <button
            type="button"
            className="preset-chip"
            onClick={() => {
              const p = DELHI_LOCATIONS.find((l) => l.id === "cp")!;
              const d = DELHI_LOCATIONS.find((l) => l.id === "lajpat_nagar")!;
              onSelectPickup({ lat: p.lat, lng: p.lng }, p.name);
              onSelectDrop({ lat: d.lat, lng: d.lng }, d.name);
            }}
          >
            ⚡ CP → Lajpat Nagar
          </button>
          <button
            type="button"
            className="preset-chip"
            onClick={() => {
              const p = DELHI_LOCATIONS.find((l) => l.id === "dwarka_sec10")!;
              const d = DELHI_LOCATIONS.find((l) => l.id === "igi_airport")!;
              onSelectPickup({ lat: p.lat, lng: p.lng }, p.name);
              onSelectDrop({ lat: d.lat, lng: d.lng }, d.name);
            }}
          >
            ✈️ Dwarka → IGI Airport
          </button>
          <button
            type="button"
            className="preset-chip"
            onClick={() => {
              const p = DELHI_LOCATIONS.find((l) => l.id === "cyber_city")!;
              const d = DELHI_LOCATIONS.find((l) => l.id === "saket")!;
              onSelectPickup({ lat: p.lat, lng: p.lng }, p.name);
              onSelectDrop({ lat: d.lat, lng: d.lng }, d.name);
            }}
          >
            🏢 Cyber City → Saket
          </button>
        </div>
      </div>
    </motion.div>
  );
};
