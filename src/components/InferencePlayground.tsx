import React, { useState, useRef, useEffect } from 'react';
import { setupMockFetch } from '../services/mockStream';
import { Play, Square, AlertCircle, Volume2, Type, Mic, MicOff } from 'lucide-react';

type InputMode = 'text' | 'audio';

export const InferencePlayground: React.FC = () => {
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [prompt, setPrompt] = useState('');
  const [output, setOutput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  
  // Audio Visualizer refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [volume, setVolume] = useState<number>(0);
  
  // Metrics
  const [tokenCount, setTokenCount] = useState(0);
  const [tps, setTps] = useState(0);
  
  // Setup mock fetch on component mount
  useEffect(() => {
    setupMockFetch();
  }, []);

  // Refs for tracking performance
  const startTimeRef = useRef<number | null>(null);
  const tokenCountRef = useRef(0);

  const streamAbortControllerRef = useRef<AbortController | null>(null);
  const metricsIntervalRef = useRef<number | null>(null);

  // Update TPS metric periodically during streaming
  useEffect(() => {
    if (isStreaming) {
      metricsIntervalRef.current = window.setInterval(() => {
        if (startTimeRef.current) {
          const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
          if (elapsedSeconds > 0) {
            setTps(Math.round((tokenCountRef.current / elapsedSeconds) * 10) / 10);
          }
        }
      }, 500); // Update every 500ms
    } else {
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
    }
    
    return () => {
      if (metricsIntervalRef.current) clearInterval(metricsIntervalRef.current);
    };
  }, [isStreaming]);

  const handleStopStream = () => {
    if (streamAbortControllerRef.current) {
      streamAbortControllerRef.current.abort();
    }
  };

  const startRecording = async () => {
    setError(null);
    setAudioBlobUrl(null); // Clear previous audio
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      
      let localChunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) localChunks.push(e.data);
      };

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        setVolume(average); 
        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
      
      recorder.onstop = () => {
        const blob = new Blob(localChunks, { type: 'audio/webm' });
        setAudioBlobUrl(URL.createObjectURL(blob));
        
        stream.getTracks().forEach(track => track.stop());
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        setVolume(0);
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      setError("Could not access microphone. Please check browser permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleStartStream = async (simulateError: boolean = false) => {
    if (inputMode === 'text' && !prompt.trim()) return;
    if (inputMode === 'audio' && !audioBlobUrl) return;
    
    // Reset state
    setOutput('');
    setError(null);
    setTokenCount(0);
    setTps(0);
    setIsStreaming(true);
    
    startTimeRef.current = Date.now();
    tokenCountRef.current = 0;
    streamAbortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/inference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: inputMode === 'text' ? prompt : "[Audio Input Received. Simulating audio-to-text or audio-to-audio inference...]",
          shouldFail: simulateError
        }),
        signal: streamAbortControllerRef.current.signal
      });

      if (!response.body) throw new Error("ReadableStream not supported in this browser.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        
        // Count tokens (words) in the chunk
        if (chunk.trim().length > 0) {
           const newTokens = chunk.trim().split(/\s+/).length;
           tokenCountRef.current += newTokens;
           setTokenCount(prev => prev + newTokens);
        }
        
        setOutput(prev => prev + chunk);
      }
      
      setIsStreaming(false);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError("Stream manually interrupted.");
      } else {
        setError(err.message || "An error occurred during streaming.");
      }
      setIsStreaming(false);
    }
  };



  return (
    <div className="panel animate-fade-in">
      <div className="header" style={{ marginBottom: '20px', textAlign: 'left' }}>
        <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Inference Playground</h2>
        <p style={{ fontSize: '0.9rem' }}>Test on-device inference with real-time streaming</p>
      </div>

      {/* Input Mode Toggle */}
      <div className="tab-container" role="tablist" aria-label="Input Mode Selection">
        <button 
          role="tab"
          aria-selected={inputMode === 'text'}
          className={`tab ${inputMode === 'text' ? 'active' : ''}`}
          onClick={() => setInputMode('text')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <Type size={18} /> Text Input
        </button>
        <button 
          role="tab"
          aria-selected={inputMode === 'audio'}
          className={`tab ${inputMode === 'audio' ? 'active' : ''}`}
          onClick={() => setInputMode('audio')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <Volume2 size={18} /> Audio Input
        </button>
      </div>

      {/* Input Area */}
      <div style={{ marginBottom: '24px' }}>
        {inputMode === 'text' ? (
          <textarea
            className="input-field"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt here..."
            rows={3}
            disabled={isStreaming}
            aria-label="Text Prompt Input"
          />
        ) : (
          <div style={{ 
            background: 'var(--bg-input)', 
            border: `1px ${isRecording ? 'solid var(--error-color)' : 'dashed var(--border-color)'}`,
            padding: '40px',
            borderRadius: '8px',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ marginBottom: '20px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isRecording ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Mic size={32} color="var(--error-color)" />
                  <div style={{ display: 'flex', gap: '4px', height: '30px', alignItems: 'center' }}>
                    {[...Array(5)].map((_, i) => (
                      <div 
                        key={i}
                        style={{
                          width: '6px',
                          backgroundColor: 'var(--error-color)',
                          borderRadius: '3px',
                          height: `${Math.max(4, (volume / 255) * 30 * (1 + Math.random() * 0.5))}px`,
                          transition: 'height 0.05s ease'
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <MicOff size={48} style={{ opacity: 0.5 }} />
              )}
            </div>
            
            <button 
              className={`btn ${isRecording ? 'btn-secondary' : 'btn-primary'}`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isStreaming}
              style={isRecording ? { borderColor: 'var(--error-color)', color: 'var(--error-color)' } : {}}
            >
              {isRecording ? <Square size={16} fill="currentColor" /> : <Mic size={16} />}
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
            
            {isRecording && (
              <div style={{ marginTop: '20px' }}>
                <p style={{ marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Listening to your microphone...</p>
              </div>
            )}
            
            {!isRecording && audioBlobUrl && (
              <div style={{ marginTop: '20px' }}>
                <p style={{ marginBottom: '8px', fontSize: '0.9rem' }}>Recorded Audio Input:</p>
                <audio controls src={audioBlobUrl} style={{ width: '100%', height: '40px', borderRadius: '8px' }} />
              </div>
            )}
            
            {!isRecording && !audioBlobUrl && (
              <div style={{ marginTop: '20px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Click 'Start Recording' to provide an audio sample for inference.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls & Metrics Bar */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          {!isStreaming ? (
            <>
              <button 
                className="btn btn-primary" 
                onClick={() => handleStartStream(false)}
                disabled={(inputMode === 'text' && !prompt.trim()) || (inputMode === 'audio' && !audioBlobUrl)}
                aria-label="Start Inference"
              >
                <Play size={18} fill="currentColor" /> Generate
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => handleStartStream(true)}
                disabled={(inputMode === 'text' && !prompt.trim()) || (inputMode === 'audio' && !audioBlobUrl)}
                title="Simulate network failure mid-stream"
                aria-label="Simulate Error"
              >
                Test Error
              </button>
            </>
          ) : (
            <button 
              className="btn btn-secondary" 
              style={{ borderColor: 'var(--error-color)', color: 'var(--error-color)' }}
              onClick={handleStopStream}
              aria-label="Stop Stream"
            >
              <Square size={18} fill="currentColor" /> Stop Stream
            </button>
          )}
        </div>

        {/* Live Metrics */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="glass-badge" aria-live="polite" aria-atomic="true">
            <span style={{ color: 'var(--text-primary)' }}>{tokenCount}</span> Tokens
          </div>
          <div className="glass-badge" aria-live="polite" aria-atomic="true">
            <span style={{ color: 'var(--accent-color)' }}>{tps.toFixed(1)}</span> TPS
          </div>
        </div>
      </div>

      {/* Output Area */}
      <div 
        style={{ 
          background: 'var(--bg-input)', 
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          minHeight: '200px',
          padding: '20px',
          position: 'relative',
          fontSize: '1.05rem',
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap'
        }}
        aria-live="assertive"
        role="log"
      >
        {output || <span style={{ color: 'var(--text-muted)' }}>Output will appear here...</span>}
        
        {isStreaming && (
          <span style={{ 
            display: 'inline-block',
            width: '8px',
            height: '18px',
            background: 'var(--accent-color)',
            marginLeft: '4px',
            verticalAlign: 'middle',
            animation: 'pulse-ring 1s infinite'
          }} />
        )}

        {/* Error State Overlay/Indicator */}
        {error && (
          <div style={{
            marginTop: '16px',
            padding: '12px 16px',
            background: 'var(--error-bg)',
            border: '1px solid var(--error-color)',
            borderRadius: '6px',
            color: 'var(--error-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.9rem'
          }} role="alert">
            <AlertCircle size={18} />
            <div>
              <strong>Stream Interrupted:</strong> {error}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
