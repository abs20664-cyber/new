import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { auth, db, collections, signIn } from '../services/firebase';
import { setDoc, doc, Timestamp, getDoc, updateDoc, query, collection, where, getDocs, onSnapshot } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default Admin Credentials for Seeding
const DEFAULT_ADMIN: User = { 
    name: 'System Administrator', 
    email: 'admin@edu.alg', 
    password: 'admin123', 
    role: 'admin', 
    id: 'sys_admin_v2' 
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
        try {
            await signIn();
            
            // Check if Admin exists, if not, SEED IT
            const adminRef = doc(db, collections.users, DEFAULT_ADMIN.id);
            const adminSnap = await getDoc(adminRef);
            
            if (!adminSnap.exists()) {
                await setDoc(adminRef, { 
                    ...DEFAULT_ADMIN, 
                    lastSeen: Timestamp.now(), 
                    createdAt: Timestamp.now(),
                    accountStatus: 'active'
                });
            }
        } catch (e) {
            console.error("[Auth] Initialization failure", e);
        } finally {
            setLoading(false);
        }
    };
    init();
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
        const q = query(collection(db, collections.users), where('email', '==', email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            throw new Error("Invalid email or password.");
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data() as User;

        if (userData.password !== pass) {
             throw new Error("Invalid email or password.");
        }

        await updateDoc(userDoc.ref, { lastSeen: Timestamp.now() });
        const loggedInUser = { id: userDoc.id, ...userData };
        setUser(loggedInUser);

    } catch (e: any) {
        console.error("Login failed", e);
        throw e;
    } finally {
        setLoading(false);
    }
  };

  const logout = () => {
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