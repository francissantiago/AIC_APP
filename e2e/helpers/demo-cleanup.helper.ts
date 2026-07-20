import { ApiClient } from './api-client.helper';

export interface DemoCleanupState {
  announcementIds: string[];
  memberIds: string[];
  familyIds: string[];
  ministryIds: string[];
  classIds: string[];
  smallGroupIds: string[];
  branchCongregationIds: string[];
  financialEntryIds: string[];
  assetIds: string[];
  calendarEventIds: string[];
  visitorIds: string[];
  attendanceIds: string[];
  documentIds: string[];
  scheduleAssignmentIds: string[];
  restoreCongregationName?: string;
}

export function createDemoCleanupState(): DemoCleanupState {
  return {
    announcementIds: [],
    memberIds: [],
    familyIds: [],
    ministryIds: [],
    classIds: [],
    smallGroupIds: [],
    branchCongregationIds: [],
    financialEntryIds: [],
    assetIds: [],
    calendarEventIds: [],
    visitorIds: [],
    attendanceIds: [],
    documentIds: [],
    scheduleAssignmentIds: [],
  };
}

export async function cleanupDemoState(state: DemoCleanupState): Promise<void> {
  let api: ApiClient;
  try {
    api = await ApiClient.asAdmin();
  } catch {
    return;
  }

  for (const id of state.scheduleAssignmentIds.splice(0)) {
    await api.deleteScheduleAssignment(id).catch(() => undefined);
  }
  for (const id of state.calendarEventIds.splice(0)) {
    await api.deleteCalendarEvent(id).catch(() => undefined);
  }
  for (const id of state.documentIds.splice(0)) {
    await api.deleteDocument(id).catch(() => undefined);
  }
  for (const id of state.attendanceIds.splice(0)) {
    await api.deleteAttendance(id).catch(() => undefined);
  }
  for (const id of state.visitorIds.splice(0)) {
    await api.deleteVisitor(id).catch(() => undefined);
  }
  for (const id of state.financialEntryIds.splice(0)) {
    await api.deleteFinancialEntry(id).catch(() => undefined);
  }
  for (const id of state.assetIds.splice(0)) {
    await api.deleteAsset(id).catch(() => undefined);
  }
  for (const id of state.classIds.splice(0)) {
    await api.deleteClass(id).catch(() => undefined);
  }
  for (const id of state.smallGroupIds.splice(0)) {
    await api.deleteSmallGroup(id).catch(() => undefined);
  }
  for (const id of state.ministryIds.splice(0)) {
    await api.deleteMinistry(id).catch(() => undefined);
  }
  for (const id of state.familyIds.splice(0)) {
    await api.deleteFamily(id).catch(() => undefined);
  }
  for (const id of state.memberIds.splice(0)) {
    await api.deleteMember(id).catch(() => undefined);
  }
  for (const id of state.branchCongregationIds.splice(0)) {
    await api.deleteCongregation(id).catch(() => undefined);
  }
  for (const id of state.announcementIds.splice(0)) {
    await api.deleteAnnouncement(id).catch(() => undefined);
  }
  if (state.restoreCongregationName) {
    await api.updateCongregationBase({ name: state.restoreCongregationName }).catch(() => undefined);
    state.restoreCongregationName = undefined;
  }
}

export async function waitForResourceId(
  finder: () => Promise<string | null>,
  label: string,
): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const id = await finder();
    if (id) {
      return id;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${label} não encontrado após criação na UI`);
}
