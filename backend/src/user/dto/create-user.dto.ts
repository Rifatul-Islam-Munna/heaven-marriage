import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsBoolean,
  IsNumber,
  IsOptional,
  MinLength,
  MaxLength,
  Min,
  Max,
  Matches,
  ValidateNested,
  IsNotEmpty,
  Length,
  IsPhoneNumber,
  IsObject,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserType } from '../entities/user.entity';

// Nested DTOs
class AddressDto {
  @ApiPropertyOptional({ example: 'House 10, Road 5, Dhanmondi' })
  @IsString()
  @IsOptional()
  presentAddress?: string;

  @ApiPropertyOptional({ example: 'Village: Savar, Post: Savar' })
  @IsString()
  @IsOptional()
  permanentAddress?: string;

  @ApiPropertyOptional({ example: 'Dhaka', description: 'District name' })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiPropertyOptional({ example: 'Dhanmondi', description: 'Upazila name' })
  @IsString()
  @IsOptional()
  upazila?: string;

  @ApiPropertyOptional({ example: 'Near city hospital' })
  @IsString()
  @IsOptional()
  extraInfo?: string;
}

class EducationInfoDto {
  @ApiPropertyOptional({ example: 'General', description: 'Education method' })
  @IsString()
  @IsOptional()
  educationMethod?: string;

  @ApiPropertyOptional({ example: "Bachelor's Degree" })
  @IsString()
  @IsOptional()
  highestEducation?: string;

  @ApiPropertyOptional({ example: 'Dhaka Board' })
  @IsString()
  @IsOptional()
  highestEducationBoard?: string;

  @ApiPropertyOptional({ example: 'Science' })
  @IsString()
  @IsOptional()
  highestEducationGroup?: string;

  @ApiPropertyOptional({ example: '2020' })
  @IsString()
  @IsOptional()
  highestEducationPassingYear?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  currentlyDoingHightEducation?: boolean;

  @ApiPropertyOptional({ example: '2015' })
  @IsString()
  @IsOptional()
  sSCPassingYear?: string;

  @ApiPropertyOptional({ example: 'Science' })
  @IsString()
  @IsOptional()
  sSCPassingGroup?: string;

  @ApiPropertyOptional({ example: 'A+' })
  @IsString()
  @IsOptional()
  sSCResult?: string;

  @ApiPropertyOptional({ example: '2017' })
  @IsString()
  @IsOptional()
  hSCPassingYear?: string;

  @ApiPropertyOptional({ example: 'Science' })
  @IsString()
  @IsOptional()
  hSCPassingGroup?: string;

  @ApiPropertyOptional({ example: 'A' })
  @IsString()
  @IsOptional()
  hSCResult?: string;
  @ApiPropertyOptional({ example: 'A' })
  @IsString()
  @IsOptional()
  educationBackground?: string;
}

class FamilyInfoDto {
  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  isFatherAlive?: boolean;

  @ApiPropertyOptional({ example: 'Business' })
  @IsString()
  @IsOptional()
  fathersProfession?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  isMotherAlive?: boolean;

  @ApiPropertyOptional({ example: 'Housewife' })
  @IsString()
  @IsOptional()
  mothersProfession?: string;

