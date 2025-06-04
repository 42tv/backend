import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { StreamRepository } from './stream.repository';

@Injectable()
export class StreamService {
  constructor(private readonly streamRepository: StreamRepository) {}

  /**
   * user_idx의 방송중인 스트림 조회
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
    thumbnail_url: string,
    request_id: string,
    stream_id: string,
    start_time: string,
    title: string,
    tx?: Prisma.TransactionClient,
  ) {
    return await this.streamRepository.createStream(
      user_idx,
      thumbnail_url,
      request_id,
      stream_id,
      start_time,
      title,
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

  /**
   * 현재 방송중인 리스트 조회
   * @returns
   */
  async getLiveList() {
    return await this.streamRepository.getLiveList();
  }

  /**
   * 방송자의 추천 수를 1 증가시킴
   * @param broadcaster_idx 방송자의 user_idx
   * @returns 업데이트된 Stream 객체
   */
  async increaseRecommend(broadcaster_idx: number) {
    return await this.streamRepository.increaseRecommend(broadcaster_idx);
  }

  /**
   * 방송의 재생 수를 1 증가시킴
   * @param broadcaster_idx 방송자의 user_idx
   * @returns 업데이트된 Stream 객체
   */
  async increasePlayCount(broadcaster_idx: number) {
    return await this.streamRepository.increasePlayCount(broadcaster_idx);
  }
}
