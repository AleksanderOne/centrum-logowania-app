import '@testing-library/jest-dom';
import ResizeObserver from 'resize-observer-polyfill';
import { TextEncoder, TextDecoder } from 'util';

global.ResizeObserver = ResizeObserver;
global.TextEncoder = TextEncoder as unknown as typeof global.TextEncoder;
global.TextDecoder = TextDecoder as unknown as typeof global.TextDecoder;

// Mock DOMRect for Radix UI
global.DOMRect = {
  fromRect: () => ({
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    toJSON: () => {},
  }),
} as unknown as typeof DOMRect;
