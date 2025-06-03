import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { MemberGuard } from 'src/auth/guard/jwt.member.guard';
import { SendChatDto } from './dto/send-chat.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('')
  @UseGuards(MemberGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '채팅 메시지 전송' })
  @ApiBody({ type: SendChatDto })
  @ApiResponse({
    status: 201,
    description: '채팅 메시지 전송 성공',
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Bad Request' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '인증되지 않은 사용자',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
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
