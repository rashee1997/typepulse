'use client';

import React, { useState } from 'react';
import { AISettings, AppPreferences } from '@/types/typing';
import { AI_PROVIDER_PRESETS, testAiConnection } from '@/lib/ai-service';
import { Check, Eye, EyeOff, Loader2, RefreshCw, Server, Shield, Sparkles, Volume2, VolumeX, X, AlertCircle } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiSettings: AISettings;
  onSaveAiSettings: (settings: AISettings) => void;
  preferences: AppPreferences;
  onSavePreferences: (prefs: AppPreferences) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  aiSettings,
  onSaveAiSettings,
  preferences,
  onSavePreferences,
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'preferences'>('ai');
  const [formData, setFormData] = useState<AISettings>({ ...aiSettings });
  const [prefsData, setPrefsData] = useState<AppPreferences>({ ...preferences });
  const [showApiKey, setShowApiKey] = useState(false);
  const [testState, setTestState] = useState<{
    loading: boolean;
    success?: boolean;
    message?: string;
    models?: string[];
  }>({ loading: false });

  if (!isOpen) return null;

  const handleProviderSelect = (presetId: string) => {
    const preset = AI_PROVIDER_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    if (preset.id === 'gemini') {
      setFormData((prev) => ({
        ...prev,
        provider: 'gemini',
        endpoint: '/api/gemini/coach',
        model: 'gemini-3.8-flash',
      }));
    } else if (preset.id === 'custom') {
      setFormData((prev) => ({
        ...prev,
        provider: 'openai-compatible',
        endpoint: prev.endpoint || 'https://api.example.com/v1',
        model: prev.model || 'gpt-4o-mini',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        provider: 'openai-compatible',
        endpoint: preset.endpoint,
        model: preset.defaultModel,
      }));
    }
    setTestState({ loading: false });
  };

  const handleTestConnection = async () => {
    setTestState({ loading: true, message: 'Connecting to endpoint...' });
    const result = await testAiConnection(formData);
    setTestState({
      loading: false,
      success: result.success,
      message: result.message,
      models: result.models,
    });
  };

  const handleSaveAndClose = () => {
    onSaveAiSettings(formData);
    onSavePreferences(prefsData);
    onClose();
  };

  const currentPreset = AI_PROVIDER_PRESETS.find(
    (p) => p.endpoint === formData.endpoint && (formData.provider === 'gemini' ? p.id === 'gemini' : p.id !== 'gemini')
  ) || AI_PROVIDER_PRESETS.find((p) => p.id === 'custom');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn" id="settings-modal-backdrop">
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        id="settings-modal-dialog"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Settings & AI Configuration</h2>
              <p className="text-xs text-slate-400">Custom OpenAI-compatible endpoints & typing preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
            id="close-settings-button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/20 px-6">
          <button
            onClick={() => setActiveTab('ai')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'ai'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
            id="tab-ai-settings"
          >
            <Server className="w-4 h-4" />
            <span>AI Model & Endpoint</span>
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'preferences'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
            id="tab-preferences"
          >
            <Volume2 className="w-4 h-4" />
            <span>Audio & Visuals</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {activeTab === 'ai' ? (
            <div className="space-y-5">
              {/* Security Banner */}
              <div className="flex items-start gap-3 p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs text-emerald-300">
                <Shield className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
                <p>
                  <strong className="font-semibold text-emerald-200">Zero-Leak Local Storage:</strong> Your API keys and endpoint settings are stored exclusively inside your browser&apos;s <code className="bg-emerald-900/40 px-1 py-0.5 rounded">localStorage</code>. They are never transmitted to any database or analytics server.
                </p>
              </div>

              {/* Provider Presets */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Provider Preset
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {AI_PROVIDER_PRESETS.map((preset) => {
                    const isSelected =
                      (preset.id === 'gemini' && formData.provider === 'gemini') ||
                      (preset.id !== 'gemini' && formData.provider === 'openai-compatible' && formData.endpoint === preset.endpoint) ||
                      (preset.id === 'custom' && !AI_PROVIDER_PRESETS.some((p) => p.id !== 'custom' && p.endpoint === formData.endpoint));

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleProviderSelect(preset.id)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500/60 text-amber-300 shadow-sm'
                            : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                        }`}
                        id={`preset-btn-${preset.id}`}
                      >
                        <div className="font-semibold truncate">{preset.name}</div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {preset.id === 'gemini' ? 'Server-managed' : preset.defaultModel || 'Custom URL'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Endpoint URL */}
              {formData.provider !== 'gemini' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="ai-endpoint-input">
                    API Base URL (OpenAI-Compatible)
                  </label>
                  <input
                    id="ai-endpoint-input"
                    type="text"
                    value={formData.endpoint}
                    onChange={(e) => setFormData((prev) => ({ ...prev, endpoint: e.target.value }))}
                    placeholder="https://api.openai.com/v1 or http://localhost:11434/v1"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono text-xs"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Works with OpenAI, OpenRouter, Groq, DeepSeek, Local Ollama, LM Studio, vLLM, or any custom reverse proxy.
                  </p>
                </div>
              )}

              {/* API Key */}
              {formData.provider !== 'gemini' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-300" htmlFor="ai-api-key-input">
                      API Key
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {formData.endpoint.includes('localhost') ? 'Optional for local Ollama / LM Studio' : 'Required'}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      id="ai-api-key-input"
                      type={showApiKey ? 'text' : 'password'}
                      value={formData.apiKey}
                      onChange={(e) => setFormData((prev) => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="sk-..."
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Model Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="ai-model-input">
                  Model Name
                </label>
                <input
                  id="ai-model-input"
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData((prev) => ({ ...prev, model: e.target.value }))}
                  placeholder="e.g. gpt-4o-mini, deepseek-chat, llama-3.3-70b-versatile"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono text-xs"
                />
                {currentPreset?.models && currentPreset.models.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-[11px] text-slate-400 mr-1 self-center">Presets:</span>
                    {currentPreset.models.map((mod) => (
                      <button
                        key={mod}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, model: mod }))}
                        className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-colors ${
                          formData.model === mod
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {mod}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Server Proxy Toggle */}
              {formData.provider !== 'gemini' && (
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div className="pr-4">
                    <div className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                      <span>Use Server Proxy for Requests</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Bypasses browser CORS errors when connecting to third-party endpoints or APIs that reject direct browser calls.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.useServerProxy}
                      onChange={(e) => setFormData((prev) => ({ ...prev, useServerProxy: e.target.checked }))}
                      className="sr-only peer"
                      id="server-proxy-toggle"
                    />
                    <div className="w-10 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              )}

              {/* Connection Test Section */}
              <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Endpoint Verification</span>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testState.loading}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
                    id="test-connection-button"
                  >
                    {testState.loading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Test Connection</span>
                      </>
                    )}
                  </button>
                </div>

                {testState.message && (
                  <div
                    className={`text-xs p-2.5 rounded-lg flex items-start gap-2 border ${
                      testState.success
                        ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {testState.success ? (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p>{testState.message}</p>
                      {testState.models && testState.models.length > 0 && (
                        <p className="mt-1 text-[11px] opacity-80">
                          Detected models: {testState.models.slice(0, 4).join(', ')}...
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Preferences Tab */
            <div className="space-y-5">
              {/* Sound Settings */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-200 font-medium">
                    {prefsData.soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                    <span>Mechanical Switch Audio Feedback</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefsData.soundEnabled}
                      onChange={(e) => setPrefsData((prev) => ({ ...prev, soundEnabled: e.target.checked }))}
                      className="sr-only peer"
                      id="sound-enabled-toggle"
                    />
                    <div className="w-10 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {prefsData.soundEnabled && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Volume</span>
                      <span>{Math.round(prefsData.soundVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={prefsData.soundVolume}
                      onChange={(e) => setPrefsData((prev) => ({ ...prev, soundVolume: parseFloat(e.target.value) }))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Keyboard Visualizer Toggle */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-200">Show Keyboard Guide</span>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Displays visual keyboard with interactive finger placement and target key highlights.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefsData.showKeyboard}
                    onChange={(e) => setPrefsData((prev) => ({ ...prev, showKeyboard: e.target.checked }))}
                    className="sr-only peer"
                    id="keyboard-visible-toggle"
                  />
                  <div className="w-10 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {/* Smooth Caret Toggle */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-200">Smooth Caret Motion</span>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Animates cursor gliding between letters with subtle motion transition.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefsData.smoothCaret}
                    onChange={(e) => setPrefsData((prev) => ({ ...prev, smoothCaret: e.target.checked }))}
                    className="sr-only peer"
                    id="smooth-caret-toggle"
                  />
                  <div className="w-10 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {/* Ghost Pacer Toggle */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-200">Real-Time Ghost PB Pacer</span>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Displays an ethereal pacing caret moving at your personal best WPM to race against yourself in real time.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefsData.showGhostPacer !== false}
                    onChange={(e) => setPrefsData((prev) => ({ ...prev, showGhostPacer: e.target.checked }))}
                    className="sr-only peer"
                    id="ghost-pacer-toggle"
                  />
                  <div className="w-10 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setFormData({ ...aiSettings });
              setPrefsData({ ...preferences });
            }}
            className="text-xs text-slate-400 hover:text-slate-200 font-medium"
          >
            Reset Changes
          </button>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="px-5 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors shadow-lg shadow-amber-500/20"
              id="save-settings-button"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
