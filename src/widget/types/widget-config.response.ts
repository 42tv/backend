export interface ChatConfigResponse {
  style: string;
  maxMessages: number;
  showProfileImage: boolean;
  fontSize: number;
  showUserId: boolean;
}

export interface GoalConfigResponse {
  style: string;
  goalAmount: number;
  goalLabel: string;
  bgOpacity: number;
  fontSize: number;
  animationType: string;
}

export interface WidgetConfigResponse {
  widgetType: string;
  broadcasterId: string;
  config: ChatConfigResponse | GoalConfigResponse;
}

export interface WidgetTokenResponse {
  token: string;
  widgetType: string;
  config: ChatConfigResponse | GoalConfigResponse;
}
