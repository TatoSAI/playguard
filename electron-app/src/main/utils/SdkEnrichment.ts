/**
 * SDK Enrichment Utilities
 * Shared element-lookup and game-state capture logic used by
 * both TestRecorder and AdHocMonitor.
 */

import { UIElement } from '../unity/UnityBridge'

export type { UIElement }

/** Minimal bridge interface satisfied structurally by both UnityBridge and HTML5Bridge */
export interface ISdkBridge {
  isSDKConnected(): boolean
  getUIElements(): Promise<UIElement[]>
  listCustomProperties(): Promise<string[]>
  getCustomProperty(name: string): Promise<string | null>
}

// Match radius — calibrated at 75px based on observed tap data:
// intentional taps land 26-64px from SDK element centers (coordinate offset between
// CSS viewport pixels and game canvas coordinates). Incorrect taps land 90+px away.
const MATCH_THRESHOLD_PX = 75

/** Returns true if point (x,y) falls inside the element's bounding box */
function hitTestBounds(el: UIElement, x: number, y: number): boolean {
  if (!el.size) return false
  const hw = el.size.width / 2
  const hh = el.size.height / 2
  return (
    x >= el.position.x - hw && x <= el.position.x + hw &&
    y >= el.position.y - hh && y <= el.position.y + hh
  )
}

/**
 * Find the best-matching interactable UI element at a screen position.
 *
 * Strategy (in priority order):
 *  1. Exact bounding-box hit (if element.size is provided by the SDK)
 *  2. Nearest active element within MATCH_THRESHOLD_PX (40px) of the tap
 *
 * Returns null if no element is close enough — no false positives.
 */
export function findElementAtPosition(
  elements: UIElement[],
  x: number,
  y: number
): UIElement | null {
  if (elements.length === 0) return null

  // Pass 1: exact bounding-box hit — use if SDK provides size
  for (const el of elements) {
    if (!el.active) continue
    if (hitTestBounds(el, x, y)) return el
  }

  // Pass 2: nearest active element within tight threshold
  let closest: UIElement | null = null
  let closestDist = Infinity

  for (const el of elements) {
    if (!el.active) continue
    const dist = Math.sqrt(
      Math.pow(el.position.x - x, 2) + Math.pow(el.position.y - y, 2)
    )
    if (dist < closestDist) {
      closestDist = dist
      closest = el
    }
  }

  return closestDist < MATCH_THRESHOLD_PX ? closest : null
}

/** Distance from tap point to element center (useful for confidence display) */
export function elementDistance(el: UIElement, x: number, y: number): number {
  return Math.round(Math.sqrt(
    Math.pow(el.position.x - x, 2) + Math.pow(el.position.y - y, 2)
  ))
}

/**
 * Returns diagnostic info for a tap: how many elements exist and the
 * closest distance. Useful for debugging coordinate mismatches.
 */
export function diagnosticElementSearch(
  elements: UIElement[],
  x: number,
  y: number
): { count: number; closestName: string | null; closestDist: number } {
  if (elements.length === 0) return { count: 0, closestName: null, closestDist: Infinity }

  let closest: UIElement | null = null
  let closestDist = Infinity

  for (const el of elements) {
    if (!el.active) continue
    const dist = Math.sqrt(
      Math.pow(el.position.x - x, 2) + Math.pow(el.position.y - y, 2)
    )
    if (dist < closestDist) {
      closestDist = dist
      closest = el
    }
  }

  return {
    count: elements.filter(e => e.active).length,
    closestName: closest?.name ?? null,
    closestDist: Math.round(closestDist)
  }
}

/**
 * Snapshot all registered custom properties from the game SDK.
 * Returns up to maxProps values in parallel. Never throws.
 */
export async function captureGameState(
  bridge: ISdkBridge,
  maxProps = 10
): Promise<Record<string, string | null>> {
  try {
    const names = await bridge.listCustomProperties()
    if (names.length === 0) return {}

    const limited = names.slice(0, maxProps)
    const results = await Promise.allSettled(
      limited.map((name) => bridge.getCustomProperty(name))
    )

    const state: Record<string, string | null> = {}
    for (let i = 0; i < limited.length; i++) {
      const r = results[i]
      state[limited[i]] = r.status === 'fulfilled' ? r.value : null
    }
    return state
  } catch {
    return {}
  }
}
