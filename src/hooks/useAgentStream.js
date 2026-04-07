import { useEffect, useRef } from 'react';
import { usePipelineStore } from '@/store/usePipelineStore';

export function useAgentStream(uploadId) {
  const { setAgentState, appendAgentLog } = usePipelineStore();
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
        }
      } catch (_) {}
    };

    es.onerror = () => { es.close(); };

    return () => { es.close(); };
  }, [uploadId]);

  return esRef;
}
