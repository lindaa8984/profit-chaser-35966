import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any; user?: User | null }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  userRole: 'guest' | 'premium' | 'admin' | null;
  sessionExpiry: Date | null;
  isSessionValid: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'guest' | 'premium' | 'admin' | null>(null);
  const [sessionExpiry, setSessionExpiry] = useState<Date | null>(null);

  useEffect(() => {
    console.log('Auth: Setting up auth state listener');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth: State changed', { event, hasSession: !!session, userId: session?.user?.id });
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch user role when session changes
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
            checkSessionExpiry(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
          setSessionExpiry(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Auth: Initial session check', { hasSession: !!session, userId: session?.user?.id });
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id);
        checkSessionExpiry(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (data && !error) {
      setUserRole(data.role as 'guest' | 'premium' | 'admin');
    }
  };

  const checkSessionExpiry = async (userId: string) => {
    // For admin and premium users, check subscription end_date
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (roleData?.role === 'admin' || roleData?.role === 'premium') {
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('end_date')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();
      
      if (subData?.end_date) {
        setSessionExpiry(new Date(subData.end_date));
      }
      return;
    }

    // For guest users, check guest_sessions
    const { data, error } = await supabase
      .from('guest_sessions')
      .select('session_end')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('session_end', { ascending: false })
      .limit(1)
      .single();

    if (data && !error) {
      setSessionExpiry(new Date(data.session_end));
    }
  };

  const isSessionValid = () => {
    if (!user) return false;
    // Admin users always have valid sessions
    if (userRole === 'admin') return true;
    // Premium and guest users need valid expiry
    if (!sessionExpiry) return false;
    return new Date() < sessionExpiry;
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName
        }
      }
    });

    if (error) {
      toast.error('فشل إنشاء الحساب: ' + error.message);
    } else {
      toast.success('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول');
    }

    return { error, user: data?.user };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error('فشل تسجيل الدخول: ' + error.message);
    } else {
      toast.success('تم تسجيل الدخول بنجاح!');
    }

    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('فشل تسجيل الخروج');
    } else {
      toast.success('تم تسجيل الخروج بنجاح');
    }
  };

  const contextValue: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    userRole,
    sessionExpiry,
    isSessionValid: isSessionValid(),
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
