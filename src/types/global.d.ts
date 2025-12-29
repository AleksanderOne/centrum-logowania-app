export {};

declare global {
  interface Window {
    e2eLogin?: (email: string) => void;
  }
}
