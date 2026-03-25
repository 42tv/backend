export interface ChatConfigResponse {
  style: string;
  maxMessages: number;
  showProfileImage: boolean;
  fontSize: string;
  bgOpacity: number;
  bgColor: string;
  fontColor: string;
  messageDuration: number;
  showBadges: boolean;
}

export interface DonationConfigResponse {
  style: string;
  minDisplayAmount: number;
  displayDuration: number;
  goalAmount: number | null;
  goalLabel: string | null;
  bgOpacity: number;
  fontSize: string;
  animationType: string;
  soundEnabled: boolean;
}

export interface WidgetConfigResponse {
  widgetType: string;
  broadcasterId: string;
  chatConfig: ChatConfigResponse;
  donationConfig: DonationConfigResponse;
}

export interface WidgetTokenResponse {
  token: string;
  widgetType: string;
  widgetUrl: string;
  previewUrl: string;
  chatConfig: ChatConfigResponse;
  donationConfig: DonationConfigResponse;
}
