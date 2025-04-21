import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  IvsClient,
  CreateChannelCommand,
  CreateStreamKeyCommand,
  DeleteChannelCommand,
  DeleteStreamKeyCommand,
  GetStreamCommand,
} from '@aws-sdk/client-ivs';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { User } from 'src/user/entities/user.entity';
import { UserService } from 'src/user/user.service';
import { StreamService } from 'src/stream/stream.service';
import { IvsRepository } from './ivs.repository';
import { IvsEvent } from './entities/lambda.response';
import { BroadcastSettingService } from 'src/broadcast-setting/broadcast-setting.service';
import { timeFormatter } from 'src/utils/utils';

@Injectable()
export class IvsService {
  private readonly client: IvsClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ivsRepository: IvsRepository,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly streamService: StreamService,
    private readonly broadcastSettingService: BroadcastSettingService,
  ) {
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
        recordingConfigurationArn: process.env.AWS_IVS_RECORDING_CONFIG_ARN,
      });
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      throw new InternalServerErrorException('AWS의 IVS 채널 생성요청 실패');
    }
  }

  /**
   * IVS 채널 삭제 요청
   * @param channelArn
   * @returns
   */
  async requestDeleteIvs(channelArn: string) {
    try {
      const command = new DeleteChannelCommand({
        arn: channelArn,
      });
      const response = await this.client.send(command);
      return response;
    } catch (error) {
      throw new InternalServerErrorException('AWS의 IVS 채널 삭제요청 실패');
    }
  }

  /**
   * createUser에서 사용하는 더미 데이터 생성
   * @param channel_idx
   * @param tx
   * @returns
   */
  async createIvs(user_id: string, tx?: Prisma.TransactionClient) {
    const prismaClient = tx ?? this.prisma;
    const response = await this.requestCreateIvs(user_id);
    console.log(response);
    const channelId = response.channel.arn.split('/')[1];
    // 채널명은 idx로 설정
    try {
      return await prismaClient.iVSChannel.create({
        data: {
          arn: response.channel.arn,
          ingest_endpoint: 'rtmps://' + response.channel.ingestEndpoint,
          playback_url: response.channel.playbackUrl,
          stream_key: response.streamKey.value,
          stream_key_arn: response.streamKey.arn,
          recording_arn: response.channel.recordingConfigurationArn,
          restriction_policy_arn: response.channel.playbackRestrictionPolicyArn,
          name: user_id.toString(),
          channel_id: channelId,
          User: {
            connect: {
              user_id: user_id,
            },
          },
        },
      });
    } catch (e) {
      await this.requestDeleteIvs(response.channel.arn);
    }
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
        ingest_endpoint: 'rtmp://' + responseChannel.channel.ingestEndpoint,
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

  async getChannel(channelArn: string) {
    try {
      const command = new GetStreamCommand({
        channelArn: channelArn,
      });

      const response = await this.client.send(command);
      console.log(response);
      console.log(response.$metadata.httpStatusCode);
      console.log(response.stream);
      return response;
    } catch (error) {
      console.log(error);
      if (error.Code == 'ChannelNotBroadcasting') {
        const errorData = {
          $metadata: error.$metadata,
          Code: error.Code,
        };
        return errorData;
      }
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
  async reCreateStreamKey(user: User) {
    const ivs = await this.prisma.iVSChannel.findFirst({
      where: {
        user_idx: user.idx,
      },
    });
    if (!ivs) {
      throw new BadRequestException('채널이 존재하지 않습니다.');
    }
    const stream = await this.streamService.getStreamByUserIdx(user.idx);
    if (stream) {
      throw new BadRequestException('방송중에는 변경불가능합니다');
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
      const finded_ivs = await this.prisma.iVSChannel.findFirst({
        where: {
          user_idx: user.idx,
        },
      });
      return {
        streamKey: finded_ivs.stream_key,
      };
    }
  }

  /**
   * 방송 시작 람다 콜백의 경우
   * @param ivsEvent
   * @returns
   */
  async streamStart(ivsEvent: IvsEvent) {
    const ivs = await this.ivsRepository.findByArn(ivsEvent.resource);
    if (!ivs) {
      throw new BadRequestException('채널이 존재하지 않습니다.');
    }
    const broadcastSetting =
      await this.broadcastSettingService.getBroadcastSetting(ivs.user_idx);
    if (!broadcastSetting) {
      throw new BadRequestException('방송 설정이 존재하지 않습니다.');
    }
    ivsEvent.time = timeFormatter(ivsEvent.time);
    const channelId = ivsEvent.resource.split('/')[1];
    const thumbnailUrl = `${process.env.CDN_URL}/thumbnails/${channelId}.jpg`;
    await this.streamService.createStream(
      ivs.user_idx,
      thumbnailUrl,
      ivsEvent.id,
      ivsEvent.streamId,
      ivsEvent.time,
      broadcastSetting.title,
      broadcastSetting.is_adult,
      broadcastSetting.is_pw,
      broadcastSetting.is_fan,
      broadcastSetting.password,
      broadcastSetting.fan_level,
    );
    // return stream;
  }

  async streamStop(ivsEvent: IvsEvent) {
    const ivs = await this.ivsRepository.findByArn(ivsEvent.resource);
    if (!ivs) {
      throw new BadRequestException('채널이 존재하지 않습니다.');
    }
    await this.streamService.deleteStream(ivsEvent.streamId);
  }

  async handleCallbackStreamEvent(ivsEvent: IvsEvent) {
    if (ivsEvent.eventName == 'Stream Start') {
      await this.streamStart(ivsEvent);
    } else if (ivsEvent.eventName == 'Stream End') {
      // await this.streamStop(ivsEvent);
    }
    const ivs = await this.ivsRepository.findByArn(ivsEvent.resource);
    if (!ivs) {
      throw new BadRequestException('채널이 존재하지 않습니다.');
    }

    return ivs;
  }
}
