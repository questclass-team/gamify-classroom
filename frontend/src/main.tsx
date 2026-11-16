import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { router } from './router'
import './styles/global.css'

async function startMockApi() {
  // Dynamic import + DEV guard: production builds drop MSW and the mocks entirely.
  if (!import.meta.env.DEV || import.meta.env.VITE_USE_MOCKS === 'false') return
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })
}

await startMockApi()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
