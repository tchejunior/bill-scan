import { useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi, type User } from '@/api/auth'

export function useAuth() {
  const queryClient = useQueryClient()
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ['auth/me'],
    queryFn: () => authApi.me().catch(() => null),
    staleTime: Infinity,
    retry: false,
  })

  async function logout() {
    await authApi.logout().catch(() => {})
    queryClient.clear()
    window.location.href = '/login'
  }

  return { user: user ?? null, isLoading, logout }
}
