import { useEffect, useRef } from 'react';
import { usePipelineStore } from '@/store/usePipelineStore';

// Maps backend stage names to frontend stepStatus keys
const STAGE_TO_STATUS_KEY = {
  address_normalize: 'normalize',
  geocoding:         'geocode',
  code_mapping:      'mapCodes',
  normalization:     'normalizeValues',
};

export function useAgentStream(uploadId) {
  const { setAgentState, appendAgentLog, setStepStatus } = usePipelineStore();
  const esRef = useRef(null);

  useEffect(() => {
    if (!uploadId) return;

    const es = new EventSource(`/api/stream/${uploadId}`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        const { agent_id, event, message, result } = data;
        if (!agent_id) return;

        if (event === 'start') {
          setAgentState(agent_id, { status: 'running', thinkingLog: [] });
        } else if (event === 'log') {
          appendAgentLog(agent_id, message);
        } else if (event === 'done') {
          setAgentState(agent_id, { status: 'completed', result: result ?? {} });
        } else if (event === 'error') {
          setAgentState(agent_id, { status: 'error', error: message });
        } else if (event === 'stage_complete') {
          // message contains the stage name dispatched from the backend
          const stageKey = message || result;
          const statusKey = STAGE_TO_STATUS_KEY[stageKey] ?? stageKey;
          if (statusKey) {
            setStepStatus(statusKey, 'done');
          }
        }
      } catch (_) {}
    };

    es.onerror = () => { es.close(); };

    return () => { es.close(); };
  }, [uploadId]);

  return esRef;
}
