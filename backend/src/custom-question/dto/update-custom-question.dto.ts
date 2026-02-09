import { PartialType } from '@nestjs/swagger';
import { CreateCustomQuestionDto } from './create-custom-question.dto';

export class UpdateCustomQuestionDto extends PartialType(CreateCustomQuestionDto) {}
