import { describe, expect, it } from 'vitest';

import { viewport } from '../layout';

describe('app layout viewport', () => {
  it('exports mobile-friendly viewport settings', () => {
    expect(viewport).toMatchObject({
      width: 'device-width',
      initialScale: 1,
      viewportFit: 'cover',
    });
  });
});
