import { useCallback, useMemo, useState } from 'react';
import { Landing } from '@/components/Landing';
import { Workspace } from '@/components/Workspace';
import { parseCsv, parseCsvText, buildDataset } from '@/lib/csv';
import { analyze } from '@/lib/insights';
import { SAMPLE_CSV } from '@/lib/sampleData';
import type { Dataset, View } from '@/lib/types';

type Screen = 'landing' | 'workspace';

function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [view, setView] = useState<View>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDataset = useCallback((ds: Dataset) => {
    setDataset(ds);
    setView('overview');
    setScreen('workspace');
    setError(null);
    setLoading(false);
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setLoading(true);
      try {
        if (file.size > 10 * 1024 * 1024) {
          throw new Error('File is larger than 10MB. Please try a smaller CSV.');
        }
        const parsed = await parseCsv(file);
        const ds = buildDataset(parsed, file.name);
        loadDataset(ds);
      } catch (e) {
        setLoading(false);
        setError(e instanceof Error ? e.message : 'Could not read that file. Please check it is a valid CSV.');
      }
    },
    [loadDataset],
  );

  const handleDemo = useCallback(() => {
    setError(null);
    setLoading(true);
    try {
      const parsed = parseCsvText(SAMPLE_CSV);
      const ds = buildDataset(parsed, 'sample_sales_2024.csv');
      loadDataset(ds);
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : 'Could not load the sample dataset.');
    }
  }, [loadDataset]);

  const handleBack = useCallback(() => {
    setScreen('landing');
    setDataset(null);
    setError(null);
  }, []);

  if (screen === 'workspace' && dataset) {
    return <WorkspaceWithAnalysis dataset={dataset} view={view} onView={setView} onBack={handleBack} />;
  }

  return (
    <Landing
      onFile={handleFile}
      onDemo={handleDemo}
      loading={loading}
      error={error}
    />
  );
}

export default App;

function WorkspaceWithAnalysis({
  dataset,
  view,
  onView,
  onBack,
}: {
  dataset: Dataset;
  view: View;
  onView: (v: View) => void;
  onBack: () => void;
}) {
  const analysis = useMemo(() => analyze(dataset), [dataset]);
  return (
    <Workspace
      dataset={dataset}
      analysis={analysis}
      view={view}
      onView={onView}
      onBack={onBack}
    />
  );
}
