import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { db, collections } from '../services/firebase';
import { doc, getDoc, onSnapshot, updateDoc, Timestamp } from 'firebase/firestore';
import { supabase } from '../services/supabase';

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Fetch user profile from Firestore
        const userRef = doc(db, collections.users, session.user.id);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUser({ id: session.user.id, ...userSnap.data() } as User);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Real-time user sync
  useEffect(() => {
    if (!user?.id) return;
    
    const unsub = onSnapshot(doc(db, collections.users, user.id), (docSnap) => {
        if (docSnap.exists()) {
             const userData = docSnap.data() as User;
             setUser(prev => ({ ...prev, ...userData, id: docSnap.id } as User));
        } else {
             logout();
        }
    });

    return () => unsub();
  }, [user?.id]);

  // Real-time Presence Heartbeat
  useEffect(() => {
    if (!user?.id) return;

    const updatePresence = async () => {
        try {
            await updateDoc(doc(db, collections.users, user.id), {
                lastSeen: Timestamp.now()
            });
        } catch (e) {
            console.error("[Presence] Heartbeat failed", e);
        }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 60000); // 60s Heartbeat

    return () => clearInterval(interval);
  }, [user?.id]);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
    } catch (e: any) {
        console.error("Login failed", e);
        throw e;
    } finally {
        setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
