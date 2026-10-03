import { createContext, useContext, type ReactNode } from 'react'
import { api } from '../lib/store'
import type { Profile } from '../lib/types'
import { useQuery } from './useQuery'

type ProfileState = {
  profile: Profile | null
  loading: boolean
  /** Resolves once the new profile is in state: await it before navigating. */
  refresh: () => Promise<void>
}

const ProfileContext = createContext<ProfileState>({ profile: null, loading: true, refresh: async () => {} })

export function ProfileProvider({ children }: { children: ReactNode }) {
  const q = useQuery(api.getProfile, [])
  return (
    <ProfileContext.Provider value={{ profile: q.data ?? null, loading: q.loading, refresh: q.reload }}>
      {children}
    </ProfileContext.Provider>
  )
}

export const useProfile = () => useContext(ProfileContext)

/** For screens behind RequireProfile, where a profile is guaranteed. */
export function useOwnProfile(): Profile {
  const { profile } = useContext(ProfileContext)
  if (!profile) throw new Error('useOwnProfile outside RequireProfile')
  return profile
}
