import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  IvsClient,
  CreateChannelCommand,
  GetStreamKeyCommand,
  CreateStreamKeyCommand,
  DeleteChannelCommand,
  DeleteStreamKeyCommand,
} from '@aws-sdk/client-ivs';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class IvsService {
  private readonly client: IvsClient;

  constructor(private readonly prisma: PrismaService) {
    this.client = new IvsClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  /**
   * IVS채널 생성 요청
   * @param channelName
   * @returns
   */
  async requestCreateIvs(channelName: string) {
    try {
      const command = new CreateChannelCommand({
        name: channelName,
        type: 'STANDARD', // or STANDARD
      });
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      throw new InternalServerErrorException('AWS의 IVS 채널 생성요청 실패');
    }
  }

  /**
   * createUser에서 사용하는 더미 데이터 생성
   * @param channel_idx
   * @param tx
   * @returns
   */
  async createDummy(user_idx: number, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;
    // 채널명은 idx로 설정
    return await prismaClient.iVSChannel.create({
      data: {
        User: {
          connect: {
            idx: user_idx,
          },
        },
      },
    });
  }

  /**
   * 실제 aws ivs에 채널 생성 요청
   * @param user_idx
   * @param channel_title
   * @param tx
   * @returns
   */
  async updateIvsChannel(
    user_idx: number,
    channel_title: string,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    // 채널명은 idx로 설정
    const ivs = await prismaClient.iVSChannel.findFirst({
      where: {
        user_idx: user_idx,
      },
    });
    if (!ivs) {
      throw new BadRequestException(
        '채널이 존재하지 않습니다. 관리자에게 문의해주세요',
      );
    }
    if (ivs.arn) {
      throw new BadRequestException('이미 채널이 생성되어 있습니다.');
    }
    const responseChannel = await this.requestCreateIvs(channel_title);
    const updated = await prismaClient.iVSChannel.update({
      where: {
        user_idx: user_idx,
      },
      data: {
        name: channel_title,
        arn: responseChannel.channel.arn,
        ingest_endpoint: responseChannel.channel.ingestEndpoint,
        playback_url: responseChannel.channel.playbackUrl,
        stream_key: responseChannel.streamKey.value,
        stream_key_arn: responseChannel.streamKey.arn,
      },
    });
    return updated;
  }

  async deleteChannel(channelArn: string) {
    try {
      const command = new DeleteChannelCommand({
        arn: channelArn,
      });
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      console.error('Error deleting channel:', error);
      throw error;
    }
  }

  /**
   * channelArn에 streamKey 생성
   * @param channelArn
   * @returns
   */
  async createStreamKey(channelArn: string) {
    try {
      const command = new CreateStreamKeyCommand({
        channelArn: channelArn,
      });
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      throw new InternalServerErrorException('AWS의 streamKey 생성 실패');
      throw error;
    }
  }

  async getStreamKey(channelArn: string) {
    try {
      const command = new GetStreamKeyCommand({
        arn: channelArn,
      });

      const response = await this.client.send(command);
      return response;
    } catch (error) {
      console.error('Error fetching stream key:', error);
      throw error;
    }
  }

  /**
   * streamKey ARN 으로 streamKey 삭제
   * @param streamKeyArn
   * @returns
   */
  async DeleteStreamKey(streamKeyArn: string) {
    try {
      const command = new DeleteStreamKeyCommand({
        arn: streamKeyArn,
      });

      const response = await this.client.send(command);
      return response;
    } catch (error) {
      throw new InternalServerErrorException('AWS의 스트림키 삭제 실패');
    }
  }

  /**
   * 스트림키 재생성
   * 1. 채널이 없으면 BadRequestException
   * 2. 채널의 arn이 없으면 생성
   * 3. 있으면 스트림키만 지우고 재생성
   * @param user_idx
   */
  async recreateStreamKey(user: User) {
    const ivs = await this.prisma.iVSChannel.findFirst({
      where: {
        user_idx: user.idx,
      },
    });
    if (!ivs) {
      throw new BadRequestException('채널이 존재하지 않습니다.');
    }
    if (!ivs.arn) {
      const ivs = await this.updateIvsChannel(
        user.idx,
        user.userId.replace('@', '_'),
      );
      return ivs;
    } else {
      await this.DeleteStreamKey(ivs.stream_key_arn);
      const response = await this.createStreamKey(ivs.arn);
      await this.prisma.iVSChannel.update({
        where: {
          user_idx: user.idx,
        },
        data: {
          stream_key: response.streamKey.value,
          stream_key_arn: response.streamKey.arn,
        },
      });
      return await this.prisma.iVSChannel.findFirst({
        where: {
          user_idx: user.idx,
        },
      });
    }
  }
}
