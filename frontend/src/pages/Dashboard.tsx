import { useState, useEffect } from 'react';
import { TopBar }          from '../components/layout/TopBar';
import { SolarMonitor }    from '../components/solar/SolarMonitor';
import { ForecastPanel }   from '../components/forecast/ForecastPanel';
import { GlobeView }       from '../components/globe/GlobeView';
import { RegionScorecard } from '../components/regions/RegionScorecard';
import { ActionPlanner }   from '../components/ai/ActionPlanner';
import { StormArchive }    from '../components/archive/StormArchive';
import { useSolarData }    from '../hooks/useSolarData';
import { api }             from '../api/cosmicgrid';
import { MOCK_STORMS }     from '../data/mockFallback';
import type { HistoricalStorm } from '../types';

export function Dashboard() {
  const {
    solarWind, forecast, regions, status,
    loading, error, connected, refresh,
  } = useSolarData();

  const [selectedRegion, setSelectedRegion]     = useState<string | null>(null);
  const [historicalStorms, setHistoricalStorms] = useState<HistoricalStorm[]>([]);
  const [archiveLoading, setArchiveLoading]     = useState(true);

  // ✅ Derive effective region — no useEffect, no setState in effect
  const effectiveRegion = selectedRegion ??
    (regions.length > 0
      ? [...regions].sort((a, b) => b.riskScore - a.riskScore)[0].id
      : null);

  // Load historical storms
  useEffect(() => {
    api.getHistoricalStorms(30)
      .then(setHistoricalStorms)
      .catch(() => setHistoricalStorms(MOCK_STORMS))
      .finally(() => setArchiveLoading(false));
  }, []);

  const alertCount = forecast
    ? (['G3', 'G4', 'G5'].includes(forecast.stormCategory) ? 1 : 0)
    : 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TopBar
        status={status}
        connected={connected}
        error={error}
        alerts={alertCount}
        onRefresh={refresh}
      />

      <main className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* Row 1 — Solar Monitor */}
        <SolarMonitor data={solarWind} loading={loading} />

        {/* Row 2 — Globe + Forecast */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
          <div className="xl:col-span-3">
            <GlobeView
              regions={regions}
              selectedRegion={effectiveRegion}
              onRegionSelect={id => setSelectedRegion(id || null)}
            />
          </div>
          <div className="xl:col-span-2">
            <ForecastPanel forecast={forecast} loading={loading} />
          </div>
        </div>

        {/* Row 3 — Regions + AI Planner */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5" style={{ minHeight: 520 }}>
          <div className="xl:col-span-2 overflow-hidden" style={{ maxHeight: 560 }}>
            <RegionScorecard
              regions={regions}
              selectedRegion={effectiveRegion}
              onSelect={setSelectedRegion}
            />
          </div>
          <div className="xl:col-span-3 overflow-hidden" style={{ maxHeight: 560 }}>
            <ActionPlanner
              regions={regions}
              selectedRegionId={effectiveRegion}
              onRegionChange={setSelectedRegion}
            />
          </div>
        </div>

        {/* Row 4 — Storm Archive */}
        <StormArchive
          storms={historicalStorms}
          currentForecast={forecast}
          loading={archiveLoading}
        />
      </main>
    </div>
  );
}