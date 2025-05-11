import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class StreamViewerService {
  constructor(private readonly prisma: PrismaService) {}

  async addStreamViewer(streamId: number, userIdx?: number, guestId?: string) {
    if (userIdx) {
      return await this.prisma.streamViewer.create({
        data: {
          is_guest: false,
          stream: {
            connect: {
              id: streamId,
            },
          },
          viewer: {
            connect: {
              idx: userIdx,
            },
          },
        },
      });
    } else if (guestId) {
      return await this.prisma.streamViewer.create({
        data: {
          stream: {
            connect: {
              id: streamId,
            },
          },
          guest_id: guestId,
          is_guest: true,
        },
      });
    } else {
      throw new BadRequestException('User ID or Guest ID must be provided.');
    }
  }

  async deleteStreamViewer(
    streamId: number,
    userIdx?: number,
    guestId?: string,
  ) {
    if (userIdx) {
      return await this.prisma.streamViewer.deleteMany({
        where: {
          stream_id: streamId,
          viewer_idx: userIdx,
        },
      });
    } else if (guestId) {
      return await this.prisma.streamViewer.deleteMany({
        where: {
          stream_id: streamId,
          guest_id: guestId,
        },
      });
    } else {
      throw new BadRequestException('User ID or Guest ID must be provided.');
    }
  }
}
