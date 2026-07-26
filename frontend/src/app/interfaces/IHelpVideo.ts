export interface IHelpVideo {
  featureId: string;
  route: string;
  path: string;
  titleKey: string;
  recordedAt?: string;
  durationMs?: number | null;
}

export interface IHelpVideoManifest {
  version: string;
  locale: string;
  videos: IHelpVideo[];
}
