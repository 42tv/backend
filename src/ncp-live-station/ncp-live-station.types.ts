/**
 * NCP Live Station 공통 타입.
 * 얇은 클라이언트이므로 전 엔드포인트를 완전 타입화하지 않고,
 * 이번 연동에서 실제 사용하는 핵심 엔드포인트(채널·콜백)만 검증된 필드로 정의한다.
 * 나머지 엔드포인트의 요청 바디/응답은 각 service 메서드의 제네릭으로 호출 측에서 지정한다.
 */

/** NCP 단건 응답 래퍼 */
export interface NcpResponse<T> {
  content: T;
}

/** NCP 목록 응답 래퍼 */
export interface NcpListResponse<T> {
  content: T[];
  total?: number;
}

/** 채널 상태 (GET /channels/{id} 의 channelStatus) */
export type ChannelStatus =
  | 'CREATING'
  | 'READY'
  | 'PUBLISHING'
  | 'BLOCK'
  | 'FORCE_BLOCK'
  | 'DELETED'
  | 'FORCE_DELETED';

/** 서비스 URL 종류 (GET /channels/{id}/serviceUrls) */
export type ServiceUrlType = 'GENERAL' | 'TIMEMACHINE' | 'THUMBNAIL';

/** 채널 생성 요청 바디 (POST /channels) */
export interface CreateChannelBody {
  channelName: string;
  cdn: {
    createCdn: boolean;
    cdnType?: string;
    profileId?: number;
    regionType?: string;
    cdnInstanceNo?: number;
    cdnDomain?: string;
  };
  qualitySetId: number;
  useDvr: boolean;
  record: {
    type: string;
    format?: string;
    bucketName?: string;
    filePath?: string;
    accessControl?: string;
  };
  drmEnabledYn: boolean;
  outputProtocol?: 'HLS' | 'LL_HLS' | 'HLS,DASH';
  envType?: 'REAL' | 'DEV' | 'STAGE';
  immediateOnAir?: boolean;
  isStreamFailOver?: boolean;
  timemachineMin?: number;
  drm?: Record<string, unknown>;
}

/** 채널 상세 정보 (GET /channels/{id} 응답 content) */
export interface ChannelInfo {
  channelId: string;
  channelName: string;
  channelStatus: ChannelStatus;
  streamKey: string;
  publishUrl: string;
  globalPublishUrl?: string;
  qualitySetName?: string;
  outputProtocol?: string;
  isRecording?: boolean;
  useDVR?: boolean;
  [key: string]: unknown;
}

/** 서비스 URL 항목 */
export interface ServiceUrl {
  name: string;
  url: string;
  resolution?: string;
  videoBitrate?: number;
  audioBitrate?: number;
}

/** 콜백 등록 요청 바디 (POST /events/callbackEndpoint) */
export interface RegisterCallbackBody {
  callbackUrl: string;
}

/** Live Station 이벤트 코드 */
export type NcpEventCode =
  | 'PUBLISH_START'
  | 'PUBLISH_END'
  | 'ONAIR_START'
  | 'ONAIR_END'
  | 'STREAM_UPDATE';

/** 콜백 수신 페이로드 (NCP → 우리 서버 POST) */
export interface NcpCallbackPayload {
  id: number;
  logLevel: 'INFO' | 'ERROR';
  channelId: string;
  event: NcpEventCode | string;
  timestamp: number;
}
