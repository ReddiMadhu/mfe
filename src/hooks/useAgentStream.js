import { useEffect, useRef, useCallback } from 'react';
import { usePipelineStore } from '@/store/usePipelineStore';

// Maps backend stage names → frontend stepStatus keys
const STAGE_TO_STATUS_KEY = {
  address_normalize: 'normalize',
  geocoding:         'geocode',
  code_mapping:      'mapCodes',
  normalization:     'normalizeValues',
  column_mapping:    'mapping',
};

// Maps stage_complete status key → which executionStep number it unlocks
const STAGE_TO_EXEC_STEP = {
  normalize:       2,
  geocode:         3,
  mapping:         4,
  mapCodes:        5,
  normalizeValues: 6,
};

const MAX_RETRIES   = 6;
const RETRY_BASE_MS = 1000; // doubles each retry: 1s → 2s → 4s → 8s…

/**
 * useAgentStream — Production SSE hook.
 *
 * Features:
 *  - Auto-reconnect with exponential backoff (up to MAX_RETRIES times)
 *  - Handles: start | log | progress | done | error | stage_complete events
 *  - 'progress' event: { current, total, message } shows row-level progress
 *  - Exposes connection status via ref: 'connecting' | 'open' | 'closed' | 'error'
 *  - Cleans up properly on unmount / uploadId change
 */
export function useAgentStream(uploadId) {
  const {
    setAgentState,
    appendAgentLog,
    setStepStatus,
    setExecutionStep,
  } = usePipelineStore();

  const esRef      = useRef(null);      // EventSource instance
  const statusRef  = useRef('closed');  // live connection status
  const retryRef   = useRef(0);
  const timerRef   = useRef(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!uploadId || !mountedRef.current) return;

    // Close any existing connection before opening a new one
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    statusRef.current = 'connecting';
    const apiBase = import.meta.env.VITE_API_URL || '';
    const es = new EventSource(`${apiBase}/api/stream/${uploadId}`);
    esRef.current = es;

    es.onopen = () => {
      if (!mountedRef.current) return;
      statusRef.current = 'open';
      retryRef.current  = 0; // reset retry counter on successful connection
    };

    es.onmessage = (e) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(e.data);
        const { agent_id, event, message, result } = data;
        if (!agent_id) return;

        switch (event) {
          // ── Agent lifecycle events ─────────────────────────────────────────
          case 'start':
            setAgentState(agent_id, { status: 'running', thinkingLog: [] });
            break;

          case 'log':
            appendAgentLog(agent_id, message);
            break;

          // ── Row-level progress (e.g. "Processed 500 / 10000 rows") ─────────
          case 'progress': {
            const { current = 0, total = 0 } = result ?? {};
            const pctMsg = total > 0
              ? `[${current}/${total}] ${message}`
              : message;
            appendAgentLog(agent_id, pctMsg);
            break;
          }

          case 'done':
            setAgentState(agent_id, { status: 'completed', result: result ?? {} });
            break;

          case 'error':
            setAgentState(agent_id, { status: 'error', error: message });
            break;

          // ── Pipeline stage completed — unlock the next UI step ─────────────
          case 'stage_complete': {
            // message holds the backend stage name e.g. "geocoding"
            const stageKey  = message || result;
            const statusKey = STAGE_TO_STATUS_KEY[stageKey] ?? stageKey;
            if (statusKey) {
              setStepStatus(statusKey, 'done');
              const execStep = STAGE_TO_EXEC_STEP[statusKey];
              if (execStep) setExecutionStep(execStep);
            }
            break;
          }

          default:
            break;
        }
      } catch (_) {
        // Silently ignore malformed SSE payloads
      }
    };

    es.onerror = () => {
      if (!mountedRef.current) return;
      es.close();
      esRef.current     = null;
      statusRef.current = 'error';

      if (retryRef.current < MAX_RETRIES) {
        const delay = RETRY_BASE_MS * Math.pow(2, retryRef.current);
        retryRef.current += 1;
        timerRef.current = setTimeout(connect, delay);
      } else {
        statusRef.current = 'closed';
      }
    };
  }, [uploadId, setAgentState, appendAgentLog, setStepStatus, setExecutionStep]);

  useEffect(() => {
    mountedRef.current = true;
    retryRef.current   = 0;
    connect();

    return () => {
      mountedRef.current = false;
      clearTimeout(timerRef.current);
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      statusRef.current = 'closed';
    };
  }, [connect]);

  // Callers can read statusRef.current for connection status indicators
  return statusRef;
}
