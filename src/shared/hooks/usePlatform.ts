/**
 * usePlatform — React hook for platform detection.
 *
 * Usage:
 *   const { name, isNative, isElectron, isMobile } = usePlatform()
 */

import { useMemo } from 'react'
import { platform, type PlatformName } from '@/platform'

interface UsePlatformResult {
  name: PlatformName
  isNative: boolean
  isElectron: boolean
  isMobile: boolean
  isWeb: boolean
  /** True when running on iOS or Android (Capacitor) */
  isCapacitor: boolean
}

export function usePlatform(): UsePlatformResult {
  // platform.name re-evaluates on every call, but the result is stable
  // after app startup, so memoize to prevent re-renders
  return useMemo(() => ({
    name: platform.name,
    isNative: platform.isNative,
    isElectron: platform.isElectron,
    isMobile: platform.isMobile,
    isWeb: platform.isWeb,
    isCapacitor: platform.isMobile,
  }), [])
}
