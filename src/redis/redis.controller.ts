import { Controller } from '@nestjs/common';
import { RedisService } from './redis.service';

import { MessagePattern } from '@nestjs/microservices';

@Controller('redis')
export class RedisController {
  constructor(private readonly redisService: RedisService) {}

  // @MessagePattern('chatting')
  // async testMessage(message: any) {
  //   const savedMessage = { ...message };
  //   console.log(savedMessage);
  //   await this.redisService.sendChatToRoom(
  //     savedMessage.broadcaster_id,
  //     message,
  //   );

  //   // console.log('message', JSON.stringify(message, null, 2));
  // }
}
