"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/layout/DashboardLayout"

interface User {
  id: string
  name: string
  email: string
  role: string
}

export default function DashboardWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/session", {
        credentials: "include",
      })

      if (!res.ok) {
        router.push("/auth/login")
        return
      }

      const data = await res.json()
      setUser(data.user)
    } catch {
      router.push("/auth/login")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <DashboardLayout userRole={user.role} userName={user.name}>
      {children}
    </DashboardLayout>
  )
}
