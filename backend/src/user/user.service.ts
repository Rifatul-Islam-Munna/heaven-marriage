import { HttpException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { AdminUserDto, FindOneDto, LoginDto, NewPasswordResetWithOtp, ReqForDto, ResetPasswordDto, UpdateUserDto, UserFilterDto } from './dto/update-user.dto';
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
import { TelegramChannel, TelegramService } from './telegram.service';
import {OAuth2Client } from "google-auth-library"
import { Cron,CronExpression } from '@nestjs/schedule';
import { OtpService } from './otp.service';
import { SmsService } from './sms.service';
import { Counter, CounterDocument } from './entities/counter.schema';
import { PdfService } from './pdf.service';
@Injectable()
export class UserService  implements OnModuleInit{
  private logger = new Logger(UserService.name)
  constructor(@InjectModel(User.name) private userModel:Model<UserDocument>,@InjectModel(Shortlist.name) private shortlistModel:Model<ShortlistDocument> , private jwtService:JwtService, private bkash:BkashService,  private readonly configService: ConfigService,private pricingService: PricingService,@InjectModel(RequestNumber.name) private requestNumberModel:Model<RequestNumberDocument>, private telegramService:TelegramService,private otpService:OtpService, private smsService:SmsService,@InjectModel(Counter.name) private counterModel:Model<CounterDocument>, private pdfService:PdfService){}
   async onModuleInit() {
    await this.ensurePhoneNumberIndex();
    const findOneAdmin = await this.userModel.findOne({role:'admin'}).lean().exec();
    if(!findOneAdmin){
      const rewPAssword =  this.configService.get<string>('ADMIN_PASSWORD') as string
      const passwordHash = await bcrypt.hash(rewPAssword, 10)
     const createAdmin = await this.userModel.create({
      name:"admin",
       phoneNumber: this.configService.get<string>('ADMIN_USER') as string,
       password: passwordHash,
       role: 'admin',
       isOtpVerified:true
     })
    }
   }
  private async ensurePhoneNumberIndex() {
    const currentIndexes = await this.userModel.collection.indexes();
    const hasExpectedPhoneIndex = currentIndexes.some(
      (index) =>
        index.name === 'phoneNumber_1' &&
        index.unique === true &&
        index.partialFilterExpression?.phoneNumber?.$type === 'string',
    );

    if (hasExpectedPhoneIndex) {
      return;
    }

    const legacyPhoneIndex = currentIndexes.find(
      (index) => index.name === 'phoneNumber_1',
    );

    if (legacyPhoneIndex) {
      this.logger.warn('Replacing legacy phoneNumber_1 index so null phone numbers are allowed');
      await this.userModel.collection.dropIndex('phoneNumber_1');
    }

    await this.userModel.collection.createIndex(
      { phoneNumber: 1 },
      {
        name: 'phoneNumber_1',
        unique: true,
        partialFilterExpression: {
          phoneNumber: { $type: 'string' },
        },
      },
    );
  }
  async create(createUserDto: CreateUserDto) {
    
    if(!createUserDto.phoneNumber || !createUserDto.password){
      throw new HttpException('All fields are required', 400);
    }

  const findIsUserThere = await this.userModel.findOne({phoneNumber:createUserDto.phoneNumber}).lean().exec();

  if(findIsUserThere ){
    if (findIsUserThere.isOtpVerified) {
      throw new HttpException('User already exists', 400);
    }
      const now = new Date();
    const otpExpiry = new Date(findIsUserThere.otpValidatedAt);
     if (otpExpiry > now) {
      return {
        message: 'OTP has already been sent to your mobile number',
        data: {
          phoneNumber: findIsUserThere.phoneNumber,
          otpExpiresAt: otpExpiry,
        },
      };
    }
       const newOtp = await this.otpService.generateUniqueOTP();
    const newOtpExpiry = new Date(Date.now() + 26 * 60 * 1000);

    await this.userModel.updateOne(
      { phoneNumber: createUserDto.phoneNumber },
      {
        $set: {
          otpNumber: newOtp,
          otpValidatedAt: newOtpExpiry,
        },
      }
    );
    this.smsService.sendOtpSms(createUserDto.phoneNumber,newOtp)
    return {
      message: 'OTP has been sent to your mobile number',
      data: {
        phoneNumber: findIsUserThere.phoneNumber,
        otpExpiresAt: newOtpExpiry,
      },
    };

  }
  const passwordHash = await bcrypt.hash(createUserDto.password, 10);

  const {phoneNumber,name} = createUserDto
  const newId = await this.counterModel.findOneAndUpdate({_id:"counter"},{$inc:{seq:1}},{new:true, upsert: true }).lean();
  const userIdCount = `${String(newId.seq).padStart(6, '0')}`;
  const getOtp = await this.otpService.generateUniqueOTP()
    const finalData ={
      phoneNumber,
      name,
      password:passwordHash,
      userId:userIdCount,
      otpNumber:getOtp,
      gender:createUserDto.gender,
    
      otpValidatedAt: new Date(Date.now() + 26 * 60 * 1000),
    }
    this.smsService.sendOtpSms(phoneNumber,getOtp)
    const create = await this.userModel.create(finalData);
    if(!create){
      throw new HttpException('User not created', 400);
    }


    return {message:'User created successfully',data:create};
  }


  async verifyOtp(otp:string){
    const findOneAndUpdated = await this.userModel.findOneAndUpdate({otpNumber:otp},{isOtpVerified:true,otpValidatedAt:null, otpNumber:null}).lean();
    if(!findOneAndUpdated){
      throw new HttpException('User not found', 400);
    }
          const secret = this.configService.get<string>('ACCESS_TOKEN');
  this.logger.log('🔑 Regular Login SECRET:', secret); // Debug
    const access_token = await this.jwtService.sign({email:findOneAndUpdated.email ?? "",id:findOneAndUpdated._id,role:findOneAndUpdated.role,mobileNumber:findOneAndUpdated.phoneNumber},{expiresIn:"10d",secret:secret});
    return {message:'User verified successfully',data:findOneAndUpdated,access_token:access_token};
    
  }
  




 @Cron(CronExpression.EVERY_10_MINUTES)
async findUserAndUpdated() {
  
    // Find all users where:
    // 1. otpValidatedAt exists (not null/undefined)
    // 2. otpValidatedAt is less than current time (expired)
    const result = await this.userModel.updateMany(
      {
        otpValidatedAt: {
          $ne: null, // Not null
          $exists: true, // Field exists
          $lt: new Date(), // Less than current time (expired)
        },
        isOtpVerified:false
      },
      {
        $set: {
          otpValidatedAt: null,
          otpNumber: null,
        },
      }
    );

    console.log(`Cleared ${result.modifiedCount} expired OTPs`);
    return { success: true, clearedCount: result.modifiedCount };
  
}


  async updatedFullUserInformation (updated:UpdateUserDto,userId:string){
    const {password,isOtpVerified,isSubscriber, role, otpNumber, numberOfConnections, id, otpValidatedAt, _v,updatedAt,createdAt,...payload} = updated
    const idAndUpdate =  await this.userModel.findOneAndUpdate({_id:userId},{$set:payload},{new:true}).lean();
    if(!idAndUpdate){
      throw new HttpException('User not updated', 400);
    }
   this.sendToUser(idAndUpdate)
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
     const findOneUser = await this.userModel.findOne({phoneNumber}).select(" email id role phoneNumber name email password isOtpVerified userId numberOfConnections gender").lean();
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
      const secret = this.configService.get<string>('ACCESS_TOKEN');
  this.logger.log('🔑 Regular Login SECRET:', secret); // Debug
    const access_token = await this.jwtService.sign({email:findOneUser.email ?? "",id:findOneUser._id,role:findOneUser.role,mobileNumber:findOneUser.phoneNumber},{expiresIn:"10d",secret:secret});
     return{
      message:'User logged in successfully',
      access_token,
     
      user:findOneUser
    }
  }

  async loginWithGoogle(tokenId:string){
     const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
       const ticket = await client.verifyIdToken({
      idToken: tokenId,
      audience: process.env.GOOGLE_CLIENT_ID
    })
   const googlePayload = ticket.getPayload();
   this.logger.debug('googlePayload',googlePayload)
   const {email,name,picture,} = googlePayload as {email:string,name:string,picture:string}

   let finUserByEmail = await this.userModel.findOne({email:email});
  const newId = await this.counterModel.findOneAndUpdate({_id:"counter"},{$inc:{seq:1}},{new:true, upsert: true }).lean();
  const userIdCount = `${String(newId.seq).padStart(6, '0')}`;
   if(!finUserByEmail){
     finUserByEmail = await this.userModel.create({
      email:email,
      name:name,
      isOtpVerified:true,
      userId:userIdCount

     })
   }
       const secret = this.configService.get<string>('ACCESS_TOKEN');
  this.logger.log('🔑 Regular Login SECRET:', secret); // Debug
     const access_token = await this.jwtService.sign({email:finUserByEmail.email ?? "",id:finUserByEmail._id ?? "",role:finUserByEmail?.role ?? "",mobileNumber:finUserByEmail?.phoneNumber ?? ""},{expiresIn:"10d",secret:secret});
     return{
       message:'User logged in successfully',
      access_token:access_token,
     
      user:finUserByEmail
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
    country,
    polygamy
    
  } = userQuery;

  console.log('Received query params:', userQuery);

  const limit = 10;
  const skip = (page - 1) * limit;
  const pipeline: any[] = [];
  const isBiodataNumber = query && /^\d+$/.test(query.trim());

/* pipeline.push({
  $match: {
    $and: [
      { isPublished: { $eq: true } },
      { isPublished: { $ne: null } },
      { isPublishFromAdmin: { $eq: true } },
      { isPublishFromAdmin: { $ne: null } }
    ]
  }
}); */
  const firstMatch: any = {
    $and: [
     /*  { isPublished: { $eq: true } },
      { isPublished: { $ne: null } }, */
      { isPublishFromAdmin: { $eq: true } },
      { isPublishFromAdmin: { $ne: null } }
    ]
  };

  // 1. Fuzzy Search Stage (only if query provided)
   if (query && !isBiodataNumber) {
    firstMatch.$and.push({
      $text: { 
        $search: query,
        $caseSensitive: false,
        $diacriticSensitive: false
      }
    });
  }
   pipeline.push({ $match: firstMatch });
  if (query && !isBiodataNumber) {
    pipeline.push({
      $addFields: { 
        searchScore: { $meta: 'textScore' } 
      }
    });
    
    pipeline.push({
      $sort: { searchScore: -1 }
    });
  }

  if (query && isBiodataNumber) {
    const numericQuery = parseInt(query);
    pipeline.push({
      $match: {
        $or: [
          { userId: query },                           // Exact match "000004"
          { userId: String(numericQuery) },            // Match "4"
          { userId: { $regex: `^0*${numericQuery}$` } } // Match with any leading zeros
        ]
      }
    });
  }
  // 2. Build $match conditions
  const matchConditions: any = {};

  if (gender && gender !== 'all') {
    matchConditions.gender = gender;
  }
  this.logger.debug('polygamy',polygamy)
 if(polygamy){
  matchConditions['marriageInformationWomen.polygamyConsentOptions'] = 'yes'
 }
  if (maritalStatus && maritalStatus.length > 0 && maritalStatus[0] !== 'all') {
  const hasPolygamy = maritalStatus.includes('yes');
  const otherStatuses = maritalStatus.filter(status => status !== 'yes');
  
  if (hasPolygamy && otherStatuses.length > 0) {
    // Both regular marital status and polygamy
    matchConditions.$or = [
      { maritalStatus: { $in: otherStatuses } },
      { 'marriageInformationWomen.polygamyConsentOptions': 'yes' }
    ];
  } else if (hasPolygamy) {
    // Only polygamy
    matchConditions['marriageInformationWomen.polygamyConsentOptions'] = 'yes';
  } else {
    // Only regular marital status
    matchConditions.maritalStatus = { $in: otherStatuses };
  }
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

 // After building matchConditions, add conversion for height
if (heightMin !== undefined || heightMax !== undefined) {
  // Add a stage to convert height string to number
  pipeline.push({
    $addFields: {
      'personalInformation.heightNumeric': {
        $toDouble: {
          $ifNull: ['$personalInformation.height', 0]
        }
      }
    }
  });

  // Now use the numeric field for comparison
  matchConditions['personalInformation.heightNumeric'] = {};
  if (heightMin !== undefined) matchConditions['personalInformation.heightNumeric'].$gte = heightMin;
  if (heightMax !== undefined) matchConditions['personalInformation.heightNumeric'].$lte = heightMax;
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
  const hasVerified = category.includes('verified');
  const hasGeneral = category.includes('general');
  this.logger.log(`hasVerified: ${hasVerified}, hasGeneral: ${hasGeneral}`);
  if(hasVerified && hasGeneral){
    matchConditions.isSubscriber = { $in: [true, false] };
  }
  else if (hasVerified && !hasGeneral) {
    matchConditions.isSubscriber = true;
  } else if (hasGeneral && !hasVerified) {
    matchConditions.isSubscriber = false;
  } 
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
  const searchId = id.id;
  const isValidObjectId = Types.ObjectId.isValid(searchId) && 
                          String(new Types.ObjectId(searchId)) === searchId;
  
  let findOne;
  
  // Try to find by _id first if it's a valid ObjectId
  if (isValidObjectId) {
    findOne = await this.userModel
      .findById(searchId)
      .select('-password -email -otpNumber -otpValidatedAt -phoneNumber -whatsapp ')
      .lean();
  }
  
  // If not found and not a valid ObjectId, try userId
  if (!findOne) {
    findOne = await this.userModel
      .findOne({ userId: searchId })
      .select('-password -email -otpNumber -otpValidatedAt -phoneNumber -whatsapp ')
      .lean();
  }
  
  if (!findOne) {
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

   async removeUser(id: string) {
     const findOne = await this.userModel.findByIdAndDelete(id).lean();
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
  const { page = 1, limit = 10, gender = 'all', query: searchQuery,isPublished } = query;
  const skip = (page - 1) * limit;
  this.logger.debug("searchQuery->",isPublished)

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
  
  if (isPublished !== undefined && isPublished !== null && isPublished !== 'all') {
  filter.isPublishFromAdmin =  isPublished === 'true';
}

  // Execute query with pagination
  const [data, totalItems] = await Promise.all([
    this.userModel
      .find(filter)
      .select('name email phoneNumber whatsapp maritalStatus isSubscriber isOtpVerified numberOfConnections isPublished isPublishFromAdmin userId')
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
            this.findUserAndSendToTelegram(parts[0])
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
  const finUser = await this.userModel.findById(payload.userId).select("email id role phoneNumber name gender email password isOtpVerified userId numberOfConnections").lean();
  if(!finUser){
    throw new HttpException('User not found', 400);
  }
  if(!finUser.phoneNumber){
    throw new HttpException('Your phone number is missing', 400);
  }
  if(finUser?.numberOfConnections <=0){
    throw new HttpException('Not enough connections', 400);
  }
  const isAlreadyInRequest = await this.requestNumberModel.findOne({userId:payload.userId,requestUserId:payload.requestUserId}).lean();
  if(isAlreadyInRequest){
    throw new HttpException('Phone Number already requested', 400);
  }
  const requestUser = await this.userModel.findById(payload.requestUserId).select("email id role gender phoneNumber name email password isOtpVerified userId numberOfConnections").lean();
  if(!requestUser?.phoneNumber){
    throw new HttpException('User not found', 400);
  }
  const [updatedUser,createdUser] = await Promise.all([
    await this.userModel.findByIdAndUpdate(payload.userId,{$inc:{numberOfConnections:-1}},{new:true}).select("email id role phoneNumber name email password isOtpVerified userId numberOfConnections gender").lean(),
    await this.requestNumberModel.create({userId:payload.userId,requestUserId:payload.requestUserId})
  ])
  const UserReqNumber = {
    from:{
      name:finUser.name,
      email:finUser.email,
      phoneNumber:finUser.phoneNumber,
      userId:finUser.userId,
      gender:finUser.gender
    },
    toUser:{
      name:requestUser.name,
      email:requestUser.email,
      phoneNumber:requestUser.phoneNumber,
      userId:requestUser.userId,
      gender:requestUser.gender
    }
  }
  this.NumberRequest(UserReqNumber)
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

async RequestForOtpRestPassword(payload:ReqForDto){
  const findOneUser = await this.userModel.findOne({phoneNumber:payload.phoneNumber}).lean();
  if(!findOneUser || !findOneUser.phoneNumber){
    throw new HttpException('User not found', 400);
  }
        const newOtp = await this.otpService.generateUniqueOTP();
    const newOtpExpiry = new Date(Date.now() + 26 * 60 * 1000);

    await this.userModel.updateOne(
      { phoneNumber: findOneUser.phoneNumber },
      {
        $set: {
          otpNumber: newOtp,
          otpValidatedAt: newOtpExpiry,
        },
      }
    );
    this.smsService.sendOtpSms(findOneUser.phoneNumber,newOtp)

    return {
      message:"OTP sent successfully",
     
    }

  
}
async ResetPasswordWithOtp (payload:NewPasswordResetWithOtp){
  const findUser = await this.userModel.findOne({phoneNumber:payload.phoneNumber,otpNumber:payload.otp}).lean();
  if(!findUser){
    throw new HttpException('User not found', 400);
  }

  const hashedPassword = await bcrypt.hash(payload.newPassword, 10);
  await this.userModel.updateOne(
    { phoneNumber: findUser.phoneNumber },
    {
      $set: {
        password: hashedPassword,
        otpNumber: null,
        otpValidatedAt: null,
      },
    }
  );
  return {
    message:"Password reset successfully",
  }
  
}









//bot 

 async sendToUser(user: UserDocument) {
    const isMale = user.gender?.toLowerCase() === 'male' || user.gender?.toLowerCase() === 'পুরুষ';
    const isFemale = user.gender?.toLowerCase() === 'female' || user.gender?.toLowerCase() === 'মহিলা';
      const completionPercentage = this.calculateDataCompletion(user);
       if (completionPercentage < 55) {
    this.logger.warn(`User ${user.userId} data is only ${completionPercentage}% complete. Skipping PDF send.`);
    return false;
  }
    if(user?.isPdfSend) {
      this.logger.warn(`User ${user.userId} has already sent a PDF. Skipping PDF send.`);
      return false;
    };
    
    try {
      // Generate PDF
      this.logger.log(`Generating PDF for user ${user.userId}`);
      const pdfBuffer = await this.pdfService.generateBiodataPdf(user);

      // Send PDF to Telegram
      const sent = await this.telegramService.sendDocument({
        channel: isMale ? TelegramChannel.MALE : TelegramChannel.FEMALE,
        document: pdfBuffer,
        filename: `${user?.name}-biodata-${isMale ? 'NG' : 'NB'}-${user.userId}.pdf`,
        caption: `🎉 New ${isMale ? 'Male' : 'Female'} Biodata\n\nBiodata #${isMale ? 'NG' : 'NB'}-${user.userId}\nName: ${user.name || 'N/A'}\nPhone: ${user.phoneNumber || 'N/A'}`,
      });

      if (sent) {
        this.logger.log(`PDF sent successfully for user ${user.userId}`);
        const findAdnUpdate = await this.userModel.findOneAndUpdate({_id:user._id},{isPdfSend:true}).exec();
        return true;
      } else {
        this.logger.warn(`Failed to send PDF for user ${user.userId}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Error generating/sending PDF: ${error.message}`);
      return false;
    }
  }
 private calculateDataCompletion(user: UserDocument): number {
  const fields = [
    // Basic Info (10 fields)
    user.name,
    user.userId,
    user.email,
    user.phoneNumber,
    user.gender,
    user.maritalStatus,
    user.age,
    user.bloodGroup,
    user.weight,
    user.nationality,

    // Address (4 fields)
    user.address?.district,
    user.address?.upazila,
    user.address?.permanentAddress,
    user.address?.presentAddress,

    // Education (6 fields)
    user.educationInfo?.educationMethod,
    user.educationInfo?.highestEducation,
    user.educationInfo?.highestEducationBoard,
    user.educationInfo?.highestEducationGroup,
    user.educationInfo?.highestEducationPassingYear,
    user.educationInfo?.educationBackground,

    // Family (8 fields)
    user.familyInfo?.isFatherAlive,
    user.familyInfo?.fathersProfession,
    user.familyInfo?.isMotherAlive,
    user.familyInfo?.mothersProfession,
    user.familyInfo?.brotherCount,
    user.familyInfo?.sisterCount,
    user.familyInfo?.familyFinancial,
    user.familyInfo?.familyReligiousCondition,

    // Personal (10 fields)
    user.personalInformation?.height,
    user.personalInformation?.skinTone,
    user.personalInformation?.outsideClothes,
    user.personalInformation?.prayerFiverTimeFrom,
    user.personalInformation?.reciteQuran,
    user.personalInformation?.fiqhFollow,
    user.personalInformation?.digitalMedia,
    user.personalInformation?.islamicStudy,
    user.personalInformation?.physicalStructure,
    user.personalInformation?.maharaNonMahram,

    // Occupation (3 fields)
    user.occupational?.profession,
    user.occupational?.workingDetails,
    user.occupational?.salary,

    // Marriage Info (5 fields - conditional based on gender)
    user.marriageInformationWomen?.isGuardiansAgreed || user.marriageInformationMan?.isGuardiansAgreed,
    user.marriageInformationWomen?.jobAfterMarriage || user.marriageInformationMan?.wifeJobAfterMarriage,
    user.marriageInformationWomen?.studyAfterMarriage || user.marriageInformationMan?.allowWifeStudyAfterMarriage,
    user.marriageInformationWomen?.thoughtsOnMarriage || user.marriageInformationMan?.thoughtsOnMarriage,
    user.marriageInformationWomen?.polygamyConsentOptions || user.marriageInformationMan?.livingPlaceAfterMarriage,

    // Expected Partner (5 fields)
    user.expectedLifePartner?.age,
    user.expectedLifePartner?.education,
    user.expectedLifePartner?.profession,
    user.expectedLifePartner?.district,
    user.expectedLifePartner?.maritalStatus,
  ];

  const totalFields = fields.length;
  const filledFields = fields.filter(
    field => field !== null && field !== undefined && field !== ''
  ).length;

  const percentage = Math.round((filledFields / totalFields) * 100);
  return percentage;
}

async findUserAndSendToTelegram(id: string) {
  const user = await this.userModel.findById(id).exec();
  if(!user) return;
  const getValue = (value: any): string => {
    if (value === null || value === undefined || value === '') return 'তথ্য নেই';
    if (typeof value === 'boolean') return value ? 'হ্যাঁ' : 'না';
    return String(value);
  };

  // Determine if user is male or female
  const isMale = user.gender?.toLowerCase() === 'male' || user.gender?.toLowerCase() === 'পুরুষ';
  const isFemale = user.gender?.toLowerCase() === 'female' || user.gender?.toLowerCase() === 'মহিলা';

 const message = `
🎉 <b>${isMale ? 'পুরুষ' : isFemale ? 'মহিলা' : ''} ব্যবহারকারী</b>

━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 <b>মৌলিক তথ্য</b>
👤 নাম: ${getValue(user.name)}
🆔 ইউজার আইডি: ${getValue(user.userId)}
📧 ইমেইল: ${getValue(user.email)}
📱 ফোন: ${getValue(user.phoneNumber)}
👥 ভূমিকা: ${getValue(user.role)}
⚧ লিঙ্গ: ${getValue(user.gender)}
💍 বৈবাহিক অবস্থা: ${getValue(user.maritalStatus)}
🎂 বয়স: ${getValue(user.age)} বছর
🩸 রক্তের গ্রুপ: ${getValue(user.bloodGroup)}
⚖️ ওজন: ${getValue(user.weight)} কেজি
🌍 জাতীয়তা: ${getValue(user.nationality)}
🔗 কানেকশন: ${getValue(user.numberOfConnections)}

━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 <b>ঠিকানা তথ্য</b>
🏠 বর্তমান ঠিকানা: ${getValue(user.address?.presentAddress)}
🏡 স্থায়ী ঠিকানা: ${getValue(user.address?.permanentAddress)}
📌 জেলা: ${getValue(user.address?.district)}
🗺 উপজেলা: ${getValue(user.address?.upazila)}
ℹ️ অতিরিক্ত তথ্য: ${getValue(user.address?.extraInfo)}

━━━━━━━━━━━━━━━━━━━━━━━━━━

🎓 <b>শিক্ষাগত তথ্য</b>
📚 শিক্ষা পদ্ধতি: ${getValue(user.educationInfo?.educationMethod)}
🏆 সর্বোচ্চ শিক্ষা: ${getValue(user.educationInfo?.highestEducation)}
📋 বোর্ড: ${getValue(user.educationInfo?.highestEducationBoard)}
📖 বিভাগ: ${getValue(user.educationInfo?.highestEducationGroup)}
📅 পাশের বছর: ${getValue(user.educationInfo?.highestEducationPassingYear)}
📝 বর্তমানে পড়াশোনা: ${getValue(user.educationInfo?.currentlyDoingHightEducation)}
📚 শিক্ষাগত পটভূমি: ${getValue(user.educationInfo?.educationBackground)}

<i>এসএসসি তথ্য:</i>
📅 পাশের বছর: ${getValue(user.educationInfo?.sSCPassingYear)}
📖 বিভাগ: ${getValue(user.educationInfo?.sSCPassingGroup)}
🎯 ফলাফল: ${getValue(user.educationInfo?.sSCResult)}

<i>এইচএসসি তথ্য:</i>
📅 পাশের বছর: ${getValue(user.educationInfo?.hSCPassingYear)}
📖 বিভাগ: ${getValue(user.educationInfo?.hSCPassingGroup)}
🎯 ফলাফল: ${getValue(user.educationInfo?.hSCResult)}

━━━━━━━━━━━━━━━━━━━━━━━━━━

👨‍👩‍👧‍👦 <b>পারিবারিক তথ্য</b>
👨 পিতা জীবিত: ${getValue(user.familyInfo?.isFatherAlive)}
💼 পিতার পেশা: ${getValue(user.familyInfo?.fathersProfession)}
👩 মাতা জীবিত: ${getValue(user.familyInfo?.isMotherAlive)}
💼 মাতার পেশা: ${getValue(user.familyInfo?.mothersProfession)}
👬 ভাই সংখ্যা: ${getValue(user.familyInfo?.brotherCount)}
ℹ️ ভাইদের তথ্য: ${getValue(user.familyInfo?.brotherInformation)}
👭 বোন সংখ্যা: ${getValue(user.familyInfo?.sisterCount)}
ℹ️ বোনদের তথ্য: ${getValue(user.familyInfo?.sisterInformation)}
💰 পারিবারিক আর্থিক অবস্থা: ${getValue(user.familyInfo?.familyFinancial)}
🏠 পারিবারিক সম্পদ: ${getValue(user.familyInfo?.familyAssetDetails)}
☪️ পারিবারিক ধর্মীয় অবস্থা: ${getValue(user.familyInfo?.familyReligiousCondition)}

━━━━━━━━━━━━━━━━━━━━━━━━━━

🧑 <b>ব্যক্তিগত তথ্য</b>
👔 বাইরের পোশাক: ${getValue(user.personalInformation?.outsideClothes)}
${isFemale ? `🧕 নিকাব বছর: ${getValue(user.personalInformation?.womenNiqbYear)}` : ''}
${isMale ? `🧔 দাড়ি: ${getValue(user.personalInformation?.manBeard)}` : ''}
${isMale ? `👖 টাখনুর উপরে কাপড়: ${getValue(user.personalInformation?.manClothAboveAnkels)}` : ''}
🕌 পাঁচ ওয়াক্ত নামাজ: ${getValue(user.personalInformation?.prayerFiverTimeFrom)}
⏰ নামাজ মিস: ${getValue(user.personalInformation?.MissPrayerTime)}
👥 মাহরাম-নন মাহরাম: ${getValue(user.personalInformation?.maharaNonMahram)}
📖 কুরআন তেলাওয়াত: ${getValue(user.personalInformation?.reciteQuran)}
⚖️ ফিকহ অনুসরণ: ${getValue(user.personalInformation?.fiqhFollow)}
📱 ডিজিটাল মিডিয়া: ${getValue(user.personalInformation?.digitalMedia)}
🏥 মানসিক/শারীরিক সমস্যা: ${getValue(user.personalInformation?.mentalOrPhysicalIssue)}
✨ দ্বীনের বিশেষ কাজ: ${getValue(user.personalInformation?.specialWorkOfDeen)}
🎯 মাজার বিশ্বাস: ${getValue(user.personalInformation?.majarBeliveStatus)}
📚 ইসলামিক বই: ${getValue(user.personalInformation?.islamicBookName)}
👨‍🏫 আলেম নাম: ${getValue(user.personalInformation?.islamicScholarsName)}
🎨 শখ: ${getValue(user.personalInformation?.extraInfoHobby)}
📏 উচ্চতা: ${getValue(user.personalInformation?.height)} ফুট
🎨 গায়ের রং: ${getValue(user.personalInformation?.skinTone)}
📖 ইসলামিক পড়াশোনা: ${getValue(user.personalInformation?.islamicStudy)}
🏋️ শারীরিক গঠন: ${getValue(user.personalInformation?.physicalStructure)}

━━━━━━━━━━━━━━━━━━━━━━━━━━

💼 <b>পেশাগত তথ্য</b>
👔 পেশা: ${getValue(user.occupational?.profession)}
📋 কাজের বিবরণ: ${getValue(user.occupational?.workingDetails)}
💰 বেতন: ${getValue(user.occupational?.salary)}

${isFemale && user.marriageInformationWomen ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━

💑 <b>বিবাহ সংক্রান্ত তথ্য</b>
👨‍👩‍👧 অভিভাবক রাজি: ${getValue(user.marriageInformationWomen.isGuardiansAgreed)}
💼 বিয়ের পর চাকরি: ${getValue(user.marriageInformationWomen.jobAfterMarriage)}
📚 বিয়ের পর পড়াশোনা: ${getValue(user.marriageInformationWomen.studyAfterMarriage)}
💭 বিয়ে নিয়ে চিন্তা: ${getValue(user.marriageInformationWomen.thoughtsOnMarriage)}
👥 বহুবিবাহে সম্মতি: ${getValue(user.marriageInformationWomen.polygamyConsentOptions)}
👶 সন্তান লালন-পালন: ${getValue(user.marriageInformationWomen.caringforChildren)}
🤱 সন্তানের হেফাজত: ${getValue(user.marriageInformationWomen.childCustody)}
` : ''}

${isMale && user.marriageInformationMan ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━

💑 <b>বিবাহ সংক্রান্ত তথ্য</b>
👨‍👩‍👧 অভিভাবক রাজি: ${getValue(user.marriageInformationMan.isGuardiansAgreed)}
🧕 স্ত্রীর পর্দা: ${getValue(user.marriageInformationMan.wifeVailAfterMarriage)}
📚 স্ত্রীর পড়াশোনা: ${getValue(user.marriageInformationMan.allowWifeStudyAfterMarriage)}
💼 স্ত্রীর চাকরি: ${getValue(user.marriageInformationMan.wifeJobAfterMarriage)}
🏠 বসবাসের স্থান: ${getValue(user.marriageInformationMan.livingPlaceAfterMarriage)}
🎁 উপহার প্রত্যাশা: ${getValue(user.marriageInformationMan.expectedAnyGiftFromMarriage)}
💭 বিয়ে নিয়ে চিন্তা: ${getValue(user.marriageInformationMan.thoughtsOnMarriage)}
` : ''}

${user.expectedLifePartner ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━

💕 <b>প্রত্যাশিত জীবনসঙ্গী</b>
🎂 বয়স: ${getValue(user.expectedLifePartner.age)}
🎨 গায়ের রং: ${getValue(user.expectedLifePartner.complexion)}
📏 উচ্চতা: ${getValue(user.expectedLifePartner.height)}
🎓 শিক্ষা: ${getValue(user.expectedLifePartner.education)}
📌 জেলা: ${getValue(user.expectedLifePartner.district)}
🗺 উপজেলা: ${getValue(user.expectedLifePartner.upazila)}
💍 বৈবাহিক অবস্থা: ${getValue(user.expectedLifePartner.maritalStatus)}
💼 পেশা: ${getValue(user.expectedLifePartner.profession)}
💰 আর্থিক অবস্থা: ${getValue(user.expectedLifePartner.financialCondition)}
✨ প্রত্যাশিত গুণাবলী: ${getValue(user.expectedLifePartner.expectedQuality)}
` : ''}

${user.pledge ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ <b>অঙ্গীকার</b>
👨‍👩‍👧 অভিভাবক জানেন: ${getValue(user.pledge.youGordianKnowsThis)}
✓ সকল তথ্য সত্য: ${getValue(user.pledge.allTheInformationTrue)}
⚠️ ভুল তথ্যের দায়িত্ব: ${getValue(user.pledge.anyMisInformationWeAreNotKnowing)}
` : ''}

${user.howYouWannaGetMarried ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━

💑 <b>বিবাহের ধরন</b>
💒 কীভাবে বিবাহ করতে চান: ${getValue(user.howYouWannaGetMarried)}
` : ''}

${user.customFields && user.customFields.size > 0 ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 <b>অতিরিক্ত তথ্য</b>
${Array.from(user.customFields.entries()).map(([key, value]) => `${key}: ${getValue(value)}`).join('\n')}
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━

⏰ <b>সময়:</b> ${new Date().toLocaleString('bn-BD', { 
    timeZone: 'Asia/Dhaka',
    dateStyle: 'full',
    timeStyle: 'short'
  })}
  `.trim();

  try {
    const sendToTelegram = await this.telegramService.sendToChannel({
      channel: TelegramChannel.SUBSCRIBER,
      message: message,
      isHTML: true,
    });

    if (sendToTelegram) {
      this.logger.log(`User ${user.userId} info sent to Telegram successfully`);
      return true;
    } else {
      this.logger.warn(`Failed to send user ${user.userId} info to Telegram`);
      return false;
    }
  } catch (error) {
    this.logger.error(`Error sending to Telegram: ${error.message}`);
    return false;
  }
}

async NumberRequest(payload: {
    from: {
        name: string;
        email: string;
        phoneNumber: string;
        userId: string;
        gender: string;
    };
    toUser: {
        name: string;
        email: string;
        phoneNumber: string;
        userId: string;
        gender: string;
    };
}) {
    const genderBangla = {
        male: "পুরুষ",
        female: "মহিলা"
    };

    const message = `
🔔 <b>নতুন নম্বর অনুরোধ</b> 🔔

━━━━━━━━━━━━━━━━━━━━

👤 <b>অনুরোধকারী:</b>
   📛 নাম: <b>${payload.from.name}</b>
   📞 ফোন: <code>${payload.from.phoneNumber}</code>
   📧 ইমেইল: <code>${payload.from.email}</code>
   🆔 ইউজার আইডি: <code>${payload.from.userId}</code>
   👥 লিঙ্গ: ${genderBangla[payload.from.gender as 'male' | 'female']}

━━━━━━━━━━━━━━━━━━━━

👤 <b>যার নম্বর চাওয়া হয়েছে:</b>
   📛 নাম: <b>${payload.toUser.name}</b>
   📞 ফোন: <code>${payload.toUser.phoneNumber}</code>
   📧 ইমেইল: <code>${payload.toUser.email}</code>
   🆔 ইউজার আইডি: <code>${payload.toUser.userId}</code>
   👥 লিঙ্গ: ${genderBangla[payload.toUser.gender as 'male' | 'female']}

━━━━━━━━━━━━━━━━━━━━

⏰ সময়: ${new Date().toLocaleString('bn-BD', { 
        dateStyle: 'full', 
        timeStyle: 'short',
        timeZone: 'Asia/Dhaka' 
    })}

    `.trim();

  const sendToTelegram = await this.telegramService.sendToChannel({
      channel: TelegramChannel.NUMBERREQUEST,
      message: message,
      isHTML: true,
    });
}




}
