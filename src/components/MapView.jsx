/**
 * MapView - Google Maps embed with dark style + amber pins.
 * Person 3 owns this. Replace with real Google Maps when API key is ready.
 */
import { useRef, useEffect, useState } from 'react'

const MADISON_CENTER = { lat: 43.0731, lng: -89.4012 }

const DARK_MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#0d1117' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#7a6a55' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1c1610' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a3020' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e2439' }] },
]

export function MapView({ restaurants = [], selectedId, onSelect, className = '' }) {
  const ref = useRef(null)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    if (!window.google?.maps || !ref.current) return

    const map = new window.google.maps.Map(ref.current, {
      center: MADISON_CENTER,
      zoom: 14,
      styles: DARK_MAP_STYLES,
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    })

    const markers = restaurants.map((r) => {
      const m = new window.google.maps.Marker({
        position: { lat: r.lat ?? MADISON_CENTER.lat, lng: r.lng ?? MADISON_CENTER.lng },
        map,
        title: r.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: selectedId === r.id ? 12 : 8,
          fillColor: '#f5a623',
          fillOpacity: selectedId === r.id ? 1 : 0.7,
          strokeColor: '#ffc654',
          strokeWeight: 2,
        },
      })
      m.addListener('click', () => onSelect?.(r))
      return m
    })

    setMapReady(true)
    return () => markers.forEach((m) => m.setMap(null))
  }, [restaurants, selectedId, onSelect])

  // Fallback: static map placeholder when Google Maps not loaded
  if (!window.google?.maps) {
    return (
      <div
        ref={ref}
        className={`relative overflow-hidden rounded-2xl border border-dim bg-gradient-to-br from-[#0a0d0f] via-[#111820] to-[#0d1510] min-h-[180px] ${className}`}
      >
        <svg className="absolute inset-0 w-full h-full opacity-15" preserveAspectRatio="none">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <line key={`v${i}`} x1={`${i * 20}%`} y1="0%" x2={`${i * 20}%`} y2="100%" stroke="white" strokeWidth="0.4" />
          ))}
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={`h${i}`} x1="0%" y1={`${i * 25}%`} x2="100%" y2={`${i * 25}%`} stroke="white" strokeWidth="0.4" />
          ))}
        </svg>
        <div className="absolute bottom-2 right-3 text-[9px] font-ui tracking-widest text-white/20">
          MADISON, WI
        </div>
        <p className="absolute inset-0 flex items-center justify-center text-xs text-muted">
          Add VITE_GOOGLE_MAPS_KEY to enable map
        </p>
      </div>
    )
  }

  return <div ref={ref} className={`min-h-[180px] rounded-2xl overflow-hidden ${className}`} />
}
