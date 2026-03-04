import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { Layout } from '@/components/Layout'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { MapPin, Navigation, Car, CheckCircle2, Clock, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

// Haversine formula to get distance in meters
function getDistanceInMeters(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // in metres
}

export default function ExecuteTrip() {
    const { user, isLoading: isAuthLoading } = useAuth()
    const router = useRouter()
    const { id } = router.query

    const [trip, setTrip] = useState(null)
    const [visits, setVisits] = useState([])
    const [loading, setLoading] = useState(false)
    const [currentLocation, setCurrentLocation] = useState(null)

    // Refs for live tracking
    const watchIdRef = useRef(null)
    const lastApiUpdateRef = useRef(0)
    const inTransitVisitRef = useRef(null)

    useEffect(() => {
        // Attempt to get location early for faster interactions
        if (navigator.geolocation && !currentLocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => console.log('Location access denied or error', err)
            )
        }
    }, [currentLocation])

    useEffect(() => {
        async function fetchTripData() {
            if (!user || !id) return

            const { data: tripData } = await supabase
                .from('trips')
                .select('*')
                .eq('id', id)
                .single()

            if (tripData) {
                setTrip(tripData)
                fetchVisits()
            }
        }

        if (!isAuthLoading && id) fetchTripData()

        // Subscribe to realtime visits changes for this trip
        const channel = supabase.channel('visits-changes')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'visits', filter: `trip_id=eq.${id}` },
                (payload) => {
                    fetchVisits() // refetch to get joined family data or update state manually
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user, isAuthLoading, id])

    const fetchVisits = async () => {
        const { data, error } = await supabase
            .from('visits')
            .select('*, host_family:families!host_family_id(name, address, lat, lng)')
            .eq('trip_id', id)
            .order('sequence_order', { ascending: true })

        if (data) setVisits(data)
    }

    // --- Live Tracking & Auto-Arrive Logic ---
    useEffect(() => {
        const inTransitVisit = visits.find(v => v.status === 'in_transit')
        inTransitVisitRef.current = inTransitVisit

        if (inTransitVisit) {
            // Start watching location
            if (navigator.geolocation && !watchIdRef.current) {
                const channel = supabase.channel(`location:visit-${inTransitVisit.id}`)

                watchIdRef.current = navigator.geolocation.watchPosition(
                    async (position) => {
                        const { latitude, longitude } = position.coords;
                        setCurrentLocation({ lat: latitude, lng: longitude });

                        // 1. Broadcast via Realtime
                        channel.send({
                            type: 'broadcast',
                            event: 'location-update',
                            payload: { lat: latitude, lng: longitude }
                        });

                        // 2. Check Auto-Arrive (Distance <= 100m)
                        if (inTransitVisit.host_family?.lat && inTransitVisit.host_family?.lng) {
                            const distance = getDistanceInMeters(
                                latitude, longitude,
                                inTransitVisit.host_family.lat, inTransitVisit.host_family.lng
                            );

                            if (distance <= 100) {
                                toast.success('You are within 100m. Automatically marked as arrived!')
                                handleMarkArrived(inTransitVisit.id)
                                return; // Stop processing this tick
                            }
                        }

                        // 3. Persist to DB & ETA update every 15 seconds
                        const now = Date.now();
                        if (now - lastApiUpdateRef.current > 15000) {
                            lastApiUpdateRef.current = now;
                            fetch('/api/update-status', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    visitId: inTransitVisit.id,
                                    lat: latitude,
                                    lng: longitude,
                                    status: 'in_transit'
                                })
                            }).catch(console.error);
                        }
                    },
                    (error) => console.error('Watch position error:', error),
                    { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
                )
            }
        } else {
            // Stop watching if no visit is in transit
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current)
                watchIdRef.current = null
            }
        }

        return () => {
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current)
                watchIdRef.current = null
            }
        }
    }, [visits])


    const handleLeaveNow = async (visitId) => {
        setLoading(true)

        let lat = currentLocation?.lat
        let lng = currentLocation?.lng

        // If location is not available, try to get it right now
        if (!lat || !lng) {
            try {
                const pos = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject)
                })
                lat = pos.coords.latitude
                lng = pos.coords.longitude
            } catch (e) {
                toast.error('Location is required to calculate ETA. Please enable location services.')
                setLoading(false)
                return
            }
        }

        try {
            const response = await fetch('/api/update-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ visitId, lat, lng, status: 'in_transit' })
            })

            const result = await response.json()

            if (!response.ok) throw new Error(result.error || 'Failed to update status')

            toast.success('Status updated! The host has been notified.')
            fetchVisits()
        } catch (error) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleMarkArrived = async (visitId) => {
        setLoading(true)
        const { error } = await supabase
            .from('visits')
            .update({ status: 'arrived' })
            .eq('id', visitId)

        if (error) {
            toast.error('Failed to mark as arrived')
        } else {
            // Already handled by component UI refresh
            fetchVisits()
        }
        setLoading(false)
    }

    if (isAuthLoading || !user || !trip) return (
        <div className="flex h-screen items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                <p className="text-zinc-400 text-sm">Loading trip...</p>
            </div>
        </div>
    )

    const completedVisits = visits.filter(v => v.status === 'arrived')
    const progress = visits.length > 0 ? (completedVisits.length / visits.length) * 100 : 0

    return (
        <Layout>
            <div className="mb-8">
                <Link href={`/trip/${id}`} className="inline-flex items-center text-sm text-zinc-500 hover:text-indigo-400 mb-4 transition-colors group">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Edit Itinerary
                </Link>
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Trip Execution</h1>
                        <p className="text-zinc-500">{trip.festival_name}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-zinc-500 font-medium mb-1">Trip Progress</p>
                        <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto space-y-6">
                {visits.length === 0 && (
                    <div className="py-14 text-center text-zinc-500 border-2 border-dashed border-zinc-700/50 rounded-2xl bg-zinc-800/20">
                        <p>Your itinerary is empty.</p>
                        <Link href={`/trip/${id}`}>
                            <Button variant="outline" className="mt-4 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10">Go back and add stops</Button>
                        </Link>
                    </div>
                )}

                {visits.map((visit, index) => {
                    const isActive = visit.status === 'pending' || visit.status === 'in_transit'
                    const isNextPending = visit.status === 'pending' && visits.findIndex(v => v.status === 'pending') === index

                    return (
                        <div key={visit.id} className={`rounded-xl border transition-all overflow-hidden ${visit.status === 'arrived' ? 'opacity-50 border-zinc-700/30 bg-zinc-900/30' : isActive ? 'border-indigo-500/30 bg-zinc-900/60 shadow-lg shadow-indigo-500/10' : 'border-zinc-700/40 bg-zinc-900/40 opacity-70'}`}>
                            <div className="p-5 pb-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm border ${visit.status === 'arrived' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : isActive ? 'border-indigo-500/40 bg-indigo-500/20 text-indigo-300' : 'border-zinc-600/40 bg-zinc-700/30 text-zinc-500'}`}>
                                            {index + 1}
                                        </div>
                                        <div>
                                            <p className="text-base font-semibold text-zinc-100">{visit.host_family?.name}</p>
                                            <p className="flex items-center text-xs text-zinc-500 mt-0.5 gap-1">
                                                <MapPin className="h-3 w-3 shrink-0" /> {visit.host_family?.address}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="text-right flex flex-col items-end">
                                        {visit.status === 'arrived' && (
                                            <span className="flex items-center text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full gap-1">
                                                <CheckCircle2 className="w-3 h-3" /> Arrived
                                            </span>
                                        )}
                                        {visit.status === 'in_transit' && (
                                            <span className="flex items-center text-xs font-semibold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-1 rounded-full animate-pulse gap-1">
                                                <Car className="w-3 h-3" /> In Transit
                                            </span>
                                        )}
                                        {visit.status === 'pending' && (
                                            <span className="flex items-center text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg gap-1">
                                                <Clock className="w-3 h-3" /> {visit.planned_arrival}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {visit.status === 'in_transit' && visit.estimated_travel_time_mins && (
                                <div className="mx-5 mb-3 px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-600/20 to-violet-600/10 border border-indigo-500/20">
                                    <p className="text-sm font-medium text-indigo-300 flex items-center gap-2">
                                        <Navigation className="w-3.5 h-3.5 shrink-0" />
                                        ETA: ~{visit.estimated_travel_time_mins} mins
                                    </p>
                                </div>
                            )}

                            {(isNextPending || visit.status === 'in_transit') && (
                                <div className="px-5 pb-5">
                                    {visit.status === 'pending' && isNextPending && (
                                        <Button
                                            className="w-full bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 text-white font-bold h-12 text-base group transition-all"
                                            onClick={() => handleLeaveNow(visit.id)}
                                            disabled={loading}
                                        >
                                            {loading
                                                ? <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Calculating ETA...</span>
                                                : <span className="flex items-center gap-2">Leaving Now <Navigation className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" /></span>}
                                        </Button>
                                    )}
                                    {visit.status === 'in_transit' && (
                                        <Button
                                            className="w-full bg-emerald-600 hover:bg-emerald-500 h-12 text-base font-bold shadow-lg shadow-emerald-500/20 transition-all"
                                            onClick={() => handleMarkArrived(visit.id)}
                                            disabled={loading}
                                        >
                                            Mark as Arrived <CheckCircle2 className="ml-2 w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </Layout>
    )
}
