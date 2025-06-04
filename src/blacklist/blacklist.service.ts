import { Injectable } from '@nestjs/common';
import { BlacklistRepository } from './blacklist.repository';
import { BlacklistWithBlocked } from './types/blacklist.type';

@Injectable()
export class BlacklistService {
  constructor(private readonly blacklistRepository: BlacklistRepository) {}

  async create(ownerIdx: number, blockedIdx: number) {
    return this.blacklistRepository.create(ownerIdx, blockedIdx);
  }

  async findOne(ownerIdx: number, blockedIdx: number) {
    return this.blacklistRepository.findOne(ownerIdx, blockedIdx);
  }

  async delete(ownerIdx: number, blockedIdx: number) {
    return this.blacklistRepository.delete(ownerIdx, blockedIdx);
  }

  async getBlacklist(ownerIdx: number): Promise<BlacklistWithBlocked[]> {
    return this.blacklistRepository.findAllByOwner(ownerIdx);
  }

  async isUserBlocked(
    broadcasterIdx: number,
    viewerIdx: number,
  ): Promise<boolean> {
    return this.blacklistRepository.isBlocked(broadcasterIdx, viewerIdx);
  }
}
