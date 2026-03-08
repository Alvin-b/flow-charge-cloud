import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  user_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  has_pin: boolean;
  avatar_url: string | null;
  // admin users will have this flag set by a migration or manually
  is_admin?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    // Fetch profile from safe view (excludes pin_hash)
    const [profileResult, roleResult] = await Promise.all([
      supabase
        .from("profiles_safe" as any)
        .select("user_id, full_name, phone, email, avatar_url, is_admin")
        .eq("user_id", userId)
        .maybeSingle() as Promise<{ data: { user_id: string; full_name: string; phone: string; email: string | null; avatar_url: string | null; is_admin?: boolean } | null }>,
      supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle(),
    ]);

    const data = profileResult.data;

    if (data) {
      // Set is_admin from user_roles table (preferred) or legacy profiles flag
      const hasAdminRole = !!roleResult.data;
      data.is_admin = hasAdminRole || !!data.is_admin;
      // If profile exists but full_name is missing, try to fill it from Supabase Auth user_metadata
      if (!data.full_name) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const metaName = authUser?.user_metadata?.full_name;
        if (metaName) {
          data.full_name = metaName;
          // update using RPC to avoid profile select permission
          supabase.rpc("upsert_profile", {
            p_full_name: metaName,
            p_phone: data.phone || null,
            p_email: data.email || null,
          }).then(() => {});
        }
      }

      // Check if PIN is set via server-side function (no hash exposed)
      const { data: hasPin } = await supabase.rpc("has_pin");

      setProfile({ ...data, has_pin: !!hasPin });
    } else {
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // Then get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
