import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { Layout } from '@/components/Layout'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Search, MapPin, Clock, ArrowLeft, Send, X } from 'lucide-react'
import Link from 'next/link'

export default function TripDetails() {
    const { user, isLoading } = useAuth()
    const router = useRouter()
    const { id } = router.query

    const [trip, setTrip] = useState(null)
    const [visits, setVisits] = useState([])
    const [allFamilies, setAllFamilies] = useState([])

    // Modals / forms
    const [selectedFamily, setSelectedFamily] = useState(null)
    const [plannedTime, setPlannedTime] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        async function fetchTripDetails() {
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

        async function fetchAllFamilies() {
            if (!user) return
            const { data } = await supabase
                .from('families')
                .select('id, name, address')
                .neq('auth_id', user.id)
                .order('name', { ascending: true })
            if (data) setAllFamilies(data)
        }

        if (!isLoading && id) {
            fetchTripDetails()
            fetchAllFamilies()
        }
    }, [user, isLoading, id])

    const fetchVisits = async () => {
        const { data } = await supabase
            .from('visits')
            .select('*, host_family:families!host_family_id(name, address)')
            .eq('trip_id', id)
            .order('sequence_order', { ascending: true })

        if (data) setVisits(data)
    }

    // Search feature removed

    const handleAddVisit = async (e) => {
        e.preventDefault()
        if (!selectedFamily || !plannedTime) return
        setLoading(true)

        const newOrder = visits.length > 0 ? visits[visits.length - 1].sequence_order + 1 : 1

        const { error } = await supabase
            .from('visits')
            .insert({
                trip_id: id,
                host_family_id: selectedFamily.id,
                sequence_order: newOrder,
                planned_arrival: plannedTime,
                status: 'pending'
            })

        if (error) {
            toast.error('Failed to add visit: ' + error.message)
        } else {
            toast.success('Visit added!')
            setSelectedFamily(null)
            setPlannedTime('')
            fetchVisits()
        }
        setLoading(false)
    }

    if (isLoading || !user || !trip) return (
        <div className="flex h-screen items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                <p className="text-zinc-400 text-sm">Loading trip details...</p>
            </div>
        </div>
    )

    return (
        <Layout>
            {/* Page header */}
            <div className="mb-8">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center text-sm text-zinc-500 hover:text-indigo-400 mb-5 transition-colors group"
                >
                    <ArrowLeft className="mr-1.5 h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                    Back to Trips
                </Link>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 md:p-6 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent border border-indigo-500/20">
                    <div>
                        <p className="text-xs font-medium text-indigo-400 uppercase tracking-wider mb-1">
                            {new Date(trip.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-100">{trip.festival_name}</h1>
                    </div>
                    <Link href={`/trip/${trip.id}/execute`}>
                        <Button className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 font-semibold shrink-0 transition-all">
                            Start Trip
                            <Send className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

                {/* Left — Itinerary */}
                <div className="lg:col-span-2 space-y-5">
                    <h2 className="text-base font-semibold text-zinc-400 uppercase tracking-wider">Itinerary</h2>

                    {visits.length === 0 ? (
                        <div className="py-14 text-center rounded-2xl border-2 border-dashed border-zinc-700/50 bg-zinc-800/20">
                            <MapPin className="w-8 h-8 mx-auto text-zinc-600 mb-3" />
                            <p className="text-zinc-400 font-medium">No stops yet</p>
                            <p className="text-zinc-600 text-sm mt-1">Use the panel on the right to add family stops.</p>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-stagger">
                            {visits.map((visit, idx) => (
                                <div key={visit.id} className="flex items-start gap-4">
                                    {/* Timeline indicator */}
                                    <div className="flex flex-col items-center mt-1 shrink-0">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold text-sm">
                                            {idx + 1}
                                        </div>
                                        {idx !== visits.length - 1 && (
                                            <div className="w-px flex-1 bg-indigo-500/20 my-2 min-h-[2.5rem]" />
                                        )}
                                    </div>

                                    {/* Visit card */}
                                    <div className="flex-1 rounded-xl border border-white/[0.07] bg-zinc-900/60 hover:bg-zinc-900/80 transition-colors overflow-hidden group">
                                        <div className="flex justify-between items-start p-4 gap-3">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-zinc-100 truncate">{visit.host_family?.name}</p>
                                                <p className="flex items-start text-xs text-zinc-500 mt-1 gap-1.5">
                                                    <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                                                    <span className="truncate">{visit.host_family?.address}</span>
                                                </p>
                                            </div>
                                            <div className="flex items-center text-xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1.5 rounded-lg shrink-0 gap-1.5">
                                                <Clock className="w-3 h-3" />
                                                {visit.planned_arrival}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right — Add a Stop */}
                <div>
                    <div className="sticky top-20 rounded-2xl border border-indigo-500/20 bg-zinc-900/60 overflow-hidden">
                        <div className="p-5 border-b border-white/[0.06]">
                            <h2 className="font-semibold text-zinc-100">Add a Stop</h2>
                            <p className="text-xs text-zinc-400 mt-0.5">Select a family from the list to add to your trip.</p>
                        </div>
                        <div className="p-5">
                            {!selectedFamily ? (
                                <div className="space-y-4">
                                    {allFamilies.length > 0 ? (
                                        <div className="space-y-2 max-h-[400px] overflow-y-auto animate-fade-in-up pr-2">
                                            {allFamilies.map(fam => (
                                                <button
                                                    key={fam.id}
                                                    onClick={() => setSelectedFamily(fam)}
                                                    className="w-full text-left p-3 bg-zinc-800/60 hover:bg-indigo-500/10 border border-white/[0.06] hover:border-indigo-500/30 rounded-xl text-sm transition-all"
                                                >
                                                    <p className="font-semibold text-zinc-200">{fam.name}</p>
                                                    <p className="text-xs text-zinc-500 truncate mt-0.5">{fam.address}</p>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-zinc-500 text-center py-4">No families available.</p>
                                    )}
                                </div>
                            ) : (
                                <form onSubmit={handleAddVisit} className="space-y-4 animate-fade-in-up">
                                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/25 rounded-xl relative">
                                        <p className="font-semibold text-zinc-200 pr-6">{selectedFamily.name}</p>
                                        <p className="text-xs text-zinc-500 mt-0.5">{selectedFamily.address}</p>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedFamily(null)}
                                            className="absolute top-2.5 right-2.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="plannedTime" className="text-xs text-zinc-400 uppercase tracking-wide font-medium">Planned Arrival</Label>
                                        <Input
                                            id="plannedTime"
                                            type="time"
                                            value={plannedTime}
                                            onChange={(e) => setPlannedTime(e.target.value)}
                                            required
                                            className="bg-white/5 border-white/10 text-zinc-100"
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-500/20"
                                        disabled={loading}
                                    >
                                        {loading
                                            ? <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Adding...</span>
                                            : 'Add to Itinerary'
                                        }
                                    </Button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    )
}
