import { Test, TestingModule } from '@nestjs/testing';
import { SmallGroupsController } from './small-groups.controller';
import { SmallGroupsService } from './small-groups.service';

describe('SmallGroupsController', () => {
  let controller: SmallGroupsController;

  const smallGroupsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    listLeaderOptions: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findMembers: jest.fn(),
    addMember: jest.fn(),
    updateMember: jest.fn(),
    removeMember: jest.fn(),
    listMemberOptions: jest.fn(),
    findMeetings: jest.fn(),
    createMeeting: jest.fn(),
    updateMeeting: jest.fn(),
    removeMeeting: jest.fn(),
    getMeetingAttendance: jest.fn(),
    upsertMeetingAttendance: jest.fn(),
    getFrequencyReport: jest.fn(),
    exportFrequencyCsv: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SmallGroupsController],
      providers: [
        { provide: SmallGroupsService, useValue: smallGroupsService },
      ],
    }).compile();

    controller = module.get(SmallGroupsController);
  });

  it('deve delegar create ao service', async () => {
    const dto = { name: 'Célula Centro' };
    const response = { id: 'g1', name: 'Célula Centro' };
    smallGroupsService.create.mockResolvedValue(response);

    await expect(controller.create(dto)).resolves.toEqual(response);
    expect(smallGroupsService.create).toHaveBeenCalledWith(dto);
  });

  it('deve delegar findAll ao service', async () => {
    const query = { page: 1, limit: 20 };
    const response = { data: [], total: 0, page: 1, limit: 20 };
    smallGroupsService.findAll.mockResolvedValue(response);

    await expect(controller.findAll(query)).resolves.toEqual(response);
    expect(smallGroupsService.findAll).toHaveBeenCalledWith(query);
  });
});