  @ApiPropertyOptional({ example: 2, minimum: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Transform(({ value }) => parseInt(value, 10))
  brotherCount?: number;

  @ApiPropertyOptional({ example: '1 married, 1 studying' })
  @IsString()
  @IsOptional()
  brotherInformation?: string;

  @ApiPropertyOptional({ example: 1, minimum: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Transform(({ value }) => parseInt(value, 10))
  sisterCount?: number;

  @ApiPropertyOptional({ example: '1 married' })
  @IsString()
  @IsOptional()
  sisterInformation?: string;

  @ApiPropertyOptional({ example: 'Middle Class', description: 'Financial status' })
  @IsString()
  @IsOptional()
  familyFinancial?: string;

  @ApiPropertyOptional({ example: 'Own house, land' })
  @IsString()
  @IsOptional()
  familyAssetDetails?: string;

  @ApiPropertyOptional({ example: 'Practicing Muslim family' })
  @IsString()
  @IsOptional()
  familyReligiousCondition?: string;
}

class PersonalInformationDto {
  @ApiPropertyOptional({ example: 'Traditional Islamic dress' })
  @IsString()
  @IsOptional()
  outsideClothes?: string;

  @ApiPropertyOptional({ example: '2 years' })
  @IsString()
  @IsOptional()
  womenNiqbYear?: string;

  @ApiPropertyOptional({ example: 'Yes, Sunnah beard' })
  @IsString()
  @IsOptional()
  manBeard?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  manClothAboveAnkels?: boolean;

  @ApiPropertyOptional({ example: '2018' })
  @IsString()
  @IsOptional()
  prayerFiverTimeFrom?: string;

  @ApiPropertyOptional({ example: 'Rarely' })
  @IsString()
  @IsOptional()
  MissPrayerTime?: string;

  @ApiPropertyOptional({ example: 'Maintain proper hijab' })
  @IsString()
  @IsOptional()
  maharaNonMahram?: string;

  @ApiPropertyOptional({ example: 'Can recite with tajweed' })
  @IsString()
  @IsOptional()
  reciteQuran?: string;

  @ApiPropertyOptional({ example: 'Hanafi' })
  @IsString()
  @IsOptional()
  fiqhFollow?: string;

  @ApiPropertyOptional({ example: 'Limited use for necessary purposes' })
  @IsString()
  @IsOptional()
  digitalMedia?: string;

  @ApiPropertyOptional({ example: 'None' })
  @IsString()
  @IsOptional()
  mentalOrPhysicalIssue?: string;

  @ApiPropertyOptional({ example: 'Teaching Quran' })
  @IsString()
  @IsOptional()
  specialWorkOfDeen?: string;

  @ApiPropertyOptional({ example: 'Strong belief in Tawheed' })
  @IsString()
  @IsOptional()
  majarBeliveStatus?: string;

  @ApiPropertyOptional({ example: 'Riyadus Saliheen, Fazail e Amal' })
  @IsString()
  @IsOptional()
  islamicBookName?: string;

  @ApiPropertyOptional({ example: 'Mufti Menk, Nouman Ali Khan' })
  @IsString()
  @IsOptional()
  islamicScholarsName?: string;

  @ApiPropertyOptional({ example: 'Reading, traveling' })
  @IsString()
  @IsOptional()
  extraInfoHobby?: string;

  @ApiPropertyOptional({ example: 165, minimum: 100, maximum: 250 })
  @IsNumber()
  @IsOptional()
  @Min(100)
  @Max(250)
  @Transform(({ value }) => Number(value))
  height?: number;

  @ApiPropertyOptional({ example: 'Fair', description: 'Skin tone' })
  @IsString()
  @IsOptional()
  skinTone?: string;

  @ApiPropertyOptional({ example: 'Madrasa' })
  @IsString()
  @IsOptional()
  islamicStudy?: string;
  @ApiPropertyOptional({ example: 'Madrasa' })
  @IsString()
  @IsOptional()
  physicalStructure?: string;
}

class OccupationalDto {
  @ApiPropertyOptional({ example: 'Software Engineer' })
  @IsString()
  @IsOptional()
  profession?: string;

  @ApiPropertyOptional({ example: 'Full-time at tech company' })
  @IsString()
  @IsOptional()
  workingDetails?: string;

  @ApiPropertyOptional({ example: '50000 BDT' })
  @IsString()
  @IsOptional()
  salary?: string;
}

class MarriageInformationWomenDto {
  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  isGuardiansAgreed?: boolean;

  @ApiPropertyOptional({ example: 'Will continue if needed' })
  @IsString()
  @IsOptional()
  jobAfterMarriage?: string;

  @ApiPropertyOptional({ example: 'Will complete current degree' })
  @IsString()
  @IsOptional()
  studyAfterMarriage?: string;

  @ApiPropertyOptional({ example: 'Want a pious and caring husband' })
  @IsString()
  @IsOptional()
  thoughtsOnMarriage?: string;
  @ApiPropertyOptional({ example: 'Want a pious and caring husband' })
  @IsString()
  @IsOptional()
  polygamyConsentOptions: string;

   @ApiPropertyOptional({ example: 'Want a pious and caring husband' })
  @IsString()
  @IsOptional()
  caringforChildren: string;
  @ApiPropertyOptional({ example: 'Want a pious and caring husband' })
  @IsString()
  @IsOptional()
  childCustody: string;
}

class MarriageInformationManDto {
  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  isGuardiansAgreed?: boolean;

  @ApiPropertyOptional({ example: 'Full hijab with niqab preferred' })
  @IsString()
  @IsOptional()
  wifeVailAfterMarriage?: string;

  @ApiPropertyOptional({ example: 'Support if she wants to continue' })
  @IsString()
  @IsOptional()
  allowWifeStudyAfterMarriage?: string;

  @ApiPropertyOptional({ example: 'Only if necessary' })
  @IsString()
  @IsOptional()
  wifeJobAfterMarriage?: string;

  @ApiPropertyOptional({ example: 'Own apartment in Dhaka' })
  @IsString()
  @IsOptional()
  livingPlaceAfterMarriage?: string;

  @ApiPropertyOptional({ example: 'No expectations' })
  @IsString()
  @IsOptional()
  expectedAnyGiftFromMarriage?: string;

  @ApiPropertyOptional({ example: 'Building a Islamic family' })
  @IsString()
  @IsOptional()
  thoughtsOnMarriage?: string;
}

class ExpectedLifePartnerDto {
  @ApiPropertyOptional({ example: '22-28' })
  @IsString()
  @IsOptional()
  age?: string;

  @ApiPropertyOptional({ example: 'Fair to Medium' })
  @IsString()
  @IsOptional()
  complexion?: string;

  @ApiPropertyOptional({ example: '5\'2" to 5\'6"' })
  @IsString()
  
  @IsOptional()
  height?: string;

  @ApiPropertyOptional({ example: 'Graduate or above' })
  @IsString()
  @IsOptional()
  education?: string;

  @ApiPropertyOptional({ example: 'Dhaka' })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiPropertyOptional({ example: 'Any' })
  @IsString()
  @IsOptional()
  upazila?: string;

  @ApiPropertyOptional({ example: 'Never Married' })
  @IsString()
  @IsOptional()
  maritalStatus?: string;

  @ApiPropertyOptional({ example: 'Any halal profession' })
  @IsString()
  @IsOptional()
  profession?: string;

  @ApiPropertyOptional({ example: 'Middle class or above' })
  @IsString()
  @IsOptional()
  financialCondition?: string;

  @ApiPropertyOptional({ example: 'Pious, respectful, family oriented' })
  @IsString()
  @IsOptional()
  expectedQuality?: string;
}

class PledgeDto {
  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  youGordianKnowsThis?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  allTheInformationTrue?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  anyMisInformationWeAreNotKnowing?: boolean;
}

// Main Create User DTO
export class CreateUserDto {
  // REQUIRED FIELDS (from schema with required:true)
  @ApiProperty({ example: 'Ahmed Rahman', description: 'Full name of the user' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name: string;
  @ApiProperty({ type:String,enum:UserType,default:UserType.USER })
  @IsString()
  @IsOptional()
  role?: UserType.USER;

  @ApiProperty({ example: '01712345678' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(\+8801|01)[3-9]\d{8}$/, {
    message: 'Phone number must be valid Bangladesh number',
  })
  @IsPhoneNumber('BD')
  phoneNumber: string;

  @ApiProperty({ example: 'StrongPass@123', minLength: 8 })
  @IsString()
  @IsNotEmpty()
  @MinLength(7)
  @MaxLength(50)
 /*  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain uppercase, lowercase, number and special character',
  }) */
  password: string;

  // OPTIONAL FIELDS (no required:true in schema)
  @ApiPropertyOptional({ example: 'ahmed@example.com' })
 
  @IsOptional()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string;

  @ApiPropertyOptional({ example: 'Male', enum: ['Male', 'Female'] })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ example: 'Never Married', enum: ['Never Married', 'Divorced', 'Widowed'] })
  @IsString()
  @IsOptional()
  maritalStatus?: string;

  @ApiPropertyOptional({ example: 25, minimum: 18, maximum: 100 })
  @IsNumber()
  @IsOptional()
  @Min(10)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  age?: number;

  @ApiPropertyOptional({ example: 'A+', enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] })
  @IsString()
  @IsOptional()
  bloodGroup?: string;

  @ApiPropertyOptional({ example: 65, minimum: 30, maximum: 200, description: 'Weight in kg' })
  @IsNumber()
  @IsOptional()
  @Min(10)
  @Max(200)
  @Transform(({ value }) => parseInt(value, 10))
  weight?: number;

  @ApiPropertyOptional({ example: 'Bangladeshi' })
  @IsString()
  @IsOptional()
  nationality?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  isOtpVerified?: boolean;

  @ApiPropertyOptional({ example: '123456' })
  @IsString()
  @IsOptional()
  @Length(6, 6)
  otpNumber?: string;

  @ApiPropertyOptional({ example: '123456' })
  @IsString()
  @IsOptional()

  howYouWannaGetMarried?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  otpValidatedAt?: Date;

  @ApiPropertyOptional({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  isSubscriber?: boolean;

  // NESTED OPTIONAL OBJECTS
  @ApiPropertyOptional({ type: AddressDto })
  @ValidateNested()
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (typeof value === 'string') return JSON.parse(value);
    return value;
  })
  address?: AddressDto;

  @ApiPropertyOptional({ type: EducationInfoDto })
  @ValidateNested()
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (typeof value === 'string') return JSON.parse(value);
    return value;
  })
  educationInfo?: EducationInfoDto;

  @ApiPropertyOptional({ type: FamilyInfoDto })
  @ValidateNested()
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (typeof value === 'string') return JSON.parse(value);
    return value;
  })
  familyInfo?: FamilyInfoDto;

