import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findOneByLocalAuth(user_id: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        user_id: user_id,
      },
    });
    const compare = await bcrypt.compare(password, user.password);
    if (!compare) {
      return null;
    }
    return user;
  }

  async createUser(id: string, pw: string, nickname: string) {
    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(pw, salt);
    return await this.prisma.user.create({
      data: {
        user_id: id,
        password: hash,
        nickname: nickname,
      },
    });
  }
}
