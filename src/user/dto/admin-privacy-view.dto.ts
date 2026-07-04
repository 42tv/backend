import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export const PRIVACY_FIELDS = ['name', 'phone', 'email', 'address'] as const;
export type PrivacyField = (typeof PRIVACY_FIELDS)[number];

export class AdminPrivacyViewDto {
  @IsIn(PRIVACY_FIELDS)
  field: PrivacyField;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
