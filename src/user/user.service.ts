import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(id: string, pw: string, nickname: string) {
    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(pw, salt);
    await this.prisma.user.create({
      data: {
        user_id: id,
        user_pw: hash,
        nickname: nickname,
      },
    });
  }
}
