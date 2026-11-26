import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { api } from '../lib/api.js';

export interface SavedLocation {
  state: string;
  pincode?: string;
  serviceable: boolean;
  message: string;
}

const STORAGE_KEY = 'anuvarnika_user_location';

interface LocationPromptModalProps {
  isOpenExternal?: boolean;
  onCloseExternal?: () => void;
  onLocationSelected?: (loc: SavedLocation) => void;
}

export const LocationPromptModal: React.FC<LocationPromptModalProps> = ({
  isOpenExternal,
  onCloseExternal,
  onLocationSelected,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      const timer = setTimeout(() => setIsOpen(true), 700);
      return () => clearTimeout(timer);
    } else if (onLocationSelected) {
      try {
        onLocationSelected(JSON.parse(saved));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (isOpenExternal) {
      setIsOpen(true);
    }
  }, [isOpenExternal]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [isOpen]);

  const closeModal = () => {
    setIsOpen(false);
    onCloseExternal?.();
  };

  const verifyAndSavePin = async (pin: string) => {
    try {
      setIsChecking(true);
      const res = await api.checkPincode(pin);
      const loc: SavedLocation = {
        state: res.state || 'Service Check',
        pincode: pin,
        serviceable: res.serviceable,
        message: res.message,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
      onLocationSelected?.(loc);
      setStatusMsg({ ok: res.serviceable, text: res.message });
      if (res.serviceable) {
        setTimeout(closeModal, 1100);
      }
    } catch (err: any) {
      setStatusMsg({ ok: false, text: err.message || 'Unable to verify PIN code.' });
    } finally {
      setIsChecking(false);
    }
  };

  const handlePinCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = pinCode.trim();
    if (!/^\d{6}$/.test(cleaned)) {
      setStatusMsg({ ok: false, text: 'Please enter a valid 6-digit PIN code.' });
      return;
    }
    await verifyAndSavePin(cleaned);
  };

  const handleAllowLocation = () => {
    if (!('geolocation' in navigator)) {
      setStatusMsg({
        ok: false,
        text: 'Location access is unavailable in this browser. Please enter your 6-digit PIN code.',
      });
      return;
    }

    setIsDetectingGps(true);
    setStatusMsg(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );
          const geoData: any = await geoRes.json();
          const detectedPin = String(geoData?.address?.postcode || '').replace(/\D/g, '').slice(0, 6);

          if (/^\d{6}$/.test(detectedPin)) {
            setPinCode(detectedPin);
            await verifyAndSavePin(detectedPin);
          } else {
            setStatusMsg({
              ok: false,
              text: 'Could not detect a 6-digit PIN from your GPS coordinates. Please enter your PIN code below.',
            });
          }
        } catch {
          setStatusMsg({
            ok: false,
            text: 'Unable to look up PIN code from your location. Please enter it manually.',
          });
        } finally {
          setIsDetectingGps(false);
        }
      },
      () => {
        setIsDetectingGps(false);
        setStatusMsg({
          ok: false,
          text: 'Location permission was denied. Please enter your 6-digit PIN code below.',
        });
      },
      { timeout: 8000 }
    );
  };

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as any)}
      onCancel={(e) => {
        e.preventDefault();
        closeModal();
      }}
      aria-labelledby="location-modal-title"
      className="p-0 rounded-3xl bg-surface border border-accent/40 shadow-2xl max-w-md w-[calc(100%-2rem)] mx-auto overflow-hidden"
    >
      <div className="p-6 sm:p-7 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 id="location-modal-title" className="font-serif text-xl font-semibold text-primary">
                Check Delivery Availability
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Enter your PIN code or allow location access to verify delivery
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="p-1.5 rounded-full text-ink-muted hover:text-primary hover:bg-canvas transition"
            aria-label="Close location modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Allow Location Access */}
        <button
          type="button"
          onClick={handleAllowLocation}
          disabled={isDetectingGps || isChecking}
          className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-primary/10 hover:bg-primary/15 border border-primary/25 text-primary text-sm font-semibold transition active:scale-[0.98] disabled:opacity-60"
        >
          <Navigation className={`w-4 h-4 ${isDetectingGps ? 'animate-spin' : ''}`} />
          <span>{isDetectingGps ? 'Detecting your PIN code...' : 'Use My Current Location'}</span>
        </button>

        <div className="flex items-center gap-3 text-[11px] uppercase tracking-widest text-ink-muted">
          <span className="h-px flex-1 bg-accent/20" />
          <span>or</span>
          <span className="h-px flex-1 bg-accent/20" />
        </div>

        {/* Enter PIN Code */}
        <form onSubmit={handlePinCheck} className="space-y-2.5">
          <label htmlFor="location-pin-input" className="block text-xs font-semibold text-ink-primary">
            Enter 6-Digit Delivery PIN Code
          </label>
          <div className="flex gap-2">
            <input
              id="location-pin-input"
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              placeholder="e.g. 500001"
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
              className="flex-1 px-4 py-2.5 rounded-xl bg-canvas border border-accent/30 text-sm font-mono focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={isChecking || isDetectingGps || pinCode.length !== 6}
              className="px-5 py-2.5 rounded-xl bg-primary text-canvas text-xs font-semibold hover:bg-primary-hover transition disabled:opacity-50"
            >
              {isChecking ? 'Checking...' : 'Check'}
            </button>
          </div>
        </form>

        {statusMsg && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
              statusMsg.ok
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-amber-50 text-amber-900 border border-amber-200'
            }`}
          >
            {statusMsg.ok ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
            )}
            <span className="leading-relaxed">{statusMsg.text}</span>
          </div>
        )}
      </div>
    </dialog>
  );
};
