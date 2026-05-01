import type { SelectionSnapshot } from '../selection/selectionTypes';

export function getFloatingPosition(selection?: SelectionSnapshot): { top: number; left: number } {
  const margin = 14;
  const cardWidth = 360;
  const viewportGutter = 16;
  const rect = selection?.rect;

  if (!rect) {
    return {
      top: window.scrollY + Math.max(24, window.innerHeight * 0.2),
      left: window.scrollX + Math.max(viewportGutter, window.innerWidth - cardWidth - viewportGutter),
    };
  }

  const preferredTop = rect.bottom + margin;
  const preferredLeft = Math.min(
    Math.max(rect.left, window.scrollX + viewportGutter),
    window.scrollX + window.innerWidth - cardWidth - viewportGutter,
  );

  return {
    top: preferredTop,
    left: preferredLeft,
  };
}
