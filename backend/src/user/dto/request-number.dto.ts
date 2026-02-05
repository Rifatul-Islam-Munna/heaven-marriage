import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsMongoId } from 'class-validator';

export class RequestNumberDto {
    @ApiProperty({ example: '01712345678' })
    @IsMongoId()

    userId: string;

    @ApiProperty({ example: '01712345678' })
    @IsMongoId()
    requestUserId: string;
}

export class paginationDto{
    @ApiProperty({ example: '1' })
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    page: number;
    @ApiProperty({ example: '1' })
   @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    limit: number;
}