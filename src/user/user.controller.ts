import { Body, Controller, Post } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  //@Get('')
  //async getUser(): Promise<string> {
  //    return 'Hello World';
  //}

  @Post('')
  async createUser(
    @Body('id') id: string,
    @Body('password') pw: string,
    @Body('nickname') nickname: string,
  ) {
    return await this.userService.createUser(id, pw, nickname);
  }
}
