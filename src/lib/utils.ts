import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAppUrl() {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  // @ts-ignore
  return import.meta.env?.VITE_APP_URL || '';
}
