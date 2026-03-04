import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { Layout } from '@/components/Layout'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { MapPin, Clock, ArrowLeft, Send, X, Pencil, Trash2, Check, CalendarDays } from 'lucide-react'
import Link from 'next/link'

export default function TripDetails() {
    const { user, isLoading } = useAuth()
    const router = useRouter()
    const { id } = router.query

    const [trip, setTrip] = useState(null)
    const [visits, setVisits] = useState([])
    const [allFamilies, setAllFamilies] = useState([])

    // Add visit
    const [selectedFamily, setSelectedFamily] = useState(null)
    const [plannedTime, setPlannedTime] = useState('')
    const [loading, setLoading] = useState(false)

    // Edit trip
    const [isEditingTrip, setIsEditingTrip] = useState(false)
    const [editTripName, setEditTripName] = useState('')
    const [editTripDate, setEditTripDate] = useState('')
    const [savingTrip, setSavingTrip] = useState(false)

    // Edit visit
    const [editingVisitId, setEditingVisitId] = useState(null)
    const [editVisitTime, setEditVisitTime] = useState('')
    const [savingVisit, setSavingVisit] = useState(false)

    // Delete visit
    const [deletingVisitId, setDeletingVisitId] = useState(null)

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

    // ── Edit Trip ──
    const startEditingTrip = () => {
        setEditTripName(trip.festival_name)
        setEditTripDate(trip.date)
        setIsEditingTrip(true)
    }

    const handleSaveTrip = async () => {
        setSavingTrip(true)
        const { data, error } = await supabase
            .from('trips')
            .update({ festival_name: editTripName, date: editTripDate })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            toast.error('Failed to update trip')
        } else {
            toast.success('Trip updated!')
            setTrip(data)
            setIsEditingTrip(false)
        }
        setSavingTrip(false)
    }

    // ── Edit Visit ──
    const startEditingVisit = (visit) => {
        setEditingVisitId(visit.id)
        setEditVisitTime(visit.planned_arrival)
    }

    const handleSaveVisit = async (visitId) => {
        setSavingVisit(true)
        const { error } = await supabase
            .from('visits')
            .update({ planned_arrival: editVisitTime })
            .eq('id', visitId)

        if (error) {
            toast.error('Failed to update visit')
        } else {
            toast.success('Visit updated!')
            setVisits(visits.map(v => v.id === visitId ? { ...v, planned_arrival: editVisitTime } : v))
            setEditingVisitId(null)
        }
        setSavingVisit(false)
    }

    // ── Delete Visit ──
    const handleDeleteVisit = async (visitId) => {
        setDeletingVisitId(visitId)
        const { error } = await supabase.from('visits').delete().eq('id', visitId)

        if (error) {
            toast.error('Failed to remove visit')
        } else {
            toast.success('Visit removed')
            setVisits(visits.filter(v => v.id !== visitId))
        }
        setDeletingVisitId(null)
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

                {/* Trip header card */}
                {isEditingTrip ? (
                    <div className="flex flex-col gap-4 p-5 md:p-6 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent border border-indigo-500/30 animate-fade-in-up">
                        <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Edit Trip Details</p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="space-y-1.5 flex-1">
                                <Label className="text-xs text-zinc-400 uppercase tracking-wide font-medium">Festival Name</Label>
                                <Input
                                    value={editTripName}
                                    onChange={(e) => setEditTripName(e.target.value)}
                                    className="bg-white/5 border-white/10 text-zinc-100"
                                />
                            </div>
                            <div className="space-y-1.5 flex-1">
                                <Label className="text-xs text-zinc-400 uppercase tracking-wide font-medium">Date</Label>
                                <Input
                                    type="date"
                                    value={editTripDate}
                                    onChange={(e) => setEditTripDate(e.target.value)}
                                    className="bg-white/5 border-white/10 text-zinc-100"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                onClick={handleSaveTrip}
                                disabled={savingTrip}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white"
                            >
                                {savingTrip
                                    ? <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Saving...</span>
                                    : <><Check className="h-4 w-4 mr-1.5" />Save Changes</>
                                }
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setIsEditingTrip(false)}
                                className="text-zinc-400 hover:text-zinc-200 border border-white/[0.06]"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 md:p-6 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent border border-indigo-500/20">
                        <div>
                            <p className="text-xs font-medium text-indigo-400 uppercase tracking-wider mb-1">
                                {new Date(trip.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-100">{trip.festival_name}</h1>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={startEditingTrip}
                                className="text-zinc-400 hover:text-indigo-300 hover:bg-indigo-500/10 border border-white/[0.06] hover:border-indigo-500/20 transition-all"
                            >
                                <Pencil className="h-4 w-4 mr-1.5" />
                                Edit Trip
                            </Button>
                            <Link href={`/trip/${trip.id}/execute`}>
                                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 font-semibold transition-all">
                                    Start Trip
                                    <Send className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                )}
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
                                        {editingVisitId === visit.id ? (
                                            /* Inline time edit */
                                            <div className="p-4 flex flex-col gap-3 animate-fade-in-up">
                                                <p className="font-semibold text-zinc-100">{visit.host_family?.name}</p>
                                                <div className="flex items-end gap-3">
                                                    <div className="space-y-1.5 flex-1">
                                                        <Label className="text-xs text-zinc-400 uppercase tracking-wide font-medium">Planned Arrival</Label>
                                                        <Input
                                                            type="time"
                                                            value={editVisitTime}
                                                            onChange={(e) => setEditVisitTime(e.target.value)}
                                                            className="bg-white/5 border-white/10 text-zinc-100 h-8 text-sm"
                                                        />
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleSaveVisit(visit.id)}
                                                        disabled={savingVisit}
                                                        className="bg-indigo-600 hover:bg-indigo-500 text-white h-8 px-3"
                                                    >
                                                        {savingVisit ? <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setEditingVisitId(null)}
                                                        className="text-zinc-500 hover:text-zinc-300 h-8 px-3 border border-white/[0.06]"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex justify-between items-start p-4 gap-3">
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-zinc-100 truncate">{visit.host_family?.name}</p>
                                                    <p className="flex items-start text-xs text-zinc-500 mt-1 gap-1.5">
                                                        <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                                                        <span className="truncate">{visit.host_family?.address}</span>
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <div className="flex items-center text-xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1.5 rounded-lg gap-1.5">
                                                        <Clock className="w-3 h-3" />
                                                        {visit.planned_arrival}
                                                    </div>
                                                    {/* Edit / Delete visit */}
                                                    <button
                                                        onClick={() => startEditingVisit(visit)}
                                                        className="p-1.5 text-zinc-600 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all"
                                                        title="Edit arrival time"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteVisit(visit.id)}
                                                        disabled={deletingVisitId === visit.id}
                                                        className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50"
                                                        title="Remove from itinerary"
                                                    >
                                                        {deletingVisitId === visit.id
                                                            ? <span className="h-3.5 w-3.5 block rounded-full border-2 border-red-400/30 border-t-red-400 animate-spin" />
                                                            : <Trash2 className="h-3.5 w-3.5" />
                                                        }
                                                    </button>
                                                </div>
                                            </div>
                                        )}
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
