import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BannedWordAction } from '@prisma/client';
import { RedisService } from 'src/redis/redis.service';
import { AdminAuditLogService } from 'src/admin-audit-log/admin-audit-log.service';
import { BannedWordRepository } from './banned-word.repository';

const BANNED_WORDS_CACHE_KEY = 'banned_words';
const BANNED_WORDS_CACHE_TTL = 300; // 5분 (변경 시 즉시 무효화)

export interface BannedWordEntry {
  word: string;
  action: BannedWordAction;
}

/**
 * 채팅 금칙어 관리.
 * 채팅 게이트웨이 핫패스에서 사용되므로 Redis에 목록을 캐싱하고
 * 변경(등록/삭제) 시 캐시를 무효화한다 (멀티 서버 공유).
 */
@Injectable()
export class BannedWordService {
  constructor(
    private readonly repository: BannedWordRepository,
    private readonly redisService: RedisService,
    private readonly auditLogService: AdminAuditLogService,
  ) {}

  async findAll() {
    return await this.repository.findAll();
  }

  async create(adminIdx: number, word: string, action: BannedWordAction) {
    const trimmed = word.trim();
    if (!trimmed) {
      throw new BadRequestException('금칙어를 입력하세요.');
    }
    const existing = await this.repository.findByWord(trimmed);
    if (existing) {
      throw new BadRequestException('이미 등록된 금칙어입니다.');
    }

    const created = await this.repository.create(trimmed, action, adminIdx);
    await this.invalidateCache();
    await this.auditLogService.record({
      adminIdx,
      action: 'BANNED_WORD_CREATE',
      targetType: 'BANNED_WORD',
      targetId: created.id,
      detail: { word: trimmed, action },
    });
    return created;
  }

  async delete(adminIdx: number, id: number) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException('금칙어를 찾을 수 없습니다.');
    }
    await this.repository.delete(id);
    await this.invalidateCache();
    await this.auditLogService.record({
      adminIdx,
      action: 'BANNED_WORD_DELETE',
      targetType: 'BANNED_WORD',
      targetId: id,
      detail: { word: existing.word },
    });
  }

  /**
   * 채팅 필터링용 금칙어 목록 (Redis 캐시 우선, 미스 시 DB 조회 후 캐싱)
   */
  async getActiveWords(): Promise<BannedWordEntry[]> {
    const cached = await this.redisService.getCache(BANNED_WORDS_CACHE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // 캐시 파손 시 DB로 폴백
      }
    }

    const words = await this.repository.findAll();
    const entries: BannedWordEntry[] = words.map((w) => ({
      word: w.word,
      action: w.action,
    }));
    await this.redisService.setCache(
      BANNED_WORDS_CACHE_KEY,
      JSON.stringify(entries),
      BANNED_WORDS_CACHE_TTL,
    );
    return entries;
  }

  /**
   * 메시지에 금칙어 필터 적용.
   * BLOCK 단어 포함 시 예외, MASK 단어는 '*'로 치환해 반환.
   */
  async applyFilter(message: string): Promise<string> {
    const entries = await this.getActiveWords();
    let filtered = message;
    for (const entry of entries) {
      if (!entry.word) continue;
      if (!filtered.includes(entry.word)) continue;
      if (entry.action === BannedWordAction.BLOCK) {
        throw new BadRequestException('금칙어가 포함되어 전송할 수 없습니다.');
      }
      filtered = filtered.split(entry.word).join('*'.repeat(entry.word.length));
    }
    return filtered;
  }

  private async invalidateCache() {
    await this.redisService.deleteCache(BANNED_WORDS_CACHE_KEY);
  }
}
