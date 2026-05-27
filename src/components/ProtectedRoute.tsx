import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { store } from "@/lib/store";
import { Loader2, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        // Check if user is blocked
        const { data: blockData } = await supabase
          .from("blocked_users")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (blockData) {
          setBlocked(true);
          setLoading(false);
          return;
        }

        // Sync data from cloud if local cache is empty
        const localProfile = store.getProfile();
        if (!localProfile) {
          await store.syncFromCloud();
        }
        setAuthenticated(true);
      } else {
        store.clearLocal();
        setAuthenticated(false);
        navigate("/auth");
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <ShieldX className="mx-auto text-destructive" size={48} />
          <h1 className="font-display text-2xl font-bold text-foreground">Access Suspended</h1>
          <p className="text-muted-foreground">
            Your access to OVIA PREP has been suspended. Please contact your school administrator for assistance.
          </p>
          <Button
            variant="outline"
            onClick={async () => {
              store.clearLocal();
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
          >
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  if (!authenticated) return null;

  return <>{children}</>;
};

export default ProtectedRoute;
