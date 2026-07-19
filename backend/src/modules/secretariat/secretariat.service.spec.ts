import { Repository } from 'typeorm';
import { CongregationsService } from '../congregations/congregations.service';
import { Member } from '../members/entities/member.entity';
import { AttendanceService } from './attendance/attendance.service';
import { AttendanceRecord } from './attendance/entities/attendance-record.entity';
import { CalendarEvent } from './calendar/entities/calendar-event.entity';
import { SecretariatDocument } from './documents/entities/secretariat-document.entity';
import { SecretariatService } from './secretariat.service';
import { Visitor } from './visitors/entities/visitor.entity';

describe('SecretariatService', () => {
  const getOrCreateBaseMock = jest
    .fn()
    .mockResolvedValue({ id: 'congregation-1' });

  const chain = () => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(0),
    getMany: jest.fn().mockResolvedValue([]),
    getRawMany: jest.fn().mockResolvedValue([]),
  });

  const calendarEventsRepository = {
    createQueryBuilder: jest.fn().mockImplementation(chain),
  } as unknown as Repository<CalendarEvent>;
  const visitorsRepository = {
    createQueryBuilder: jest.fn().mockImplementation(chain),
  } as unknown as Repository<Visitor>;
  const attendanceRepository = {
    createQueryBuilder: jest.fn().mockImplementation(chain),
  } as unknown as Repository<AttendanceRecord>;
  const documentsRepository = {
    createQueryBuilder: jest.fn().mockImplementation(chain),
  } as unknown as Repository<SecretariatDocument>;
  const membersRepository = {
    createQueryBuilder: jest.fn().mockImplementation(chain),
  } as unknown as Repository<Member>;
  const congregationsService = {
    getOrCreateBase: getOrCreateBaseMock,
  } as unknown as CongregationsService;
  const getLastRecordMock = jest.fn().mockResolvedValue(null);
  const attendanceService = {
    getLastRecord: getLastRecordMock,
  } as unknown as AttendanceService;

  const service = new SecretariatService(
    calendarEventsRepository,
    visitorsRepository,
    attendanceRepository,
    documentsRepository,
    membersRepository,
    congregationsService,
    attendanceService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('getDashboard com activeCongregationId não chama getOrCreateBase', async () => {
    const explicitId = '22222222-3333-4444-5555-666666666666';
    getOrCreateBaseMock.mockResolvedValue({ id: 'congregation-1' });

    await service.getDashboard(explicitId);

    expect(getOrCreateBaseMock).not.toHaveBeenCalled();
    expect(getLastRecordMock).toHaveBeenCalledWith(explicitId);
  });
});
