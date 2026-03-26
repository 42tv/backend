import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  Prisma,
  WidgetType,
  WidgetToken,
  WidgetChatConfig,
  WidgetDonationConfig,
  User,
} from '@prisma/client';

type WidgetTokenWithConfigs = WidgetToken & {
  chat_config: WidgetChatConfig;
  donation_config: WidgetDonationConfig;
};

type WidgetTokenWithConfigsAndBroadcaster = WidgetTokenWithConfigs & {
  broadcaster: Pick<User, 'user_id'>;
};

@Injectable()
export class WidgetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByToken(
    token: string,
  ): Promise<WidgetTokenWithConfigsAndBroadcaster | null> {
    return this.prisma.widgetToken.findUnique({
      where: { token },
      include: {
        chat_config: true,
        donation_config: true,
        broadcaster: { select: { user_id: true } },
      },
    });
  }

  async findAllByBroadcaster(
    broadcasterId: number,
  ): Promise<WidgetTokenWithConfigs[]> {
    return this.prisma.widgetToken.findMany({
      where: { broadcaster_id: broadcasterId },
      include: { chat_config: true, donation_config: true },
      orderBy: { created_at: 'asc' },
    });
  }

  async createToken(
    broadcasterId: number,
    token: string,
    widgetType: WidgetType,
  ): Promise<WidgetTokenWithConfigs> {
    return this.prisma.$transaction(async (tx) => {
      const chatConfig = await tx.widgetChatConfig.create({ data: {} });
      const donationConfig = await tx.widgetDonationConfig.create({ data: {} });

      return tx.widgetToken.create({
        data: {
          token,
          broadcaster_id: broadcasterId,
          widget_type: widgetType,
          chat_config_id: chatConfig.id,
          donation_config_id: donationConfig.id,
        },
        include: { chat_config: true, donation_config: true },
      });
    });
  }

  async updateChatConfig(
    configId: string,
    data: Prisma.WidgetChatConfigUpdateInput,
  ): Promise<WidgetChatConfig> {
    return this.prisma.widgetChatConfig.update({
      where: { id: configId },
      data,
    });
  }

  async updateDonationConfig(
    configId: string,
    data: Prisma.WidgetDonationConfigUpdateInput,
  ): Promise<WidgetDonationConfig> {
    return this.prisma.widgetDonationConfig.update({
      where: { id: configId },
      data,
    });
  }
}
