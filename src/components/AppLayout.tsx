import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, Brain, StickyNote, MessageCircle,
  BarChart3, CalendarCheck, Clock, Sun, Moon, Monitor, LogOut, Library, Shield, GraduationCap, FileText,
  WifiOff, Volume2, BookX, ClipboardList, Users2, Users,
} from "lucide-react";
import OviAvatar from "./OviAvatar";
import waterfallsLogo from "@/assets/waterfalls-logo.png";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";
import { store } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const baseNavItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/flashcards", label: "OVI PULSE", icon: Brain },
  { path: "/study-plan", label: "OVI COMPASS", icon: CalendarCheck },
  { path: "/assessment", label: "OVI ARENA", icon: BookOpen },
  { path: "/exam-simulation", label: "Exam Simulation", icon: Clock },
  { path: "/past-papers", label: "Past Paper Vault", icon: FileText },
  { path: "/notes", label: "OVI VAULT", icon: StickyNote },
  { path: "/study-guides", label: "Study Guides", icon: Library },
  { path: "/chat", label: "OVI MIND", icon: MessageCircle },
  { path: "/voice", label: "OVI VOICE", icon: Volume2 },
  { path: "/assignments", label: "Assignments", icon: ClipboardList },
  { path: "/mistake-journal", label: "Mistake Journal", icon: BookX },
  { path: "/parent", label: "Parent View", icon: Users2 },
  { path: "/study-groups", label: "Study Groups", icon: Users },
  { path: "/analytics", label: "OVI INSIGHT", icon: BarChart3 },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

const ThemeToggle = () => {
  const { setTheme, isDark } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {isDark ? <Moon size={16} strokeWidth={1.5} /> : <Sun size={16} strokeWidth={1.5} />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem onClick={() => setTheme("light")} className="gap-2">
          <Sun size={14} strokeWidth={1.5} /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="gap-2">
          <Moon size={14} strokeWidth={1.5} /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} className="gap-2">
          <Monitor size={14} strokeWidth={1.5} /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const MobileThemeToggle = () => {
  const { isDark, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark
        ? <Moon size={18} strokeWidth={1.5} className="text-muted-foreground" />
        : <Sun size={18} strokeWidth={1.5} className="text-muted-foreground" />}
    </Button>
  );
};

const AppLayout = ({ children }: AppLayoutProps) => {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);

  // Role check — admin bypass or Supabase user_roles table
  useEffect(() => {
    // Admin bypass for Anesu Dzere
    if (localStorage.getItem("ovi_admin_bypass") === "true") {
      setIsAdmin(true);
      setIsTeacher(true);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .in("role", ["admin", "teacher"]);
      if (!cancelled) {
        setIsAdmin(data?.some((r) => r.role === "admin") ?? false);
        setIsTeacher(data?.some((r) => r.role === "teacher" || r.role === "admin") ?? false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden lg:flex w-64 flex-col glass-sidebar text-sidebar-foreground">
        <Link
          to="/dashboard"
          className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border"
        >
          <img
            src={waterfallsLogo}
            alt="OVIA Prep · Waterfalls Academy"
            className="w-10 h-10 object-contain shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-sm text-sidebar-primary leading-tight tracking-tight">
              OVIA Prep
            </h1>
            <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/55 mt-0.5">
              Waterfalls Academy
            </p>
          </div>
        </Link>

        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {baseNavItems.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
                }`}
              >
                <Icon size={17} strokeWidth={1.5} />
                {label}
              </Link>
            );
          })}
        </nav>

        {(isAdmin || isTeacher) && (
          <div className="px-3 pb-2 space-y-0.5">
            {isTeacher && (
              <Link
                to="/teacher"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  location.pathname === "/teacher"
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
                }`}
              >
                <GraduationCap size={17} strokeWidth={1.5} />
                OVI Classroom
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  location.pathname === "/admin"
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
                }`}
              >
                <Shield size={17} strokeWidth={1.5} />
                Director's Suite
              </Link>
            )}
          </div>
        )}

        <div className="px-4 py-3 border-t border-sidebar-border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-sidebar-foreground/50">
              <OviAvatar size="sm" animate={false} />
              <span>OVI · Companion</span>
            </div>
            <ThemeToggle />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent text-xs"
            onClick={async () => {
              store.clearLocal();
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
          >
            <LogOut size={14} strokeWidth={1.5} /> Sign Out
          </Button>
          <p className="text-[9px] uppercase tracking-wider text-sidebar-foreground/40 text-center pt-1">
            Made by OVIA Software Solutions
          </p>
        </div>
      </aside>

      <div className="flex flex-col flex-1 min-w-0">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src={waterfallsLogo} alt="OVIA Prep" className="w-8 h-8 object-contain" />
            <span className="font-display font-bold text-foreground text-sm">OVIA Prep</span>
          </Link>
          <MobileThemeToggle />
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>

        <nav className="lg:hidden flex items-center justify-around border-t border-border bg-card py-2">
          {baseNavItems.slice(0, 5).map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon size={20} strokeWidth={1.5} />
                <span>{label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default AppLayout;
