import { useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { auth } from './firebase';

export type UserRole = 'pm' | 'sad';

interface AuthUser extends User {
  role?: UserRole;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  role: UserRole | null;
}

export const useAuth = (): AuthState => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const tokenResult = await user.getIdTokenResult();

          // role padrão vindo das custom claims (ou 'pm' se ausente)
          let userRole = (tokenResult.claims.role as UserRole) || 'pm';

          // ✅ Override local: este e-mail SEMPRE terá role 'sad'
          if (user.email?.toLowerCase() === 'macmarypm@gmail.com') {
            userRole = 'sad';
          }

          const authUser: AuthUser = { ...user, role: userRole };
          setUser(authUser);
          setRole(userRole);
        } catch (error) {
          console.error('Error getting user token:', error);
          // fallback mantendo usuário logado, com role 'pm'
          setUser(user as AuthUser);
          setRole('pm');
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading, role };
};

export const login = async (email: string, password: string, rememberMe: boolean = false) => {
  if (rememberMe) {
    await setPersistence(auth, browserLocalPersistence);
  }
  return signInWithEmailAndPassword(auth, email, password);
};

export const logout = () => signOut(auth);
