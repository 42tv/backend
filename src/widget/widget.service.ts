import { Injectable, NotFoundException } from '@nestjs/common';
import { ulid } from 'ulid';
import { WidgetType, WidgetChatConfig, WidgetGoalConfig } from '@prisma/client';
import { WidgetRepository } from './widget.repository';
import { CreateWidgetTokenDto } from './dto/create-widget-token.dto';
import { UpdateChatConfigDto } from './dto/update-chat-config.dto';
import { UpdateGoalConfigDto } from './dto/update-goal-config.dto';
import {
  WidgetConfigResponse,
  WidgetTokenResponse,
  ChatConfigResponse,
  GoalConfigResponse,
} from './types/widget-config.response';

@Injectable()
export class WidgetService {
  constructor(private readonly widgetRepository: WidgetRepository) {}

  private generateToken(): string {
    return ulid();
  }

  private formatChatConfig(config: WidgetChatConfig): ChatConfigResponse {
    return {
      style: config.style.toLowerCase(),
      maxMessages: config.max_messages,
      showProfileImage: config.show_profile_image,
      fontSize: config.font_size,
      showUserId: config.show_user_id,
    };
  }

  private formatGoalConfig(config: WidgetGoalConfig): GoalConfigResponse {
    return {
      style: config.style.toLowerCase(),
      goalAmount: config.goal_amount,
      goalLabel: config.goal_label,
      bgOpacity: config.bg_opacity,
      fontSize: config.font_size,
      animationType: config.animation_type,
    };
  }

  async getConfig(token: string): Promise<WidgetConfigResponse> {
    const widgetToken = await this.widgetRepository.findByToken(token);
    if (!widgetToken) {
      throw new NotFoundException('위젯을 찾을 수 없습니다.');
    }

    return {
      widgetType: widgetToken.widget_type,
      broadcasterId: widgetToken.broadcaster.user_id,
      config: this.formatConfig(
        widgetToken.widget_type,
        widgetToken.chat_config,
        widgetToken.goal_config,
      ),
    };
  }

  async getMyTokens(broadcasterId: number): Promise<WidgetTokenResponse[]> {
    const existing =
      await this.widgetRepository.findAllByBroadcaster(broadcasterId);

    const requiredTypes = [WidgetType.CHAT, WidgetType.GOAL];
    const existingTypes = new Set(existing.map((wt) => wt.widget_type));

    const missing = requiredTypes.filter((type) => !existingTypes.has(type));
    const created = await Promise.all(
      missing.map((type) =>
        this.widgetRepository.createToken(
          broadcasterId,
          this.generateToken(),
          type,
        ),
      ),
    );

    const tokens = [...existing, ...created];
    return tokens.map((wt) => ({
      token: wt.token,
      widgetType: wt.widget_type,
      config: this.formatConfig(wt.widget_type, wt.chat_config, wt.goal_config),
    }));
  }

  private formatConfig(
    widgetType: WidgetType,
    chatConfig: WidgetChatConfig,
    goalConfig: WidgetGoalConfig,
  ): ChatConfigResponse | GoalConfigResponse {
    return widgetType === WidgetType.CHAT
      ? this.formatChatConfig(chatConfig)
      : this.formatGoalConfig(goalConfig);
  }

  async createToken(
    broadcasterId: number,
    dto: CreateWidgetTokenDto,
  ): Promise<WidgetTokenResponse> {
    const token = this.generateToken();
    const wt = await this.widgetRepository.createToken(
      broadcasterId,
      token,
      dto.widget_type,
    );
    return {
      token: wt.token,
      widgetType: wt.widget_type,
      config: this.formatConfig(wt.widget_type, wt.chat_config, wt.goal_config),
    };
  }

  async updateChatConfig(
    broadcasterId: number,
    dto: UpdateChatConfigDto,
  ): Promise<ChatConfigResponse> {
    const widgetToken = await this.widgetRepository.findByBroadcasterAndType(
      broadcasterId,
      WidgetType.CHAT,
    );
    if (!widgetToken) throw new NotFoundException('위젯을 찾을 수 없습니다.');

    const updated = await this.widgetRepository.updateChatConfig(
      widgetToken.chat_config_id,
      {
        ...(dto.style !== undefined && { style: dto.style }),
        ...(dto.max_messages !== undefined && {
          max_messages: dto.max_messages,
        }),
        ...(dto.show_profile_image !== undefined && {
          show_profile_image: dto.show_profile_image,
        }),
        ...(dto.font_size !== undefined && { font_size: dto.font_size }),
        ...(dto.show_user_id !== undefined && {
          show_user_id: dto.show_user_id,
        }),
      },
    );
    return this.formatChatConfig(updated);
  }

  async updateGoalConfig(
    broadcasterId: number,
    dto: UpdateGoalConfigDto,
  ): Promise<GoalConfigResponse> {
    const widgetToken = await this.widgetRepository.findByBroadcasterAndType(
      broadcasterId,
      WidgetType.GOAL,
    );
    if (!widgetToken) throw new NotFoundException('위젯을 찾을 수 없습니다.');

    const updated = await this.widgetRepository.updateGoalConfig(
      widgetToken.goal_config_id,
      {
        ...(dto.style !== undefined && { style: dto.style }),
        ...(dto.goal_amount !== undefined && { goal_amount: dto.goal_amount }),
        ...(dto.goal_label !== undefined && { goal_label: dto.goal_label }),
        ...(dto.bg_opacity !== undefined && { bg_opacity: dto.bg_opacity }),
        ...(dto.font_size !== undefined && { font_size: dto.font_size }),
        ...(dto.animation_type !== undefined && {
          animation_type: dto.animation_type,
        }),
      },
    );
    return this.formatGoalConfig(updated);
  }
}
