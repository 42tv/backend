import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FanService {
    constructor(
        private readonly prismaService: PrismaService, // Assuming PrismaService is defined and imported correctly
    ) {}

     
}
