import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { LogOut, Navigation, Menu, X, LayoutDashboard, CalendarCheck } from 'lucide-react'

export function Layout({ children }) {
    const { user, isLoading } = useAuth()
    const router = useRouter()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/')
    }

    const navLinks = [
        { href: '/dashboard', label: 'My Trips', icon: CalendarCheck },
        { href: '/host', label: 'Host Dashboard', icon: LayoutDashboard },
    ]

    const isActive = (href) => router.pathname === href || router.pathname.startsWith(href + '/')

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-[oklch(0.12_0.025_268/0.85)] backdrop-blur-xl supports-[backdrop-filter]:bg-[oklch(0.12_0.025_268/0.7)]">
                <div className="container mx-auto flex h-14 items-center justify-between px-4">
                    {/* Logo */}
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="flex items-center gap-2 group">
                            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500/20 group-hover:bg-indigo-500/30 transition-colors">
                                <Navigation className="h-4 w-4 text-indigo-400" />
                            </div>
                            <span className="font-bold text-base gradient-text">VisitSync</span>
                        </Link>

                        {/* Desktop Nav */}
                        {user && (
                            <nav className="hidden md:flex items-center gap-1 ml-4">
                                {navLinks.map(({ href, label }) => (
                                    <Link
                                        key={href}
                                        href={href}
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isActive(href)
                                                ? 'bg-indigo-500/15 text-indigo-300'
                                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                                            }`}
                                    >
                                        {label}
                                    </Link>
                                ))}
                            </nav>
                        )}
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-2">
                        {user && !isLoading && (
                            <>
                                {/* Desktop sign out */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleSignOut}
                                    className="hidden md:flex text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                                >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Sign Out
                                </Button>

                                {/* Mobile sign out (icon only) */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleSignOut}
                                    className="md:hidden text-zinc-400 hover:text-zinc-200 hover:bg-white/5 h-8 w-8"
                                >
                                    <LogOut className="h-4 w-4" />
                                </Button>
                            </>
                        )}

                        {/* Mobile hamburger */}
                        {user && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="md:hidden text-zinc-400 hover:text-zinc-200 hover:bg-white/5 h-8 w-8"
                                aria-label="Toggle menu"
                            >
                                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Mobile nav drawer */}
                {user && mobileMenuOpen && (
                    <div className="md:hidden border-t border-white/[0.06] bg-[oklch(0.12_0.025_268/0.95)] backdrop-blur-xl px-4 py-3 space-y-1 animate-fade-in-up">
                        {navLinks.map(({ href, label, icon: Icon }) => (
                            <Link
                                key={href}
                                href={href}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive(href)
                                        ? 'bg-indigo-500/15 text-indigo-300'
                                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                {label}
                            </Link>
                        ))}
                    </div>
                )}
            </header>

            <main className="flex-1 container mx-auto p-4 md:p-8">
                {children}
            </main>
        </div>
    )
}
