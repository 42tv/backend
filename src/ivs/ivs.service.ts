import { Injectable } from '@nestjs/common';
import {
  IvsClient,
  CreateChannelCommand,
  GetStreamKeyCommand,
  CreateStreamKeyCommand,
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

  async createChannel(channel_idx: number, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;
    return await prismaClient.stream.create({
      data: {
        channel_idx: channel_idx,
      },
    });
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
