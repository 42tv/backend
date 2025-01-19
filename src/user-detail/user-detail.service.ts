import { Injectable } from '@nestjs/common';

@Injectable()
export class UserDetailService {
  constructor(private readonly prisma: PrismaService) {}
}
