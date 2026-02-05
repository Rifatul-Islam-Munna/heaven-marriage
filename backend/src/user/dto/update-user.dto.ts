import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsArray, IsInt, IsMongoId, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class UpdateUserDto extends PartialType(CreateUserDto) {
    @ApiProperty({example:"mongo id"})
    @IsMongoId()
    @IsOptional()
    id:string;
    @ApiProperty({example:"mongo id"})
  
    _v:string;
    @ApiProperty({example:"mongo id"})
   
    updatedAt:string;
    @ApiProperty({example:"mongo id"})
   
    createdAt:string;
    @ApiProperty({example:"5"})
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt() 
   
    numberOfConnections:number;
}


export class LoginDto{
     @ApiProperty({ example: '01712345678' })
      @IsString()
      @IsNotEmpty()
      @IsPhoneNumber('BD')
      /* @Matches(/^(\+8801|01)[3-9]\d{8}$/, {
        message: 'Phone number must be valid Bangladesh number',
      }) */
      phoneNumber: string;
    
      @ApiProperty({ example: 'StrongPass@123', minLength: 8 })
      @IsString()
      @IsNotEmpty()
      @MinLength(7)
      @MaxLength(50)
      /* @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
        message: 'Password must contain uppercase, lowercase, number and special character',
      }) */
      password: string;
}


export class UserFilterDto {
  // Search query for fuzzy search
  @ApiPropertyOptional({
    description: 'Search term for name (fuzzy search)',
    example: 'John',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  query?: string;

  // Pagination
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  // Gender filter
  @ApiPropertyOptional({
    description: 'Gender filter',
    example: 'male',
    default: 'all',
    enum: ['all', 'male', 'female'],
  })
  @IsOptional()
  @IsString()
  gender?: string = 'all';

  // Array filters - will be comma-separated from frontend
  @ApiPropertyOptional({
    description: 'Marital status filter (comma-separated)',
    example: 'single,divorced',
    isArray: true,
    type: String,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    return value ? value.split(',').map((v: string) => v.trim()) : [];
  })
  @IsArray()
  maritalStatus?: string[];

  @ApiPropertyOptional({
    description: 'Education medium filter (comma-separated)',
    example: 'bangla,english',
    isArray: true,
    type: String,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    return value ? value.split(',').map((v: string) => v.trim()) : [];
  })
  @IsArray()
  educationMedium?: string[];

  @ApiPropertyOptional({
    description: 'Religious education filter (comma-separated)',
    example: 'quran,hadith',
    isArray: true,
    type: String,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    return value ? value.split(',').map((v: string) => v.trim()) : [];
  })
  @IsArray()
  religiousEducation?: string[];

  @ApiPropertyOptional({
    description: 'Skin color filter (comma-separated)',
    example: 'fair,medium',
    isArray: true,
    type: String,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    return value ? value.split(',').map((v: string) => v.trim()) : [];
  })
  @IsArray()
  skinColor?: string[];

  @ApiPropertyOptional({
    description: 'Fiqh filter (comma-separated)',
    example: 'hanafi,shafii',
    isArray: true,
    type: String,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    return value ? value.split(',').map((v: string) => v.trim()) : [];
  })
  @IsArray()
  fiqh?: string[];

  @ApiPropertyOptional({
    description: 'Profession filter (comma-separated)',
    example: 'engineer,doctor',
    isArray: true,
    type: String,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    return value ? value.split(',').map((v: string) => v.trim()) : [];
  })
  @IsArray()
  profession?: string[];

  @ApiPropertyOptional({
    description: 'Economic status filter (comma-separated)',
    example: 'middle,upper',
    isArray: true,
    type: String,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    return value ? value.split(',').map((v: string) => v.trim()) : [];
  })
  @IsArray()
  economicStatus?: string[];

  @ApiPropertyOptional({
    description: 'Category filter (comma-separated)',
    example: 'premium,verified',
    isArray: true,
    type: String,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    return value ? value.split(',').map((v: string) => v.trim()) : [];
  })
  @IsArray()
  category?: string[];

  // Range filters
  @ApiPropertyOptional({
    description: 'Minimum age',
    example: 18,
    default: 18,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(12)
  ageMin?: number = 16;

  @ApiPropertyOptional({
    description: 'Maximum age',
    example: 40,
    default: 40,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Max(100)
  ageMax?: number = 100;

  @ApiPropertyOptional({
    description: 'Minimum height (in feet)',
    example: 4,
    default: 4,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(3)
  heightMin?: number ;

  @ApiPropertyOptional({
    description: 'Maximum height (in feet)',
    example: 7,
    default: 7,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Max(1200)
  heightMax?: number = 900 ;

  // Location filters
  @ApiPropertyOptional({
    description: 'District ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsString()
  districtId?: string;
  // Location filters
  @ApiPropertyOptional({
    description: 'District ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    description: 'Upazila ID',
    example: '507f1f77bcf86cd799439012',
  })
  @IsOptional()
  @IsString()
  upazilaId?: string;


}


export class FindOneDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsMongoId()
  id: string;
}
export class FindOneTokenDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
 
  id: string;
}

export class ResetPasswordDto{
    @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  oldPassword: string;
  
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  newPassword: string;

}

export class AdminUserDto{
    @ApiPropertyOptional({
    description: 'Search term for name (fuzzy search)',
    example: 'John',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  query?: string;

  // Pagination
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  // Gender filter
  @ApiPropertyOptional({
    description: 'Gender filter',
    example: 'male',
    default: 'all',
    enum: ['all', 'male', 'female'],
  })
  @IsOptional()
  @IsString()
  gender?: string = 'all';
}