  @ApiPropertyOptional({ type: PersonalInformationDto })
  @ValidateNested()
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (typeof value === 'string') return JSON.parse(value);
    return value;
  })
  personalInformation?: PersonalInformationDto;

  @ApiPropertyOptional({ type: OccupationalDto })
  @ValidateNested()
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (typeof value === 'string') return JSON.parse(value);
    return value;
  })
  occupational?: OccupationalDto;

  @ApiPropertyOptional({ type: MarriageInformationWomenDto })
  @ValidateNested()
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (typeof value === 'string') return JSON.parse(value);
    return value;
  })
  marriageInformationWomen?: MarriageInformationWomenDto;

  @ApiPropertyOptional({ type: MarriageInformationManDto })
  @ValidateNested()
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (typeof value === 'string') return JSON.parse(value);
    return value;
  })
  marriageInformationMan?: MarriageInformationManDto;

  @ApiPropertyOptional({ type: ExpectedLifePartnerDto })
  @ValidateNested()
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (typeof value === 'string') return JSON.parse(value);
    return value;
  })
  expectedLifePartner?: ExpectedLifePartnerDto;

  @ApiPropertyOptional({ type: PledgeDto })
  @ValidateNested()
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (typeof value === 'string') return JSON.parse(value);
    return value;
  })
  pledge?: PledgeDto;

   @ApiPropertyOptional({
    description: 'Dynamic custom fields as key-value pairs',
    example: {
      height: '5.8',
      occupation: 'Engineer',
    },
  })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, string>;
}
