import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PlayService } from './play.service';
import { AuthService } from 'src/auth/auth.service';
import { StreamService } from 'src/stream/stream.service';
import { UserService } from 'src/user/user.service';
import { BlacklistService } from 'src/blacklist/blacklist.service';
import { BookmarkService } from 'src/bookmark/bookmark.service';
import { ManagerService } from 'src/manager/manager.service';
import { FanService } from 'src/fan/fan.service';

describe('PlayService', () => {
  let service: PlayService;

  const mockUserService = {
    getUserByUserIdWithRelations: jest.fn(),
    findByUserIdx: jest.fn(),
    getBookmarkByStreamerIdx: jest.fn(),
  };
  const mockStreamService = {
    getStreamByUserIdx: jest.fn(),
  };
  const mockAuthService = {
    generatePlayToken: jest.fn(),
  };
  const mockBlacklistService = {
    isUserBlocked: jest.fn(),
  };
  const mockBookmarkService = {
    getUserBookmarkCount: jest.fn(),
  };
  const mockManagerService = {
    isManager: jest.fn(),
  };
  const mockFanService = {
    findFan: jest.fn(),
    matchFanLevel: jest.fn(),
  };

  const broadcasterBase = {
    idx: 1,
    user_id: 'streamer',
    nickname: 'streamer',
    profile_img: '',
    ivs: { playback_url: 'https://playback.example' },
    broadcastSetting: {
      title: 'test',
      is_adult: false,
      is_fan: false,
      is_pw: false,
      password: null,
    },
  };

  const stream = {
    idx: 10,
    stream_id: 'stream_1',
    play_cnt: 0,
    recommend_cnt: 0,
    start_time: new Date(),
  };

  const makeBroadcaster = (setting: Partial<any>) => ({
    ...broadcasterBase,
    broadcastSetting: { ...broadcasterBase.broadcastSetting, ...setting },
  });

  const makeUser = (overrides: Partial<any> = {}) => ({
    idx: 2,
    user_id: 'viewer',
    nickname: 'viewer',
    profile_img: '',
    is_adult_verified: false,
    ...overrides,
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayService,
        { provide: UserService, useValue: mockUserService },
        { provide: StreamService, useValue: mockStreamService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: BlacklistService, useValue: mockBlacklistService },
        { provide: BookmarkService, useValue: mockBookmarkService },
        { provide: ManagerService, useValue: mockManagerService },
        { provide: FanService, useValue: mockFanService },
      ],
    }).compile();

    service = module.get<PlayService>(PlayService);

    mockStreamService.getStreamByUserIdx.mockResolvedValue(stream);
    mockBookmarkService.getUserBookmarkCount.mockResolvedValue({ count: 0 });
    mockAuthService.generatePlayToken.mockReturnValue({ token: 'play_token' });
    mockBlacklistService.isUserBlocked.mockResolvedValue(false);
    mockManagerService.isManager.mockResolvedValue(false);
    mockFanService.findFan.mockResolvedValue(null);
    mockFanService.matchFanLevel.mockResolvedValue(null);
    mockUserService.getBookmarkByStreamerIdx.mockResolvedValue(null);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('게스트 접근', () => {
    it('성인방송은 게스트 시청을 차단한다', async () => {
      mockUserService.getUserByUserIdWithRelations.mockResolvedValue(
        makeBroadcaster({ is_adult: true }),
      );

      await expect(
        service.play(0, 'streamer', true, 'guest-id-1234', ''),
      ).rejects.toThrow(BadRequestException);
    });

    it('일반방송은 게스트 시청을 허용한다', async () => {
      mockUserService.getUserByUserIdWithRelations.mockResolvedValue(
        makeBroadcaster({}),
      );

      const result = await service.play(
        0,
        'streamer',
        true,
        'guest-id-1234',
        '',
      );

      expect(result.user.role).toBe('guest');
    });
  });

  describe('성인방송 회원 접근', () => {
    it('성인 인증되지 않은 viewer는 403으로 차단한다', async () => {
      mockUserService.getUserByUserIdWithRelations.mockResolvedValue(
        makeBroadcaster({ is_adult: true }),
      );
      mockUserService.findByUserIdx.mockResolvedValue(
        makeUser({ is_adult_verified: false }),
      );

      await expect(service.play(2, 'streamer', false, '', '')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('성인 인증되지 않은 member(fan)는 403으로 차단한다', async () => {
      mockUserService.getUserByUserIdWithRelations.mockResolvedValue(
        makeBroadcaster({ is_adult: true }),
      );
      mockUserService.findByUserIdx.mockResolvedValue(
        makeUser({ is_adult_verified: false }),
      );
      mockFanService.findFan.mockResolvedValue({ idx: 100 });

      await expect(service.play(2, 'streamer', false, '', '')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('성인 인증된 viewer는 시청을 허용한다', async () => {
      mockUserService.getUserByUserIdWithRelations.mockResolvedValue(
        makeBroadcaster({ is_adult: true }),
      );
      mockUserService.findByUserIdx.mockResolvedValue(
        makeUser({ is_adult_verified: true }),
      );

      const result = await service.play(2, 'streamer', false, '', '');

      expect(result.user.role).toBe('viewer');
      expect(result.user.play_token).toBe('play_token');
    });
  });

  describe('일반방송 회원 접근', () => {
    it('일반방송은 미인증 회원도 시청을 허용한다', async () => {
      mockUserService.getUserByUserIdWithRelations.mockResolvedValue(
        makeBroadcaster({}),
      );
      mockUserService.findByUserIdx.mockResolvedValue(
        makeUser({ is_adult_verified: false }),
      );

      const result = await service.play(2, 'streamer', false, '', '');

      expect(result.user.role).toBe('viewer');
    });
  });
});
