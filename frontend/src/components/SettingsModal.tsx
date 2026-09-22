import { useState } from 'react';
import {
  X,
  SlidersHorizontal,
  Key,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck,
  Cpu,
  Save,
  Check,
  RotateCcw
} from 'lucide-react';
import type { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
}

export const SettingsModal = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}: SettingsModalProps) => {
  const [apiKey, setApiKey] = useState(settings.apiKey || '');
  const [modelName, setModelName] = useState(settings.modelName || 'gemini-2.5-flash');
  const [temperature, setTemperature] = useState(settings.temperature ?? 0.3);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings({
      apiKey: apiKey.trim(),
      modelName,
      temperature,
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  const handleReset = () => {
    setApiKey('');
    setModelName('gemini-2.5-flash');
    setTemperature(0.3);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg glass-panel rounded-3xl border border-zinc-200 shadow-2xl overflow-hidden z-10 flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-200/60 bg-white/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-zinc-100 border border-zinc-200">
              <SlidersHorizontal className="w-5 h-5 text-zinc-800" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-900">Application Settings</h3>
              <p className="text-xs text-zinc-500">Configure AI models, API keys, and analysis parameters.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          {/* Smart Engine Status Notice */}
          <div className="p-3.5 rounded-2xl bg-zinc-100/70 border border-zinc-200 flex items-start gap-3 text-xs text-zinc-700">
            <ShieldCheck className="w-4 h-4 text-zinc-800 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-zinc-900">Built-in Local Smart Engine Active</p>
              <p className="text-zinc-600 mt-0.5">
                The chatbot operates fully out of the box with intelligent pandas data aggregation, BM25 hybrid search, and citation linking. Adding a Gemini API key unlocks generative reasoning.
              </p>
            </div>
          </div>

          {/* Gemini API Key */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-zinc-600" />
                <span>Google Gemini API Key (Optional)</span>
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 transition-colors"
              >
                <span>Get Free Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full pl-3 pr-10 py-2 text-xs bg-white/90 border border-zinc-200 rounded-xl focus:outline-hidden focus:border-zinc-500 text-zinc-900 placeholder:text-zinc-400 font-mono shadow-xs"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Your key is saved locally in browser storage and never transmitted to any third party.
            </p>
          </div>

          {/* Model Selection */}
          <div>
            <label className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5 mb-1.5">
              <Cpu className="w-3.5 h-3.5 text-zinc-600" />
              <span>Model Selection</span>
            </label>
            <select
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white/90 border border-zinc-200 rounded-xl focus:outline-hidden focus:border-zinc-500 text-zinc-900 shadow-xs cursor-pointer"
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended - Fastest & Intelligent)</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash (Standard)</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Multimodal Reasoning)</option>
            </select>
          </div>

          {/* Temperature */}
          <div>
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <label className="font-semibold text-zinc-800">Temperature (Creativity)</label>
              <span className="font-mono text-zinc-600">{temperature.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-zinc-900 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
              <span>0.0 (Precise / Factual)</span>
              <span>1.0 (Creative)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200/60 bg-white/60 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              {saved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
              <span>{saved ? 'Saved!' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
