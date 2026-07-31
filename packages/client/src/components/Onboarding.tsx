import { useState, useEffect } from 'react';
import { api, modelsApi } from '../api';
import { ShieldAlert, Cpu, Download, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'detected' | 'missing'>('checking');
  const [pulling, setPulling] = useState(false);

  useEffect(() => {
    checkOllama();
  }, []);

  const checkOllama = async () => {
    try {
      const res = await api.get('/health');
      if (res.data.status === 'ok') {
        setOllamaStatus('detected');
      }
    } catch (e) {
      setOllamaStatus('missing');
    }
  };

  const handlePullLlama = async () => {
    setPulling(true);
    try {
      await modelsApi.pull('llama3');
      // In a real app, we'd poll for progress
      setStep(3);
    } catch (e) {
      alert('Failed to start download');
    } finally {
      setPulling(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-950 z-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
                <ShieldAlert size={32} className="text-blue-500" />
            </div>
        </div>

        {step === 1 && (
            <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h1 className="text-2xl font-bold text-white">Welcome to AI Pentest Copilot</h1>
                <p className="text-zinc-400 text-sm leading-relaxed">
                    The local-first AI assistant for technical security professionals.
                </p>
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Cpu size={20} className={ollamaStatus === 'detected' ? 'text-green-500' : 'text-zinc-500'} />
                        <span className="text-sm font-medium">Ollama Detection</span>
                    </div>
                    {ollamaStatus === 'checking' && <Loader2 size={16} className="animate-spin text-zinc-500" />}
                    {ollamaStatus === 'detected' && <CheckCircle2 size={20} className="text-green-500" />}
                    {ollamaStatus === 'missing' && <AlertTriangle size={20} className="text-red-500" />}
                </div>
                
                {ollamaStatus === 'missing' ? (
                    <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                        Ollama not found. Please install and start Ollama to use local models.
                    </div>
                ) : (
                    <button 
                        onClick={() => setStep(2)}
                        className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold transition-all"
                    >
                        Get Started
                    </button>
                )}
            </div>
        )}

        {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <h2 className="text-xl font-bold text-white text-center">Setup your Brain</h2>
                <p className="text-zinc-400 text-sm text-center">
                    To operate, the Copilot needs a local Large Language Model.
                </p>
                
                <div className="space-y-3">
                    <button 
                        onClick={handlePullLlama}
                        disabled={pulling}
                        className="w-full flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-blue-500/50 transition-all group"
                    >
                        <div className="text-left text-sm font-medium">
                            <div>Download Llama 3 (Recommended)</div>
                            <div className="text-[10px] text-zinc-500">Fast, secure, and accurate.</div>
                        </div>
                        {pulling ? <Loader2 size={18} className="animate-spin text-blue-500" /> : <Download size={18} className="text-zinc-500 group-hover:text-blue-500" />}
                    </button>

                    <button 
                        onClick={() => setStep(3)}
                        className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                        Skip for now (I have my own models)
                    </button>
                </div>
            </div>
        )}

        {step === 3 && (
            <div className="space-y-8 text-center animate-in fade-in zoom-in duration-500">
                <CheckCircle2 size={48} className="text-green-500 mx-auto" />
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-white">System Ready</h2>
                    <p className="text-zinc-400 text-sm">
                        Engines initialized. Security rules active.
                    </p>
                </div>
                <button 
                    onClick={onComplete}
                    className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-600/20"
                >
                    Launch Mission Control
                </button>
            </div>
        )}
      </div>
    </div>
  );
}
