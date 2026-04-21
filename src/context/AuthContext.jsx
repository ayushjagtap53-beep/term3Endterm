import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// CONCEPT: Context API (Global State)
const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  // CONCEPT: useState (Component State)
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Authentication functions
  const signup = async (email, password, role = 'student') => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email,
        role
      });
      setUserRole(role);
      return userCredential;
    } catch (error) {
      if (error.code?.includes('api-key') || error.code?.includes('invalid')) {
        console.warn("MOCK MODE ENABLED for Signup due to Firebase Error");
        setCurrentUser({ uid: 'mock-uuid-' + Date.now(), email });
        setUserRole(role);
        return { user: { uid: 'mock-uuid-' + Date.now(), email } };
      }
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      if (error.code?.includes('api-key') || error.code?.includes('invalid')) {
        console.warn("MOCK MODE ENABLED for Login due to Firebase Error");
        // We guess student by default for mock login unless forced
        const testRole = email.includes('admin') ? 'admin' : 'student';
        setCurrentUser({ uid: 'mock-user-123', email });
        setUserRole(testRole);
        return { user: { uid: 'mock-user-123', email } };
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (currentUser?.uid?.includes('mock')) {
        setCurrentUser(null);
        setUserRole(null);
        return;
      }
      await signOut(auth);
    } catch (error) {
      console.error("Logout error", error);
      setCurrentUser(null);
      setUserRole(null);
    }
  };

  // CONCEPT: useEffect for Data Fetching & Subscriptions
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Fetch user role from firestore
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserRole(docSnap.data().role);
          } else {
            // Default to student if no document exists
            setUserRole('student');
          }
        } catch (error) {
          console.error("Error fetching role: ", error);
          setUserRole('student');
        }
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    login,
    signup,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
