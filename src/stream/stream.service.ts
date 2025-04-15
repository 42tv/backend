import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { StreamRepository } from './stream.repository';

@Injectable()
export class StreamService {
  constructor(private readonly streamRepository: StreamRepository) {}

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
  async deleteStream(user_idx: number, tx?: Prisma.TransactionClient) {
    return await this.streamRepository.deleteStream(user_idx, tx);
  }
}
