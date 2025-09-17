import { Logger } from '@nestjs/common';

export class EnvironmentValidator {
  private static readonly logger = new Logger(EnvironmentValidator.name);

  /**
   * 애플리케이션 시작 시 모든 필수 환경변수를 검증합니다.
   */
  static validateRequiredEnvironmentVariables(): void {
    const requiredEnvVars = [
      // 데이터베이스
      'DATABASE_URL',

      // Redis
      'REDIS_IP',
      'REDIS_PASSWORD',

      // JWT
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',

      // AWS 서비스
      'AWS_REGION',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'AWS_S3_BUCKET',
      'AWS_IVS_RECORDING_CONFIG_ARN',
      'AWS_WEBHOOK_SECRET_TOKEN',

      // CDN 및 URL
      'CDN_URL',
      'FRONTEND_REDIRECT_URI',

      // Google OAuth
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'GOOGLE_REDIRECT_URI',
    ];

    const missingEnvVars = requiredEnvVars.filter(
      (envVar) => !process.env[envVar] || process.env[envVar].trim() === '',
    );

    if (missingEnvVars.length > 0) {
      const errorMessage = `다음 필수 환경변수가 설정되지 않았습니다: ${missingEnvVars.join(', ')}`;
      this.logger.error(errorMessage);
      this.logger.error('애플리케이션을 시작할 수 없습니다. .env 파일을 확인해주세요.');
      throw new Error(errorMessage);
    }

    this.logger.log(`모든 필수 환경변수가 설정되었습니다. (총 ${requiredEnvVars.length}개)`);
  }

  /**
   * 특정 환경변수 그룹을 검증합니다.
   */
  static validateEnvironmentGroup(groupName: string, envVars: string[]): void {
    const missingEnvVars = envVars.filter(
      (envVar) => !process.env[envVar] || process.env[envVar].trim() === '',
    );

    if (missingEnvVars.length > 0) {
      const errorMessage = `${groupName} 관련 환경변수가 누락되었습니다: ${missingEnvVars.join(', ')}`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    this.logger.log(`${groupName} 환경변수 검증 완료`);
  }

  /**
   * AWS 관련 환경변수만 검증합니다.
   */
  static validateAWSEnvironmentVariables(): void {
    this.validateEnvironmentGroup('AWS', [
      'AWS_REGION',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'AWS_S3_BUCKET',
      'AWS_IVS_RECORDING_CONFIG_ARN',
      'AWS_WEBHOOK_SECRET_TOKEN',
    ]);
  }

  /**
   * 데이터베이스 관련 환경변수만 검증합니다.
   */
  static validateDatabaseEnvironmentVariables(): void {
    this.validateEnvironmentGroup('Database', [
      'DATABASE_URL',
      'REDIS_IP',
      'REDIS_PASSWORD',
    ]);
  }

  /**
   * 인증 관련 환경변수만 검증합니다.
   */
  static validateAuthEnvironmentVariables(): void {
    this.validateEnvironmentGroup('Authentication', [
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'GOOGLE_REDIRECT_URI',
    ]);
  }
}