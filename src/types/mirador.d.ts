declare module 'mirador' {
  type MiradorViewer = {
    unmount: () => void
  }

  type MiradorApi = {
    viewer: (config: Record<string, unknown>) => MiradorViewer
  }

  type OSDViewer = {
    viewport: {
      fitBoundsWithConstraints: (rect: unknown, immediately?: boolean) => void
      goHome: (immediately?: boolean) => void
    }
    world: {
      getItemAt: (index: number) => {
        imageToViewportRectangle: (x: number, y: number, width: number, height: number) => unknown
      }
    }
  }

  export const OSDReferences: {
    get: (windowId: string) => {current?: OSDViewer} | undefined
  }

  const Mirador: MiradorApi
  export default Mirador
}
