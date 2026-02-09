import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class CreateCustomQuestionDto {
  @IsString()
  @IsNotEmpty({ message: 'Question is required' })
  @MinLength(5, { message: 'Question must be at least 5 characters' })
  @MaxLength(500, { message: 'Question must not exceed 500 characters' })
  question: string;
}


export class deleteDto{
  @IsString()
  @IsNotEmpty({ message: 'Question is required' })
 id: string;
}
