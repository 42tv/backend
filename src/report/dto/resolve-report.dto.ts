import { ReportResolveAction } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class ResolveReportDto {
  @IsEnum(ReportResolveAction)
  action: ReportResolveAction;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
