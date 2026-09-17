'use client';

import React, { useState } from 'react';
import { AISettings, AppPreferences } from '@/types/typing';
import { AI_PROVIDER_PRESETS, testAiConnection } from '@/lib/ai-service';
import { Check, Eye, EyeOff, Loader2, RefreshCw, Server, Shield, Sparkles, Volume2, VolumeX, X, AlertCircle, Sun, Moon, Monitor } from 'lucide-react';

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

  const applyThemePreview = (theme: string) => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
    } else if (theme === 'dark' || theme === 'dark-slate') {
      root.classList.add('dark');
    } else if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  const handleCloseAndRevert = () => {
    applyThemePreview(preferences.theme || 'dark');
    onClose();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn" id="settings-modal-backdrop">
      <div 
        className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-dialog overflow-hidden flex flex-col max-h-[90vh]"
        id="settings-modal-dialog"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-muted/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-accent-subtle border border-accent-border text-accent">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Settings & AI Configuration</h2>
              <p className="text-xs text-text-muted">Custom OpenAI-compatible endpoints & typing preferences</p>
            </div>
          </div>
          <button
            onClick={handleCloseAndRevert}
            className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-surface-hover transition-colors"
            id="close-settings-button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border bg-surface-muted/30 px-6">
          <button
            onClick={() => setActiveTab('ai')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'ai'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-text-primary'
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
                ? 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-text-primary'
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
              <div className="flex items-start gap-3 p-3.5 bg-success-subtle border border-success-border rounded-xl text-xs text-success">
                <Shield className="w-4 h-4 mt-0.5 text-success shrink-0" />
                <p>
                  <strong className="font-semibold text-text-primary">Zero-Leak Local Storage:</strong> Your API keys and endpoint settings are stored exclusively inside your browser&apos;s <code className="bg-surface px-1 py-0.5 rounded border border-border">localStorage</code>. They are never transmitted to any database or analytics server.
                </p>
              </div>

              {/* Provider Presets */}
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
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
                            ? 'bg-accent-subtle border-accent text-accent shadow-sm'
                            : 'bg-surface-hover/50 border-border text-text-secondary hover:bg-surface-active hover:text-text-primary'
                        }`}
                        id={`preset-btn-${preset.id}`}
                      >
                        <div className="font-semibold truncate">{preset.name}</div>
                        <div className="text-[10px] text-text-muted truncate mt-0.5">
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
                  <label className="block text-xs font-medium text-text-secondary mb-1.5" htmlFor="ai-endpoint-input">
                    API Base URL (OpenAI-Compatible)
                  </label>
                  <input
                    id="ai-endpoint-input"
                    type="text"
                    value={formData.endpoint}
                    onChange={(e) => setFormData((prev) => ({ ...prev, endpoint: e.target.value }))}
                    placeholder="https://api.openai.com/v1 or http://localhost:11434/v1"
                    className="w-full px-3.5 py-2.5 bg-surface-muted border border-border rounded-xl text-text-primary placeholder:text-text-subtle focus:outline-none focus:border-accent font-mono text-xs"
                  />
                  <p className="mt-1 text-[11px] text-text-muted">
                    Works with OpenAI, OpenRouter, Groq, DeepSeek, Local Ollama, LM Studio, vLLM, or any custom reverse proxy.
                  </p>
                </div>
              )}

              {/* API Key */}
              {formData.provider !== 'gemini' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-text-secondary" htmlFor="ai-api-key-input">
                      API Key
                    </label>
                    <span className="text-[11px] text-text-muted">
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
                      className="w-full pl-3.5 pr-10 py-2.5 bg-surface-muted border border-border rounded-xl text-text-primary placeholder:text-text-subtle focus:outline-none focus:border-accent font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Model Selection */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5" htmlFor="ai-model-input">
                  Model Name
                </label>
                <input
                  id="ai-model-input"
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData((prev) => ({ ...prev, model: e.target.value }))}
                  placeholder="e.g. gpt-4o-mini, deepseek-chat, llama-3.3-70b-versatile"
                  className="w-full px-3.5 py-2.5 bg-surface-muted border border-border rounded-xl text-text-primary placeholder:text-text-subtle focus:outline-none focus:border-accent font-mono text-xs"
                />
                {currentPreset?.models && currentPreset.models.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-[11px] text-text-muted mr-1 self-center">Presets:</span>
                    {currentPreset.models.map((mod) => (
                      <button
                        key={mod}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, model: mod }))}
                        className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-colors ${
                          formData.model === mod
                            ? 'bg-accent-subtle text-accent border-accent'
                            : 'bg-surface-hover text-text-muted border-border hover:text-text-primary'
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
                <div className="p-3.5 bg-surface-muted border border-border rounded-xl flex items-center justify-between">
                  <div className="pr-4">
                    <div className="text-xs font-medium text-text-primary flex items-center gap-1.5">
                      <span>Use Server Proxy for Requests</span>
                    </div>
                    <p className="text-[11px] text-text-muted mt-0.5">
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
                    <div className="w-10 h-6 bg-surface-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                  </label>
                </div>
              )}

              {/* Connection Test Section */}
              <div className="p-3.5 bg-surface-muted border border-border rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-secondary">Endpoint Verification</span>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testState.loading}
                    className="px-3 py-1.5 bg-surface-hover hover:bg-surface-active disabled:opacity-50 text-text-primary rounded-lg text-xs font-medium border border-border flex items-center gap-1.5 transition-colors"
                    id="test-connection-button"
                  >
                    {testState.loading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
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
                        ? 'bg-success-subtle border-success-border text-success'
                        : 'bg-danger-subtle border-danger-border text-danger'
                    }`}
                  >
                    {testState.success ? (
                      <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
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
              {/* Theme & Appearance */}
              <div className="p-4 bg-surface-muted border border-border rounded-xl space-y-3" id="settings-theme-section">
                <div>
                  <span className="font-medium text-text-primary flex items-center gap-2">
                    <Sun className="w-4 h-4 text-accent" />
                    <span>Theme & Appearance</span>
                  </span>
                  <p className="text-xs text-text-muted mt-0.5">
                    Select your visual theme. Choose between high-contrast Light Mode, deep Obsidian Dark Mode, or sync with System preferences.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const nextPrefs = { ...prefsData, theme: 'light' as const };
                      setPrefsData(nextPrefs);
                      applyThemePreview('light');
                    }}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-center transition-all cursor-pointer ${
                      prefsData.theme === 'light'
                        ? 'bg-accent-subtle border-accent text-accent shadow-sm ring-1 ring-accent'
                        : 'bg-surface hover:bg-surface-hover border-border text-text-secondary hover:text-text-primary'
                    }`}
                    id="theme-select-light"
                  >
                    <div className={`p-2 rounded-lg ${prefsData.theme === 'light' ? 'bg-accent text-accent-foreground' : 'bg-surface-muted text-text-muted'}`}>
                      <Sun className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-tight">Light Mode</div>
                      <div className="text-[10px] text-text-muted mt-0.5">Crisp daytime</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const nextPrefs = { ...prefsData, theme: 'dark' as const };
                      setPrefsData(nextPrefs);
                      applyThemePreview('dark');
                    }}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-center transition-all cursor-pointer ${
                      prefsData.theme === 'dark' || prefsData.theme === 'dark-slate' || !prefsData.theme
                        ? 'bg-accent-subtle border-accent text-accent shadow-sm ring-1 ring-accent'
                        : 'bg-surface hover:bg-surface-hover border-border text-text-secondary hover:text-text-primary'
                    }`}
                    id="theme-select-dark"
                  >
                    <div className={`p-2 rounded-lg ${prefsData.theme === 'dark' || prefsData.theme === 'dark-slate' || !prefsData.theme ? 'bg-accent text-accent-foreground' : 'bg-surface-muted text-text-muted'}`}>
                      <Moon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-tight">Dark Mode</div>
                      <div className="text-[10px] text-text-muted mt-0.5">Obsidian night</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const nextPrefs = { ...prefsData, theme: 'system' as const };
                      setPrefsData(nextPrefs);
                      applyThemePreview('system');
                    }}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-center transition-all cursor-pointer ${
                      prefsData.theme === 'system'
                        ? 'bg-accent-subtle border-accent text-accent shadow-sm ring-1 ring-accent'
                        : 'bg-surface hover:bg-surface-hover border-border text-text-secondary hover:text-text-primary'
                    }`}
                    id="theme-select-system"
                  >
                    <div className={`p-2 rounded-lg ${prefsData.theme === 'system' ? 'bg-accent text-accent-foreground' : 'bg-surface-muted text-text-muted'}`}>
                      <Monitor className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-tight">System</div>
                      <div className="text-[10px] text-text-muted mt-0.5">Auto sync OS</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Sound Settings */}
              <div className="p-4 bg-surface-muted border border-border rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-text-primary font-medium">
                    {prefsData.soundEnabled ? <Volume2 className="w-4 h-4 text-accent" /> : <VolumeX className="w-4 h-4 text-text-muted" />}
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
                    <div className="w-10 h-6 bg-surface-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                  </label>
                </div>

                {prefsData.soundEnabled && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-xs text-text-muted">
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
                      className="w-full accent-accent cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Keyboard Visualizer Toggle */}
              <div className="p-4 bg-surface-muted border border-border rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-medium text-text-primary">Show Keyboard Guide</span>
                  <p className="text-xs text-text-muted mt-0.5">
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
                  <div className="w-10 h-6 bg-surface-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>

              {/* Smooth Caret Toggle */}
              <div className="p-4 bg-surface-muted border border-border rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-medium text-text-primary">Smooth Caret Motion</span>
                  <p className="text-xs text-text-muted mt-0.5">
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
                  <div className="w-10 h-6 bg-surface-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>

              {/* Animated Hands Guide (Basic Lessons) */}
              <div className="p-4 bg-surface-muted border border-border rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-medium text-text-primary">Visual Animated Hands (Basic Lessons)</span>
                  <p className="text-xs text-text-muted mt-0.5">
                    Displays animated dual hands and tactile finger reach paths for Tier 1 Foundation lessons.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefsData.showAnimatedHandsInLessons !== false}
                    onChange={(e) => setPrefsData((prev) => ({ ...prev, showAnimatedHandsInLessons: e.target.checked }))}
                    className="sr-only peer"
                    id="animated-hands-toggle"
                  />
                  <div className="w-10 h-6 bg-surface-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>

              {/* Error Discipline Mode */}
              <div className="p-4 bg-surface-muted border border-border rounded-xl space-y-3">
                <div>
                  <span className="font-medium text-text-primary">Error Navigation & Discipline</span>
                  <p className="text-xs text-text-muted mt-0.5">
                    Choose how the typing engine handles mistakes and backspacing.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPrefsData((prev) => ({ ...prev, errorMode: 'standard' }))}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      (prefsData.errorMode || 'standard') === 'standard'
                        ? 'bg-accent-subtle border-accent text-accent ring-1 ring-accent'
                        : 'bg-surface hover:bg-surface-hover border-border text-text-secondary'
                    }`}
                  >
                    <div className="text-xs font-bold">Standard</div>
                    <div className="text-[10px] text-text-muted mt-0.5">Free backspacing and error correction</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrefsData((prev) => ({ ...prev, errorMode: 'stop-on-error' }))}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      prefsData.errorMode === 'stop-on-error'
                        ? 'bg-accent-subtle border-accent text-accent ring-1 ring-accent'
                        : 'bg-surface hover:bg-surface-hover border-border text-text-secondary'
                    }`}
                  >
                    <div className="text-xs font-bold">Stop on Error</div>
                    <div className="text-[10px] text-text-muted mt-0.5">Must correct mistakes before moving forward</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrefsData((prev) => ({ ...prev, errorMode: 'confidence' }))}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      prefsData.errorMode === 'confidence'
                        ? 'bg-accent-subtle border-accent text-accent ring-1 ring-accent'
                        : 'bg-surface hover:bg-surface-hover border-border text-text-secondary'
                    }`}
                  >
                    <div className="text-xs font-bold">Confidence Mode</div>
                    <div className="text-[10px] text-text-muted mt-0.5">No backspacing allowed; pure momentum</div>
                  </button>
                </div>

                {/* Quick Word Skip on Space */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-text-primary">Quick Word Skip on Space</span>
                    <p className="text-[11px] text-text-muted">Pressing Space mid-word skips immediately to the next word.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefsData.quickWordSkip ?? true}
                      onChange={(e) => setPrefsData((prev) => ({ ...prev, quickWordSkip: e.target.checked }))}
                      className="sr-only peer"
                      id="quick-word-skip-toggle"
                    />
                    <div className="w-10 h-6 bg-surface-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                  </label>
                </div>
              </div>

              {/* Viewport Transition Mode */}
              <div className="p-4 bg-surface-muted border border-border rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-medium text-text-primary">Fixed 3-Line Sliding Window</span>
                  <p className="text-xs text-text-muted mt-0.5">
                    Keeps active text anchored on line 2 with smooth line promotions, avoiding vertical viewport jump.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(prefsData.viewportMode || '3-line') === '3-line'}
                    onChange={(e) =>
                      setPrefsData((prev) => ({
                        ...prev,
                        viewportMode: e.target.checked ? '3-line' : 'scrolling',
                      }))
                    }
                    className="sr-only peer"
                    id="viewport-mode-toggle"
                  />
                  <div className="w-10 h-6 bg-surface-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>

              {/* Ghost Pacer Toggle */}
              <div className="p-4 bg-surface-muted border border-border rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-medium text-text-primary">Real-Time Ghost PB Pacer</span>
                  <p className="text-xs text-text-muted mt-0.5">
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
                  <div className="w-10 h-6 bg-surface-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* Cadence Metronome & Rhythm Pacer Section */}
              <div className="p-4 bg-surface-muted border border-border rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-text-primary">Cadence Metronome & Rhythm Pacer</span>
                    <p className="text-xs text-text-muted mt-0.5">
                      Rhythmic audio ticks that stabilize keystroke cadence and prevent rushing or stuttering.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefsData.cadenceMetronomeEnabled ?? false}
                      onChange={(e) => setPrefsData((prev) => ({ ...prev, cadenceMetronomeEnabled: e.target.checked }))}
                      className="sr-only peer"
                      id="cadence-metronome-toggle"
                    />
                    <div className="w-10 h-6 bg-surface-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                  </label>
                </div>

                {prefsData.cadenceMetronomeEnabled && (
                  <div className="pt-3 border-t border-border/60 space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-text-secondary">Target Metronome Speed</span>
                      <span className="font-mono text-xs font-bold text-accent">{prefsData.cadenceTargetWpm || 60} WPM</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="140"
                      step="5"
                      value={prefsData.cadenceTargetWpm || 60}
                      onChange={(e) => setPrefsData((prev) => ({ ...prev, cadenceTargetWpm: Number(e.target.value) }))}
                      className="w-full accent-accent cursor-pointer"
                    />

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-text-secondary">Metronome Volume</span>
                      <span className="font-mono text-xs text-text-muted">{Math.round((prefsData.cadenceMetronomeVolume ?? 0.15) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="0.4"
                      step="0.02"
                      value={prefsData.cadenceMetronomeVolume ?? 0.15}
                      onChange={(e) => setPrefsData((prev) => ({ ...prev, cadenceMetronomeVolume: Number(e.target.value) }))}
                      className="w-full accent-accent cursor-pointer"
                    />

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className="text-xs font-medium text-text-primary">Visual Cadence Bar</span>
                        <p className="text-[11px] text-text-muted">Real-time rhythm indicator (Locked In, Smooth, Rushing, Stuttering).</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={prefsData.cadenceVisualPacer ?? true}
                          onChange={(e) => setPrefsData((prev) => ({ ...prev, cadenceVisualPacer: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-surface-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent"></div>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Nitro Racer AI Challenger Twin */}
              <div className="p-4 bg-surface-muted border border-border rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-medium text-text-primary">Nitro Racer &quot;Challenger Twin&quot; Ghost</span>
                  <p className="text-xs text-text-muted mt-0.5">
                    Spawns an AI competitor that mirrors and challenges your real-time pace with humanized acceleration curves.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefsData.challengerTwinEnabled ?? true}
                    onChange={(e) => setPrefsData((prev) => ({ ...prev, challengerTwinEnabled: e.target.checked }))}
                    className="sr-only peer"
                    id="challenger-twin-toggle"
                  />
                  <div className="w-10 h-6 bg-surface-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface-muted/50 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setFormData({ ...aiSettings });
              setPrefsData({ ...preferences });
              applyThemePreview(preferences.theme || 'dark');
            }}
            className="text-xs text-text-muted hover:text-text-primary font-medium cursor-pointer"
          >
            Reset Changes
          </button>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCloseAndRevert}
              className="px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary rounded-xl hover:bg-surface-hover transition-colors border border-border cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="px-5 py-2 text-xs font-semibold text-accent-foreground bg-accent hover:bg-accent-hover rounded-xl transition-colors shadow-glow-accent-sm"
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
