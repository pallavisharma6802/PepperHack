/**
 * MapView - Google Maps embed with dark style + amber pins.
 * Uses VITE_GOOGLE_MAPS_KEY or VITE_GOOGLE_API_KEY (same key as backend GOOGLE_API_KEY).
 */
import { useRef, useEffect, useState } from 'react'

const MADISON_CENTER = { lat: 43.0731, lng: -89.4012 }
const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || import.meta.env.VITE_GOOGLE_API_KEY

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
  const [scriptLoaded, setScriptLoaded] = useState(!!window.google?.maps)

  // Load Google Maps JavaScript API (same key as backend GOOGLE_API_KEY)
  useEffect(() => {
    if (window.google?.maps || !MAPS_KEY) return
    const existing = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existing) {
      const check = () => {
        if (window.google?.maps) setScriptLoaded(true)
        else setTimeout(check, 100)
      }
      check()
      return
    }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}`
    script.async = true
    script.defer = true
    script.onload = () => {
      if (window.google?.maps) setScriptLoaded(true)
    }
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!window.google?.maps || !ref.current) return

    const map = new window.google.maps.Map(ref.current, {
      center: MADISON_CENTER,
      zoom: 14,
      styles: DARK_MAP_STYLES,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      gestureHandling: 'greedy',
    })

    const infoWindow = new window.google.maps.InfoWindow()
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
      m.addListener('click', () => {
        const esc = (s) => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
        const content = `
          <div class="map-popup-content" style="min-width:160px;padding:4px 0;font-family:system-ui,sans-serif;">
            <div style="font-weight:600;font-size:14px;color:#1a1a1a;margin-bottom:4px;">${esc(r.name)}</div>
            ${r.cuisine ? `<div style="font-size:12px;color:#555;">${esc(r.cuisine)}</div>` : ''}
            ${r.rating ? `<div style="font-size:12px;color:#555;margin-top:2px;">★ ${esc(String(r.rating))}</div>` : ''}
            <button class="map-popup-btn" style="margin-top:8px;padding:6px 12px;background:#f5a623;border:none;border-radius:6px;font-weight:600;font-size:12px;cursor:pointer;color:#1a1a1a;">View details</button>
          </div>
        `
        infoWindow.setContent(content)
        infoWindow.open(map, m)
        window.google.maps.event.addListener(infoWindow, 'domready', () => {
          const content = infoWindow.getContent()
          const el = typeof content === 'string' ? null : content
          const btn = el?.querySelector?.('.map-popup-btn')
          if (btn) {
            btn.onclick = () => {
              onSelect?.(r)
              infoWindow.close()
            }
          }
        })
      })
      return m
    })

    setMapReady(true)
    return () => {
      infoWindow.close()
      delete window.__mapSelectRestaurant
      markers.forEach((m) => m.setMap(null))
    }
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
          {MAPS_KEY ? 'Loading map…' : 'Add VITE_GOOGLE_MAPS_KEY to .env (same as GOOGLE_API_KEY)'}
        </p>
      </div>
    )
  }

  return <div ref={ref} className={`min-h-[180px] rounded-2xl overflow-hidden ${className}`} />
}
