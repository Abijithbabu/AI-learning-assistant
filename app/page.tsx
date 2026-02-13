import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Brain,
  Sparkles,
  Zap,
  Shield,
  Users,
} from "lucide-react";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-purple-500 selection:text-white overflow-hidden">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/40 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/30 blur-[120px]" />
      </div>

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="flex items-center justify-between px-6 py-6 md:px-12 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">
              AI Learning
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="hidden md:block text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="bg-white text-black px-5 py-2.5 rounded-full font-semibold text-sm hover:scale-105 transition-transform flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <main className="max-w-7xl mx-auto px-6 pt-20 pb-32 text-center md:text-left">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-semibold tracking-wide uppercase">
                <Sparkles className="w-3 h-3" />
                Next Gen Education
              </div>
              <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400">
                Turn Content into <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">
                  Interactive Courses
                </span>
              </h1>
              <p className="text-lg md:text-xl text-gray-400 max-w-xl leading-relaxed">
                Upload your PDFs, Videos, and Docs. Our AI instantly structures
                them into comprehensive lessons and acts as a 24/7 personal
                tutor.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  href="/dashboard"
                  className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-purple-500/50 transition-all hover:-translate-y-1"
                >
                  Start Learning Now
                </Link>
                <Link
                  href="#features"
                  className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl font-bold text-lg hover:bg-white/10 transition-colors backdrop-blur-sm"
                >
                  Watch Demo
                </Link>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-400 pt-8">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-gray-800 border-2 border-black flex items-center justify-center text-xs"
                    >
                      <Users className="w-3 h-3" />
                    </div>
                  ))}
                </div>
                <p>Trusted by 10,000+ students</p>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative hidden md:block group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-75 transition duration-1000"></div>
              <div className="relative rounded-2xl border border-white/10 bg-gray-900/50 backdrop-blur-xl p-6 shadow-2xl">
                <div className="space-y-4">
                  {/* Mock UI */}
                  <div className="flex gap-2 mb-6">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 w-3/4 bg-gray-700 rounded animate-pulse" />
                    <div className="h-32 w-full bg-gray-800 rounded-lg border border-gray-700 p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded bg-purple-600 flex items-center justify-center">
                          <BotIcon />
                        </div>
                        <div className="space-y-2 flex-1">
                          <div className="h-3 w-1/4 bg-gray-600 rounded" />
                          <div className="h-2 w-full bg-gray-700 rounded" />
                          <div className="h-2 w-5/6 bg-gray-700 rounded" />
                        </div>
                      </div>
                    </div>
                    <div className="h-4 w-1/2 bg-gray-700 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Features Grid */}
        <section
          id="features"
          className="py-24 bg-black/50 backdrop-blur-lg border-t border-white/5"
        >
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                Powered by Advanced AI
              </h2>
              <p className="text-gray-400">
                Everything you need to master any subject.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                icon={<Zap className="w-6 h-6 text-yellow-400" />}
                title="Instant Generation"
                desc="Upload files and get a structured course in seconds, complete with modules and summaries."
              />
              <FeatureCard
                icon={<Brain className="w-6 h-6 text-purple-400" />}
                title="Smart Tutor"
                desc="Chat with an AI that knows your course material inside out. No hallucinations."
              />
              <FeatureCard
                icon={<Shield className="w-6 h-6 text-blue-400" />}
                title="Private Data"
                desc="Your learning materials are secure and used only to teach you and your students."
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all group">
      <div className="w-12 h-12 rounded-lg bg-black/50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-white/10">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{desc}</p>
    </div>
  );
}

function BotIcon() {
  return (
    <svg
      className="w-4 h-4 text-white"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}
