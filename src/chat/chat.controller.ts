import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { MemberGuard } from 'src/auth/guard/jwt.member.guard';
import { SendChatDto } from './dto/send-chat.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('')
  @UseGuards(MemberGuard)
  async sendChattingMessage(@Req() req, @Body() sendChatDto: SendChatDto) {
    const userIdx = req.user.idx;
    const { broadcaster_id, message } = sendChatDto;
    return await this.chatService.sendChattingMessage(
      userIdx,
      broadcaster_id,
      message,
    );
  }
}
