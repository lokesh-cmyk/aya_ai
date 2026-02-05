import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";

/**
 * Hook to get current user's role and check if they're an admin
 */
export function useUserRole() {
  const { data: session } = useSession();

  const { data: userData } = useQuery({
    queryKey: ["user-role", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const res = await fetch(`/api/users?limit=1`);
      if (!res.ok) return null;
      const data = await res.json();
      // Find current user in the list
      const user = data.users?.find((u: any) => u.id === session.user.id);
      return user;
    },
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const role = userData?.role || null;
  const isAdmin = role === "ADMIN";

  return {
    role,
    isAdmin,
    isLoading: !session?.user?.id || !userData,
  };
}
