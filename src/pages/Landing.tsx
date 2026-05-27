import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  BookOpen, Brain, BarChart3, CalendarCheck, Sparkles, ArrowRight,
  Sun, Moon, Shield, Info, Target, RefreshCw, MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import OviAvatar from "@/components/OviAvatar";
import waterfallsLogo from "@/assets/waterfalls-logo.png";
import { useTheme } from "@/hooks/use-theme";

const features = [
  { icon: Target, title: "Diagnoses your weak topics", desc: "Every assessment is dissected concept-by-concept so OVI knows exactly where you struggle." },
  { icon: RefreshCw, title: "Builds adaptive notes for you", desc: "Revision notes are regenerated to attack your gaps — never generic textbook copy." },
  { icon: Brain, title: "Drills you with spaced flashcards", desc: "Wrong answers become flashcards on an SM-2 schedule so they stick before the exam." },
  { icon: BarChart3, title: "Tracks every topic over time", desc: "Mastery, streaks, neglected subjects — all on one Hub view tuned to ZIMSEC HBC." },
];

const Landing = () => {
  const { isDark, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <img src={waterfallsLogo} alt="Waterfalls Academy" className="w-10 h-10 object-contain" />
          <div className="leading-tight">
            <div className="font-display font-bold text-base text-foreground">OVIA Prep</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Waterfalls Academy</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/about">
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
              <Info size={16} strokeWidth={1.5} /> About
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setTheme(isDark ? "light" : "dark")}>
            {isDark ? <Moon size={18} strokeWidth={1.5} /> : <Sun size={18} strokeWidth={1.5} />}
          </Button>
          <Link to="/auth">
            <Button variant="default" size="sm">Enter Hub</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-20 lg:py-28 flex flex-col lg:flex-row items-center gap-12">
        <motion.div
          className="flex-1 text-center lg:text-left"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-semibold mb-6">
            <Sparkles size={16} strokeWidth={1.5} />
            ZIMSEC O-Level · Heritage-Based Curriculum
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-[1.05] mb-6">
            OVIA Prep
            <span className="block text-primary">Waterfalls Academy</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mb-8">
            Meet OVI — your AI revision companion. OVI diagnoses what you don't know yet,
            rewrites your notes to fix it, drills you with adaptive practice, and remembers
            what you forget so you walk into the exam hall prepared, not panicked.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <Link to="/auth">
              <Button size="lg" className="gap-2 text-base px-8">
                Enter the Hub <ArrowRight size={18} strokeWidth={1.5} />
              </Button>
            </Link>
            <Link to="/about">
              <Button size="lg" variant="outline" className="gap-2 text-base px-8">
                Learn More
              </Button>
            </Link>
          </div>
        </motion.div>

        <motion.div
          className="flex-1 flex justify-center"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="relative flex items-center gap-6">
            <div className="absolute -inset-10 bg-primary/5 rounded-full blur-3xl" />
            <img
              src={waterfallsLogo}
              alt="Waterfalls Academy crest"
              className="relative w-44 h-44 lg:w-56 lg:h-56 object-contain drop-shadow-2xl"
            />
            <OviAvatar size="xl" mood="greeting" message="Welcome — let's go." showGlow />
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <h2 className="font-display text-3xl font-bold text-center text-foreground mb-3">
          What OVI Does With You
        </h2>
        <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-12 text-sm sm:text-base">
          Every revision session is co-piloted. OVI is not a passive textbook — it watches your
          progress, adapts the work to you, and stays on your weakest topics until they stop
          being weak.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="bg-card border border-border rounded-xl p-6 academic-shadow hover:-translate-y-0.5 transition-transform"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <f.icon className="text-primary" size={22} strokeWidth={1.5} />
              </div>
              <h3 className="font-display font-bold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Quick capabilities row */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: BookOpen, label: "Adaptive Assessments" },
            { icon: MessageCircle, label: "OVI Tutor Chat" },
            { icon: CalendarCheck, label: "Personalised Study Plan" },
            { icon: Brain, label: "Spaced-Repetition Flashcards" },
          ].map((c) => (
            <div key={c.label} className="glass academic-shadow rounded-xl p-4 border border-border flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <c.icon size={18} strokeWidth={1.5} />
              </div>
              <span className="font-semibold text-sm text-foreground">{c.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Data Safety Badge */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="flex items-center justify-center gap-3 glass border border-border rounded-xl px-6 py-4">
          <Shield className="text-primary shrink-0" size={22} strokeWidth={1.5} />
          <div>
            <span className="text-sm font-semibold text-foreground">Data Safety Verified</span>
            <span className="text-xs text-muted-foreground ml-2">
              Per-student isolation · Cascade deletion · Server-side admin checks
            </span>
          </div>
          <Link to="/about" className="ml-auto">
            <Button variant="ghost" size="sm" className="text-xs">Learn More</Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} OVIA Prep · Waterfalls Academy
        </p>
        <p className="text-xs text-muted-foreground">
          Made by <span className="font-semibold text-foreground">OVIA Software Solutions</span>. OVI and OVIA Prep are intellectual property of Anesu T. Dzere. All rights reserved.
        </p>
        <Link to="/about" className="text-xs text-primary hover:underline">About Us & Data Safety</Link>
      </footer>
    </div>
  );
};

export default Landing;
