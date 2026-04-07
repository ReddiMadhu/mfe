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

// Address normalization (auto-triggered)
export const runNormalize = (uploadId) =>
  req(`/normalize/${uploadId}`, { method: 'POST' });

// Geocoding (auto-triggered)
export const runGeocode = (uploadId) =>
  req(`/geocode/${uploadId}`, { method: 'POST' });

// Column mapping suggestions
export const suggestColumns = (uploadId) =>
  req(`/suggest-columns/${uploadId}`);

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
