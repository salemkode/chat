import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { MessageSquare, ArrowRight } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  const navigate = useNavigate()

  const isAuthenticated =
    typeof window !== 'undefined'
      ? (() => {
          try {
            const authState = localStorage.getItem('chatapp_auth_state')
            if (!authState) return false
            const state = JSON.parse(authState) as {
              isAuthenticated: boolean
              token?: string
            }
            return state.isAuthenticated
          } catch {
            return false
          }
        })()
      : false

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
      {/* Hero Section - Brand Story Focus */}
      <section className="min-h-screen flex items-center justify-center relative px-6">
        {/* Subtle ambient glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Brand Logo */}
          <div className="flex items-center justify-center gap-3 mb-16">
            <div className="p-3 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm">
              <MessageSquare className="w-8 h-8 text-primary" />
            </div>
            <span className="text-2xl font-semibold text-foreground">
              ChatApp
            </span>
          </div>

          {/* Main Headline - Brand Story */}
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-8 leading-[1.1]">
            <span className="block text-foreground">Where</span>
            <span className="block text-primary">conversations</span>
            <span className="block text-foreground">come alive</span>
          </h1>

          {/* Brand Narrative */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed font-light">
            We believe every message matters. That's why we built a platform
            that transforms how you connect—with simplicity, speed, and meaning.
          </p>

          {/* Value Proposition */}
          <div className="flex items-center justify-center gap-6 mb-12 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>End-to-end encrypted</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>Lightning fast</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span>Always free</span>
            </div>
          </div>

          {/* Primary CTA */}
          <div className="flex items-center justify-center gap-4 mb-8">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => {
                  void navigate({ to: '/chat' })
                }}
                className="px-10 py-5 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-primary/25 inline-flex items-center gap-3"
              >
                Open Chats
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    void navigate({ to: '/login', search: { redirect: '/chat' } })
                  }}
                  className="px-10 py-5 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-primary/25 inline-flex items-center gap-3"
                >
                  Start your journey
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </button>
                <a
                  href="/signup"
                  className="px-6 py-5 rounded-2xl bg-secondary hover:bg-secondary/90 text-secondary-foreground font-medium text-lg transition-all duration-300"
                >
                  Sign up
                </a>
              </>
            )}
          </div>

          {/* Trust Indicator */}
          <p className="text-sm text-muted-foreground">
            No credit card required · Join 10,000+ users
          </p>
        </div>
      </section>

      {/* Brand Philosophy Section */}
      <section className="py-32 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-primary text-sm font-semibold mb-4 tracking-wider uppercase">
                Our Philosophy
              </p>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
                Technology should feel
                <span className="text-primary"> invisible</span>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                When communication works perfectly, you forget about technology
                exists. You focus on what matters: the people you connect with,
                the ideas you share, and the moments you create together.
              </p>
              <p className="text-muted-foreground text-lg leading-relaxed">
                That's the experience we're building—one message at a time.
              </p>
            </div>

            <div className="space-y-6">
              {[
                {
                  number: '01',
                  title: 'Clarity over complexity',
                  desc: 'Every feature serves a purpose. No clutter, no confusion.',
                },
                {
                  number: '02',
                  title: 'Privacy by design',
                  desc: 'Your conversations belong to you. Always.',
                },
                {
                  number: '03',
                  title: 'Speed without sacrifice',
                  desc: 'Instant delivery without compromising on security.',
                },
              ].map((item) => (
                <div
                  key={item.number}
                  className="group p-6 rounded-2xl bg-card/30 border border-border/50 hover:border-primary/30 transition-all duration-300"
                >
                  <span className="text-primary/60 text-sm font-mono mb-3 block">
                    {item.number}
                  </span>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Timeline/Story Section */}
      <section className="py-32 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-primary text-sm font-semibold mb-4 tracking-wider uppercase">
            The Journey
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Built for the way you
            <span className="text-primary"> communicate</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-16 leading-relaxed">
            From a simple idea to a platform loved by thousands. Our story is
            just beginning.
          </p>

          <div className="grid md:grid-cols-3 gap-8 text-left">
            {[
              {
                year: '2023',
                title: 'The Beginning',
                desc: 'Started with a question: Can messaging be better?',
              },
              {
                year: '2024',
                title: 'The Foundation',
                desc: 'Built infrastructure that scales and secures.',
              },
              {
                year: '2025',
                title: 'The Future',
                desc: 'Shaping the next generation of communication.',
              },
            ].map((milestone) => (
              <div key={milestone.year} className="relative">
                <div className="text-primary/40 text-6xl font-bold mb-4">
                  {milestone.year}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {milestone.title}
                </h3>
                <p className="text-muted-foreground">{milestone.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA - Brand Promise */}
      <section className="py-32 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-12 md:p-16 rounded-3xl bg-gradient-to-br from-card/80 to-card/30 border border-border relative overflow-hidden">
            {/* Ambient effect */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                Ready to experience the
                <span className="text-primary"> difference</span>?
              </h2>
              <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                Join thousands who've already transformed how they connect. Your
                first conversation is waiting.
              </p>
              <div className="flex items-center justify-center gap-4">
                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={() => {
                      void navigate({ to: '/chat' })
                    }}
                    className="px-10 py-5 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-primary/25 inline-flex items-center gap-3"
                  >
                    Open Chats
                    <ArrowRight className="w-5 h-5" />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        void navigate({ to: '/login', search: { redirect: '/chat' } })
                      }}
                      className="px-10 py-5 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-primary/25 inline-flex items-center gap-3"
                    >
                      Create your account
                      <ArrowRight className="w-5 h-5" />
                    </button>
                    <a
                      href="/signup"
                      className="px-6 py-5 rounded-2xl bg-secondary hover:bg-secondary/90 text-secondary-foreground font-medium text-lg transition-all duration-300"
                    >
                      Sign up
                    </a>
                  </>
                )}
              </div>
              <p className="mt-6 text-sm text-muted-foreground">
                Free forever · No credit card required
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="py-16 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-muted-foreground" />
              <span className="text-muted-foreground font-semibold">
                ChatApp
              </span>
            </div>

            <p className="text-muted-foreground text-sm">
              &copy; {new Date().getFullYear()} ChatApp Inc. Crafted with care.
            </p>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="/login" className="hover:text-primary transition-colors">
                Privacy
              </a>
              <a href="/login" className="hover:text-primary transition-colors">
                Terms
              </a>
              <a href="/login" className="hover:text-primary transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
