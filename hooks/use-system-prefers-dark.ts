import * as React from "react"

/**
 * Hydration-safe reader for the OS colour-scheme preference.
 *
 * `matchMedia` only exists in the browser, so reading it during render would make
 * the client markup disagree with the server prerender. `useSyncExternalStore`
 * solves that by rendering the stable server snapshot first and re-rendering with
 * the live browser value once hydration completes.
 *
 * The MediaQueryList is created once per document (it is inherently global) so
 * `getSnapshot` stays cheap and returns a stable boolean.
 */
const DARK_QUERY = "(prefers-color-scheme: dark)"
const SERVER_SNAPSHOT = true

let darkQuery: MediaQueryList | null = null

function getDarkQuery(): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return null
  }
  if (!darkQuery) {
    darkQuery = window.matchMedia(DARK_QUERY)
  }
  return darkQuery
}

const subscribe = (onStoreChange: () => void) => {
  const mql = getDarkQuery()
  if (!mql) return () => {}
  mql.addEventListener("change", onStoreChange)
  return () => mql.removeEventListener("change", onStoreChange)
}

const getSnapshot = () => getDarkQuery()?.matches ?? SERVER_SNAPSHOT

const getServerSnapshot = () => SERVER_SNAPSHOT

export function useSystemPrefersDark(): boolean {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
