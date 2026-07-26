import type { IHelpVideo } from '@interfaces/IHelpVideo';

export function normalizeAppPath(url: string): string {
  const withoutQuery = url.split('?')[0] ?? '';
  const withoutHash = withoutQuery.split('#')[0] ?? '';
  if (!withoutHash || withoutHash === '/') {
    return withoutHash;
  }
  return withoutHash.endsWith('/') ? withoutHash.slice(0, -1) : withoutHash;
}

export function resolveHelpVideoByUrl(path: string, videos: readonly IHelpVideo[]): IHelpVideo | null {
  if (!path || videos.length === 0) {
    return null;
  }

  const sorted = [...videos]
    .filter((video) => video.route)
    .sort((left, right) => right.route.length - left.route.length);

  for (const video of sorted) {
    if (path === video.route || path.startsWith(`${video.route}/`)) {
      return video;
    }
  }

  return null;
}
