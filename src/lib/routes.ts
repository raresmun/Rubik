export type Screen = 'home' | 'lessons' | 'physical' | 'session' | 'progress' | 'parents';

const paths: Record<Screen, string> = {
  home: '/', lessons: '/lessons', physical: '/physical', session: '/practice',
  progress: '/progress', parents: '/parents',
};

/** The path is the screen; saved activity data remains in IndexedDB. */
export function readScreen(pathname = window.location.pathname): Screen {
  const path = pathname.replace(/\/+$/, '') || '/';
  return (Object.keys(paths) as Screen[]).find(screen => paths[screen] === path) ?? 'home';
}

/** Do not add duplicate entries, or push a new entry while handling Back/Forward. */
export function writeScreen(screen: Screen, replace = false): void {
  const path = paths[screen];
  if (window.location.pathname === path) return;
  if (replace) window.history.replaceState(null, '', path);
  else window.history.pushState(null, '', path);
}
