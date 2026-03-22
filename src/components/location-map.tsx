/**
 * Carte de localisation Leaflet — composant CLIENT.
 *
 * Rôle :
 *   Affiche une carte OpenStreetMap centrée sur les coordonnées d'une ville,
 *   avec un marqueur et un popup indiquant la localisation du terrain.
 *
 * Interactions :
 *   - Utilisé par la page de détail d'annonce (listings/[id]/page.tsx)
 *   - Utilise Leaflet + react-leaflet pour le rendu de la carte
 *   - Les tuiles proviennent d'OpenStreetMap (gratuit, pas de clé API)
 *
 * Exemple d'usage :
 *   <LocationMap lat={4.051} lng={9.768} label="Douala · Bonamoussadi" />
 */
'use client'

import { useEffect, useState } from 'react'

/** Props du composant carte */
interface LocationMapProps {
  /** Latitude du centre de la carte */
  lat: number
  /** Longitude du centre de la carte */
  lng: number
  /** Texte affiché dans le popup du marqueur (ex: "Douala · Bonamoussadi") */
  label: string
  /** Niveau de zoom de la carte (défaut: 13) */
  zoom?: number
  /** Hauteur CSS de la carte (défaut: "280px") */
  height?: string
}

export function LocationMap({
  lat,
  lng,
  label,
  zoom = 13,
  height = '280px',
}: LocationMapProps) {
  // Leaflet ne fonctionne pas côté serveur (accès à window/document)
  // On charge dynamiquement les composants react-leaflet côté client
  const [loaded, setLoaded] = useState(false)
  const [Components, setComponents] = useState<{
    MapContainer: typeof import('react-leaflet')['MapContainer']
    TileLayer: typeof import('react-leaflet')['TileLayer']
    Marker: typeof import('react-leaflet')['Marker']
    Popup: typeof import('react-leaflet')['Popup']
  } | null>(null)

  useEffect(() => {
    async function loadLeaflet() {
      // 1. Charger le CSS Leaflet
      await import('leaflet/dist/leaflet.css')

      // 2. Fix icônes Leaflet manquantes avec les bundlers modernes
      //    On utilise les CDN unpkg pour éviter les problèmes de résolution d'assets
      const L = await import('leaflet')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      // 3. Charger les composants react-leaflet
      const { MapContainer, TileLayer, Marker, Popup } = await import('react-leaflet')
      setComponents({ MapContainer, TileLayer, Marker, Popup })
      setLoaded(true)
    }

    loadLeaflet()
  }, [])

  // Skeleton pendant le chargement de Leaflet
  if (!loaded || !Components) {
    return (
      <div
        className="flex animate-pulse items-center justify-center rounded-xl bg-[#F0EBE3]"
        style={{ height }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-8 w-8 text-[#E8E0D5]" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
        </svg>
      </div>
    )
  }

  const { MapContainer, TileLayer, Marker, Popup } = Components

  return (
    <div className="overflow-hidden rounded-xl border border-[#E8E0D5]" style={{ height }}>
      <MapContainer
        center={[lat, lng]}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
        attributionControl={true}
      >
        {/* Tuiles OpenStreetMap — gratuites, pas de clé API */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Marqueur de localisation avec popup */}
        <Marker position={[lat, lng]}>
          <Popup>
            <span className="text-sm font-medium">{label}</span>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}
