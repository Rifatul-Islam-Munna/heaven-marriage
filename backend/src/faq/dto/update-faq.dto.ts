import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateFaqDto } from './create-faq.dto';
import { IsMongoId, IsString } from 'class-validator';

export class UpdateFaqDto extends PartialType(CreateFaqDto) {
    @ApiProperty()
    @IsString()
    @IsMongoId()
    id:string
}
