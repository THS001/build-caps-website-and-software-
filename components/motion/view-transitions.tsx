"use client"

import { createContext, useCallback, useContext, useEffect, useRef, type ComponentProps, type MouseEvent } from "react"
import { usePathname as useFullPathname } from "next/navigation"
import { Link, usePathname, useRouter } from "@/i18n/navigation"

type Run = (navigate: () => void) => void

const ViewTransitionContext = createContext<Run>((navigate) => navigate())

// Never hold the old page frozen longer than this, even if the next route is slow.
const MAX_WAIT_MS = 1200

/**
 * Route transitions with the browser's View Transitions API: a soft fade and blur
 * between pages, plus shared-element morphs for anything given a matching
 * `view-transition-name` (a card image becoming the detail-page hero).
 * Browsers without the API, and reduced-motion visitors, navigate instantly.
 */
export function ViewTransitions({ children }: { children: React.ReactNode }) {
  const pathname = useFullPathname()
  const finish = useRef<(() => void) | null>(null)

  // The new route has committed: let the browser animate to it.
  useEffect(() => {
    finish.current?.()
    finish.current = null
  }, [pathname])

  const run = useCallback<Run>((navigate) => {
    const supported = typeof document !== "undefined" && "startViewTransition" in document
    if (!supported || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return navigate()

    document.startViewTransition(
      () =>
        new Promise<void>((resolve) => {
          finish.current = resolve
          navigate()
          setTimeout(resolve, MAX_WAIT_MS)
        }),
    )
  }, [])

  return <ViewTransitionContext.Provider value={run}>{children}</ViewTransitionContext.Provider>
}

/** Programmatic navigation with the same transition, e.g. after a form step. */
export function useTransitionRouter() {
  const router = useRouter()
  const run = useContext(ViewTransitionContext)
  return {
    push: (href: string) => run(() => router.push(href)),
    replace: (href: string) => run(() => router.replace(href)),
  }
}

/** Drop-in for the locale-aware Link that animates the route change. */
export function TransitionLink({ href, onClick, ...props }: ComponentProps<typeof Link>) {
  const router = useRouter()
  const pathname = usePathname()
  const run = useContext(ViewTransitionContext)

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0
    if (event.defaultPrevented || modified || props.target === "_blank" || props.locale || typeof href !== "string") return
    // Same page (or just a hash): let the browser handle it, there is no new route to wait for.
    const path = href.split(/[?#]/)[0]
    if (!path || path === pathname) return

    event.preventDefault()
    run(() => router.push(href))
  }

  return <Link href={href} onClick={handleClick} {...props} />
}
