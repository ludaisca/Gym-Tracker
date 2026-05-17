import { useAuthStore } from '../store'

export function useProAccess() {
  const user = useAuthStore(s => s.user)
  const now = new Date()
  const isPro = !!user && (
    (user.plan === 'pro' && (!user.planExpiresAt || new Date(user.planExpiresAt) > now)) ||
    (!!user.trialEndsAt && new Date(user.trialEndsAt) > now)
  )
  return {
    isPro,
    plan: user?.plan ?? 'free',
    planExpiresAt: user?.planExpiresAt,
    trialEndsAt: user?.trialEndsAt,
  }
}
