import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix generic Leaflet icon issue in Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom icons for host and visitor
const hostIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const visitorIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Component to recenter map when visitor moves
function RecenterAutomatically({ lat, lng }) {
    const map = useMap()
    useEffect(() => {
        map.setView([lat, lng])
    }, [lat, lng, map])
    return null
}

export default function LiveMap({ hostLat, hostLng, visitorLat, visitorLng }) {
    if (!hostLat || !hostLng || !visitorLat || !visitorLng) {
        return (
            <div className="h-48 w-full bg-zinc-800/50 flex flex-col items-center justify-center text-zinc-500 rounded-xl border border-white/[0.05]">
                <p className="text-sm">Waiting for GPS data...</p>
            </div>
        )
    }

    return (
        <div className="h-48 w-full rounded-xl overflow-hidden border border-white/[0.05] relative z-0">
            <MapContainer center={[visitorLat, visitorLng]} zoom={14} className="h-full w-full">
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                <Marker position={[hostLat, hostLng]} icon={hostIcon}>
                    <Popup>Your Home</Popup>
                </Marker>
                <Marker position={[visitorLat, visitorLng]} icon={visitorIcon}>
                    <Popup>Visitor</Popup>
                </Marker>
                <RecenterAutomatically lat={visitorLat} lng={visitorLng} />
            </MapContainer>
        </div>
    )
}
