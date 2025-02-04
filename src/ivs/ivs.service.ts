import { Injectable } from '@nestjs/common';
import {
  IvsClient,
  CreateChannelCommand,
  GetStreamKeyCommand,
  CreateStreamKeyCommand,
  DeleteChannelCommand,
} from '@aws-sdk/client-ivs';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

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

  async requestChannel(channelName: string) {
    try {
      const command = new CreateChannelCommand({
        name: channelName,
        type: 'STANDARD', // or STANDARD
      });

      const response = await this.client.send(command);
      return response;
    } catch (error) {
      console.error('Error creating channel:', error);
      throw error;
    }
  }

  async createChannel(
    channel_idx: number,
    channle_title: string,
    tx?: Prisma.TransactionClient,
  ) {
    const prismaClient = tx ?? this.prisma;
    // 채널명은 idx로 설정
    const responseChannel = await this.requestChannel(channel_idx.toString());
    return await prismaClient.iVSChannel.create({
      data: {
        name: channle_title,
        arn: responseChannel.channel.arn,
        ingest_endpoint: responseChannel.channel.ingestEndpoint,
        playback_url: responseChannel.channel.playbackUrl,
        stream_key: responseChannel.streamKey.value,
        Channel: {
          connect: {
            idx: channel_idx,
          },
        },
      },
    });
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

  async createStreamKey(channelArn: string) {
    try {
      const command = new CreateStreamKeyCommand({
        channelArn,
      });

      const response = await this.client.send(command);
      return response;
    } catch (error) {
      console.error('Error creating stream key:', error);
      throw error;
    }
  }

  async getStreamKey(streamKeyArn: string) {
    try {
      const command = new GetStreamKeyCommand({
        arn: streamKeyArn,
      });

      const response = await this.client.send(command);
      return response;
    } catch (error) {
      console.error('Error fetching stream key:', error);
      throw error;
    }
  }
}
