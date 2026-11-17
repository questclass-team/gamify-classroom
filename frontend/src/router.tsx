import { createBrowserRouter, Navigate } from 'react-router'
import { RequireRole, RootRedirect } from './auth/guards'
import { AppLayout } from './layout/AppLayout'
import { ImportAccountsPage } from './pages/admin/ImportAccountsPage'
import { LoginPage } from './pages/LoginPage'
import { StudentHomePage } from './pages/student/StudentHomePage'
import { GroupConfigPage } from './pages/teacher/GroupConfigPage'
import { GroupLayoutRoute } from './pages/teacher/GroupLayout'
import { GroupsPage } from './pages/teacher/GroupsPage'
import { GroupStudentsPage } from './pages/teacher/GroupStudentsPage'

export const router = createBrowserRouter([
  { path: '/', element: <RootRedirect /> },
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireRole role="admin" />,
    children: [
      { element: <AppLayout />, children: [{ path: '/admin', element: <ImportAccountsPage /> }] },
    ],
  },
  {
    element: <RequireRole role="teacher" />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/teacher', element: <GroupsPage /> },
          {
            path: '/teacher/groups/:groupId',
            element: <GroupLayoutRoute />,
            children: [
              { index: true, element: <GroupStudentsPage /> },
              { path: 'config', element: <GroupConfigPage /> },
            ],
          },
        ],
      },
    ],
  },
  {
    element: <RequireRole role="student" />,
    children: [
      { element: <AppLayout />, children: [{ path: '/student', element: <StudentHomePage /> }] },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
