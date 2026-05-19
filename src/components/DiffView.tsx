import React, { useState, useEffect } from 'react';
import type { DiffOp } from '../utils/diffAlgorithm';
import { calculateDiff } from '../utils/diffAlgorithm';
import { ArrowRightLeft } from 'lucide-react';

export const DiffView: React.FC = () => {
  const [modelA, setModelA] = useState("The quick brown fox jumps over the lazy dog.");
  const [modelB, setModelB] = useState("The fast brown fox leaps over a lazy dog.");
  const [diff, setDiff] = useState<DiffOp[]>([]);

  useEffect(() => {
    setDiff(calculateDiff(modelA, modelB));
  }, [modelA, modelB]);

  return (
    <div className="panel animate-fade-in" style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <ArrowRightLeft className="text-accent" size={24} color="var(--accent-color)" />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Model Output Diff</h2>
      </div>

      <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Model A Version 1.0 (Baseline)</label>
          <textarea
            className="input-field"
            value={modelA}
            onChange={(e) => setModelA(e.target.value)}
            rows={4}
            placeholder="Enter baseline model output..."
          />
        </div>
        <div style={{ flex: '1 1 300px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Model B Version 1.1 (Candidate)</label>
          <textarea
            className="input-field"
            value={modelB}
            onChange={(e) => setModelB(e.target.value)}
            rows={4}
            placeholder="Enter candidate model output..."
          />
        </div>
      </div>

      <div style={{ background: 'var(--bg-input)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '12px', color: 'var(--text-secondary)' }}>Diff Result</h3>
        <div style={{ lineHeight: '1.8', fontSize: '1.05rem', whiteSpace: 'pre-wrap' }}>
          {diff.map((op, i) => {
            const hasSpace = i < diff.length - 1;
            if (op.type === 'equal') {
              return <span key={i} style={{ color: 'var(--text-primary)' }}>{op.value}{hasSpace ? ' ' : ''}</span>;
            }
            if (op.type === 'delete') {
              return (
                <span key={i} style={{ 
                  backgroundColor: 'var(--diff-remove-bg)', 
                  color: 'var(--diff-remove-text)',
                  textDecoration: 'line-through',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  marginRight: hasSpace ? '4px' : '0'
                }}>
                  {op.value}
                </span>
              );
            }
            if (op.type === 'insert') {
              return (
                <span key={i} style={{ 
                  backgroundColor: 'var(--diff-add-bg)', 
                  color: 'var(--diff-add-text)',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  fontWeight: 500,
                  marginRight: hasSpace ? '4px' : '0'
                }}>
                  {op.value}
                </span>
              );
            }
            return null;
          })}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '16px', marginTop: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: 'var(--diff-remove-bg)', border: '1px solid var(--diff-remove-text)' }}></div>
          <span>Removed in B</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: 'var(--diff-add-bg)', border: '1px solid var(--diff-add-text)' }}></div>
          <span>Added in B</span>
        </div>
      </div>
    </div>
  );
};
