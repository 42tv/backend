import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class IvsEvent {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  time: string;

  @IsString()
  @IsNotEmpty()
  resource: string;

  @IsString()
  @IsNotEmpty()
  eventName: string;

  @IsString()
  @IsNotEmpty()
  channelName: string;

  @IsString()
  @IsNotEmpty()
  streamId: string;

  @IsOptional()
  @IsString()
  code?: string | null;
}
