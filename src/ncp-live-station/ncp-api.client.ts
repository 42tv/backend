import { HttpException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';

export type NcpHttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
export type NcpQuery = Record<
  string,
  string | number | boolean | undefined | null
>;

export interface NcpRequestOptions {
  query?: NcpQuery;
  body?: unknown;
}

/**
 * NCP Live Station REST API 공통 클라이언트.
 *
 * - API Gateway 서명 v2 (HMAC-SHA256) 를 직접 생성해 헤더에 실어 호출한다.
 * - Node 내장 fetch/crypto 사용 (별도 의존성 없음).
 * - 각 기능별 service(NcpChannelService 등)가 method·path 를 넘겨 호출한다.
 *
 * 환경변수: NCP_ACCESS_KEY, NCP_SECRET_KEY, (선택) NCP_REGION(기본 KR)
 */
@Injectable()
export class NcpApiClient {
  private readonly logger = new Logger(NcpApiClient.name);
  private readonly baseUrl = 'https://livestation.apigw.ntruss.com';

  private readonly accessKey: string;
  private readonly secretKey: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.accessKey = this.configService.get<string>('NCP_ACCESS_KEY') ?? '';
    this.secretKey = this.configService.get<string>('NCP_SECRET_KEY') ?? '';
    this.region = this.configService.get<string>('NCP_REGION') ?? 'KR';

    if (!this.accessKey || !this.secretKey) {
      this.logger.warn(
        'NCP_ACCESS_KEY / NCP_SECRET_KEY 가 설정되지 않았습니다. Live Station 호출이 실패합니다.',
      );
    }
  }

  /**
   * 서명된 요청을 보내고 파싱된 응답 바디를 반환한다.
   * (NCP 응답은 보통 `{ content: ... }` 형태이므로 호출 측에서 `.content` 로 접근)
   */
  async request<T = unknown>(
    method: NcpHttpMethod,
    path: string,
    options?: NcpRequestOptions,
  ): Promise<T> {
    const uri = path + this.buildQuery(options?.query);
    const timestamp = Date.now().toString();
    const signature = this.sign(method, uri, timestamp);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-ncp-apigw-timestamp': timestamp,
      'x-ncp-iam-access-key': this.accessKey,
      'x-ncp-apigw-signature-v2': signature,
      'x-ncp-region_code': this.region,
    };

    const hasBody = options?.body !== undefined && method !== 'GET';

    const res = await fetch(this.baseUrl + uri, {
      method,
      headers,
      body: hasBody ? JSON.stringify(options?.body) : undefined,
    });

    const text = await res.text();
    let json: unknown = undefined;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = text;
      }
    }

    if (!res.ok) {
      const message = this.extractErrorMessage(json) ?? res.statusText;
      this.logger.error(
        `NCP Live Station 호출 실패 [${res.status}] ${method} ${uri} - ${message}`,
      );
      throw new HttpException(
        { message: `[NCP LiveStation] ${message}`, upstream: json },
        res.status,
      );
    }

    return json as T;
  }

  /** HMAC-SHA256 서명 v2 생성 */
  private sign(method: NcpHttpMethod, uri: string, timestamp: string): string {
    const message = `${method} ${uri}\n${timestamp}\n${this.accessKey}`;
    return createHmac('sha256', this.secretKey)
      .update(message)
      .digest('base64');
  }

  private buildQuery(query?: NcpQuery): string {
    if (!query) return '';
    const parts = Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(
        ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
      );
    return parts.length ? `?${parts.join('&')}` : '';
  }

  private extractErrorMessage(json: unknown): string | undefined {
    if (json && typeof json === 'object') {
      const obj = json as Record<string, unknown>;
      const error = obj.error as Record<string, unknown> | undefined;
      const fromError = error?.message ?? error?.errorMessage;
      const msg = fromError ?? obj.message ?? obj.errorMessage;
      if (typeof msg === 'string') return msg;
    }
    if (typeof json === 'string') return json;
    return undefined;
  }
}
