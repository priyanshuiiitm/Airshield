import React, { useState } from 'react';
import Map, { Source, Layer, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Leaf, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';

const MAPTILER_KEY = "get_your_own_Key"; // We can use a demo style URL

const App = () => {
  // We'll mock the JSON payload we generated in the backend
  const [activeRoute, setActiveRoute] = useState("R2_SAFER");
  
  const classification = "AVOIDABLE";
  
  const uiCard = {
    title: "🫁 Safer route found",
    message: "+2 min\n↓63.4% estimated exposure\nEarn ₹3",
    action: "Take safer route",
    route_id: "R2_SAFER"
  };

  // Mock Route GeoJSONs
  const route1GeoJSON = {
    type: "Feature",
    properties: { id: "R1_FAST" },
    geometry: {
      type: "LineString",
      coordinates: [
        [77.20, 28.61],
        [77.21, 28.62],
        [77.25, 28.63]
      ]
    }
  };

  const route2GeoJSON = {
    type: "Feature",
    properties: { id: "R2_SAFER" },
    geometry: {
      type: "LineString",
      coordinates: [
        [77.20, 28.61],
        [77.18, 28.59],
        [77.17, 28.60],
        [77.25, 28.63]
      ]
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Map
        initialViewState={{
          longitude: 77.21,
          latitude: 28.61,
          zoom: 11
        }}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
      >
        <NavigationControl position="top-right" />
        
        {/* Route 1 (Fastest) */}
        <Source id="route1" type="geojson" data={route1GeoJSON}>
          <Layer 
            id="route1-line" 
            type="line" 
            paint={{
              'line-color': activeRoute === 'R1_FAST' ? '#3b82f6' : '#94a3b8',
              'line-width': activeRoute === 'R1_FAST' ? 6 : 4
            }} 
          />
        </Source>

        {/* Route 2 (Safer) */}
        <Source id="route2" type="geojson" data={route2GeoJSON}>
          <Layer 
            id="route2-line" 
            type="line" 
            paint={{
              'line-color': activeRoute === 'R2_SAFER' ? '#10b981' : '#94a3b8',
              'line-width': activeRoute === 'R2_SAFER' ? 6 : 4
            }} 
          />
        </Source>
      </Map>

      {/* Decision Card */}
      <div style={{
        position: 'absolute',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '90%',
        maxWidth: '400px',
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ padding: '8px', backgroundColor: '#ecfdf5', borderRadius: '50%' }}>
            <Leaf color="#10b981" size={24} />
          </div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>{uiCard.title}</h2>
        </div>
        
        <div style={{ marginBottom: '20px', color: '#4b5563', fontSize: '15px', lineHeight: '1.5' }}>
          {uiCard.message.split('\n').map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>

        <button 
          style={{
            width: '100%',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
          onClick={() => setActiveRoute(uiCard.route_id)}
        >
          {uiCard.action}
        </button>
      </div>
    </div>
  );
};

export default App;
