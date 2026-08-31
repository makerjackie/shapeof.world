import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import {
  emptyExperienceCapabilities,
  mergeExperienceCapabilities,
  type ExperienceCapabilities,
  type ExperienceCapabilityPatch,
} from '~/lib/experience-capabilities'

type ExperienceCapabilitiesContextValue = {
  capabilities: ExperienceCapabilities
  registerCapabilities: (id: string, patch: ExperienceCapabilityPatch) => () => void
}

const ExperienceCapabilitiesContext = createContext<ExperienceCapabilitiesContextValue | null>(null)

export function ExperienceCapabilitiesProvider({ children }: { children: ReactNode }) {
  const patchesRef = useRef(new Map<string, ExperienceCapabilityPatch>())
  const [capabilities, setCapabilities] = useState(emptyExperienceCapabilities)

  const registerCapabilities = useCallback((id: string, patch: ExperienceCapabilityPatch) => {
    patchesRef.current.set(id, patch)
    setCapabilities(mergeExperienceCapabilities([...patchesRef.current.values()]))
    return () => {
      patchesRef.current.delete(id)
      setCapabilities(mergeExperienceCapabilities([...patchesRef.current.values()]))
    }
  }, [])

  const value = useMemo(
    () => ({ capabilities, registerCapabilities }),
    [capabilities, registerCapabilities],
  )

  return (
    <ExperienceCapabilitiesContext.Provider value={value}>
      {children}
    </ExperienceCapabilitiesContext.Provider>
  )
}

export function useExperienceCapabilities(): ExperienceCapabilities {
  return useContext(ExperienceCapabilitiesContext)?.capabilities ?? emptyExperienceCapabilities
}

export function useRegisterExperienceCapabilities(id: string, patch: ExperienceCapabilityPatch) {
  const register = useContext(ExperienceCapabilitiesContext)?.registerCapabilities
  const patchKey = JSON.stringify(patch)

  useLayoutEffect(() => {
    if (!register) return
    return register(id, JSON.parse(patchKey) as ExperienceCapabilityPatch)
  }, [id, patchKey, register])
}
