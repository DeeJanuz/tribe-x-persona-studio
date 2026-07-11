export type DraftRevisionRecord = {
  revision: number;
};

type DraftFlusherOptions<Definition, Record extends DraftRevisionRecord> = {
  getDefinition: () => Definition;
  getRevision: () => number | null;
  persist: (input: {
    baseRevision: number;
    definition: Definition;
    force: boolean;
  }) => Promise<Record>;
  onRevision: (record: Record) => void;
  maxPasses?: number;
};

export type DraftFlushResult<Definition, Record extends DraftRevisionRecord> = {
  definition: Definition;
  record: Record;
};

export function createSerializedDraftFlusher<Definition, Record extends DraftRevisionRecord>(
  options: DraftFlusherOptions<Definition, Record>,
) {
  let inFlight: Promise<DraftFlushResult<Definition, Record>> | null = null;

  const flush = (force = false): Promise<DraftFlushResult<Definition, Record>> => {
    if (inFlight) return inFlight;

    const run = async () => {
      let forcePass = force;
      const maxPasses = options.maxPasses ?? 20;

      for (let pass = 0; pass < maxPasses; pass += 1) {
        const definition = options.getDefinition();
        const baseRevision = options.getRevision();
        if (baseRevision == null) throw new Error("Draft revision is unavailable.");

        const record = await options.persist({ baseRevision, definition, force: forcePass });
        options.onRevision(record);

        if (options.getDefinition() === definition) return { definition, record };
        forcePass = false;
      }

      throw new Error("Draft kept changing while saving. Pause editing and retry.");
    };

    const task = run();
    inFlight = task.finally(() => {
      inFlight = null;
    });
    return inFlight;
  };

  return {
    flush,
    hasInFlight: () => inFlight !== null,
  };
}
