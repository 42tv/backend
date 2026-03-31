import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  Prisma,
  WidgetType,
  WidgetToken,
  WidgetChatConfig,
  WidgetGoalConfig,
  User,
} from '@prisma/client';

type WidgetTokenWithConfigs = WidgetToken & {
  chat_config: WidgetChatConfig;
  goal_config: WidgetGoalConfig;
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
        goal_config: true,
        broadcaster: { select: { user_id: true } },
      },
    });
  }

  async findByBroadcasterAndType(
    broadcasterId: number,
    widgetType: WidgetType,
  ): Promise<WidgetTokenWithConfigs | null> {
    return this.prisma.widgetToken.findFirst({
      where: { broadcaster_id: broadcasterId, widget_type: widgetType },
      include: { chat_config: true, goal_config: true },
    });
  }

  async findAllByBroadcaster(
    broadcasterId: number,
  ): Promise<WidgetTokenWithConfigs[]> {
    return this.prisma.widgetToken.findMany({
      where: { broadcaster_id: broadcasterId },
      include: { chat_config: true, goal_config: true },
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
      const goalConfig = await tx.widgetGoalConfig.create({ data: {} });

      return tx.widgetToken.create({
        data: {
          token,
          broadcaster_id: broadcasterId,
          widget_type: widgetType,
          chat_config_id: chatConfig.id,
          goal_config_id: goalConfig.id,
        },
        include: { chat_config: true, goal_config: true },
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

  async updateGoalConfig(
    configId: string,
    data: Prisma.WidgetGoalConfigUpdateInput,
  ): Promise<WidgetGoalConfig> {
    return this.prisma.widgetGoalConfig.update({
      where: { id: configId },
      data,
    });
  }
}
