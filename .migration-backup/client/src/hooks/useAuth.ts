import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 30 * 1000, // Consider auth data fresh for 30 seconds (reduced to pick up admin changes faster)
    gcTime: 60 * 1000, // Keep in cache for 1 minute
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
