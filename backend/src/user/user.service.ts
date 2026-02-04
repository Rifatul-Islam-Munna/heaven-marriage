import { HttpException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { FindOneDto, LoginDto, UpdateUserDto, UserFilterDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './entities/user.entity';
import { Model } from 'mongoose';
import bcrypt from 'bcrypt';
import type  { PaginateModel } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import ShortUniqueId from 'short-unique-id';
@Injectable()
export class UserService  {
  private logger = new Logger(UserService.name)
  constructor(@InjectModel(User.name) private userModel:Model<UserDocument> , private jwtService:JwtService){}
  
  async create(createUserDto: CreateUserDto) {
    
 

  const findIsUserThere = await this.userModel.exists({phoneNumber:createUserDto.phoneNumber}).exec();
  if(findIsUserThere){
    throw new HttpException('User already exists', 400);
  }
  const passwordHash = await bcrypt.hash(createUserDto.password, 10);
  const userId = new ShortUniqueId({ length: 10,dictionary:"alphanum_lower" })
  const id = userId.randomUUID()
  const {phoneNumber,name} = createUserDto
    const finalData ={
      phoneNumber,
      name,
      password:passwordHash,
      userId:id
    
    }
    const create = await this.userModel.create(finalData);
    if(!create){
      throw new HttpException('User not created', 400);
    }


    return {message:'User created successfully',data:create};
  }

  async updatedFullUserInformation (updated:UpdateUserDto,userId:string){
    const {password,phoneNumber,isOtpVerified,isSubscriber, role, otpNumber, id, otpValidatedAt, _v,updatedAt,createdAt,...payload} = updated
    const idAndUpdate =  await this.userModel.findOneAndUpdate({_id:userId},{$set:payload},{new:true}).lean();
    if(!idAndUpdate){
      throw new HttpException('User not updated', 400);
    }

    return {
      message:'User updated successfully',
      data:idAndUpdate
    }



  }

  async loginUser(loginUserDto:LoginDto){
     const {phoneNumber,password} = loginUserDto
     if(!phoneNumber || !password){
       throw new HttpException('All fields are required', 400);
     }
     const findOneUser = await this.userModel.findOne({phoneNumber}).select(" email id role phoneNumber name email password isOtpVerified userId").lean();
     if(!findOneUser){
       throw new HttpException('User not found', 400);
     }
     this.logger.debug("is-user-verified->",findOneUser.isOtpVerified)
     if(!findOneUser.isOtpVerified){
       throw new HttpException('User is not verified', 408);
     }
      const isMatch = await bcrypt.compare(password,findOneUser.password);
       if(!isMatch){
      throw new HttpException('Invalid credentials', 400);
    }
    const access_token = this.jwtService.sign({email:findOneUser.email,id:findOneUser._id,role:findOneUser.role,mobileNumber:findOneUser.phoneNumber},{expiresIn:"10d",secret:process.env.ACCESS_TOKEN});
     return{
      message:'User logged in successfully',
      access_token,
     
      user:findOneUser
    }
  }

 async findAll(userQuery: UserFilterDto) {
  const {
    ageMax,
    ageMin,
    category,
    districtId,
    economicStatus,
    educationMedium,
    fiqh,
    gender,
    heightMax,
    heightMin,
    maritalStatus,
    page = 1,
    profession,
    query,
    religiousEducation,
    skinColor,
    upazilaId,
  } = userQuery;

  console.log('Received query params:', userQuery);

  const limit = 10;
  const skip = (page - 1) * limit;
  const pipeline: any[] = [];

  // 1. Fuzzy Search Stage (only if query provided)
  if (query) {
    console.log('Adding search stage for:', query);
    pipeline.push({
      $search: {
        index: 'userSearchIndex',
        compound: {
          should: [
            {
              text: {
                query: query,
                path: 'name',
                fuzzy: { maxEdits: 2, prefixLength: 0, maxExpansions: 50 },
                score: { boost: { value: 5 } },
              },
            },
            {
              text: {
                query: query,
                path: ['address.presentAddress', 'address.district', 'occupational.profession'],
                fuzzy: { maxEdits: 2 },
                score: { boost: { value: 2 } },
              },
            },
          ],
          minimumShouldMatch: 1,
        },
      },
    });

    pipeline.push({
      $addFields: { searchScore: { $meta: 'searchScore' } },
    });
  }

  // 2. Build $match conditions
  const matchConditions: any = {};

  if (gender && gender !== 'all') {
    matchConditions.gender = gender;
  }

  if (maritalStatus && maritalStatus.length > 0) {
    matchConditions.maritalStatus = { $in: maritalStatus };
  }

  if (ageMin !== undefined || ageMax !== undefined) {
    matchConditions.age = {};
    if (ageMin !== undefined) matchConditions.age.$gte = ageMin;
    if (ageMax !== undefined) matchConditions.age.$lte = ageMax;
  }

  if (districtId) {
    matchConditions['address.district'] = districtId;
  }

  if (upazilaId) {
    matchConditions['address.upazila'] = upazilaId;
  }

  if (educationMedium && educationMedium.length > 0) {
    matchConditions['educationInfo.educationMethod'] = { $in: educationMedium };
  }

  if (religiousEducation && religiousEducation.length > 0) {
    matchConditions['personalInformation.islamicStudy'] = { $in: religiousEducation };
  }

  if (heightMin !== undefined || heightMax !== undefined) {
    matchConditions['personalInformation.height'] = {};
    if (heightMin !== undefined) matchConditions['personalInformation.height'].$gte = heightMin;
    if (heightMax !== undefined) matchConditions['personalInformation.height'].$lte = heightMax;
  }

  if (skinColor && skinColor.length > 0) {
    matchConditions['personalInformation.skinTone'] = { $in: skinColor };
  }

  if (fiqh && fiqh.length > 0) {
    matchConditions['personalInformation.fiqhFollow'] = { $in: fiqh };
  }

  if (profession && profession.length > 0) {
    matchConditions['occupational.profession'] = { $in: profession };
  }

  if (economicStatus && economicStatus.length > 0) {
    matchConditions['familyInfo.familyFinancial'] = { $in: economicStatus };
  }

  if (category && category.length > 0) {
    matchConditions.role = { $in: category };
  }

  // Add $match stage if conditions exist
  if (Object.keys(matchConditions).length > 0) {
    console.log('Adding match conditions:', matchConditions);
    pipeline.push({ $match: matchConditions });
  }

  console.log('Pipeline before count:', JSON.stringify(pipeline));

  // 3. Count total documents
  const countPipeline = [...pipeline, { $count: 'total' }];
  const countResult = await this.userModel.aggregate(countPipeline);
  const total = countResult.length > 0 ? countResult[0].total : 0;

  console.log('Total documents after filters:', total);

  // 4. Add sorting
  // ✅ NEW CODE - Add random field
pipeline.push({
  $addFields: {
    randomSort: { $rand: {} }  // Generates random 0-1 for each document
  }
});

// ✅ NEW CODE - Sort by random field
pipeline.push({
  $sort: { randomSort: 1 }
});


  // 5. Add pagination
  pipeline.push({ $skip: skip }, { $limit: limit });

  // 6. Project specific fields
  pipeline.push({
    $project: {
      _id: 1,
      name: 1,
      email: 1,
      age: 1,
      gender: 1,
      maritalStatus: 1,
      userId:1,
      role: 1,
      createdAt: 1,
      'address.district': 1,
      'address.upazila': 1,
      'address.presentAddress': 1,
      'educationInfo.educationMethod': 1,
      'educationInfo.highestEducation': 1,
      'personalInformation.height': 1,
      'personalInformation.skinTone': 1,
      'personalInformation.fiqhFollow': 1,
      'occupational.profession': 1,
      'familyInfo.familyFinancial': 1,
       
    },
  });

  console.log('Final pipeline:', JSON.stringify(pipeline));

  // Execute aggregation
  const users = await this.userModel.aggregate(pipeline);

  console.log('Users returned:', users.length);

  return {
    docs: users,
    totalDocs: total,
    limit,
    page,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page < Math.ceil(total / limit),
    hasPrevPage: page > 1,
    nextPage: page < Math.ceil(total / limit) ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null,
    pagingCounter: skip + 1,
  };
}




  async findOne(id: FindOneDto) {
    const findOne = await this.userModel.findById(id.id).select("  -password -email -otpNumber -otpValidatedAt -phoneNumber -name").lean();
    if(!findOne) {
      throw new HttpException('User not found', 400);
    }
    return findOne;
  }
  async finMyProfile(id: string) {
    const findOne = await this.userModel.findById(id).select("  -password -otpNumber -otpValidatedAt ").lean();
    if(!findOne) {
      throw new HttpException('User not found', 400);
    }
    return findOne;
  }

 async update( updateUserDto: UpdateUserDto) {
    const {id,password, _v,updatedAt,createdAt,...rest} = updateUserDto
    const findOne = await this.userModel.findByIdAndUpdate(id,{$set:rest},{new:true}).lean();
    if(!findOne) {
      throw new HttpException('User not found', 400);
    }
    return findOne;
  }

   async remove(id: FindOneDto) {
     const findOne = await this.userModel.findByIdAndDelete(id.id).lean();
    if(!findOne) {
      throw new HttpException('User not found', 400);
    }
    return findOne;
  }
}
