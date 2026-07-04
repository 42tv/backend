import { Injectable } from '@nestjs/common';
import { BannedWordAction } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BannedWordRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return await this.prisma.bannedWord.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  async findByWord(word: string) {
    return await this.prisma.bannedWord.findUnique({ where: { word } });
  }

  async create(word: string, action: BannedWordAction, createdBy: number) {
    return await this.prisma.bannedWord.create({
      data: { word, action, created_by: createdBy },
    });
  }

  async delete(id: number) {
    return await this.prisma.bannedWord.delete({ where: { id } });
  }

  async findById(id: number) {
    return await this.prisma.bannedWord.findUnique({ where: { id } });
  }
}
