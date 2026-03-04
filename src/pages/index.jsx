import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { MapPin, Navigation, Sparkles } from 'lucide-react'

export default function Home() {
    const { user, isLoading } = useAuth()
    const router = useRouter()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isSignUp, setIsSignUp] = useState(false)
    const [loading, setLoading] = useState(false)

    const [hasProfile, setHasProfile] = useState(null)

    // Profile Form state
    const [familyName, setFamilyName] = useState('')
    const [phone, setPhone] = useState('')
    const [address, setAddress] = useState('')
    const [lat, setLat] = useState('')
    const [lng, setLng] = useState('')

    useEffect(() => {
        async function checkProfile() {
            if (user) {
                const { data, error } = await supabase
                    .from('families')
                    .select('id')
                    .eq('auth_id', user.id)
                    .maybeSingle()

                if (error) {
                    console.error('Error checking profile', error)
                }

                if (data) {
                    setHasProfile(true)
                    router.push('/dashboard')
                } else {
                    setHasProfile(false)
                }
            }
        }

        if (!isLoading) {
            checkProfile()
        }
    }, [user, isLoading, router])

    const handleAuth = async (e) => {
        e.preventDefault()
        setLoading(true)

        if (isSignUp) {
            const { error } = await supabase.auth.signUp({ email, password })
            if (error) toast.error(error.message)
            else toast.success('Check your email for the confirmation link.')
        } else {
            const { error } = await supabase.auth.signInWithPassword({ email, password })
            if (error) toast.error(error.message)
            else toast.success('Signed in successfully!')
        }
        setLoading(false)
    }

    const handleCreateProfile = async (e) => {
        e.preventDefault()
        if (!user) return
        setLoading(true)

        const { error } = await supabase
            .from('families')
            .insert({
                auth_id: user.id,
                name: familyName,
                phone,
                address,
                lat: Number(lat) || null,
                lng: Number(lng) || null
            })

        if (error) {
            toast.error('Failed to create profile: ' + error.message)
        } else {
            toast.success('Profile created!')
            setHasProfile(true)
            router.push('/dashboard')
        }
        setLoading(false)
    }

    const getLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLat(position.coords.latitude)
                    setLng(position.coords.longitude)
                    toast.success("Location acquired!")
                },
                () => {
                    toast.error("Error getting location. Please enter manually.")
                }
            )
        } else {
            toast.error("Geolocation is not supported by this browser.")
        }
    }

    if (isLoading || (user && hasProfile === null) || hasProfile) {
        return (
            <div className="flex h-screen items-center justify-center hero-bg">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center animate-pulse">
                        <Navigation className="h-5 w-5 text-indigo-400" />
                    </div>
                    <p className="text-zinc-400 text-sm font-medium">Loading VisitSync...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="relative flex min-h-screen items-center justify-center hero-bg p-4 overflow-hidden">
            {/* Decorative blobs */}
            <div className="pointer-events-none absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-3xl" />
            <div className="pointer-events-none absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-violet-500/8 blur-3xl" />

            <div className="relative w-full max-w-md space-y-6 animate-fade-in-up">

                {/* Brand header */}
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 animate-float animate-pulse-glow mx-auto">
                        <Navigation className="h-8 w-8 text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight gradient-text">
                            VisitSync
                        </h1>
                        <p className="text-zinc-400 text-sm max-w-xs mx-auto mt-1">
                            Coordinate family visits during festivals — seamlessly.
                        </p>
                    </div>
                </div>

                {!user ? (
                    <div className="glass-card rounded-2xl shadow-2xl overflow-hidden">
                        <div className="px-6 pt-6 pb-2">
                            <h2 className="text-xl font-semibold text-zinc-100">
                                {isSignUp ? 'Create an account' : 'Welcome back'}
                            </h2>
                            <p className="text-sm text-zinc-400 mt-0.5">
                                {isSignUp ? 'Enter your email to sign up' : 'Enter your credentials to sign in'}
                            </p>
                        </div>
                        <div className="p-6 pt-4">
                            <form onSubmit={handleAuth} className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="email" className="text-zinc-300 text-xs font-medium uppercase tracking-wide">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="family@example.com"
                                        required
                                        className="bg-white/5 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500/50 focus:ring-indigo-500/20"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="password" className="text-zinc-300 text-xs font-medium uppercase tracking-wide">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="bg-white/5 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500/50 focus:ring-indigo-500/20"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-500/20 transition-all mt-2"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <span className="flex items-center gap-2">
                                            <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                            Processing...
                                        </span>
                                    ) : (isSignUp ? 'Create Account' : 'Sign In')}
                                </Button>
                            </form>
                            <div className="mt-5 text-center">
                                <button
                                    onClick={() => setIsSignUp(!isSignUp)}
                                    className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                    {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="glass-card rounded-2xl shadow-2xl overflow-hidden">
                        <div className="px-6 pt-6 pb-2">
                            <div className="flex items-center gap-2 mb-1">
                                <Sparkles className="h-4 w-4 text-indigo-400" />
                                <h2 className="text-xl font-semibold text-zinc-100">Complete your Family Profile</h2>
                            </div>
                            <p className="text-sm text-zinc-400">We need a few details to get you started.</p>
                        </div>
                        <div className="p-6 pt-4">
                            <form onSubmit={handleCreateProfile} className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="familyName" className="text-zinc-300 text-xs font-medium uppercase tracking-wide">Family Name</Label>
                                    <Input
                                        id="familyName"
                                        value={familyName}
                                        onChange={(e) => setFamilyName(e.target.value)}
                                        placeholder="The Smiths"
                                        required
                                        className="bg-white/5 border-white/10 text-zinc-100 placeholder:text-zinc-600"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="phone" className="text-zinc-300 text-xs font-medium uppercase tracking-wide">Phone Number <span className="text-zinc-500 normal-case">(optional)</span></Label>
                                    <Input
                                        id="phone"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="+1 234 567 8900"
                                        className="bg-white/5 border-white/10 text-zinc-100 placeholder:text-zinc-600"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="address" className="text-zinc-300 text-xs font-medium uppercase tracking-wide">Home Address</Label>
                                    <Input
                                        id="address"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        placeholder="123 Festival Way, City"
                                        required
                                        className="bg-white/5 border-white/10 text-zinc-100 placeholder:text-zinc-600"
                                    />
                                </div>

                                <div className="space-y-2 pt-1">
                                    <Label className="text-zinc-300 text-xs font-medium uppercase tracking-wide">Home Location</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={getLocation}
                                        className="w-full border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:text-indigo-200 hover:border-indigo-500/50 transition-all"
                                    >
                                        <MapPin className="mr-2 h-4 w-4" />
                                        Get Current Location
                                    </Button>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label htmlFor="lat" className="text-xs text-zinc-500">Latitude</Label>
                                            <Input
                                                id="lat"
                                                type="number"
                                                step="any"
                                                value={lat}
                                                onChange={(e) => setLat(e.target.value ? Number(e.target.value) : '')}
                                                placeholder="40.7128"
                                                required
                                                className="bg-white/5 border-white/10 text-zinc-100 placeholder:text-zinc-600"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="lng" className="text-xs text-zinc-500">Longitude</Label>
                                            <Input
                                                id="lng"
                                                type="number"
                                                step="any"
                                                value={lng}
                                                onChange={(e) => setLng(e.target.value ? Number(e.target.value) : '')}
                                                placeholder="-74.0060"
                                                required
                                                className="bg-white/5 border-white/10 text-zinc-100 placeholder:text-zinc-600"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-500/20 mt-2"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <span className="flex items-center gap-2">
                                            <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                            Saving...
                                        </span>
                                    ) : 'Complete Setup →'}
                                </Button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
