import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';

/**
 * AWS S3 서비스
 * 파일 업로드/삭제 등 S3 관련 작업을 처리합니다.
 * 이 서비스는 다른 컨트롤러에서 파일 관리 목적으로 사용됩니다.
 */
@Injectable()
export class AwsService {
  private readonly s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  constructor() {}

  /**
   * S3에 파일 업로드
   * @param key S3에 저장될 파일의 키(경로)
   * @param buffer 업로드할 파일의 버퍼 데이터
   * @param mimetype 파일의 MIME 타입
   * @returns Promise<void>
   */
  async uploadToS3(
    key: string,
    buffer: Buffer<ArrayBufferLike>,
    mimetype: string,
  ) {
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    });
    await this.s3.send(command);
  }

  /**
   * S3에서 파일 삭제
   * @param key S3에서 삭제할 파일의 키(경로)
   * @returns Promise<void>
   */
  async deleteFromS3(key: string) {
    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
    });
    await this.s3.send(command);
  }
}
