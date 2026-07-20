import { loginViaApi } from './api-auth.helper';
import { getApiUrl } from './session.helper';

export interface RoleSummary {
  id: number;
  code: string;
  name: string;
}

export interface UserSummary {
  id: string;
  username: string;
  email: string;
}

export interface PermissionSummary {
  id: number;
  code: string;
}

export interface MemberSummary {
  id: string;
  fullName: string;
}

export interface FamilySummary {
  id: string;
  name: string;
}

export interface CalendarEventSummary {
  id: string;
  title: string;
  type: string;
  sourceMemberId: string | null;
}

export interface BirthdayReportItem {
  memberId: string;
  fullName: string;
  familyId: string;
  familyName: string;
}

export interface MinistrySummary {
  id: string;
  name: string;
}

export interface ClassSummary {
  id: string;
  name: string;
}

export interface SmallGroupSummary {
  id: string;
  name: string;
}

export interface SmallGroupMeetingSummary {
  id: string;
  meetingDate: string;
}

export interface CongregationSummary {
  id: string;
  name: string;
  type: string;
  status: string;
}

export interface FinancialCategorySummary {
  id: string;
  name: string;
  type: string;
  active: boolean;
}

export interface FinancialEntrySummary {
  id: string;
  description: string;
  type: string;
  amount: string;
  memberId: string | null;
}

export interface AssetSummary {
  id: string;
  name: string;
}

export interface VisitorSummary {
  id: string;
  fullName: string;
  memberId: string | null;
}

export interface AttendanceSummary {
  id: string;
  eventDate: string;
  totalPresent: number;
}

export interface DocumentSummary {
  id: string;
  title: string;
  hasAttachment?: boolean;
}

export interface ScheduleAssignmentSummary {
  id: string;
  memberId: string;
  roleLabel: string;
}

export interface AnnouncementSummary {
  id: string;
  title: string;
}

export class ApiClient {
  constructor(
    private readonly token: string,
    private readonly apiUrl = getApiUrl(),
  ) {}

