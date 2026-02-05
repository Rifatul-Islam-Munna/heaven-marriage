import { HttpException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { AdminUserDto, FindOneDto, LoginDto, ResetPasswordDto, UpdateUserDto, UserFilterDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './entities/user.entity';
import { Model, Types } from 'mongoose';
import bcrypt from 'bcrypt';

import { JwtService } from '@nestjs/jwt';
import ShortUniqueId from 'short-unique-id';
import { Shortlist, ShortlistDocument } from './entities/shortlist.schema';
import { CreateShortlistDto, PaginationDto } from './dto/create-shortlist.dto';
import { BkashService } from './bkash.service';
import { ConfigService } from '@nestjs/config';
import { PricingService } from 'src/pricing/pricing.service';
import { RequestNumberDto } from './dto/request-number.dto';
import { RequestNumber, RequestNumberDocument } from './entities/RequestNumber.schema';
@Injectable()
export class UserService  {
  private logger = new Logger(UserService.name)
  constructor(@InjectModel(User.name) private userModel:Model<UserDocument>,@InjectModel(Shortlist.name) private shortlistModel:Model<ShortlistDocument> , private jwtService:JwtService, private bkash:BkashService,  private readonly configService: ConfigService,private pricingService: PricingService,@InjectModel(RequestNumber.name) private requestNumberModel:Model<RequestNumberDocument>){}
  
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
    const {password,phoneNumber,isOtpVerified,isSubscriber, role, otpNumber, numberOfConnections, id, otpValidatedAt, _v,updatedAt,createdAt,...payload} = updated
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
     const findOneUser = await this.userModel.findOne({phoneNumber}).select(" email id role phoneNumber name email password isOtpVerified userId numberOfConnections").lean();
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
    country
  } = userQuery;

  console.log('Received query params:', userQuery);

  const limit = 10;
  const skip = (page - 1) * limit;
  const pipeline: any[] = [];

  // 1. Fuzzy Search Stage (only if query provided)
 if (query) { 
    console.log('Adding text search stage for:', query);
    
    // Use $text instead of $search (works with local MongoDB)
    pipeline.push({
      $match: {
        $text: { 
          $search: query,
          $caseSensitive: false,
          $diacriticSensitive: false
        }
      }
    });

    // Add text score for sorting/filtering
    pipeline.push({
      $addFields: { 
        searchScore: { $meta: 'textScore' } 
      }
    });

    // Optional: Sort by relevance
    pipeline.push({
      $sort: { searchScore: -1 }
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
  if(country){
    matchConditions.nationality = country
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

 async addToShortList(payload: CreateShortlistDto, userId: string) {
  const findAndUpdate = await this.shortlistModel.findOneAndUpdate(
    { userId: userId },
    { $addToSet: { shortlistedUserId: payload.shortlistedUserId } }, 
    { new: true, upsert: true }
  );
   
  return findAndUpdate;
}
 async removeFromShortList(payload: CreateShortlistDto, userId: string) {
  const findAndUpdate = await this.shortlistModel.findOneAndUpdate(
    { userId: userId },
    { $pull: { shortlistedUserId: payload.shortlistedUserId } }, // ✅ Use $pull instead
    { new: true }
  ).exec();
   
  return findAndUpdate;
}
async getShortlist(userId: string, paginationDto: PaginationDto) {
  const { page = 1, limit = 10 } = paginationDto;
  const skip = (page - 1) * limit;
  this.logger.debug("user-id",userId)
  const result = await this.shortlistModel.aggregate([
    // Match the user's shortlist
    { $match: { userId: new Types.ObjectId(userId) } },
    
    // Unwind the shortlisted user IDs array
    { $unwind: '$shortlistedUserId' },
    
    // Lookup/join with User collection
    {
      $lookup: {
        from: 'users', // Your User collection name (lowercase, pluralized)
        localField: 'shortlistedUserId',
        foreignField: '_id',
        as: 'userDetails'
      }
    },
    
    // Unwind the user details
    { $unwind: '$userDetails' },
    
    // Replace root with user details
    { $replaceRoot: { newRoot: '$userDetails' } },
    
    // Project only the fields you need
    {
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        age: 1,
        gender: 1,
        maritalStatus: 1,
        userId: 1,
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
      }
    },
    
    // Facet for pagination
    {
      $facet: {
        metadata: [{ $count: 'totalItems' }],
        data: [{ $skip: skip }, { $limit: limit }]
      }
    }
  ]).exec();
  

  const totalItems = result[0]?.metadata[0]?.totalItems || 0;
  const data = result[0]?.data || [];

  return {data, page, limit, totalItems};
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


  async updatePassword(id:string, updateDto:ResetPasswordDto){
    const {newPassword,oldPassword} = updateDto
    const findOne = await this.userModel.findById(id).select("password").lean();
    if(!findOne) {
      throw new HttpException('User not found', 400);
    }
    const isMatch = await bcrypt.compare(oldPassword,findOne.password);
    if(!isMatch){
      throw new HttpException('Invalid credentials', 400);
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updatePassword = await this.userModel.findByIdAndUpdate(id,{$set:{password:passwordHash}},{new:true}).lean();
    if(!updatePassword) {
      throw new HttpException('User not found', 400);
    }
    return updatePassword;
  }



 async getUserForAdmin(query: AdminUserDto) {
  const { page = 1, gender = 'all', query: searchQuery } = query;
  const limit = 10;
  const skip = (page - 1) * limit;

  // Build filter
  const filter: any = {};

  // Text search using MongoDB text index
  if (searchQuery && searchQuery.trim()) {
    filter.$text = { $search: searchQuery };
  }

  // Gender filter
  if (gender && gender !== 'all') {
    filter.gender = gender;
  }

  // Execute query with pagination
  const [data, totalItems] = await Promise.all([
    this.userModel
      .find(filter)
      .select('name email phoneNumber maritalStatus isSubscriber isOtpVerified')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }) // Latest users first
      .lean()
      .exec(),
    this.userModel.countDocuments(filter).exec(),
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  return {
    data,
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

async toggleSubscription(id:string) {
  const findOne = await this.userModel.findById(id).select("isSubscriber").lean();
  if(!findOne) {
    throw new HttpException('User not found', 400);
  }
  const updateSubscription = await this.userModel.findByIdAndUpdate(id,{$set:{isSubscriber:!findOne.isSubscriber}},{new:true}).lean();
  if(!updateSubscription) {
    throw new HttpException('User not found', 400);
  }
  return updateSubscription;
}
async userDeleteAdmin(id:string) {
  const findOne = await this.userModel.findByIdAndDelete(id).lean();
  if(!findOne) {
    throw new HttpException('User not found', 400);
  }
  
  return findOne;
}


async createPayment(pkgId: string,id:string){
  this.logger.debug("pkgId->",pkgId)
   const finOneUser = await this.userModel.findById(id).lean();
   const findOnePackage = await this.pricingService.findOne(pkgId);
   if(!finOneUser || !findOnePackage){
     throw new HttpException('User not found', 400);
   }
   this.logger.debug("findOnePackage->",findOnePackage)
   const finalPrice = findOnePackage?.discountPrice ? findOnePackage.discountPrice : findOnePackage.originalPrice ?? 100 ;
   const userIdWithConnections = `${finOneUser._id.toString()}-${findOnePackage.numberOfConnections}`
   const createPayment = await this.bkash.createPayment(finalPrice,userIdWithConnections.toString());
   return createPayment
}

async executePayment(paymentId:string){
  try{
const executePayment = await this.bkash.executePayment(paymentId);
      this.logger.log('Execute response:', executePayment);
           const BKASH_COMPLETE = this.configService.get('BKASH_COMPLETE');
           if (executePayment.transactionStatus === BKASH_COMPLETE) {
                  const parts = executePayment.payerReference.split('-');
            const findOne = await this.userModel.findByIdAndUpdate(parts[0],{$inc:{numberOfConnections:Number(parts[1])}}).lean();
            if(!findOne) {
              return {
                failure: true,
                success: false
              };
            }
            this.logger.debug("success-----of---this----era")
            return {
              success: true,
              failure: false
            }

           }
           this.logger.debug("fail-----of---this----era")
           return {
            failure: true,
            success: false}
  }catch(error){
      this.logger.debug("fail-----of---this----era",error)
    return {
      failure: true,
      success: false}
  }
  
  


}

async createRequestNumber(payload:RequestNumberDto){
  const finUser = await this.userModel.findById(payload.userId).select("email id role phoneNumber name email password isOtpVerified userId numberOfConnections").lean();
  if(!finUser){
    throw new HttpException('User not found', 400);
  }
  if(finUser?.numberOfConnections <=0){
    throw new HttpException('Not enough connections', 400);
  }
  const isAlreadyInRequest = await this.requestNumberModel.findOne({userId:payload.userId,requestUserId:payload.requestUserId}).lean();
  if(isAlreadyInRequest){
    throw new HttpException('Phone Number already requested', 400);
  }
  const requestUser = await this.userModel.findById(payload.requestUserId).select("email id role phoneNumber name email password isOtpVerified userId numberOfConnections").lean();
  if(!requestUser?.phoneNumber){
    throw new HttpException('User not found', 400);
  }
  const [updatedUser,createdUser] = await Promise.all([
    await this.userModel.findByIdAndUpdate(payload.userId,{$inc:{numberOfConnections:-1}},{new:true}).select("email id role phoneNumber name email password isOtpVerified userId numberOfConnections").lean(),
    await this.requestNumberModel.create({userId:payload.userId,requestUserId:payload.requestUserId})
  ])
return {
  userData:updatedUser,
  message:"Request number created successfully"
}

}

async getMyRequests (userId:string, query:PaginationDto){

  const {page = 1, limit = 10} = query
  const skip = (page - 1) * limit;
  const findShortlist = await this.requestNumberModel.find({userId}).populate({
    path:'requestUserId',
    select:"email phoneNumber name   isOtpVerified userId "
  }).skip(skip).limit(limit).lean();
  const totalItems = await this.requestNumberModel.countDocuments({userId});
  const totalPages = Math.ceil(totalItems / limit);
  return {
    data:findShortlist,
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  }

}

}
