import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { db, collections, auth } from '../services/firebase';
import { doc, getDoc, onSnapshot, updateDoc, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<void>;
  directLogin: (user: User) => void;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load mock user from localStorage if it exists
  useEffect(() => {
    const savedUser = localStorage.getItem('mock_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user profile from Firestore
        const userRef = doc(db, collections.users, firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUser({ id: firebaseUser.uid, ...userSnap.data() } as User);
        } else {
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
             setUser(prev => {
                 const updatedUser = { ...prev, ...userData, id: docSnap.id } as User;
                 if (localStorage.getItem('mock_user')) {
                    localStorage.setItem('mock_user', JSON.stringify(updatedUser));
                 }
                 return updatedUser;
             });
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
        await signInWithEmailAndPassword(auth, email, pass);
        localStorage.removeItem('mock_user');
    } catch (e: any) {
        console.error("Login failed", e);
        setLoading(false);
        throw e;
    }
  };

  const directLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('mock_user', JSON.stringify(userData));
    setLoading(false);
  };

  const logout = async () => {
    await signOut(auth);
    localStorage.removeItem('mock_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, directLogin, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
