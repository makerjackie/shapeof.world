type ExperienceInputEvent = KeyboardEvent | WheelEvent | TouchEvent | PointerEvent

const CONTROL_SELECTOR = [
  'a[href]', 'button', 'input', 'select', 'textarea', 'summary',
  '[contenteditable]:not([contenteditable="false"])',
  '[role="button"]', '[role="link"]', '[role="textbox"]', '[role="slider"]',
  '[role="spinbutton"]', '[role="combobox"]', '[role="listbox"]',
  '[role="tab"]', '[role="menu"]', '[role="dialog"]', '[aria-modal="true"]',
].join(',')

function hasIndependentScroll(element: Element) {
  const style = element.ownerDocument.defaultView!.getComputedStyle(element)
  return (
    /^(auto|scroll|overlay)$/.test(style.overflowY)
    && element.scrollHeight > element.clientHeight
  ) || (
    /^(auto|scroll|overlay)$/.test(style.overflowX)
    && element.scrollWidth > element.clientWidth
  )
}

export function ownsExperienceStageInput(
  stage: Element | null,
  event: ExperienceInputEvent,
  guide?: HTMLElement | null,
): boolean {
  if (!stage || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return false
  if ('isComposing' in event && (event.isComposing || event.repeat)) return false
  if (stage.closest('[inert], [data-panel-open="true"]')) return false
  if (guide) {
    const worldId = stage.closest('[data-world-id]')?.getAttribute('data-world-id')
    if (worldId && worldId !== guide.dataset.guideWorld) return false
  }

  const document = stage.ownerDocument
  let target = event.composedPath().find((node): node is Element => node instanceof Element)
  // Unfocused keyboard input targets the document body. Only one mounted stage
  // can own it; pointer input always needs a concrete target inside the stage.
  if (event.type === 'keydown' && (!target || target === document.body || target === document.documentElement)) {
    const focused = document.activeElement
    if (focused && focused !== document.body && focused !== document.documentElement) target = focused
    else if (document.querySelectorAll('.experience-stage').length === 1) target = stage
  }
  if (!target || !stage.contains(target) || target.closest('[inert]')) return false

  if (event.type.startsWith('touch')) {
    const navigation = target.closest('.guide-stage-nav')
    return Boolean(guide && navigation && guide.contains(navigation))
  }
  if (target.closest(CONTROL_SELECTOR)) return false
  const overlay = target.closest('[data-experience-overlay]')
  if (overlay && !guide?.contains(overlay)) return false
  for (let ancestor: Element | null = target; ancestor && ancestor !== stage; ancestor = ancestor.parentElement) {
    if (hasIndependentScroll(ancestor)) return false
  }
  return true
}
