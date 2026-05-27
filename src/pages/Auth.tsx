import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import OviAvatar from "@/components/OviAvatar";
import { supabase } from "@/integrations/supabase/client";
import { store } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const generateEmail = (first: string, last: string) => {
    const clean = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    return `${clean(first)}.${clean(last)}@student.ovis.local`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!firstName.trim() || !surname.trim() || !password.trim()) {
      toast({ title: "Missing fields", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }

    if (password.length < 8) {
      toast({ title: "Weak password", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      toast({ title: "Weak password", description: "Password must contain at least one letter and one number.", variant: "destructive" });
      return;
    }

    const email = generateEmail(firstName, surname);
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Sync all user data from cloud
        await store.syncFromCloud();
        const profile = store.getProfile();
        if (profile && profile.subjects.length > 0) {
          navigate("/dashboard");
        } else {
          navigate("/onboarding");
        }
      } else {
        const displayName = `${firstName.trim()} ${surname.trim()}`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
          },
        });
        if (error) throw error;
        toast({ title: "Account created!", description: "Let's set up your subjects." });
        navigate("/onboarding");
      }
    } catch (error: any) {
      const msg = error.message?.includes("Invalid login")
        ? "Incorrect name or password. Please try again."
        : error.message || "Something went wrong.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-8">
          <OviAvatar size="lg" mood="greeting" showGlow />
          <h1 className="font-display text-3xl font-bold text-foreground mt-4">OVIA PREP</h1>
          <p className="text-muted-foreground text-sm mt-1">O-Level Intelligent Revision Companion</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center font-display">
              {isLogin ? "Welcome Back!" : "Create Account"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">First Name</label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter your first name"
                  autoComplete="given-name"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Surname</label>
                <Input
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  placeholder="Enter your surname"
                  autoComplete="family-name"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters with a letter and number"
                    autoComplete={isLogin ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading && <Loader2 className="animate-spin mr-2" size={18} />}
                {isLogin ? "Sign In" : "Sign Up"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;
