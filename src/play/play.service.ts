import { Injectable } from '@nestjs/common';

@Injectable()
export class PlayService {
  constructor() {}
  async play(userId: string) {
    // Implement your play logic here
    return { message: `Playing for user ${userId}` };
  }
}
