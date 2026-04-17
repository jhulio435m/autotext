import { STORAGE_KEYS } from '../constants/storage';

function hasStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export const AUTH_EXPIRED_EVENT = 'techdoc:auth-expired';

export function getSessionToken() {
  if (!hasStorage()) return '';
  return window.localStorage.getItem(STORAGE_KEYS.authToken) || window.sessionStorage.getItem(STORAGE_KEYS.authToken) || '';
}

export function setSessionToken(token, remember = true) {
  if (!hasStorage()) return;
  if (!token) return;

  if (remember) {
    window.localStorage.setItem(STORAGE_KEYS.authToken, token);
    window.sessionStorage.removeItem(STORAGE_KEYS.authToken);
  } else {
    window.sessionStorage.setItem(STORAGE_KEYS.authToken, token);
    window.localStorage.removeItem(STORAGE_KEYS.authToken);
  }
}

export function clearSessionToken() {
  if (!hasStorage()) return;
  window.localStorage.removeItem(STORAGE_KEYS.authToken);
  window.sessionStorage.removeItem(STORAGE_KEYS.authToken);
}

export function notifyAuthExpired(detail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT, { detail }));
}
