import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ClaLogo } from './cla-logo';

describe('ClaLogo', () => {
  it('renderuje logo bez błędów', () => {
    const { container } = render(<ClaLogo />);
    // Logo is usually an svg or div
    expect(container).toBeDefined();
  });

  it('akceptuje className', () => {
    const { container } = render(<ClaLogo className="test-class" />);
    // Class is applied to the wrapper div
    expect(container.firstChild).toHaveClass('test-class');
  });
});
