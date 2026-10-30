import {
  Equals,
  IsInt,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
export class ProfileAiTurnDto {
  @IsString() @MinLength(1) @MaxLength(2000) message: string;
  @IsString() @Matches(/^[A-Za-z0-9_-]{8,100}$/) requestId: string;
  @IsInt() @Min(0) revision: number;
  @Equals(true) consent: boolean;
}
