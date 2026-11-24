import { lazy, Suspense } from 'react'
import { Outlet, useLocation } from 'react-router'

/* Smooth scroll is an enhancement: GSAP and Lenis load in their own chunk, after the page. */
const SmoothScroll = lazy(async () => ({
  default: (await import('../lib/SmoothScroll')).SmoothScroll,
}))

/**
 * Every route: smooth scroll (Lenis), fresh at the top on every page. The tabs of one group
 * (`/teacher/groups/<id>/…`, `/student/groups/<id>/…`) share an instance, so switching tabs keeps
 * the scroll position. The instance is a sibling of the page, so a new one never remounts the
 * shell or the page.
 */
export function RootLayout() {
  const { pathname } = useLocation()
  const scrollKey = pathname.replace(/^(\/(?:teacher|student)\/groups\/[^/]+).*$/, '$1')
  return (
    <>
      <Suspense fallback={null}>
        <SmoothScroll key={scrollKey} />
      </Suspense>
      <Outlet />
    </>
  )
}
