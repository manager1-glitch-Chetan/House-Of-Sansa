import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { NotificationProvider } from '@/context/NotificationContext'
import { ConfirmProvider } from '@/components/common/ConfirmDialog'
import AppLayout from '@/components/layout/AppLayout'
import { RequireAuth, RequireModule } from '@/components/layout/ProtectedRoute'
import { MODULES } from '@/lib/constants'

import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import OrdersList from '@/pages/orders/OrdersList'
import OrderReceivedForm from '@/pages/orders/OrderReceivedForm'
import OrderFlowLayout from '@/pages/orders/OrderFlowLayout'
import OrderFlowIndex from '@/pages/orders/OrderFlowIndex'
import OrderStagePage from '@/pages/orders/OrderStagePage'
import StageQueuePage from '@/pages/stages/StageQueuePage'
import MastersPage from '@/pages/masters/MastersPage'
import UsersPage from '@/pages/users/UsersPage'
import RolesPage from '@/pages/users/RolesPage'
import NotificationsPage from '@/pages/notifications/NotificationsPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <ConfirmProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                element={
                  <RequireAuth>
                    <AppLayout />
                  </RequireAuth>
                }
              >
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route
                  path="/dashboard"
                  element={
                    <RequireModule module={MODULES.DASHBOARD}>
                      <Dashboard />
                    </RequireModule>
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <RequireModule module={MODULES.ORDERS}>
                      <OrdersList />
                    </RequireModule>
                  }
                />
                <Route
                  path="/orders/new"
                  element={
                    <RequireModule module={MODULES.ORDERS}>
                      <OrderReceivedForm />
                    </RequireModule>
                  }
                />
                <Route
                  path="/orders/:id"
                  element={
                    <RequireModule module={MODULES.ORDERS}>
                      <OrderFlowLayout />
                    </RequireModule>
                  }
                >
                  <Route index element={<OrderFlowIndex />} />
                  <Route path=":stage" element={<OrderStagePage />} />
                </Route>
                <Route
                  path="/stage/:stageKey"
                  element={
                    <RequireModule module={MODULES.ORDERS}>
                      <StageQueuePage />
                    </RequireModule>
                  }
                />
                <Route
                  path="/masters"
                  element={
                    <RequireModule module={MODULES.MASTERS}>
                      <MastersPage />
                    </RequireModule>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <RequireModule module={MODULES.USERS}>
                      <UsersPage />
                    </RequireModule>
                  }
                />
                <Route
                  path="/users/roles"
                  element={
                    <RequireModule module={MODULES.USERS}>
                      <RolesPage />
                    </RequireModule>
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <RequireModule module={MODULES.NOTIFICATIONS}>
                      <NotificationsPage />
                    </RequireModule>
                  }
                />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Routes>
          </ConfirmProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
