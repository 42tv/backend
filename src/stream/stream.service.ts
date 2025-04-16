import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { StreamRepository } from './stream.repository';

@Injectable()
export class StreamService {
  constructor(private readonly streamRepository: StreamRepository) {}

  /**
   * getStreamByUserIdx
   */
  async getStreamByUserIdx(user_idx: number) {
    return await this.streamRepository.getStreamByUserIdx(user_idx);
  }

  /**
   * 방송시작 콜백시 user_idx의 스트림 생성.
   * @param user_idx
   * @param title
   * @param is_adult
   * @param is_private
   * @param is_fan
   * @param password
   * @param fan_level
   * @param tx
   * @returns
   */
  async createStream(
    user_idx: number,
    request_id: string,
    stream_id: string,
    start_time: string,
    title: string,
    is_adult: boolean,
    is_private: boolean,
    is_fan: boolean,
    password: string,
    fan_level: number,
    tx?: Prisma.TransactionClient,
  ) {
    return await this.streamRepository.createStream(
      user_idx,
      request_id,
      stream_id,
      start_time,
      title,
      is_adult,
      is_private,
      is_fan,
      password,
      fan_level,
      tx,
    );
  }

  /**
   * 스트림 삭제
   * @param user_idx
   * @param tx
   * @returns
   */
  async deleteStream(stream_id: string, tx?: Prisma.TransactionClient) {
    return await this.streamRepository.deleteStream(stream_id, tx);
  }
}
