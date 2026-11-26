import { create } from 'zustand';
import { UserDTO } from '@anuvarnika/shared';
import { api } from '../lib/api.js';

interface AuthState {
  user: UserDTO | null;
  isLoading: boolean;
  isOtpModalOpen: boolean;
  onSuccessCallback: (() => void) | null;
  openLoginModal: (onSuccess?: () => void) => void;
  openAuthModal: (onSuccess?: () => void) => void;
  closeLoginModal: () => void;
  closeAuthModal: () => void;
  fetchMe: () => Promise<void>;
  checkAuth: () => Promise<void>;
  sendOtp: (email: string, name?: string) => Promise<{ success: boolean; message: string; devOtp?: string }>;
  verifyOtp: (email: string, otp: string, name?: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isOtpModalOpen: false,
  onSuccessCallback: null,

  openLoginModal: (onSuccess) =>
    set({ isOtpModalOpen: true, onSuccessCallback: onSuccess || null }),

  openAuthModal: (onSuccess) =>
    set({ isOtpModalOpen: true, onSuccessCallback: onSuccess || null }),

  closeLoginModal: () => set({ isOtpModalOpen: false, onSuccessCallback: null }),
  closeAuthModal: () => set({ isOtpModalOpen: false, onSuccessCallback: null }),

  checkAuth: async () => {
    return get().fetchMe();
  },

  fetchMe: async () => {
    try {
      set({ isLoading: true });
      const data = await api.getMe();
      set({ user: data.user });
    } catch {
      set({ user: null });
    } finally {
      set({ isLoading: false });
    }
  },

  sendOtp: async (email, name) => {
    return await api.sendOtp(email, name);
  },

  verifyOtp: async (email, otp, name) => {
    const data = await api.verifyOtp(email, otp, name);
    if (data.user) {
      set({ user: data.user, isOtpModalOpen: false });
      const cb = get().onSuccessCallback;
      if (cb) {
        cb();
        set({ onSuccessCallback: null });
      }
      return true;
    }
    return false;
  },

  logout: async () => {
    await api.logout();
    set({ user: null });
  },
}));
