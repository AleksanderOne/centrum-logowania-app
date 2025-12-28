import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function devLog(message: string, ...args: unknown[]) {
  if (process.env.NODE_ENV === 'development') {
    console.log(message, ...args); // eslint-disable-line no-console
  }
}
