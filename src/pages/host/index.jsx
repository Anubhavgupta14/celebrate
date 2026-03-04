import { useState, useEffect } from 'react'
import { Layout } from '@/components/Layout'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { MapPin, Clock, Car, CheckCircle2, Navigation, Users } from 'lucide-react'

export default function HostDashboard() {
    const { user, isLoading: isAuthLoading } = useAuth()
    const [family, setFamily] = useState(null)
    const [expectedVisits, setExpectedVisits] = useState([])

    useEffect(() => {
        async function fetchHostData() {
            if (!user) return

            const { data: familyData } = await supabase
                .from('families')
                .select('*')
                .eq('auth_id', user.id)
                .single()

            if (familyData) {
                setFamily(familyData)
                fetchVisits(familyData.id)
            }
        }

        if (!isAuthLoading) fetchHostData()
    }, [user, isAuthLoading])

    const fetchVisits = async (familyId) => {
        const { data } = await supabase
            .from('visits')
            .select('*, trip:trips(family_id, date, families(name, phone))')
            .eq('host_family_id', familyId)
            .neq('status', 'cancelled')
            .order('planned_arrival', { ascending: true })

        if (data) {
            setExpectedVisits(data)
        }
    }

    useEffect(() => {
        if (!family) return

        const channel = supabase.channel('host-visits')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'visits',
                    filter: `host_family_id=eq.${family.id}`
                },
                async (payload) => {
                    const updatedVisit = payload.new

                    if (updatedVisit.status === 'in_transit') {
                        const { data } = await supabase
                            .from('trips')
                            .select('families(name)')
                            .eq('id', updatedVisit.trip_id)
                            .single()

                        const visitingFamilyName = data?.families?.name || 'A family'
                        const etaMsg = updatedVisit.estimated_travel_time_mins
                            ? `They will arrive in ~${updatedVisit.estimated_travel_time_mins} minutes.`
                            : 'ETA is currently unknown.'

                        toast.message(`${visitingFamilyName} has left their previous stop!`, {
                            description: etaMsg,
                            icon: <Car className="w-5 h-5 text-indigo-400" />,
                            duration: 10000
                        })
                    }

                    if (updatedVisit.status === 'arrived') {
                        toast.success('Your visitors have arrived!')
                    }

                    fetchVisits(family.id)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [family])

    if (isAuthLoading || !user) return (
        <div className="flex h-screen items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                <p className="text-zinc-400 text-sm">Loading dashboard...</p>
            </div>
        </div>
    )

    const activeVisits = expectedVisits.filter(v => v.status !== 'arrived')
    const completedVisits = expectedVisits.filter(v => v.status === 'arrived')

    return (
        <Layout>
            {/* Page header */}
            <div className="relative rounded-2xl overflow-hidden mb-8 p-6 md:p-8 bg-gradient-to-br from-violet-500/12 via-indigo-500/8 to-transparent border border-violet-500/20">
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />
                <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-violet-400" />
                    <span className="text-xs font-medium text-violet-400 uppercase tracking-wider">Host View</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-100">Host Dashboard</h1>
                <p className="text-zinc-400 text-sm mt-1">Track incoming visits for <span className="text-zinc-300 font-medium">{family?.name}</span>.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                {/* Expected visitors */}
                <div className="space-y-4">
                    <h2 className="text-base font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Expected Visitors
                        {activeVisits.length > 0 && (
                            <span className="ml-auto text-xs font-medium bg-indigo-500/15 text-indigo-400 px-2 py-0.5 rounded-full">
                                {activeVisits.length}
                            </span>
                        )}
                    </h2>

                    {activeVisits.length === 0 ? (
                        <div className="py-10 text-center rounded-2xl border-2 border-dashed border-zinc-700/50 bg-zinc-800/20">
                            <Clock className="w-8 h-8 mx-auto text-zinc-600 mb-3" />
                            <p className="text-zinc-500 text-sm">No visitors expected right now.</p>
                        </div>
                    ) : (
                        <div className="space-y-3 animate-stagger">
                            {activeVisits.map((visit) => {
                                const visitingFamily = visit.trip?.families
                                const isInTransit = visit.status === 'in_transit'

                                return (
                                    <div
                                        key={visit.id}
                                        className={`relative rounded-xl overflow-hidden border transition-all ${isInTransit
                                                ? 'border-indigo-500/40 bg-indigo-500/5 shadow-lg shadow-indigo-500/10'
                                                : 'border-zinc-700/50 bg-zinc-900/60'
                                            }`}
                                    >
                                        {/* In-transit left border glow */}
                                        {isInTransit && (
                                            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-400 to-violet-500 animate-pulse" />
                                        )}

                                        <div className="p-4 pl-5">
                                            <div className="flex justify-between items-start gap-3">
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-zinc-100 truncate">{visitingFamily?.name || 'Unknown Family'}</p>
                                                    <p className="text-xs text-zinc-500 mt-0.5">
                                                        {visitingFamily?.phone || 'No phone number'}
                                                    </p>
                                                </div>
                                                {isInTransit ? (
                                                    <span className="flex items-center text-xs font-semibold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-1 rounded-full animate-pulse shrink-0 gap-1.5">
                                                        <Car className="w-3 h-3" />
                                                        On The Way
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg shrink-0 gap-1.5">
                                                        <Clock className="w-3 h-3" />
                                                        {visit.planned_arrival}
                                                    </span>
                                                )}
                                            </div>

                                            {isInTransit && visit.estimated_travel_time_mins && (
                                                <div className="mt-3 px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-600/20 to-violet-600/10 border border-indigo-500/20">
                                                    <p className="text-sm font-medium text-indigo-300 flex items-center gap-2">
                                                        <Navigation className="w-3.5 h-3.5 shrink-0" />
                                                        ETA: ~{visit.estimated_travel_time_mins} mins away
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Arrived visitors */}
                <div className="space-y-4">
                    <h2 className="text-base font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Arrived
                        {completedVisits.length > 0 && (
                            <span className="ml-auto text-xs font-medium bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full">
                                {completedVisits.length}
                            </span>
                        )}
                    </h2>

                    {completedVisits.length === 0 ? (
                        <p className="text-zinc-600 text-sm py-4">No visitors have arrived yet.</p>
                    ) : (
                        <div className="space-y-3 animate-stagger">
                            {completedVisits.map((visit) => {
                                const visitingFamily = visit.trip?.families
                                return (
                                    <div
                                        key={visit.id}
                                        className="flex items-center justify-between px-4 py-3 rounded-xl border border-zinc-700/30 bg-zinc-900/30 opacity-50"
                                    >
                                        <p className="text-sm font-medium text-zinc-400">{visitingFamily?.name || 'Unknown Family'}</p>
                                        <span className="flex items-center text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full gap-1.5">
                                            <CheckCircle2 className="w-3 h-3" />
                                            Arrived
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    )
}