  static async asAdmin(): Promise<ApiClient> {
    const email = process.env.E2E_ADMIN_EMAIL ?? 'admin@admin.com';
    const password = process.env.E2E_ADMIN_PASSWORD ?? '';
    if (!password) {
      throw new Error('E2E_ADMIN_PASSWORD não configurado.');
    }
    const { accessToken } = await loginViaApi(getApiUrl(), email, password);
    return new ApiClient(accessToken);
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${this.token}`,
    };
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.apiUrl}${path}`, {
      method,
      headers: this.headers(),
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API ${method} ${path} falhou (${response.status}): ${text}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  listRoles(): Promise<RoleSummary[]> {
    return this.request<RoleSummary[]>('GET', '/roles');
  }

  listPermissions(): Promise<PermissionSummary[]> {
    return this.request<PermissionSummary[]>('GET', '/permissions');
  }

  findRoleIdByCode(code: string): Promise<number> {
    return this.listRoles().then((roles) => {
      const role = roles.find((item) => item.code === code);
      if (!role) {
        throw new Error(`Papel ${code} não encontrado.`);
      }
      return role.id;
    });
  }

  createUser(payload: {
    username: string;
    email: string;
    fullName: string;
    password: string;
    status?: string;
    roleIds: number[];
  }): Promise<UserSummary> {
    return this.request<UserSummary>('POST', '/users', payload);
  }

  deleteUser(id: string): Promise<void> {
    return this.request<void>('DELETE', `/users/${id}`);
  }

  findUserIdByUsername(username: string): Promise<string | null> {
    return this.request<{ data: UserSummary[] }>('GET', `/users?q=${encodeURIComponent(username)}`).then(
      (response) => response.data.find((item) => item.username === username)?.id ?? null,
    );
  }

  createRole(payload: {
    code: string;
    name: string;
    description?: string | null;
    permissionIds?: number[];
  }): Promise<RoleSummary> {
    return this.request<RoleSummary>('POST', '/roles', payload);
  }

  deleteRole(id: number): Promise<void> {
    return this.request<void>('DELETE', `/roles/${id}`);
  }

  findPermissionIdByCode(code: string): Promise<number> {
    return this.listPermissions().then((permissions) => {
      const permission = permissions.find((item) => item.code === code);
      if (!permission) {
        throw new Error(`Permissão ${code} não encontrada.`);
      }
      return permission.id;
    });
  }

  createMember(payload: {
    fullName: string;
    email?: string;
    birthDate?: string;
    status?: string;
  }): Promise<MemberSummary> {
    return this.request<MemberSummary>('POST', '/members', payload);
  }

  deleteMember(id: string): Promise<void> {
    return this.request<void>('DELETE', `/members/${id}`);
  }

  findMemberIdByFullName(fullName: string): Promise<string | null> {
    return this.request<{ data: MemberSummary[] }>(
      'GET',
      `/members?q=${encodeURIComponent(fullName)}`,
    ).then((response) => response.data.find((item) => item.fullName === fullName)?.id ?? null);
  }

  createFamily(payload: { name: string; notes?: string | null; headMemberId?: string | null }): Promise<FamilySummary> {
    return this.request<FamilySummary>('POST', '/families', payload);
  }

  deleteFamily(id: string): Promise<void> {
    return this.request<void>('DELETE', `/families/${id}`);
  }

  findFamilyIdByName(name: string): Promise<string | null> {
    return this.request<{ data: FamilySummary[] }>(
      'GET',
      `/families?search=${encodeURIComponent(name)}`,
    ).then((response) => response.data.find((item) => item.name === name)?.id ?? null);
  }

  addFamilyMember(familyId: string, memberId: string, relation = 'other'): Promise<void> {
    return this.request<void>('POST', `/families/${familyId}/members`, { memberId, relation });
  }

  removeFamilyMember(familyId: string, memberId: string): Promise<void> {
    return this.request<void>('DELETE', `/families/${familyId}/members/${memberId}`);
  }

  findCalendarEvents(params: { from: string; to: string; type?: string }): Promise<CalendarEventSummary[]> {
    const search = new URLSearchParams({
      from: params.from,
      to: params.to,
      limit: '100',
    });
    if (params.type) {
      search.set('type', params.type);
    }
    return this.request<{ data: CalendarEventSummary[] }>(
      'GET',
      `/secretariat/calendar-events?${search.toString()}`,
    ).then((response) => response.data);
  }

  findBirthdayEventForMember(memberId: string, from: string, to: string): Promise<CalendarEventSummary | null> {
    return this.findCalendarEvents({ from, to }).then(
      (events) =>
        events.find(
          (event) => event.sourceMemberId === memberId && event.type === 'birthday',
        ) ?? null,
    );
  }

  getFamilyBirthdays(month: number, familyId?: string): Promise<BirthdayReportItem[]> {
    const search = new URLSearchParams({ month: String(month) });
    if (familyId) {
      search.set('familyId', familyId);
    }
    return this.request<{ data: BirthdayReportItem[] }>(
      'GET',
      `/families/birthdays?${search.toString()}`,
    ).then((response) => response.data);
  }

  createMinistry(payload: { name: string; description?: string; status?: string }): Promise<MinistrySummary> {
    return this.request<MinistrySummary>('POST', '/ministries', payload);
  }

  deleteMinistry(id: string): Promise<void> {
    return this.request<void>('DELETE', `/ministries/${id}`);
  }

  findMinistryIdByName(name: string): Promise<string | null> {
    return this.request<{ data: MinistrySummary[] }>('GET', `/ministries?q=${encodeURIComponent(name)}`).then(
      (response) => response.data.find((item) => item.name === name)?.id ?? null,
    );
  }

  addMinistryMember(ministryId: string, memberId: string, role = 'member'): Promise<void> {
    return this.request<void>('POST', `/ministries/${ministryId}/members`, { memberId, role });
  }

  removeMinistryMember(ministryId: string, memberId: string): Promise<void> {
    return this.request<void>('DELETE', `/ministries/${ministryId}/members/${memberId}`);
  }

  createClass(payload: {
    name: string;
    status?: string;
    ageGroup?: string;
    dayOfWeek?: number;
    startTime?: string;
    room?: string;
  }): Promise<ClassSummary> {
    return this.request<ClassSummary>('POST', '/classes', payload);
  }

  deleteClass(id: string): Promise<void> {
    return this.request<void>('DELETE', `/classes/${id}`);
  }

  findClassIdByName(name: string): Promise<string | null> {
    return this.request<{ data: ClassSummary[] }>('GET', `/classes?q=${encodeURIComponent(name)}`).then(
      (response) => response.data.find((item) => item.name === name)?.id ?? null,
    );
  }

  enrollClassMember(classId: string, memberId: string, status = 'active'): Promise<void> {
    return this.request<void>('POST', `/classes/${classId}/enrollments`, { memberId, status });
  }

  removeClassEnrollment(classId: string, memberId: string): Promise<void> {
    return this.request<void>('DELETE', `/classes/${classId}/enrollments/${memberId}`);
  }

  upsertClassAttendance(
    classId: string,
    sessionDate: string,
    entries: Array<{ memberId: string; present: boolean; notes?: string | null }>,
  ): Promise<void> {
    return this.request<void>('PUT', `/classes/${classId}/attendance`, { sessionDate, entries });
  }

  getClassFrequencyReport(
    classId: string,
    from: string,
    to: string,
  ): Promise<{ className: string; sessionsCount: number; members: Array<{ memberId: string; memberFullName: string }> }> {
    const search = new URLSearchParams({ from, to });
    return this.request(`GET`, `/classes/${classId}/reports/frequency?${search.toString()}`);
  }

  createSmallGroup(payload: {
    name: string;
    status?: string;
    dayOfWeek?: number;
    startTime?: string;
  }): Promise<SmallGroupSummary> {
    return this.request<SmallGroupSummary>('POST', '/small-groups', payload);
  }

  deleteSmallGroup(id: string): Promise<void> {
    return this.request<void>('DELETE', `/small-groups/${id}`);
  }

  findSmallGroupIdByName(name: string): Promise<string | null> {
    return this.request<{ data: SmallGroupSummary[] }>(
      'GET',
      `/small-groups?q=${encodeURIComponent(name)}`,
    ).then((response) => response.data.find((item) => item.name === name)?.id ?? null);
  }

  addSmallGroupMember(groupId: string, memberId: string, role = 'member'): Promise<void> {
    return this.request<void>('POST', `/small-groups/${groupId}/members`, { memberId, role });
  }

  removeSmallGroupMember(groupId: string, memberId: string): Promise<void> {
    return this.request<void>('DELETE', `/small-groups/${groupId}/members/${memberId}`);
  }

  createSmallGroupMeeting(
    groupId: string,
    payload: { meetingDate: string; theme?: string; notes?: string },
  ): Promise<SmallGroupMeetingSummary> {
    return this.request<SmallGroupMeetingSummary>('POST', `/small-groups/${groupId}/meetings`, payload);
  }

  upsertSmallGroupAttendance(
    groupId: string,
    meetingId: string,
    entries: Array<{ memberId: string; present: boolean; notes?: string | null }>,
  ): Promise<void> {
    return this.request<void>('PUT', `/small-groups/${groupId}/meetings/${meetingId}/attendance`, {
      entries,
    });
  }

  getSmallGroupFrequencyReport(
    groupId: string,
    from: string,
    to: string,
  ): Promise<{ smallGroupName: string; meetingsCount: number; members: Array<{ memberId: string; memberFullName: string }> }> {
    const search = new URLSearchParams({ from, to });
    return this.request(`GET`, `/small-groups/${groupId}/reports/frequency?${search.toString()}`);
  }

  getCongregationBase(): Promise<CongregationSummary> {
    return this.request<CongregationSummary>('GET', '/congregation');
  }

  updateCongregationBase(payload: { name?: string; phone?: string; notes?: string }): Promise<CongregationSummary> {
    return this.request<CongregationSummary>('PATCH', '/congregation', payload);
  }

  listCongregations(params?: { q?: string; type?: string; status?: string }): Promise<{ data: CongregationSummary[] }> {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.type) search.set('type', params.type);
    if (params?.status) search.set('status', params.status);
    const query = search.toString();
    return this.request('GET', `/congregations${query ? `?${query}` : ''}`);
  }

  createCongregationBranch(payload: { name: string; status?: string; city?: string }): Promise<CongregationSummary> {
    return this.request<CongregationSummary>('POST', '/congregations', payload);
  }

  updateCongregation(id: string, payload: { name?: string; status?: string; city?: string }): Promise<CongregationSummary> {
    return this.request<CongregationSummary>('PATCH', `/congregations/${id}`, payload);
  }

  deleteCongregation(id: string): Promise<void> {
    return this.request<void>('DELETE', `/congregations/${id}`);
  }

  findCongregationIdByName(name: string): Promise<string | null> {
    return this.listCongregations({ q: name }).then(
      (response) => response.data.find((item) => item.name === name)?.id ?? null,
    );
  }

  listFinancialCategories(type?: string): Promise<FinancialCategorySummary[]> {
    const query = type ? `?type=${encodeURIComponent(type)}` : '';
    return this.request<FinancialCategorySummary[]>('GET', `/finance/categories${query}`);
  }

  createFinancialCategory(payload: { name: string; type: string }): Promise<FinancialCategorySummary> {
    return this.request<FinancialCategorySummary>('POST', '/finance/categories', payload);
  }

  updateFinancialCategory(id: string, payload: { name?: string; active?: boolean }): Promise<FinancialCategorySummary> {
    return this.request<FinancialCategorySummary>('PATCH', `/finance/categories/${id}`, payload);
  }

  findFinancialCategoryIdByName(name: string): Promise<string | null> {
    return this.listFinancialCategories().then(
      (categories) => categories.find((item) => item.name === name)?.id ?? null,
    );
  }

  findIncomeCategoryByName(name: string): Promise<FinancialCategorySummary | null> {
    return this.listFinancialCategories('income').then(
      (categories) => categories.find((item) => item.name.toLowerCase() === name.toLowerCase()) ?? null,
    );
  }

  createFinancialEntry(payload: {
    entryDate: string;
    type: string;
    categoryId: string;
    description: string;
    amount: number;
    memberId?: string | null;
    paymentMethod?: string;
  }): Promise<FinancialEntrySummary> {
    return this.request<FinancialEntrySummary>('POST', '/finance/entries', payload);
  }

  deleteFinancialEntry(id: string): Promise<void> {
    return this.request<void>('DELETE', `/finance/entries/${id}`);
  }

  findFinancialEntryIdByDescription(description: string): Promise<string | null> {
    return this.request<{ data: FinancialEntrySummary[] }>(
      'GET',
      `/finance/entries?q=${encodeURIComponent(description)}`,
    ).then((response) => response.data.find((item) => item.description === description)?.id ?? null);
  }

  createAsset(payload: {
    name: string;
    type?: string;
    status?: string;
    acquisitionValue?: number;
    currentValue?: number;
  }): Promise<AssetSummary> {
    return this.request<AssetSummary>('POST', '/finance/assets', payload);
  }

  deleteAsset(id: string): Promise<void> {
    return this.request<void>('DELETE', `/finance/assets/${id}`);
  }

  findAssetIdByName(name: string): Promise<string | null> {
    return this.request<{ data: AssetSummary[] }>('GET', `/finance/assets?q=${encodeURIComponent(name)}`).then(
      (response) => response.data.find((item) => item.name === name)?.id ?? null,
    );
  }

  createCalendarEvent(payload: {
    title: string;
    type: string;
    startsAt: string;
    endsAt: string;
    allDay?: boolean;
    location?: string | null;
    description?: string | null;
  }): Promise<CalendarEventSummary> {
    return this.request<CalendarEventSummary>('POST', '/secretariat/calendar-events', payload);
  }

  deleteCalendarEvent(id: string): Promise<void> {
    return this.request<void>('DELETE', `/secretariat/calendar-events/${id}`);
  }

  findCalendarEventIdByTitle(title: string, from: string, to: string): Promise<string | null> {
    return this.findCalendarEvents({ from, to }).then(
      (events) => events.find((event) => event.title === title)?.id ?? null,
    );
  }

  createVisitor(payload: {
    fullName: string;
    visitDate: string;
    phone?: string | null;
    notes?: string | null;
  }): Promise<VisitorSummary> {
    return this.request<VisitorSummary>('POST', '/secretariat/visitors', payload);
  }

  deleteVisitor(id: string): Promise<void> {
    return this.request<void>('DELETE', `/secretariat/visitors/${id}`);
  }

  findVisitorIdByFullName(fullName: string): Promise<string | null> {
    return this.request<{ data: VisitorSummary[] }>(
      'GET',
      `/secretariat/visitors?search=${encodeURIComponent(fullName)}`,
    ).then((response) => response.data.find((item) => item.fullName === fullName)?.id ?? null);
  }

  createAttendance(payload: {
    eventDate: string;
    eventType: string;
    totalPresent: number;
    adults?: number | null;
    children?: number | null;
    notes?: string | null;
  }): Promise<AttendanceSummary> {
    return this.request<AttendanceSummary>('POST', '/secretariat/attendance', payload);
  }

  deleteAttendance(id: string): Promise<void> {
    return this.request<void>('DELETE', `/secretariat/attendance/${id}`);
  }

  findAttendanceIdByDate(eventDate: string): Promise<string | null> {
    return this.request<{ data: AttendanceSummary[] }>(
      'GET',
      `/secretariat/attendance?from=${encodeURIComponent(eventDate)}&to=${encodeURIComponent(eventDate)}`,
    ).then((response) => response.data.find((item) => item.eventDate === eventDate)?.id ?? null);
  }

  createDocument(payload: {
    title: string;
    type: string;
    documentDate: string;
    status?: string;
    summary?: string | null;
  }): Promise<DocumentSummary> {
    return this.request<DocumentSummary>('POST', '/secretariat/documents', payload);
  }

  deleteDocument(id: string): Promise<void> {
    return this.request<void>('DELETE', `/secretariat/documents/${id}`);
  }

  findDocumentIdByTitle(title: string): Promise<string | null> {
    return this.request<{ data: DocumentSummary[] }>(
      'GET',
      `/secretariat/documents?search=${encodeURIComponent(title)}`,
    ).then((response) => response.data.find((item) => item.title === title)?.id ?? null);
  }

  async uploadDocumentFile(documentId: string, buffer: Buffer, fileName: string): Promise<void> {
    const formData = new FormData();
    formData.append('file', new Blob([buffer], { type: 'application/pdf' }), fileName);

    const response = await fetch(`${this.apiUrl}/secretariat/documents/${documentId}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Upload documento falhou (${response.status}): ${text}`);
    }
  }

