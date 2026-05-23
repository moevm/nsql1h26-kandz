import type { ReactNode } from 'react';
import { createElement, Fragment } from 'react';

export const AnimatePresence = ({ children }: { children?: ReactNode }) =>
  createElement(Fragment, null, children);

const createMotionStub = () => {
  return ({ children, ...rest }: { children?: ReactNode }) =>
    createElement('div', rest as Record<string, unknown>, children);
};

export const motion = new Proxy(
  {},
  {
    get: () => createMotionStub(),
  },
) as Record<string, ({ children, ...rest }: { children?: ReactNode }) => unknown>;
