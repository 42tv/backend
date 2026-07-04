import { IsDateString, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateTermsDto {
  @IsNumber()
  version: number;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsDateString()
  effectiveDate: string;
}
