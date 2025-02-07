import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ChannelModule } from 'src/channel/channel.module';
import { plainToInstance } from 'class-transformer';
import { CreateUserDto } from './dto/create-user.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRepository } from './user.repository';

describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService; // 트랜잭션을 적용할 Prisma 클라이언트

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ChannelModule],
      providers: [UserService, PrismaService, UserRepository],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    // ✅ 트랜잭션을 롤백하기 위해 강제 에러 발생
    // console.log('Test passed:', expect.getState().currentTestName);
  });

  it('이미 존재하는 user_id를 생성하려는 경우 - BadRequestException', async () => {
    const dto = plainToInstance(CreateUserDto, {
      id: 'validID',
      password: 'StrongP@ss1',
      nickname: 'nickname123',
    });
    try {
      await prisma.$transaction(async (tx) => {
        await service.createUser(dto, tx);
        await service.createUser(dto, tx);
      });
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
    }
  });

  it('user 생성시 채널이 정상적으로 생성되는지 확인 - NotFoundException', async () => {
    const dto = plainToInstance(CreateUserDto, {
      id: 'validID',
      password: 'StrongP@ss1',
      nickname: 'nickname123',
    });
    try {
      await prisma.$transaction(async (tx) => {
        const user = await service.createUser(dto, tx);
        const channel = await tx.channel.findFirst({
          where: { user_idx: user.idx },
        });
        if (channel) {
          // console.log(channel);
          throw new NotFoundException('transaction rollback');
        } else {
          throw new BadRequestException('No channel found');
        }
      });
    } catch (e) {
      expect(e).toBeInstanceOf(NotFoundException);
    }
  });
});
