import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Service-role client for privileged reads
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // User-bound client to verify caller and check role via has_role()
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin, error: roleErr } = await userClient.rpc("is_admin");
    if (roleErr || !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve admin user ids once (so we can exclude them from student lists)
    const { data: adminRoles } = await admin.from("user_roles").select("user_id").eq("role", "admin");
    const adminIds = new Set((adminRoles || []).map((r) => r.user_id));

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === "students") {
      const { data: { users }, error: usersError } = await admin.auth.admin.listUsers();
      if (usersError) throw usersError;

      const [{ data: profiles }, { data: blocked }, { data: assessments }, { data: mastery }] = await Promise.all([
        admin.from("profiles").select("*"),
        admin.from("blocked_users").select("*"),
        admin.from("assessments").select("user_id, percentage"),
        admin.from("topic_mastery").select("user_id, mastery, subject"),
      ]);

      const students = users
        .filter((u) => !adminIds.has(u.id))
        .map((u) => {
          const profile = profiles?.find((p) => p.user_id === u.id);
          const isBlocked = blocked?.some((b) => b.user_id === u.id);
          const userAssessments = assessments?.filter((a) => a.user_id === u.id) || [];
          const userMastery = mastery?.filter((m) => m.user_id === u.id) || [];
          const avgMastery = userMastery.length > 0
            ? Math.round(userMastery.reduce((s, m) => s + m.mastery, 0) / userMastery.length) : 0;
          const avgScore = userAssessments.length > 0
            ? Math.round(userAssessments.reduce((s, a) => s + a.percentage, 0) / userAssessments.length) : 0;

          return {
            id: u.id,
            email: u.email,
            displayName: profile?.display_name || "Unknown",
            stream: profile?.stream || "N/A",
            subjects: profile?.subjects || [],
            assessmentCount: userAssessments.length,
            avgScore,
            avgMastery,
            isBlocked,
            createdAt: u.created_at,
            lastSignIn: u.last_sign_in_at,
          };
        });

      return new Response(JSON.stringify({ students }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "stats") {
      const { data: { users } } = await admin.auth.admin.listUsers();
      const studentCount = users?.filter((u) => !adminIds.has(u.id)).length || 0;
      const [{ count: assessmentCount }, { count: blockedCount }, { data: mastery }] = await Promise.all([
        admin.from("assessments").select("*", { count: "exact", head: true }),
        admin.from("blocked_users").select("*", { count: "exact", head: true }),
        admin.from("topic_mastery").select("mastery"),
      ]);
      const avgMastery = mastery && mastery.length > 0
        ? Math.round(mastery.reduce((s, m) => s + m.mastery, 0) / mastery.length) : 0;

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const activeUsers = users?.filter((u) => u.last_sign_in_at && u.last_sign_in_at > sevenDaysAgo && !adminIds.has(u.id)).length || 0;

      return new Response(JSON.stringify({
        totalStudents: studentCount,
        activeStudents: activeUsers,
        totalAssessments: assessmentCount || 0,
        blockedStudents: blockedCount || 0,
        avgMastery,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "block") {
      const { userId, block } = body;
      if (!userId || typeof userId !== "string") throw new Error("userId required");
      if (adminIds.has(userId)) throw new Error("Cannot block an admin");

      if (block) {
        await admin.from("blocked_users").upsert({ user_id: userId }, { onConflict: "user_id" });
      } else {
        await admin.from("blocked_users").delete().eq("user_id", userId);
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { userId } = body;
      if (!userId || typeof userId !== "string") throw new Error("userId required");
      if (adminIds.has(userId)) throw new Error("Cannot delete an admin");
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Admin error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
