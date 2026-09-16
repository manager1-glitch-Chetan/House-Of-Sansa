import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Notifications, dbEvents } from '@/lib/db'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const [items, setItems] = useState([])

  const refresh = useCallback(() => {
    Notifications.list().then(setItems)
  }, [])

  useEffect(() => {
    refresh()
    const handler = () => refresh()
    dbEvents.addEventListener('change', handler)
    return () => dbEvents.removeEventListener('change', handler)
  }, [refresh])

  const unreadCount = items.filter((n) => !n.read).length

  const markRead = async (id) => {
    await Notifications.markRead(id)
    refresh()
  }
  const markAllRead = async () => {
    await Notifications.markAllRead()
    refresh()
  }

  return (
    <NotificationContext.Provider value={{ items, unreadCount, markRead, markAllRead, refresh }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
