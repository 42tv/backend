import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ulid } from 'ulid';
import {
  WidgetType,
  WidgetChatConfig,
  WidgetDonationConfig,
} from '@prisma/client';
import { WidgetRepository } from './widget.repository';
import { CreateWidgetTokenDto } from './dto/create-widget-token.dto';
import { UpdateChatConfigDto } from './dto/update-chat-config.dto';
import { UpdateDonationConfigDto } from './dto/update-donation-config.dto';
import {
  WidgetConfigResponse,
  WidgetTokenResponse,
  ChatConfigResponse,
  DonationConfigResponse,
} from './types/widget-config.response';

const WIDGET_BASE_URL = process.env.WIDGET_BASE_URL ?? 'https://42tv.kr';

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
      bgOpacity: config.bg_opacity,
      bgColor: config.bg_color,
      fontColor: config.font_color,
      messageDuration: config.message_duration,
      showBadges: config.show_badges,
      showUserId: config.show_user_id,
    };
  }

  private formatDonationConfig(
    config: WidgetDonationConfig,
  ): DonationConfigResponse {
    return {
      style: config.style.toLowerCase(),
      minDisplayAmount: config.min_display_amount,
      displayDuration: config.display_duration,
      goalAmount: config.goal_amount,
      goalLabel: config.goal_label,
      bgOpacity: config.bg_opacity,
      fontSize: config.font_size,
      animationType: config.animation_type,
      soundEnabled: config.sound_enabled,
    };
  }

  private buildWidgetUrls(
    token: string,
    widgetType: WidgetType,
  ): { widgetUrl: string; previewUrl: string } {
    const path =
      widgetType === WidgetType.CHAT ? '/widget/chat' : '/widget/donation';
    const widgetUrl = `${WIDGET_BASE_URL}${path}?token=${token}`;
    const previewUrl = `${WIDGET_BASE_URL}${path}?token=${token}&dev=true`;
    return { widgetUrl, previewUrl };
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
        widgetToken.donation_config,
      ),
    };
  }

  async getMyTokens(broadcasterId: number): Promise<WidgetTokenResponse[]> {
    const existing =
      await this.widgetRepository.findAllByBroadcaster(broadcasterId);

    const requiredTypes = [WidgetType.CHAT, WidgetType.DONATION];
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
    return tokens.map((wt) => {
      const { widgetUrl, previewUrl } = this.buildWidgetUrls(
        wt.token,
        wt.widget_type,
      );
      return {
        token: wt.token,
        widgetType: wt.widget_type,
        widgetUrl,
        previewUrl,
        config: this.formatConfig(
          wt.widget_type,
          wt.chat_config,
          wt.donation_config,
        ),
      };
    });
  }

  private formatConfig(
    widgetType: WidgetType,
    chatConfig: WidgetChatConfig,
    donationConfig: WidgetDonationConfig,
  ): ChatConfigResponse | DonationConfigResponse {
    return widgetType === WidgetType.CHAT
      ? this.formatChatConfig(chatConfig)
      : this.formatDonationConfig(donationConfig);
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
    const { widgetUrl, previewUrl } = this.buildWidgetUrls(
      wt.token,
      wt.widget_type,
    );
    return {
      token: wt.token,
      widgetType: wt.widget_type,
      widgetUrl,
      previewUrl,
      config: this.formatConfig(
        wt.widget_type,
        wt.chat_config,
        wt.donation_config,
      ),
    };
  }

  async updateChatConfig(
    broadcasterId: number,
    token: string,
    dto: UpdateChatConfigDto,
  ): Promise<ChatConfigResponse> {
    const widgetToken = await this.widgetRepository.findByToken(token);
    if (!widgetToken) throw new NotFoundException('위젯을 찾을 수 없습니다.');
    if (widgetToken.broadcaster_id !== broadcasterId)
      throw new ForbiddenException('권한이 없습니다.');

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
        ...(dto.bg_opacity !== undefined && { bg_opacity: dto.bg_opacity }),
        ...(dto.bg_color !== undefined && { bg_color: dto.bg_color }),
        ...(dto.font_color !== undefined && { font_color: dto.font_color }),
        ...(dto.message_duration !== undefined && {
          message_duration: dto.message_duration,
        }),
        ...(dto.show_badges !== undefined && { show_badges: dto.show_badges }),
        ...(dto.show_user_id !== undefined && { show_user_id: dto.show_user_id }),
      },
    );
    return this.formatChatConfig(updated);
  }

  async updateDonationConfig(
    broadcasterId: number,
    token: string,
    dto: UpdateDonationConfigDto,
  ): Promise<DonationConfigResponse> {
    const widgetToken = await this.widgetRepository.findByToken(token);
    if (!widgetToken) throw new NotFoundException('위젯을 찾을 수 없습니다.');
    if (widgetToken.broadcaster_id !== broadcasterId)
      throw new ForbiddenException('권한이 없습니다.');

    const updated = await this.widgetRepository.updateDonationConfig(
      widgetToken.donation_config_id,
      {
        ...(dto.style !== undefined && { style: dto.style }),
        ...(dto.min_display_amount !== undefined && {
          min_display_amount: dto.min_display_amount,
        }),
        ...(dto.display_duration !== undefined && {
          display_duration: dto.display_duration,
        }),
        ...(dto.goal_amount !== undefined && { goal_amount: dto.goal_amount }),
        ...(dto.goal_label !== undefined && { goal_label: dto.goal_label }),
        ...(dto.bg_opacity !== undefined && { bg_opacity: dto.bg_opacity }),
        ...(dto.font_size !== undefined && { font_size: dto.font_size }),
        ...(dto.animation_type !== undefined && {
          animation_type: dto.animation_type,
        }),
        ...(dto.sound_enabled !== undefined && {
          sound_enabled: dto.sound_enabled,
        }),
      },
    );
    return this.formatDonationConfig(updated);
  }
}
