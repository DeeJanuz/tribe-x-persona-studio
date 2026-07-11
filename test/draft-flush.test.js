import { describe, expect, it, vi } from "vitest";

import { createSerializedDraftFlusher } from "../src/draft-flush";

describe("createSerializedDraftFlusher", () => {
  it("serializes callers and persists edits made during an in-flight save", async () => {
    let definition = { name: "first" };
    let revision = 1;
    let releaseFirst;
    const firstPending = new Promise((resolve) => { releaseFirst = resolve; });
    const persist = vi.fn(async ({ definition: submitted }) => {
      if (submitted.name === "first") await firstPending;
      revision += 1;
      return { revision, definition: submitted };
    });
    const flusher = createSerializedDraftFlusher({
      getDefinition: () => definition,
      getRevision: () => revision,
      persist,
      onRevision: (record) => { revision = record.revision; },
    });

    const first = flusher.flush();
    const joined = flusher.flush();
    definition = { name: "second" };
    releaseFirst();

    const [result, joinedResult] = await Promise.all([first, joined]);
    expect(result).toBe(joinedResult);
    expect(result.definition).toBe(definition);
    expect(result.record.definition).toBe(definition);
    expect(persist).toHaveBeenCalledTimes(2);
    expect(persist.mock.calls[1][0].baseRevision).toBe(2);
    expect(flusher.hasInFlight()).toBe(false);
  });

  it("uses force only for the conflict-resolution pass", async () => {
    let definition = { name: "local" };
    let revision = 4;
    const persist = vi.fn(async ({ definition: submitted }) => {
      revision += 1;
      if (revision === 5) definition = { name: "newer local" };
      return { revision, definition: submitted };
    });
    const flusher = createSerializedDraftFlusher({
      getDefinition: () => definition,
      getRevision: () => revision,
      persist,
      onRevision: (record) => { revision = record.revision; },
    });

    await flusher.flush(true);
    expect(persist.mock.calls.map(([input]) => input.force)).toEqual([true, false]);
  });
});
