import React, { useState } from 'react';
import { MapPin, Crosshair, Shield, ShieldAlert, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * GeoLocationCard: Shows GPS coordinates with a visual map link and geofence status.
 * Props:
 *   - clockInLocation: string like "28.6139°, 77.2090°"
 *   - clockOutLocation: string (optional)
 *   - geofenceCenter: { lat, lng } (optional, for geofence validation)
 *   - geofenceRadiusKm: number (optional, default 5)
 */
export default function GeoLocationCard({ clockInLocation, clockOutLocation, geofenceCenter, geofenceRadiusKm = 5 }) {
  const [expanded, setExpanded] = useState(false);

  const parseCoords = (locStr) => {
    if (!locStr || locStr === 'No GPS Support' || locStr === 'GPS Denied' || locStr === 'N/A') return null;
    const match = locStr.match(/([-\d.]+)°?,\s*([-\d.]+)°?/);
    if (!match) return null;
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  };

  const haversineDistance = (c1, c2) => {
    const R = 6371;
    const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
    const dLng = ((c2.lng - c1.lng) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((c1.lat * Math.PI) / 180) * Math.cos((c2.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const clockInCoords = parseCoords(clockInLocation);
  const clockOutCoords = parseCoords(clockOutLocation);

  const getGeofenceStatus = (coords) => {
    if (!coords || !geofenceCenter) return null;
    const dist = haversineDistance(coords, geofenceCenter);
    return { withinFence: dist <= geofenceRadiusKm, distance: dist.toFixed(2) };
  };

  const inFence = getGeofenceStatus(clockInCoords);
  const outFence = getGeofenceStatus(clockOutCoords);

  if (!clockInCoords && !clockOutCoords) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <MapPin size={14} /> No GPS Data
      </div>
    );
  }

  const getMapUrl = (coords) => {
    if (!coords) return '#';
    return `https://www.google.com/maps?q=${coords.lat},${coords.lng}&z=16`;
  };

  return (
    <div>
      {/* Compact View */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 0.6rem',
          borderRadius: 8,
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          transition: 'all 0.2s',
        }}
        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)'; }}
        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'; }}
      >
        <Crosshair size={14} color="var(--secondary)" />
        <span style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: 600 }}>GPS Verified</span>
        {inFence && (
          inFence.withinFence
            ? <Shield size={13} color="var(--secondary)" />
            : <ShieldAlert size={13} color="var(--danger)" />
        )}
      </div>

      {/* Expanded Detail */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          style={{
            marginTop: '0.5rem',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: 10,
            padding: '0.75rem',
            fontSize: '0.78rem',
          }}
        >
          {clockInCoords && (
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--secondary)' }}>📍 Clock In</span>
                <a href={getMapUrl(clockInCoords)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none', fontSize: '0.72rem' }}>
                  Open Map <ExternalLink size={11} />
                </a>
              </div>
              <div style={{ color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                {clockInLocation}
              </div>
              {inFence && (
                <div style={{ marginTop: '0.25rem', color: inFence.withinFence ? 'var(--secondary)' : 'var(--danger)', fontSize: '0.72rem' }}>
                  {inFence.withinFence ? '✅' : '⚠️'} {inFence.distance} km from office
                  {inFence.withinFence ? ' (Within Geofence)' : ' (Outside Geofence!)'}
                </div>
              )}
            </div>
          )}

          {clockOutCoords && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--warning)' }}>🏠 Clock Out</span>
                <a href={getMapUrl(clockOutCoords)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none', fontSize: '0.72rem' }}>
                  Open Map <ExternalLink size={11} />
                </a>
              </div>
              <div style={{ color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                {clockOutLocation}
              </div>
              {outFence && (
                <div style={{ marginTop: '0.25rem', color: outFence.withinFence ? 'var(--secondary)' : 'var(--danger)', fontSize: '0.72rem' }}>
                  {outFence.distance} km from office
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
