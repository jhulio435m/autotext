import { nanoid } from 'nanoid';
import { clearSessionToken } from '../../api/session';
import { STORAGE_KEYS, hasStorage } from '../helpers';

function createSessionSlice(set) {
  return {
    setCurrentUser: (user) => {
      if (hasStorage) {
        if (user) window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
        else window.localStorage.removeItem(STORAGE_KEYS.user);
      }
      set({ currentUser: user });
    },

    logout: () => {
      clearSessionToken();
      if (hasStorage) {
        window.localStorage.removeItem(STORAGE_KEYS.user);
      }
      set({ currentUser: null, workspaceHydrated: false });
    },

    setActiveMode: (mode) => set({ activeMode: mode }),

    setSaveStatus: (status) => set({ saveStatus: status }),

    setWorkspaceHydrated: (workspaceHydrated) => set({ workspaceHydrated: Boolean(workspaceHydrated) }),

    pushToast: (message, type = 'info') => {
      const id = `toast_${nanoid(12)}`;
      set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
      return id;
    },

    removeToast: (id) => {
      set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
    },

    markUnsaved: () => set({ saveStatus: 'unsaved' })
  };
}

export { createSessionSlice };
