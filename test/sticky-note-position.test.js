import { describe, expect, it } from "vitest";

import { stickyNotePositionFromPointerDelta } from "../src/sticky-note-position";

describe("stickyNotePositionFromPointerDelta", () => {
  it("moves by the exact pointer delta regardless of canvas page offset", () => {
    expect(stickyNotePositionFromPointerDelta(
      { x: 120, y: 100 },
      { x: 760, y: 410 },
      { x: 825, y: 452 },
    )).toEqual({ x: 185, y: 142 });
  });

  it("keeps notes inside the usable canvas bounds", () => {
    expect(stickyNotePositionFromPointerDelta(
      { x: 120, y: 100 },
      { x: 760, y: 410 },
      { x: 100, y: 100 },
    )).toEqual({ x: 12, y: 52 });
  });
});
