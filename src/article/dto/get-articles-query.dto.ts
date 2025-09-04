import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, Max, Min } from 'class-validator';

export class GetArticlesQueryDto {
  @Type(() => Number)
  @IsInt({ message: 'userIdx는 유효한 숫자여야 합니다.' })
  @IsPositive({ message: 'userIdx는 1 이상의 값이어야 합니다.' })
  userIdx: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page는 유효한 숫자여야 합니다.' })
  @IsPositive({ message: 'page는 1 이상의 값이어야 합니다.' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'offset은 유효한 숫자여야 합니다.' })
  @Min(0, { message: 'offset은 0 이상의 값이어야 합니다.' })
  offset?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit은 유효한 숫자여야 합니다.' })
  @Min(1, { message: 'limit은 1 이상의 값이어야 합니다.' })
  @Max(100, { message: 'limit은 100 이하의 값이어야 합니다.' })
  limit?: number = 5;
}
