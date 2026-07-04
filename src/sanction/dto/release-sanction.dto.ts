import { IsNotEmpty, IsString } from 'class-validator';

export class ReleaseSanctionDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
