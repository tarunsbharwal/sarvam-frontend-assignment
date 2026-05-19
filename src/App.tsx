
import { InferencePlayground } from './components/InferencePlayground';
import { DiffView } from './components/DiffView';
import { Activity } from 'lucide-react';

function App() {
  return (
    <div className="layout">
      <header className="header animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Activity size={40} color="var(--accent-color)" />
          <h1>Developer Portal</h1>
        </div>
        <p>Enterprise On-Device AI Management & Inference Playground</p>
      </header>

      <main>
        <section aria-labelledby="inference-section">
          <InferencePlayground />
        </section>

        <section aria-labelledby="diff-section" style={{ marginTop: '40px' }}>
          <DiffView />
        </section>
      </main>
      
      <footer style={{ marginTop: '60px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        <p>Built for Sarvam AI Frontend Intern Assignment</p>
      </footer>
    </div>
  );
}

export default App;
