'use client'

import { useRouter } from 'next/navigation'
import { 
  BellIcon, 
  ShieldCheckIcon, 
  EnvelopeIcon, 
  GlobeAltIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

const settingsItems = [
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Configure notification preferences',
    icon: BellIcon,
    href: '/dashboard/settings/notifications',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  },
  {
    id: 'security',
    title: 'Security',
    description: 'Manage security settings',
    icon: ShieldCheckIcon,
    href: '/dashboard/settings/security',
    color: 'text-red-600',
    bgColor: 'bg-red-50'
  },
  {
    id: 'email',
    title: 'Email',
    description: 'Configure email settings',
    icon: EnvelopeIcon,
    href: '/dashboard/settings/email',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    id: 'domains',
    title: 'Domains',
    description: 'Manage allowed domains',
    icon: GlobeAltIcon,
    href: '/dashboard/settings/domains',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50'
  }
]

export default function SettingsPage() {
  const router = useRouter()

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Configure system settings</p>
      </div>

      <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
        {settingsItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              className="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors group"
            >
              <div className={`${item.bgColor} p-3 rounded-lg`}>
                <Icon className={`h-6 w-6 ${item.color}`} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
              <ChevronRightIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
            </button>
          )
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          💡 <strong>Tip:</strong> Only Super Admins can access and modify these settings.
        </p>
      </div>
    </div>
  )
}
