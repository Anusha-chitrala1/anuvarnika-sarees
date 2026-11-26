import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, ShieldCheck, ArrowRight, RefreshCw, KeyRound } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore.js';

export const AuthOtpModal: React.FC = () => {
  const { isOtpModalOpen, closeLoginModal, sendOtp, verifyOtp } = useAuthStore();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);

  // Sync dialog visibility with Zustand store
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOtpModalOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
      // Reset state on close
      setStep('email');
      setOtp(['', '', '', '', '', '']);
      setDevOtp(null);
      setErrorMessage(null);
    }
  }, [isOtpModalOpen]);

  // Handle countdown timer for OTP re-send
  useEffect(() => {
    if (step !== 'otp' || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [step, countdown]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await sendOtp(email.trim(), name.trim() || undefined);
      if (res.devOtp) {
        setDevOtp(res.devOtp);
      }
      setStep('otp');
      setCountdown(60);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto advance focus
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }

    // Auto submit if all 6 filled
    if (index === 5 && value) {
      const fullCode = newOtp.join('');
      if (fullCode.length === 6) {
        submitOtp(fullCode);
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const submitOtp = async (fullOtpCode: string) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      await verifyOtp(email.trim(), fullOtpCode, name.trim() || undefined);
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed. Please check the code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoFillDevOtp = () => {
    if (devOtp && devOtp.length === 6) {
      const digits = devOtp.split('');
      setOtp(digits);
      submitOtp(devOtp);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={(e) => {
        e.preventDefault();
        closeLoginModal();
      }}
      aria-labelledby="auth-modal-title"
      className="p-0 rounded-2xl bg-surface border border-accent/30 shadow-2xl backdrop:bg-ink-primary/60 max-w-md w-[calc(100%-2rem)] mx-auto"
    >
      <div className="p-6 sm:p-8 space-y-6">
        {/* Header with Close */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 id="auth-modal-title" className="font-serif text-2xl font-semibold text-primary">
                {step === 'email' ? 'Sign In / Register' : 'Verify Your Email'}
              </h2>
              <p className="text-xs text-ink-muted">
                {step === 'email'
                  ? 'Enter your email to receive a secure one-time passcode'
                  : `Enter the 6-digit code sent to ${email}`}
              </p>
            </div>
          </div>
          <button
            onClick={closeLoginModal}
            className="p-1 rounded-full text-ink-muted hover:text-primary transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="bg-red-50 text-red-800 text-xs p-3 rounded-lg border border-red-200">
            {errorMessage}
          </div>
        )}

        {/* Dev OTP helper badge if available */}
        {devOtp && step === 'otp' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between text-xs text-amber-900">
            <div>
              <span className="font-semibold">Dev Test OTP:</span>{' '}
              <code className="font-mono font-bold text-primary tracking-widest">{devOtp}</code>
            </div>
            <button
              onClick={handleAutoFillDevOtp}
              className="bg-amber-600 text-white px-2.5 py-1 rounded text-[11px] font-semibold hover:bg-amber-700 transition"
            >
              Fill & Verify
            </button>
          </div>
        )}

        {/* Step 1: Email Form */}
        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink-primary mb-1">
                Your Full Name (Optional)
              </label>
              <input
                type="text"
                placeholder="Priya Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-canvas border border-accent/30 text-ink-primary focus:outline-none focus:border-primary transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-primary mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="priya@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-lg bg-canvas border border-accent/30 text-ink-primary focus:outline-none focus:border-primary transition"
                />
                <Mail className="w-4 h-4 text-ink-muted absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full bg-primary text-canvas py-3 rounded-lg text-sm font-semibold hover:bg-primary-hover shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-accent" />
              ) : (
                <>
                  <span>Send Verification Code</span>
                  <ArrowRight className="w-4 h-4 text-accent" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Step 2: 6-Digit OTP Inputs */
          <div className="space-y-6">
            <div className="flex justify-between gap-2">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-input-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  autoFocus={idx === 0}
                  className="w-12 h-14 text-center font-mono text-2xl font-bold rounded-lg bg-canvas border-2 border-accent/30 text-primary focus:border-primary focus:outline-none transition"
                />
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-ink-muted">
              <button
                type="button"
                onClick={() => setStep('email')}
                className="hover:text-primary transition underline"
              >
                Change Email
              </button>

              {countdown > 0 ? (
                <span>Resend code in {countdown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="text-primary font-semibold hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3 text-accent" />
                  <span>Send Code Again</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => submitOtp(otp.join(''))}
              disabled={isLoading || otp.join('').length !== 6}
              className="w-full bg-primary text-canvas py-3 rounded-lg text-sm font-semibold hover:bg-primary-hover shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-accent" />
              ) : (
                <>
                  <KeyRound className="w-4 h-4 text-accent" />
                  <span>Verify Code & Continue</span>
                </>
              )}
            </button>
          </div>
        )}

        <div className="text-center pt-2 border-t border-accent/15">
          <p className="text-[11px] text-ink-muted">
            By signing in, you agree to AnuVarnika's Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </dialog>
  );
};
