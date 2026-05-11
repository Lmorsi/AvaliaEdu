import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'

interface User {
  name: string
  email?: string
  id?: string
  role?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
  login: (userData: User) => void
  logout: () => void
  updateUserName: (name: string) => void
  isAuthenticated: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUserProfile = async (userId: string, authUser: any) => {
    try {
      console.log('[AuthContext] Fetching user profile for userId:', userId, 'email:', authUser.email)

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('role, name')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('[AuthContext] Error fetching user profile:', error)
      }

      console.log('[AuthContext] Profile fetched:', profile)

      if (profile) {
        const userData = {
          id: userId,
          email: authUser.email,
          name: profile.name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuário',
          role: profile.role || 'user'
        }
        console.log('[AuthContext] Returning user data with role:', userData.role)
        return userData
      } else {
        console.log('[AuthContext] No profile found, returning default user role')
        return {
          id: userId,
          email: authUser.email,
          name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuário',
          role: 'user'
        }
      }
    } catch (error) {
      console.error('[AuthContext] Exception fetching user profile:', error)
      return {
        id: userId,
        email: authUser.email,
        name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuário',
        role: 'user'
      }
    }
  }

  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (mounted) {
          if (session?.user) {
            const userData = await fetchUserProfile(session.user.id, session.user)
            setUser(userData)
          }
          setLoading(false)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        try {
          if (session?.user) {
            const userData = await fetchUserProfile(session.user.id, session.user)
            if (mounted) {
              setUser(userData)
            }
          } else {
            if (mounted) {
              setUser(null)
            }
          }
        } catch (error) {
          console.error('Error in auth state change:', error)
        }
      })()
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
    if (data.user) {
      const userData = await fetchUserProfile(data.user.id, data.user)
      setUser(userData)
    }
  }

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name
        }
      }
    })
    if (error) throw error
    if (data.user) {
      await supabase.from('user_profiles').insert({
        id: data.user.id,
        email: data.user.email || email,
        name: name,
        role: 'user'
      })

      const userData = await fetchUserProfile(data.user.id, data.user)
      setUser(userData)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const login = (userData: User) => {
    setUser(userData)
  }

  const logout = () => {
    signOut()
  }

  const updateUserName = (name: string) => {
    setUser(prev => prev ? { ...prev, name } : null)
  }

  const isAuthenticated = user !== null
  const isAdmin = user?.role === 'admin'

  console.log('[AuthContext] Current user:', user)
  console.log('[AuthContext] isAdmin:', isAdmin, 'user role:', user?.role)

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    login,
    logout,
    updateUserName,
    isAuthenticated,
    isAdmin
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}