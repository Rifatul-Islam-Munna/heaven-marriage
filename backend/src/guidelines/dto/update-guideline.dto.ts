import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateGuidelineDto } from './create-guideline.dto';
import { IsMongoId, IsString } from 'class-validator';

export class UpdateGuidelineDto extends PartialType(CreateGuidelineDto) {
    @ApiProperty()
        @IsString()
        @IsMongoId()
        id:string
}
