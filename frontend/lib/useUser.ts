
"use client"
import { UserInfo } from '@/@types/user';
import { getUser } from '@/actions/auth';

import { useState, useEffect } from 'react';
import { usePathname } from "next/navigation";



interface UseUserReturn {
  user: UserInfo | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export const useUser = (): UseUserReturn => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
   console.log("Navbar - User:", user);
  console.log("Navbar - Loading:", loading);
  const pathName = usePathname()
  const fetchUser = async () => {
    try {
      setLoading(true);
      setError(null);
      const userData = await getUser();
      setUser(userData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch user'));
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [pathName]);

  return { user, loading, error, refetch: fetchUser };
};