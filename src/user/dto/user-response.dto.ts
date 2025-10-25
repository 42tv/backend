import { ApiProperty } from '@nestjs/swagger';

/**
 * 사용자 정보 DTO
 */
export class UserInfoDto {
  @ApiProperty({
    description: '사용자 인덱스',
    example: 1,
  })
  idx: number;

  @ApiProperty({
    description: '사용자 ID',
    example: 'user123',
  })
  user_id: string;

  @ApiProperty({
    description: '프로필 이미지 URL',
    example: 'https://profile-image-url',
  })
  profile_img: string;

  @ApiProperty({
    description: '닉네임',
    example: '사용자닉네임',
  })
  nickname: string;

  @ApiProperty({
    description: '코인 잔액',
    example: 1000,
  })
  coin_balance: number;

  @ApiProperty({
    description: '총 충전 금액',
    example: 5000,
  })
  total_charged: number;

  @ApiProperty({
    description: '총 사용 금액',
    example: 3000,
  })
  total_used: number;

  @ApiProperty({
    description: '총 받은 금액 (후원)',
    example: 2000,
  })
  total_received: number;
}

/**
 * 사용자 정보 조회 응답 DTO
 */
export class GetUserResponseDto {
  @ApiProperty({
    description: '사용자 정보',
    type: UserInfoDto,
  })
  user: UserInfoDto;
}

/**
 * 닉네임 변경 응답 DTO
 */
export class UpdateNicknameResponseDto {
  @ApiProperty({
    description: '변경 성공 메시지',
    example: '닉네임이 성공적으로 변경되었습니다.',
  })
  message: string;

  @ApiProperty({
    description: '변경된 닉네임',
    example: '새닉네임',
  })
  nickname: string;
}

/**
 * 비밀번호 변경 응답 DTO
 */
export class UpdatePasswordResponseDto {
  @ApiProperty({
    description: '변경 성공 메시지',
    example: '비밀번호가 성공적으로 변경되었습니다.',
  })
  message: string;
}

/**
 * 프로필 이미지 업로드 응답 DTO
 */
export class ProfileImageUploadResponseDto {
  @ApiProperty({
    description: '업로드 성공 메시지',
    example: '프로필 이미지가 성공적으로 업로드되었습니다.',
  })
  message: string;

  @ApiProperty({
    description: '업로드된 이미지 URL',
    example: 'https://bucket.s3.amazonaws.com/profile/user123/image.jpg',
  })
  imageUrl: string;
}

/**
 * 사용자 생성 응답 DTO
 */
export class CreateUserResponseDto {
  @ApiProperty({
    description: '생성 성공 메시지',
    example: '사용자가 성공적으로 생성되었습니다.',
  })
  message: string;

  @ApiProperty({
    description: '생성된 사용자 정보',
    type: UserInfoDto,
  })
  user: UserInfoDto;
}

/**
 * 사용자 프로필 조회 응답 DTO
 */
export class GetUserProfileResponseDto {
  @ApiProperty({
    description: '사용자 정보',
    type: UserInfoDto,
  })
  user: UserInfoDto;

  @ApiProperty({
    description: '추가 프로필 정보 (방송 설정 등)',
    example: {},
  })
  additionalInfo?: any;
}

/**
 * 사용자 에러 응답 DTO
 */
export class UserErrorResponseDto {
  @ApiProperty({
    description: 'HTTP 상태 코드',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: '에러 메시지',
    examples: [
      '이미 존재하는 닉네임입니다.',
      '이미 존재하는 사용자 ID입니다.',
      '비밀번호가 일치하지 않습니다.',
      '파일 업로드에 실패했습니다.',
      '지원하지 않는 파일 형식입니다.',
    ],
  })
  message: string;

  @ApiProperty({
    description: '에러 타입',
    example: 'Bad Request',
  })
  error: string;
}
