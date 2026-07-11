export type StickyNotePosition = { x: number; y: number };

export function stickyNotePositionFromPointerDelta(
  start: StickyNotePosition,
  pointerStart: StickyNotePosition,
  pointerCurrent: StickyNotePosition,
): StickyNotePosition {
  return {
    x: Math.max(12, start.x + pointerCurrent.x - pointerStart.x),
    y: Math.max(52, start.y + pointerCurrent.y - pointerStart.y),
  };
}
