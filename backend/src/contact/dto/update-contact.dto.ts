import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateContactDto } from './create-contact.dto';
import { IsBoolean, IsMongoId, IsNotEmpty } from 'class-validator';

export class UpdateContactDto extends PartialType(CreateContactDto) {
     @ApiProperty({
    description: 'Contact ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Mark as read status',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  isRead: boolean;
}
