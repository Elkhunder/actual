import React, { ReactNode, useContext } from 'react';

import { useViewportSize } from '@react-aria/utils';

import { breakpoints } from './tokens';

type TResponsiveContext = {
  atLeastSmallWidth: boolean;
  atLeastMediumWidth: boolean;
  isNarrowWidth: boolean;
  isSmallWidth: boolean;
  isMediumWidth: boolean;
  isWideWidth: boolean;
};

const ResponsiveContext = React.createContext<TResponsiveContext>(null);

export function ResponsiveProvider(props: { children: ReactNode }) {
  /*
   * Ensure we render on every viewport size change,
   * even though we're interested in document.documentElement.client<Width|Height>
   * clientWidth/Height are the document size, do not change on pinch-zoom,
   * and are what our `min-width` media queries are reading
   * Viewport size changes on pinch-zoom, which may be useful later when dealing with on-screen keyboards
   */
  useViewportSize();

  const width = document.documentElement.clientWidth;

  // Possible view modes: narrow, small, medium, wide
  const viewportInfo = {
    atLeastSmallWidth: width >= breakpoints.small,
    atLeastMediumWidth: width >= breakpoints.medium,
    isNarrowWidth: width < breakpoints.small,
    isSmallWidth: width >= breakpoints.small && width < breakpoints.medium,
    isMediumWidth: width >= breakpoints.medium && width < breakpoints.wide,
    isWideWidth: width >= breakpoints.wide,
  };

  return (
    <ResponsiveContext.Provider value={viewportInfo}>
      {props.children}
    </ResponsiveContext.Provider>
  );
}

export function useResponsive() {
  return useContext(ResponsiveContext);
}
