import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { db, collections, auth } from '../services/firebase';
import { doc, getDoc, onSnapshot, updateDoc, setDoc, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loginAnonymous: (role?: UserRole, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user profile from Firestore
        const userRef = doc(db, collections.users, firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUser({ id: firebaseUser.uid, ...userSnap.data() } as User);
        } else {
          // If anonymous user has no profile, it might be a fresh sign-in
          // We'll handle profile creation in loginAnonymous
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time user sync
  useEffect(() => {
    if (!user?.id) return;
    
    const unsub = onSnapshot(doc(db, collections.users, user.id), (docSnap) => {
        if (docSnap.exists()) {
             const userData = docSnap.data() as User;
             setUser(prev => ({ ...prev, ...userData, id: docSnap.id } as User));
        } else {
             // If document is deleted but user is still authed, we might want to sign out
             if (auth.currentUser) {
                logout();
             }
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

  const loginAnonymous = async (role: UserRole = 'admin', name: string = 'Demo User') => {
    setLoading(true);
    try {
        const cred = await signInAnonymously(auth);
        const uid = cred.user.uid;
        
        // Check if profile exists, if not create one
        const userRef = doc(db, collections.users, uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
            const newUser: Partial<User> = {
                name,
                role,
                email: `anonymous_${uid.slice(0, 5)}@demo.edu`,
                createdAt: Timestamp.now(),
                accountStatus: 'active',
                paymentStatus: 'paid'
            };
            await setDoc(userRef, newUser);
            setUser({ id: uid, ...newUser } as User);
        }
    } catch (e: any) {
        console.error("Anonymous login failed", e);
        throw e;
    } finally {
        setLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loginAnonymous, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
