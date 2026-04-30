const BASE = '/api';

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

