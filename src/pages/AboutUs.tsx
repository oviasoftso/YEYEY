import { motion } from "framer-motion";
import { Shield, Lock, Brain, RefreshCw, ArrowLeft, Sparkles, BookOpen, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import OviAvatar from "@/components/OviAvatar";
import { useTheme } from "@/hooks/use-theme";

const AboutUs = () => {
  const { isDark } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <OviAvatar size="sm" animate={false} />
          <span className="font-display font-bold text-xl text-foreground">OVIA PREP O-LEVEL</span>
        </Link>
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft size={16} /> Back
          </Button>
        </Link>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        {/* Hero */}
        <motion.div
          className="text-center space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <OviAvatar size="xl" mood="greeting" showGlow />
          <h1 className="font-display text-4xl font-bold text-foreground mt-6">About OVIA PREP</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            OVIA PREP O-LEVEL is an adaptive, AI-powered revision platform built exclusively for Zimbabwean O-Level students 
            following the ZIMSEC Heritage-Based Curriculum.
          </p>
        </motion.div>

        {/* Mission */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-8 text-center">
              <Sparkles className="text-primary mx-auto mb-4" size={32} />
              <h2 className="font-display text-2xl font-bold text-foreground mb-3">Our Mission</h2>
              <p className="text-muted-foreground leading-relaxed max-w-xl mx-auto">
                To empower every Zimbabwean O-Level student with world-class, AI-driven revision tools that adapt to 
                their unique learning needs — ensuring no student is left behind in their academic journey.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Key Features */}
        <div className="space-y-4">
          <h2 className="font-display text-2xl font-bold text-foreground text-center">How OVIA Works</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                icon: Brain,
                title: "Spaced Repetition Engine",
                desc: "OVIA uses scientifically-proven spaced repetition algorithms (SM-2) to schedule flashcard reviews at optimal intervals. Cards you struggle with appear more frequently, while mastered concepts are spaced further apart — maximizing retention with minimal study time."
              },
              {
                icon: BookOpen,
                title: "Data-Driven Revision Notes",
                desc: "Unlike generic notes, OVIA generates revision content tailored to YOUR weak areas. After each assessment, the AI identifies concepts you struggled with and creates targeted notes that address your specific knowledge gaps."
              },
              {
                icon: RefreshCw,
                title: "Adaptive Assessments",
                desc: "Assessments follow ZIMSEC cognitive weightings (Knowledge 30%, Comprehension 30%, Application 25%, Analysis 15%) with progressive difficulty. Questions use authentic ZIMSEC command words and marking schemes."
              },
              {
                icon: Users,
                title: "Institutional Licensing",
                desc: "OVIA PREP is deployed per-institution with verified student registration. Only students on your school's official class list can access the platform, ensuring a secure and controlled academic environment."
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 * i }}
              >
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <feature.icon className="text-primary" size={20} />
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Data Safety Badge */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-8">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                  <Shield className="text-green-600 dark:text-green-400" size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-display text-xl font-bold text-foreground">Data Safety</h3>
                    <span className="bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-bold px-2.5 py-0.5 rounded-full border border-green-500/20">
                      VERIFIED
                    </span>
                  </div>
                  <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                    <p>
                      <Lock className="inline mr-1.5" size={14} />
                      <strong className="text-foreground">Security-First Architecture:</strong> OVIA utilises a Security-First 
                      Workflow where institutional licenses are cryptographically bound to institutional domains. Student data 
                      is encrypted at rest and in transit.
                    </p>
                    <p>
                      <Shield className="inline mr-1.5" size={14} />
                      <strong className="text-foreground">Zero-Leak Policy:</strong> Each institution's data is logically 
                      isolated. Student records, assessment history, and academic insights cannot be accessed across institutions.
                    </p>
                    <p>
                      <Users className="inline mr-1.5" size={14} />
                      <strong className="text-foreground">Verified Registration:</strong> Only students verified against your 
                      school's official class list can register. Unverified users are directed to contact their school administration.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Privacy Statement */}
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <h3 className="font-display text-xl font-bold text-foreground">Data Privacy Statement</h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              OVIA PREP collects only the minimum data necessary to provide personalised revision experiences: 
              your name, subject selections, assessment scores, and learning analytics. This data is used exclusively 
              to power your adaptive learning experience and is never shared with third parties. Your school's 
              administration may access aggregate performance statistics for educational oversight purposes.
            </p>
          </CardContent>
        </Card>

        {/* IP Notice */}
        <div className="border-t border-border pt-8 text-center space-y-2">
          <p className="text-sm font-semibold text-foreground">
            OVIA and OVIA Advanced are the intellectual property of Anesu T. Dzere. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} OVIA PREP O-LEVEL — Powered by OVIA Advanced
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;