  getSchedulesWeek(from: string, to: string, ministryId?: string): Promise<{
    events: Array<{ id: string; title: string; ministries: Array<{ ministryId: string; assignments: ScheduleAssignmentSummary[] }> }>;
  }> {
    const search = new URLSearchParams({ from, to });
    if (ministryId) {
      search.set('ministryId', ministryId);
    }
    return this.request('GET', `/schedules/week?${search.toString()}`);
  }

  bulkUpsertScheduleAssignments(
    calendarEventId: string,
    ministryId: string,
    items: Array<{ memberId: string; roleLabel: string; confirmed?: boolean; notes?: string | null }>,
  ): Promise<ScheduleAssignmentSummary[]> {
    return this.request<ScheduleAssignmentSummary[]>(
      'PUT',
      `/schedules/events/${calendarEventId}/ministries/${ministryId}/assignments`,
      { items },
    );
  }

  deleteScheduleAssignment(id: string): Promise<void> {
    return this.request<void>('DELETE', `/schedules/assignments/${id}`);
  }

  createAnnouncement(payload: {
    title: string;
    body: string;
    publishedAt?: string;
    expiresAt?: string | null;
  }): Promise<AnnouncementSummary> {
    return this.request<AnnouncementSummary>('POST', '/announcements', payload);
  }

  deleteAnnouncement(id: string): Promise<void> {
    return this.request<void>('DELETE', `/announcements/${id}`);
  }

  findAnnouncementIdByTitle(title: string): Promise<string | null> {
    return this.request<{ data: AnnouncementSummary[] }>(
      'GET',
      `/announcements?search=${encodeURIComponent(title)}&includeExpired=true`,
    ).then((response) => response.data.find((item) => item.title === title)?.id ?? null);
  }
}
