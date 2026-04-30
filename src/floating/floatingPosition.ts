import type { SelectionSnapshot } from '../selection/selectionTypes';

export function getFloatingPosition(selection?: SelectionSnapshot): { top: number; left: number } {
  const margin = 14;
  const rect = selection?.rect;

  if (!rect) {
    return {
      top: window.scrollY + Math.max(24, window.innerHeight * 0.2),
      left: window.scrollX + Math.max(16, window.innerWidth - 420),
    };
  }

  const preferredTop = rect.bottom + margin;
  const preferredLeft = Math.min(
    Math.max(rect.left, window.scrollX + 16),
    window.scrollX + window.innerWidth - 392,
  );

  return {
    top: preferredTop,
    left: preferredLeft,
  };
}
