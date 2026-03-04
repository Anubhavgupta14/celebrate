import { useState, useEffect } from 'react'
import { Layout } from '@/components/Layout'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Plus, CalendarDays, ArrowRight, Sparkles, X } from 'lucide-react'
import Link from 'next/link'

export default function Dashboard() {
    const { user, isLoading } = useAuth()
    const [family, setFamily] = useState(null)
    const [trips, setTrips] = useState([])

    // New trip state
    const [isCreatingTrip, setIsCreatingTrip] = useState(false)
    const [tripDate, setTripDate] = useState('')
    const [festivalName, setFestivalName] = useState('')
    const [creating, setCreating] = useState(false)

    useEffect(() => {
        async function fetchData() {
            if (!user) return

            // Get current user's family
            const { data: familyData } = await supabase
                .from('families')
                .select('*')
                .eq('auth_id', user.id)
                .single()

            if (familyData) {
                setFamily(familyData)
                // Get their trips
                const { data: tripsData } = await supabase
                    .from('trips')
                    .select('*')
                    .eq('family_id', familyData.id)
                    .order('date', { ascending: false })

                if (tripsData) setTrips(tripsData)
            }
        }

        if (!isLoading) fetchData()
    }, [user, isLoading])

    const handleCreateTrip = async (e) => {
        e.preventDefault()
        if (!family) return
        setCreating(true)

        const { data, error } = await supabase
            .from('trips')
            .insert({
                family_id: family.id,
                date: tripDate,
                festival_name: festivalName
            })
            .select()
            .single()

        if (error) {
            toast.error('Failed to create trip')
        } else {
            toast.success('Trip created!')
            setTrips([data, ...trips])
            setIsCreatingTrip(false)
            setTripDate('')
            setFestivalName('')
        }
        setCreating(false)
    }

    if (isLoading || !user) return (
        <div className="flex h-screen items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                <p className="text-zinc-400 text-sm">Loading...</p>
            </div>
        </div>
    )

    return (
        <Layout>
            {/* Welcome banner */}
            <div className="relative rounded-2xl overflow-hidden mb-8 p-6 md:p-8 bg-gradient-to-br from-indigo-500/15 via-violet-500/10 to-transparent border border-indigo-500/20">
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="h-4 w-4 text-indigo-400" />
                            <span className="text-xs font-medium text-indigo-400 uppercase tracking-wider">Festival Planner</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-100">
                            Welcome, <span className="gradient-text">{family?.name}</span>!
                        </h1>
                        <p className="text-zinc-400 text-sm mt-1">Plan your festival visits and keep hosts updated automatically.</p>
                    </div>
                    <Button
                        onClick={() => setIsCreatingTrip(!isCreatingTrip)}
                        className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-all"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        New Trip
                    </Button>
                </div>
            </div>

            {/* New trip form */}
            {isCreatingTrip && (
                <div className="mb-8 rounded-2xl border border-indigo-500/25 bg-indigo-500/5 overflow-hidden animate-fade-in-up">
                    <div className="flex justify-between items-center px-6 pt-5 pb-0">
                        <div>
                            <h2 className="text-lg font-semibold text-zinc-100">Plan a New Trip</h2>
                            <p className="text-sm text-zinc-400">Select a date and give your trip a name.</p>
                        </div>
                        <button
                            onClick={() => setIsCreatingTrip(false)}
                            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                            aria-label="Close"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="p-6">
                        <form onSubmit={handleCreateTrip} className="flex flex-col sm:flex-row gap-4 items-end">
                            <div className="space-y-1.5 w-full sm:w-auto flex-1">
                                <Label htmlFor="date" className="text-xs text-zinc-400 uppercase tracking-wide font-medium">Date</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={tripDate}
                                    onChange={(e) => setTripDate(e.target.value)}
                                    required
                                    className="bg-white/5 border-white/10 text-zinc-100"
                                />
                            </div>
                            <div className="space-y-1.5 w-full sm:w-auto flex-1">
                                <Label htmlFor="festivalName" className="text-xs text-zinc-400 uppercase tracking-wide font-medium">Festival Name</Label>
                                <Input
                                    id="festivalName"
                                    value={festivalName}
                                    onChange={(e) => setFestivalName(e.target.value)}
                                    placeholder="Diwali Visits"
                                    required
                                    className="bg-white/5 border-white/10 text-zinc-100 placeholder:text-zinc-600"
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={creating}
                                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
                            >
                                {creating ? (
                                    <span className="flex items-center gap-2">
                                        <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                        Saving...
                                    </span>
                                ) : 'Save & Continue'}
                            </Button>
                        </form>
                    </div>
                </div>
            )}

            {/* Trip cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-stagger">
                {trips.length === 0 && !isCreatingTrip && (
                    <div className="col-span-full py-16 text-center rounded-2xl border-2 border-dashed border-zinc-700/50 bg-zinc-800/20">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
                            <CalendarDays className="h-7 w-7 text-indigo-400" />
                        </div>
                        <p className="text-lg font-semibold text-zinc-200 mb-1">No trips yet</p>
                        <p className="text-zinc-500 text-sm mb-5">Create your first trip to start adding visits.</p>
                        <Button
                            onClick={() => setIsCreatingTrip(true)}
                            variant="outline"
                            className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500/50"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Plan a Trip
                        </Button>
                    </div>
                )}

                {trips.map((trip, idx) => (
                    <div
                        key={trip.id}
                        className="group flex flex-col rounded-2xl border border-white/[0.07] bg-zinc-900/60 hover:bg-zinc-900/80 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-500/25 transition-all duration-200 overflow-hidden"
                        style={{ animationDelay: `${idx * 0.08}s` }}
                    >
                        {/* Accent top bar */}
                        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 opacity-60 group-hover:opacity-100 transition-opacity" />

                        <div className="p-5 flex-1">
                            <p className="text-xs font-medium text-indigo-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                <CalendarDays className="h-3 w-3" />
                                {new Date(trip.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                            </p>
                            <h3 className="text-lg font-bold text-zinc-100 leading-tight">{trip.festival_name}</h3>
                        </div>

                        <div className="px-5 pb-5">
                            <Link href={`/trip/${trip.id}`} className="block">
                                <Button
                                    className="w-full bg-zinc-800 hover:bg-indigo-600 text-zinc-300 hover:text-white border border-white/[0.06] hover:border-indigo-500/50 transition-all duration-200"
                                    variant="ghost"
                                >
                                    Manage Visits
                                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </Layout>
    )
}
