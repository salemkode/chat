import { useNavigate } from '@tanstack/react-router'
import { MessageSquare, ArrowRight, Shield, Zap, Globe } from 'lucide-react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-cyan-500 selection:text-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-24 pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl z-0 pointer-events-none">
          <div className="absolute top-20 left-20 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-700" />
        </div>

        <div className="container mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900 border border-gray-800 text-sm text-gray-400 mb-8 animate-fade-in-up">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span>Now with AI-powered suggestions</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent drop-shadow-sm">
            Connect Beyond <br className="hidden md:block" />
            <span className="text-cyan-400">Boundaries</span>
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Experience the future of communication. Secure, lightning-fast, and
            designed for clarity. Join thousands of users today.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              type="button"
              onClick={() => void navigate({ to: '/login' })}
              className="px-8 py-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-lg transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 flex items-center gap-2 group"
            >
              Get Started
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              type="button"
              className="px-8 py-4 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 font-semibold text-lg border border-gray-800 transition-all"
            >
              Learn more
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-gray-900/50">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                id: 'speed',
                icon: <Zap className="w-8 h-8 text-yellow-400" />,
                title: 'Lightning Fast',
                desc: 'Real-time message delivery with sub-millisecond latency worldwide.',
              },
              {
                id: 'secure',
                icon: <Shield className="w-8 h-8 text-emerald-400" />,
                title: 'End-to-End Secure',
                desc: 'Your conversations are encrypted and private by default.',
              },
              {
                id: 'global',
                icon: <Globe className="w-8 h-8 text-blue-400" />,
                title: 'Global Scale',
                desc: 'Connect with anyone, anywhere, with our distributed infrastructure.',
              },
            ].map((feature) => (
              <div
                key={feature.id}
                className="p-8 rounded-2xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors group"
              >
                <div className="mb-6 p-4 rounded-xl bg-gray-950 w-fit group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-24 overflow-hidden border-t border-gray-800/50">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-12">Trusted by developers</h2>
          <div className="flex flex-wrap justify-center gap-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Mock Logos */}
            {['Acme Corp', 'GlobalTech', 'Nebula', 'Circle', 'Fox'].map(
              (brand) => (
                <div
                  key={brand}
                  className="text-2xl font-bold px-6 py-3 border border-gray-800 rounded-lg text-gray-500 hover:text-white hover:border-gray-600 transition-colors cursor-default"
                >
                  {brand}
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative">
        <div className="container mx-auto px-6 max-w-4xl text-center">
          <div className="p-12 rounded-3xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

            <h2 className="text-4xl font-bold mb-6 relative z-10">
              Ready to start chatting?
            </h2>
            <p className="text-gray-400 mb-8 text-lg relative z-10">
              Join the community and experience the difference today. No credit
              card required.
            </p>
            <button
              type="button"
              onClick={() => void navigate({ to: '/login' })}
              className="relative z-10 px-8 py-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-lg transition-all shadow-lg hover:shadow-cyan-500/25"
            >
              Create free account
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-800 text-center text-gray-500 text-sm">
        <div className="flex items-center justify-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-gray-400" />
          <span className="text-gray-300 font-semibold text-base">ChatApp</span>
        </div>
        <p>
          &copy; {new Date().getFullYear()} ChatApp Inc. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
