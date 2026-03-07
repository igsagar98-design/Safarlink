import { useEffect, useState } from 'react';
import {
  getMyProfile,
  getSession,
  onAuthStateChange,
  signOut,
  type AccountType,
  type Profile,
  type Session,
  type User,
} from '@/lib/api';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [loading, setLoading] = useState(true);

  const inferAccountTypeFromUser = (nextUser: User | null): AccountType | null => {
    if (!nextUser) return null;
    const metaType = nextUser.user_metadata?.role || nextUser.user_metadata?.account_type;
    return metaType === 'company' ? 'company' : 'transporter';
  };

  useEffect(() => {
    const syncProfile = async (nextUser: User | null) => {
      if (!nextUser) {
        setProfile(null);
        setAccountType(null);
        return;
      }

      const inferredFromMeta = inferAccountTypeFromUser(nextUser);

      try {
        const nextProfile = await getMyProfile();
        setProfile(nextProfile);
        setAccountType((nextProfile?.role as AccountType | null) ?? (nextProfile?.account_type as AccountType | null) ?? inferredFromMeta);
      } catch {
        setProfile(null);
        setAccountType(inferredFromMeta);
      }
    };

    const subscription = onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      const nextUser = nextSession?.user ?? null;
      setUser(nextUser);
      syncProfile(nextUser).finally(() => {
        setLoading(false);
      });
    });

    getSession()
      .then(async (nextSession) => {
        setSession(nextSession);
        const nextUser = nextSession?.user ?? null;
        setUser(nextUser);
        await syncProfile(nextUser);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  return { user, session, profile, accountType, loading, signOut: handleSignOut };
}
