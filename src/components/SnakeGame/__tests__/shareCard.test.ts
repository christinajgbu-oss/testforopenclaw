import { createElement, isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ShareCard } from '../ShareCard';
import type { ShareCardProps } from '../types';

const html2canvasMock = vi.fn();

vi.mock('html2canvas', () => ({
  default: html2canvasMock,
}), { virtual: true });

function createProps(overrides: Partial<ShareCardProps> = {}): ShareCardProps {
  return {
    score: 42,
    skinId: 'default',
    achievementIds: ['first_bite', 'comeback_kid', 'speedster'],
    durationSeconds: 204,
    onClose: vi.fn(),
    onRestart: vi.fn(),
    ...overrides,
  };
}

function flattenElements(node: unknown): Array<ReactElementLike> {
  if (!isValidElement(node)) {
    return [];
  }

  const element = node as ReactElementLike;
  const children = element.props.children;
  const nextChildren = Array.isArray(children) ? children : [children];

  return [
    element,
    ...nextChildren.flatMap((child) => flattenElements(child)),
  ];
}

function findElementByTestId(tree: unknown, testId: string): ReactElementLike {
  const element = flattenElements(tree).find(
    (entry) => entry.props['data-testid'] === testId,
  );

  if (!element) {
    throw new Error(`Element with test id "${testId}" not found.`);
  }

  return element;
}

type ReactElementLike = {
  type: unknown;
  props: Record<string, unknown> & {
    children?: unknown;
    onClick?: (event?: unknown) => unknown;
  };
};

describe('ShareCard', () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;

  beforeEach(() => {
    html2canvasMock.mockReset();
  });

  afterEach(() => {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  });

  it('renders the score, skin, achievements, and duration details', () => {
    const markup = renderToStaticMarkup(createElement(ShareCard, createProps()));

    expect(markup).toContain('本局结束');
    expect(markup).toContain('经典绿');
    expect(markup).toContain('42');
    expect(markup).toContain('First Bite');
    expect(markup).toContain('Comeback Kid');
    expect(markup).toContain('Speedster');
    expect(markup).toContain('游戏时长 03:24');
  });

  it('captures the card and triggers a download when saving the image', async () => {
    const downloadLink = {
      click: vi.fn(),
      download: '',
      href: '',
    };
    const createElementMock = vi.fn(() => downloadLink);
    const fakeCardNode = { id: 'share-card' };
    const toDataURL = vi.fn(() => 'data:image/png;base64,abc');

    globalThis.document = {
      createElement: createElementMock,
    } as unknown as Document;
    globalThis.window = {} as Window & typeof globalThis;

    html2canvasMock.mockResolvedValue({
      toDataURL,
    });

    const tree = ShareCard(createProps());
    const saveButton = findElementByTestId(tree, 'share-card-save');

    await saveButton.props.onClick?.({
      currentTarget: {
        closest: vi.fn(() => fakeCardNode),
      },
    });

    expect(html2canvasMock).toHaveBeenCalledWith(fakeCardNode, {
      backgroundColor: null,
      scale: 2,
    });
    expect(createElementMock).toHaveBeenCalledWith('a');
    expect(downloadLink.download).toContain('snake-share-default-42');
    expect(downloadLink.href).toBe('data:image/png;base64,abc');
    expect(downloadLink.click).toHaveBeenCalledTimes(1);
  });

  it('opens the expected Twitter intent URL', () => {
    const openMock = vi.fn();

    globalThis.window = {
      open: openMock,
    } as unknown as Window & typeof globalThis;

    const tree = ShareCard(createProps());
    const twitterButton = findElementByTestId(tree, 'share-card-twitter');

    twitterButton.props.onClick?.();

    expect(openMock).toHaveBeenCalledWith(
      'https://twitter.com/intent/tweet?text=' +
        encodeURIComponent('我在贪吃蛇增强版中拿到了 42 分，用时 03:24。testforopenclaw.pages.dev'),
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('calls onClose when the close button is pressed', () => {
    const onClose = vi.fn();
    const tree = ShareCard(createProps({ onClose }));
    const closeButton = findElementByTestId(tree, 'share-card-close');

    closeButton.props.onClick?.();

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
