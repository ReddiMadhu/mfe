import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const usePipelineStore = create(persist((set) => ({
  // Upload
  uploadId: null,
  targetFormat: 'AIR',
  uploadMeta: null,     // { row_count, headers, sample }
  rawPreview: [],       // first N rows for DataPreview table
  agentType: null,      // 'catai' | 'underwriting' | null

  // Agent selection (configured on /configure before pipeline starts)
  selectedAgents: {
    dataAgent: true,       // 1 - Data Agent — always true, locked
    sovCope: true,         // SOV COPE CI/CD MODELING — checked by default
    cope: false,           // 6 - Real time CAT Event Assessment
    hazards: false,        // 3 - Hazard Assessment
    geospatial: false,     // 4 - Geospatial Data
    objAnalysis: false,    // 5 - Property Computer Vision
    riskModel: false,      // 7 - Property Vulnerability Risk
    propensity: false,     // 8 - Quote Propensity
  },

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

  // Rules configuration (from ontology page)
  rulesConfig: {},

  // Results
  normalizeResult: null,
  geocodeResult: null,
  columnMap: {},
  catResult: null,
  summaryData: null,
  mapCodesSummaryText: null,
  normalizeSummaryText: null,
  geocodeDiff: null,
  mapCodesDiff: null,
  normalizeDiff: null,

  // --- Actions ---
  setUploadId: (id) => set({ uploadId: id }),
  setTargetFormat: (fmt) => set({ targetFormat: fmt }),
  setSelectedAgents: (agents) => set({ selectedAgents: agents }),
  toggleAgent: (agentId) => set((s) => {
    if (agentId === 'dataAgent') return {};  // Data Agent is always on
    return { selectedAgents: { ...s.selectedAgents, [agentId]: !s.selectedAgents[agentId] } };
  }),
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
  setRulesConfig: (config) => set({ rulesConfig: config }),
  setMapCodesSummaryText: (s) => set({ mapCodesSummaryText: s }),
  setNormalizeSummaryText: (s) => set({ normalizeSummaryText: s }),
  
  setGeocodeDiff: (d) => set({ geocodeDiff: d }),
  setMapCodesDiff: (d) => set({ mapCodesDiff: d }),
  setNormalizeDiff: (d) => set({ normalizeDiff: d }),

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
    rulesConfig: {},
    summaryData: null,
    mapCodesSummaryText: null,
    normalizeSummaryText: null,
    geocodeDiff: null,
    mapCodesDiff: null,
    normalizeDiff: null,
    selectedAgents: {
      dataAgent: true, sovCope: true,
      cope: false, hazards: false, geospatial: false,
      objAnalysis: false, riskModel: false, propensity: false,
    },
  }),
}), { 
  name: 'pipeline-state',
  storage: createJSONStorage(() => sessionStorage)
}));
