import { describe, expect, it } from "vitest";

import { removeGraphNodes, requirePreflightSuiteVersionId } from "../src/graph-editing";

describe("removeGraphNodes", () => {
  it("removes a selection and all incident edges atomically while protecting terminals", () => {
    const result = removeGraphNodes(
      [
        { id: "start", type: "start" },
        { id: "one", type: "persona_exchange" },
        { id: "two", type: "assertion" },
        { id: "end", type: "end" },
      ],
      [
        { id: "a", source: "start", target: "one" },
        { id: "b", source: "one", target: "two" },
        { id: "c", source: "two", target: "end" },
      ],
      ["start", "one", "two", "end"],
    );

    expect(result.nodes.map((node) => node.id)).toEqual(["start", "end"]);
    expect(result.edges).toEqual([]);
    expect(result.removedIds).toEqual(["one", "two"]);
  });
});

describe("requirePreflightSuiteVersionId", () => {
  it("rejects launch review when exact version creation failed", () => {
    expect(() => requirePreflightSuiteVersionId(null, null)).toThrow(
      "Save an exact immutable suite version before reviewing launch.",
    );
  });

  it("returns an existing or newly saved exact version", () => {
    expect(requirePreflightSuiteVersionId("version-1", null)).toBe("version-1");
    expect(requirePreflightSuiteVersionId(null, { id: "version-2" })).toBe("version-2");
  });
});
