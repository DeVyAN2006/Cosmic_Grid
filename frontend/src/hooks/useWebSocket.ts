import { useEffect, useRef, useState } from 'react';
import type { WebSocketMessage } from '../types';

interface UseWebSocketReturn {
  lastMessage: WebSocketMessage | null;
  connected:   boolean;
}

export function useWebSocket(url: string): UseWebSocketReturn {
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connected, setConnected]     = useState(false);

  const socketRef  = useRef<WebSocket | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    let destroyed = false;

    function connect() {
      if (destroyed) return;

      try {
        const ws = new WebSocket(url);
        socketRef.current = ws;

        ws.onopen = () => {
          if (!destroyed) setConnected(true);
          console.log('[CosmicGrid] WebSocket connected');
        };

        ws.onclose = () => {
          if (!destroyed) {
            setConnected(false);
            console.log('[CosmicGrid] WebSocket closed — retrying in 4s');
            retryTimer.current = setTimeout(connect, 4000);
          }
        };

        ws.onerror = () => {
          ws.close();
        };

        ws.onmessage = (event) => {
          try {
            const raw = JSON.parse(event.data);

            // Normalise forecast: backend snake_case -> frontend camelCase
            if (raw?.payload?.forecast) {
              const f = raw.payload.forecast;
              raw.payload.forecast = {
                ...f,
                stormCategory: f.storm_category  ?? f.stormCategory ?? 'None',
                stormLabel:    f.storm_label     ?? f.stormLabel    ?? 'Quiet',
                predictedKp:   f.predicted_kp    ?? f.predictedKp   ?? 0,
                arrivalHours:  f.arrival_hours   ?? f.arrivalHours  ?? null,
                alertLevel:    f.alert_level     ?? f.alertLevel    ?? 'None',
                confidence:    f.confidence      ?? 0,
              };
            }

            // Normalise solar reading: backend snake_case -> frontend camelCase
            if (raw?.payload?.solar) {
              const s = raw.payload.solar;
              raw.payload.solar = {
                ...s,
                bz:       s.bz_nT         ?? s.bz       ?? 0,
                speed:    s.sw_speed       ?? s.speed    ?? 0,
                density:  s.proton_density ?? s.density  ?? 0,
                kpIndex:  s.kp_index       ?? s.kpIndex  ?? 0,
                xrayFlux: s.xray_flux      ?? s.xrayFlux ?? 1e-8,
              };
            }

            // Normalise regions array: backend snake_case -> frontend camelCase
            if (Array.isArray(raw?.payload?.regions)) {
              raw.payload.regions = raw.payload.regions.map((r: Record<string, unknown>) => ({
                ...r,
                id:                    r.id         ?? r.region_id   ?? '',
                name:                  r.name       ?? r.region_name ?? '',
                riskScore:             r.riskScore  ?? r.risk_score  ?? 0,
                alertLevel:            r.alertLevel ?? r.alert_level ?? 'None',
                lat:                   r.lat        ?? 0,
                lon:                   r.lon        ?? r.lng         ?? 0,
                transmissionLineKm:     r.transmissionLineKm ?? r.line_km            ?? 0,
                transformerAgeCategory: r.transformerAgeCategory ?? r.age_factor        ?? '—',
                populationMillions:     r.populationMillions ?? r.population_millions   ?? null,
                riskLevel:              r.riskLevel ?? r.risk_level ?? 'LOW',
              }));
            }

            if (!destroyed) setLastMessage(raw as WebSocketMessage);
          } catch {
            console.warn('[CosmicGrid] Failed to parse WS message');
          }
        };

      } catch (err) {
        console.warn('[CosmicGrid] WebSocket connect failed', err);
        if (!destroyed) {
          retryTimer.current = setTimeout(connect, 4000);
        }
      }
    }

    connect();

    return () => {
      destroyed = true;
      clearTimeout(retryTimer.current);
      socketRef.current?.close();
    };

  }, [url]);

  return { lastMessage, connected };
}