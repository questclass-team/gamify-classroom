import { createBrowserRouter, Navigate } from 'react-router'
import { RequireRole, RootRedirect } from './auth/guards'
import { AppShell } from './layout/AppShell'
import { RootLayout } from './layout/RootLayout'
import { ImportAccountsPage } from './pages/admin/ImportAccountsPage'
import { MyGroupsPage } from './pages/student/MyGroupsPage'
import { MyStatePage } from './pages/student/MyStatePage'
import { RankingPage } from './pages/student/RankingPage'
import { StudentGroupRoute } from './pages/student/StudentGroupLayout'
import { GroupAwardsPage } from './pages/teacher/awards/GroupAwardsPage'
import { GroupConfigPage } from './pages/teacher/GroupConfigPage'
import { GroupLayoutRoute } from './pages/teacher/GroupLayout'
import { GroupsPage } from './pages/teacher/GroupsPage'
import { GroupStudentsPage } from './pages/teacher/GroupStudentsPage'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <RootRedirect /> },
      {
        // The landing (three.js, shaders, GSAP) stays out of the main chunk.
        path: '/login',
        lazy: async () => ({ Component: (await import('./pages/LoginPage')).LoginPage }),
      },
      {
        element: <RequireRole role="admin" />,
        children: [
          {
            element: <AppShell />,
            children: [{ path: '/admin', element: <ImportAccountsPage /> }],
          },
        ],
      },
      {
        element: <RequireRole role="teacher" />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: '/teacher', element: <GroupsPage /> },
              {
                path: '/teacher/groups/:groupId',
                element: <GroupLayoutRoute />,
                children: [
                  { index: true, element: <GroupStudentsPage /> },
                  { path: 'config', element: <GroupConfigPage /> },
                  { path: 'awards', element: <GroupAwardsPage /> },
                ],
              },
            ],
          },
        ],
      },
      {
        element: <RequireRole role="student" />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: '/student', element: <MyGroupsPage /> },
              {
                path: '/student/groups/:groupId',
                element: <StudentGroupRoute />,
                children: [
                  { index: true, element: <MyStatePage /> },
                  { path: 'ranking', element: <RankingPage /> },
                ],
              },
            ],
          },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
