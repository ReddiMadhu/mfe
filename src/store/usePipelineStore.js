import { create } from 'zustand';

export const usePipelineStore = create((set) => ({
  // Upload
  uploadId: null,
  targetFormat: 'AIR',
  uploadMeta: null,     // { row_count, headers, sample }
  rawPreview: [],       // first 10 rows for DataPreview table

  // Step statuses
  stepStatus: {
    preview: 'idle',        // 'idle' | 'running' | 'done' | 'error'
    normalize: 'idle',
    geocode: 'idle',
    mapping: 'idle',
    mapCodes: 'idle',
    normalizeValues: 'idle',
  },

  // Live agent states (from SSE)
  agentStates: {},      // { agentId: { status, thinkingLog: [] } }

  // Results
  normalizeResult: null,
  geocodeResult: null,
  columnMap: {},
  catResult: null,
  summaryData: null,

  // --- Actions ---
  setUploadId: (id) => set({ uploadId: id }),
  setTargetFormat: (fmt) => set({ targetFormat: fmt }),

  setUploadMeta: (meta) => set({
    uploadMeta: meta,
    rawPreview: meta?.sample ?? [],
  }),

  setStepStatus: (step, status) => set((s) => ({
    stepStatus: { ...s.stepStatus, [step]: status },
  })),

  setAgentState: (agentId, state) => set((s) => ({
    agentStates: {
      ...s.agentStates,
      [agentId]: { ...s.agentStates[agentId], ...state },
    },
  })),

  appendAgentLog: (agentId, message) => set((s) => {
    const existing = s.agentStates[agentId] ?? { status: 'running', thinkingLog: [] };
    return {
      agentStates: {
        ...s.agentStates,
        [agentId]: {
          ...existing,
          thinkingLog: [...(existing.thinkingLog ?? []), { message, timestamp: Date.now() }],
        },
      },
    };
  }),

  setNormalizeResult: (r) => set({ normalizeResult: r }),
  setGeocodeResult: (r) => set({ geocodeResult: r }),
  setColumnMap: (m) => set({ columnMap: m }),
  setCatResult: (r) => set({ catResult: r }),
  setSummaryData: (d) => set({ summaryData: d }),

  reset: () => set({
    uploadId: null,
    uploadMeta: null,
    rawPreview: [],
    stepStatus: { normalize: 'idle', geocode: 'idle', mapping: 'idle', mapCodes: 'idle', normalizeValues: 'idle' },
    agentStates: {},
    normalizeResult: null,
    geocodeResult: null,
    columnMap: {},
    catResult: null,
    summaryData: null,
  }),
}));
