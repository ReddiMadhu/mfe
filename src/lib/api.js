const BASE = (import.meta.env.VITE_API_URL || '') + '/api';

async function req(url, options = {}) {
  const res = await fetch(BASE + url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

// Upload file
export const uploadFile = (file, targetFormat, rulesConfig) => {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('rules_config', JSON.stringify(rulesConfig ?? {}));
  return req(`/upload?target_format=${targetFormat}`, { method: 'POST', body: fd });
};



// Geocoding (auto-triggered)
export const runGeocode = (uploadId) =>
  req(`/geocode/${uploadId}`, { method: 'POST' });

// Column mapping suggestions
export const suggestColumns = (uploadId, targetFormat) => {
  const url = targetFormat ? `/suggest-columns/${uploadId}?target_format=${targetFormat}` : `/suggest-columns/${uploadId}`;
  return req(url);
};

// Confirm column mapping
export const confirmColumns = (uploadId, columnMap) =>
  req(`/confirm-columns/${uploadId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ column_map: columnMap }),
  });

// Map occupancy & construction codes (auto-triggered)
export const runMapCodes = (uploadId) =>
  req(`/map-codes/${uploadId}`, { method: 'POST' });

// Normalize values (auto-triggered)
export const runNormalizeValues = (uploadId) =>
  req(`/normalize-values/${uploadId}`, { method: 'POST' });

// Dashboard summary
export const getSlipSummary = (uploadId) =>
  req(`/summary/${uploadId}`);

// Forget a memory mapping
export const forgetMapping = (sourceCol, targetFormat) =>
  req(`/mapping-memory/${encodeURIComponent(sourceCol)}?target_format=${targetFormat}`, { method: 'DELETE' });

// Session info
export const getSession = (uploadId) =>
  req(`/session/${uploadId}`);

// Session stage status (for hydration after refresh)
export const getSessionStatus = (uploadId) =>
  req(`/session/${uploadId}/status`);

// Session Diff
export const getSessionDiff = (uploadId, step) =>
  req(`/session-diff/${uploadId}?step=${step}`);

// ── EP Curve Generation ──────────────────────────────────────────────────────

// Upload policy file for EP curve
export const uploadPolicyFile = (uploadId, file) => {
  const fd = new FormData();
  fd.append('file', file);
  return req(`/ep-curve/upload-policy/${uploadId}`, { method: 'POST', body: fd });
};

// Save frequency configuration
export const configureFrequency = (uploadId, config) =>
  req(`/ep-curve/configure-frequency/${uploadId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });

// Check EP curve sub-agent readiness
export const getEpCurveStatus = (uploadId) =>
  req(`/ep-curve/status/${uploadId}`);

// Generate EP curve (placeholder)
export const generateEpCurve = (uploadId) =>
  req(`/ep-curve/generate/${uploadId}`, { method: 'POST' });

// Run EP Hazard Assessment
export const runEpHazardAssessment = (uploadId) =>
  req(`/ep-curve/run-hazard/${uploadId}`, { method: 'POST' });

// ── Annual Simulation Dashboard ───────────────────────────────────────────────

// Aggregated metrics for the 3 summary cards + EP curve result
export const getSimulationSummary = (uploadId) =>
  req(`/ep-curve/simulation-summary/${uploadId}`);

// Full policy rows for the Policy data table
export const getPolicyData = (uploadId) =>
  req(`/ep-curve/policy-data/${uploadId}`);

// Pre‑EP Curve Modeling Output (mock scaffold)
export const getPreEpOutput = (uploadId) =>
  req(`/ep-curve/pre-ep-output/${uploadId}`);

// ── Slip Coding ──────────────────────────────────────────────────────────────

// Sessionless extraction — used on Configure page (no uploadId yet)
export const extractSlipStandalone = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return req('/slip-coding/extract-standalone', { method: 'POST', body: fd });
};

// Apply stored slip result to a live session (auto-called after SOV upload)
export const applySlipToSession = (uploadId, slipResult) =>
  req(`/slip-coding/apply/${uploadId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(slipResult),
  });

// Session-based extraction fallback (pipeline page, if needed)
export const uploadSlipPdf = (uploadId, file) => {
  const fd = new FormData();
  fd.append('file', file);
  return req(`/slip-coding/extract/${uploadId}`, { method: 'POST', body: fd });
};

// Retrieve stored slip coding extraction result (for hydration after refresh)
export const getSlipCodingResult = (uploadId) =>
  req(`/slip-coding/result/${uploadId}`);

