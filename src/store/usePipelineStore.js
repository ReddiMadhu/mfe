import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const usePipelineStore = create(persist((set) => ({
  // Upload
  uploadId: null,
  targetFormat: 'AIR',
  uploadMeta: null,     // { row_count, headers, sample }
  rawPreview: [],       // first N rows for DataPreview table
  agentType: null,      // 'catai' | 'underwriting' | null

  // Navigation: decoupled execution cursor vs display cursor
  executionStep: 1,     // how far the pipeline inherently has progressed
  activeViewStep: 1,    // which step's output is currently displayed

  // Step statuses
  stepStatus: {
    upload: 'idle',         // 'idle' | 'running' | 'done' | 'error'
    preview: 'idle',
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
  setAgentType: (type) => set({ agentType: type }),

  // Setting the active view step (user clicks a completed node)
  setExecutionStep: (step) => set({ executionStep: step }),
  setActiveViewStep: (step) => set({ activeViewStep: step }),

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
    agentType: null,
    activeViewStep: 1,
    executionStep: 1,
    stepStatus: { upload: 'idle', preview: 'idle', normalize: 'idle', geocode: 'idle', mapping: 'idle', mapCodes: 'idle', normalizeValues: 'idle' },
    agentStates: {},
    normalizeResult: null,
    geocodeResult: null,
    columnMap: {},
    catResult: null,
    summaryData: null,
  }),
}), { 
  name: 'pipeline-state',
  storage: createJSONStorage(() => sessionStorage)
}));
