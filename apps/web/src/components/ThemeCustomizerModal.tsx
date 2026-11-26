import React, { useRef, useEffect, useState } from 'react';
import { X, Check, Save, Sparkles, Undo2 } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore.js';
import { DEFAULT_THEME_TOKENS } from '@anuvarnika/shared';

export const ThemeCustomizerModal: React.FC = () => {
  const {
    theme,
    presets,
    isCustomizerOpen,
    toggleCustomizer,
    setTheme,
    applyPreset,
    saveThemeToD1,
  } = useThemeStore();

  const dialogRef = useRef<HTMLDialogElement>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isCustomizerOpen) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [isCustomizerOpen]);

  const handleColorChange = (key: keyof typeof theme.colors, value: string) => {
    setTheme({
      colors: {
        ...theme.colors,
        [key]: value,
      },
    });
  };

  const handleSave = async () => {
    setSaveStatus('Saving...');
    const ok = await saveThemeToD1();
    if (ok) {
      setSaveStatus('Theme Saved!');
      setTimeout(() => setSaveStatus(null), 2500);
    } else {
      setSaveStatus('Failed to save (Admin only)');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        toggleCustomizer();
      }}
      aria-labelledby="theme-modal-title"
      className="p-0 rounded-2xl bg-surface border border-accent/40 shadow-2xl backdrop:bg-ink-primary/60 max-w-lg w-[calc(100%-2rem)] mx-auto"
    >
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-accent/20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Sparkles className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h2 id="theme-modal-title" className="font-serif text-xl font-semibold text-primary">
                Theme Studio & Palette Engine
              </h2>
              <p className="text-[11px] text-ink-muted">
                Extracted from logo.jpeg • Live preview across storefront
              </p>
            </div>
          </div>
          <button
            onClick={toggleCustomizer}
            className="p-1 rounded-full text-ink-muted hover:text-primary transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Presets */}
        <div>
          <label className="block text-xs font-semibold text-ink-primary mb-2">
            Signature Palette Presets
          </label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(presets).map(([key, p]) => (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className={`flex items-center gap-2 p-2 rounded-lg border text-xs text-left transition ${
                  theme.activePreset === key
                    ? 'border-primary bg-primary/5 font-semibold text-primary'
                    : 'border-accent/20 hover:border-accent/50 text-ink-primary'
                }`}
              >
                <div className="flex -space-x-1">
                  <span className="w-3.5 h-3.5 rounded-full border border-white" style={{ backgroundColor: p.colors.brandPrimary }} />
                  <span className="w-3.5 h-3.5 rounded-full border border-white" style={{ backgroundColor: p.colors.brandAccent }} />
                  <span className="w-3.5 h-3.5 rounded-full border border-white" style={{ backgroundColor: p.colors.bgCanvas }} />
                </div>
                <span className="capitalize">{key.replace('-', ' ')}</span>
                {theme.activePreset === key && <Check className="w-3.5 h-3.5 text-primary ml-auto" />}
              </button>
            ))}
          </div>
        </div>

        {/* Individual Color Customizers */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-ink-primary">
            Logo Palette Tokens (Hex Pickers)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Brand Primary */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-canvas border border-accent/20">
              <span className="font-medium text-ink-primary">Primary Crimson</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={theme.colors.brandPrimary}
                  onChange={(e) => handleColorChange('brandPrimary', e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                />
                <span className="font-mono text-[11px] uppercase">{theme.colors.brandPrimary}</span>
              </div>
            </div>

            {/* Accent Gold */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-canvas border border-accent/20">
              <span className="font-medium text-ink-primary">Accent Gold/Brass</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={theme.colors.brandAccent}
                  onChange={(e) => handleColorChange('brandAccent', e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                />
                <span className="font-mono text-[11px] uppercase">{theme.colors.brandAccent}</span>
              </div>
            </div>

            {/* Secondary Blush */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-canvas border border-accent/20">
              <span className="font-medium text-ink-primary">Secondary Blush</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={theme.colors.brandSecondary}
                  onChange={(e) => handleColorChange('brandSecondary', e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                />
                <span className="font-mono text-[11px] uppercase">{theme.colors.brandSecondary}</span>
              </div>
            </div>

            {/* Background Canvas */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-canvas border border-accent/20">
              <span className="font-medium text-ink-primary">Warm Ivory Canvas</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={theme.colors.bgCanvas}
                  onChange={(e) => handleColorChange('bgCanvas', e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                />
                <span className="font-mono text-[11px] uppercase">{theme.colors.bgCanvas}</span>
              </div>
            </div>

            {/* Surface Card */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-canvas border border-accent/20">
              <span className="font-medium text-ink-primary">Card Surface</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={theme.colors.surfaceCard}
                  onChange={(e) => handleColorChange('surfaceCard', e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                />
                <span className="font-mono text-[11px] uppercase">{theme.colors.surfaceCard}</span>
              </div>
            </div>

            {/* Primary Ink */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-canvas border border-accent/20">
              <span className="font-medium text-ink-primary">Primary Ink</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={theme.colors.inkPrimary}
                  onChange={(e) => handleColorChange('inkPrimary', e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                />
                <span className="font-mono text-[11px] uppercase">{theme.colors.inkPrimary}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Typography & Rounding */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-ink-primary mb-1">Heading Font</label>
            <select
              value={theme.fonts.heading}
              onChange={(e) =>
                setTheme({ fonts: { ...theme.fonts, heading: e.target.value as any } })
              }
              className="w-full px-2.5 py-2 rounded-lg bg-canvas border border-accent/30 text-ink-primary font-medium"
            >
              <option value="Playfair Display">Playfair Display</option>
              <option value="Lora">Lora</option>
              <option value="Cormorant Garamond">Cormorant Garamond</option>
              <option value="Cinzel">Cinzel</option>
              <option value="Prata">Prata</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-ink-primary mb-1">UI / Body Font</label>
            <select
              value={theme.fonts.body}
              onChange={(e) =>
                setTheme({ fonts: { ...theme.fonts, body: e.target.value as any } })
              }
              className="w-full px-2.5 py-2 rounded-lg bg-canvas border border-accent/30 text-ink-primary font-medium"
            >
              <option value="Inter">Inter</option>
              <option value="DM Sans">DM Sans</option>
              <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
              <option value="Outfit">Outfit</option>
            </select>
          </div>
        </div>

        {/* Storefront Footer Visitor Counter Toggle */}
        <label className="flex items-center justify-between p-3 rounded-lg bg-canvas border border-accent/20 cursor-pointer text-xs">
          <div>
            <span className="font-semibold text-ink-primary block">Show Footer Visitor Counter</span>
            <span className="text-ink-muted text-[11px]">Display the total visitor badge in storefront footer</span>
          </div>
          <input
            type="checkbox"
            checked={theme.showVisitorCounter !== false}
            onChange={(e) => setTheme({ showVisitorCounter: e.target.checked })}
            className="w-4 h-4 accent-primary rounded cursor-pointer"
          />
        </label>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-accent/20">
          <button
            type="button"
            onClick={() => setTheme(DEFAULT_THEME_TOKENS)}
            className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-primary transition"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Reset to Logo Default</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 bg-primary text-canvas px-4 py-2 rounded-lg text-xs font-semibold hover:bg-primary-hover shadow transition"
          >
            <Save className="w-3.5 h-3.5 text-accent" />
            <span>{saveStatus || 'Save Theme'}</span>
          </button>
        </div>
      </div>
    </dialog>
  );
};
