/** Espelha ReportScope do backend. */
export enum ReportScope {
  LOCAL = 'local',
  CONSOLIDATED = 'consolidated',
}

export type ReportScopeParam = ReportScope | undefined;

export function reportScopeParam(consolidated: boolean): ReportScopeParam {
  return consolidated ? ReportScope.CONSOLIDATED : undefined;
}
