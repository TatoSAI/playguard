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

const INTERACTABLE_TYPES = ['Button', 'Toggle', 'Slider', 'Dropdown', 'InputField']

/**
 * Find the nearest interactable UI element at a screen position.
 * Identical logic to the private method in TestRecorder (Euclidean distance < 200px).
 */
export function findElementAtPosition(
  elements: UIElement[],
  x: number,
  y: number
): UIElement | null {
  if (elements.length === 0) return null

  let closest: UIElement | null = null
  let closestDist = Infinity

  for (const el of elements) {
    if (!el.active) continue
    if (!INTERACTABLE_TYPES.includes(el.type)) continue

    const dist = Math.sqrt(
      Math.pow(el.position.x - x, 2) + Math.pow(el.position.y - y, 2)
    )
    if (dist < closestDist) {
      closestDist = dist
      closest = el
    }
  }

  return closestDist < 200 ? closest : null
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
