import { IdentityService } from './identity.service';
import { QuestionConfigService, sanitizeDynamicAnswers } from '../profile-questions/question-config.service';
import { PlatformService } from './platform.service';
import { samePhone, adminSort, adminFilter, editableProfile, completion, visibleFilter } from './profile-rules';
import { HttpException, Injectable, Logger, OnModuleInit, ForbiddenException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { AdminUserDto, FindOneDto, LoginDto, NewPasswordResetWithOtp, ReqForDto, ResetPasswordDto, UpdateUserDto, UserFilterDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument, UserType } from './entities/user.entity';
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
  constructor(@InjectModel(User.name) private userModel:Model<UserDocument>,@InjectModel(Shortlist.name) private shortlistModel:Model<ShortlistDocument> , private jwtService:JwtService, private bkash:BkashService,  private readonly configService: ConfigService,private pricingService: PricingService,@InjectModel(RequestNumber.name) private requestNumberModel:Model<RequestNumberDocument>, private telegramService:TelegramService,private otpService:OtpService, private smsService:SmsService,@InjectModel(Counter.name) private counterModel:Model<CounterDocument>, private pdfService:PdfService, private identity:IdentityService, private platform:PlatformService, private questions:QuestionConfigService){}
   async onModuleInit() {
    await this.ensurePhoneNumberIndex();
    const findOneAdmin = await this.userModel.findOne({role:UserType.ADMIN}).lean().exec();
    if(!findOneAdmin){
      const rewPAssword =  this.configService.get<string>('ADMIN_PASSWORD') as string
      const passwordHash = await bcrypt.hash(rewPAssword, 10)
     const createAdmin = await this.userModel.create({
      name:"admin",
       phoneNumber: this.configService.get<string>('ADMIN_USER') as string,
       password: passwordHash,
       role: UserType.ADMIN,
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
  async create(createUserDto: CreateUserDto) {return this.identity.register(createUserDto);}

  async resendOtp(id:string){return this.identity.resend(id);}
  async verifyOtp(payload:any) {return this.identity.verify(payload);}

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


  async updatedFullUserInformation(updated:UpdateUserDto,userId:string) {
    const current:any=await this.userModel.findById(userId).lean();
    if(!current)throw new HttpException('Account unavailable',404);
    const schema=await this.questions.get();
    const payload=editableProfile(updated);
    if((updated as any).dynamicAnswers!==undefined){
      payload.dynamicAnswers=sanitizeDynamicAnswers((updated as any).dynamicAnswers,
        current.dynamicAnswers,schema.questions,current.gender||payload.gender);
    }
    // Account contact changes use separate verification; existing contact data stays intact.
    if(payload.guardianPhone&&samePhone(payload.guardianPhone,current.phoneNumber))throw new HttpException('নিজের ও অভিভাবকের ফোন নম্বর আলাদা হতে হবে',400);
    if(typeof (updated as any).isPublished==='boolean')payload.isPublished=(updated as any).isPublished;
    payload.draftStep=Math.max(0,Math.min(9,Number((updated as any).draftStep)||0));
    payload.draftSavedAt=new Date();
    if((updated as any).submit===true) {
      const state={...current,...payload};
      const status=completion(state,schema.questions);
      if(status.percentage<100)throw new HttpException({message:'Required questions are unanswered',missing:status.remaining},400);
      payload.biodataStatus='submitted';
      payload.isPublishFromAdmin=false;
      payload.verificationStatus='pending';
    }
    const data=await this.userModel.findByIdAndUpdate(userId,{$set:payload},{new:true,runValidators:true}).select('-password -otpNumber -otpValidatedAt -connectionGrants -connectionUnlocks -creditedPaymentIds').lean();
    return {message:(updated as any).submit?'Biodata submitted for review':'Draft saved',data,completion:completion(data,schema.questions)};
  }

  async loginUser(payload:LoginDto){return this.identity.login(payload);}

  async loginWithGoogle(tokenId:string){
     const clientId=this.configService.get<string>('GOOGLE_CLIENT_ID');
     if(!clientId)throw new HttpException('Google sign-in is not configured',503);
     const client = new OAuth2Client(clientId);
     let ticket;
     try{ticket=await client.verifyIdToken({idToken:tokenId,audience:clientId});}
     catch{throw new HttpException('Google sign-in could not be verified. Please try again.',401);}
   const googlePayload = ticket.getPayload();
   if(!googlePayload?.email_verified||!googlePayload.email)throw new HttpException('Google email is not verified',401);
   googlePayload.email=googlePayload.email.trim().toLowerCase();
   const {email,name,picture,} = googlePayload as {email:string,name:string,picture:string}

   let isNewUser=false;
   let finUserByEmail = await this.userModel.findOne({email:email});
  const newId = await this.counterModel.findOneAndUpdate({_id:"counter"},{$inc:{seq:1}},{new:true, upsert: true }).lean();
  const userIdCount = `${String(newId.seq).padStart(6, '0')}`;
   if(!finUserByEmail){
     const claim=await this.userModel.db.collection('identity_claims').findOneAndUpdate({_id:email as any},{$setOnInsert:{userId:new Types.ObjectId()}},{upsert:true,returnDocument:'after'});
     isNewUser=true;
     finUserByEmail = await this.userModel.findOneAndUpdate({_id:claim!.userId},{$setOnInsert:{
      email:email,
      name:name,
      isOtpVerified:true,
      isEmailVerified:true,
      userId:userIdCount

     }},{upsert:true,returnDocument:'after'})
   }
   if(!finUserByEmail)throw new HttpException('Unable to sign in',400);
   if(finUserByEmail.password&&finUserByEmail.isOtpVerified&&!finUserByEmail.isEmailVerified)throw new HttpException('Please sign in with your password and verify this email in your dashboard before using Google sign-in.',400);
   if(!finUserByEmail.isOtpVerified) {
     finUserByEmail=await this.userModel.findByIdAndUpdate(finUserByEmail._id,{$set:{isOtpVerified:true,isEmailVerified:true,name},$unset:{password:1}},{returnDocument:'after'});
   }else if(!finUserByEmail.isEmailVerified) {
     finUserByEmail=await this.userModel.findByIdAndUpdate(finUserByEmail._id,{$set:{isEmailVerified:true}},{returnDocument:'after'});
   }
   if(!finUserByEmail)throw new HttpException('Unable to sign in',400);
   const access_token = await this.identity.token(finUserByEmail);
     return{
       message:'User logged in successfully',
      access_token:access_token,
     
      isNewUser,
      user:this.identity.safe(finUserByEmail)
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
    ...visibleFilter,
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

 if(category?.includes('verified'))matchConditions.verificationStatus='approved';
 if(category?.includes('general'))matchConditions.isSubscriber={$ne:true};

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
      isSubscriber:1,
      verificationStatus:1,
      age: 1,
      gender: 1,
      maritalStatus: 1,
      userId:1,
      role: 1,
      createdAt: 1,
    
      'address.district': 1,
      'address.upazila': 1,
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
    docs: users.map(u=>({...u,isVerified:u.verificationStatus==='approved'})),
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

 async addToShortList(payload:CreateShortlistDto,userId:string) {
  if(!payload.shortlistedUserId)throw new HttpException("Profile ID is required",400);
  await this.platform.profile(payload.shortlistedUserId,userId);
  const r=await this.shortlistModel.updateOne({userId},{$addToSet:{shortlistedUserId:payload.shortlistedUserId}},{upsert:true});
  const created=r.modifiedCount>0||r.upsertedCount>0;
  if(created)await this.userModel.updateOne({_id:payload.shortlistedUserId},{$inc:{profileInterests:1}});
  return {success:true,created};
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
    
    { $match: visibleFilter },
    // Project only the fields you need
    {
      $project: {
        _id: 1,
        isSubscriber:1,
        verificationStatus:1,
        age: 1,
        gender: 1,
        maritalStatus: 1,
        userId: 1,
        role: 1,
        createdAt: 1,
        'address.district': 1,
        'address.upazila': 1,
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



async findOne(id:FindOneDto,actor?:string,role?:string){return this.platform.profile(id.id,actor,role);}

  async adminProfile(id:string,actorRole:string) {
    await this.assertManageableTarget(id,actorRole);
    return this.finMyProfile(id);
  }
  private async assertManageableTarget(id:string,actorRole:string){
    if(actorRole===UserType.ADMIN)return;
    if(!Types.ObjectId.isValid(id))throw new ForbiddenException('Account not available');
    const target=await this.userModel.findById(id).select('role').lean();
    if(!target||target.role!==UserType.USER)
      throw new ForbiddenException('Staff and administrator accounts can only be managed by administrators');
  }
  async finMyProfile(id: string) {
    const findOne = await this.userModel.findById(id).select("  -password -otpNumber -otpValidatedAt ").lean();
    if(!findOne) {
      throw new HttpException('User not found', 400);
    }
    return {...findOne,completion:completion(findOne,(await this.questions.get()).questions)};
  }

 async update( updateUserDto: UpdateUserDto,actor:string,actorRole:string=UserType.ADMIN) {
    await this.assertManageableTarget(updateUserDto.id,actorRole);
    if(updateUserDto.numberOfConnections!==undefined&&(await this.userModel.findById(updateUserDto.id).select("numberOfConnections").lean())?.numberOfConnections!==updateUserDto.numberOfConnections){await this.platform.setBalance(actor,updateUserDto.id,updateUserDto.numberOfConnections,updateUserDto.adjustmentReason||"",updateUserDto.requestId||"");}
    await this.platform.audit(actor,"profile.admin.update",updateUserDto.id);
    const {id,password, _v,updatedAt,createdAt,...raw} = updateUserDto
    const rest:any=editableProfile(raw);
    for(const k of ['isPublishFromAdmin','isPublished','verificationStatus','statusReason'])if(raw[k]!==undefined)rest[k]=raw[k];
    if(rest.isPublishFromAdmin===true)rest.verificationStatus='approved';
    if(rest.isPublishFromAdmin===false)rest.verificationStatus='rejected';
    const findOne = await this.identity.adminUpdateProfile(actor,id,rest,raw);
    if(!findOne) {
      throw new HttpException('User not found', 400);
    }
    return findOne;
  }

   async removeUser(id:string){return this.platform.createCase(id,'deletion',{});}

   async remove(id: FindOneDto,actor:string,actorRole:string=UserType.ADMIN) {
     await this.assertManageableTarget(id.id,actorRole);
     await this.platform.audit(actor,"account.admin.delete",id.id);
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
    return {message:'Password updated successfully'};
  }



 async getUserForAdmin(query: AdminUserDto,actorRole:string=UserType.ADMIN) {
  const { page = 1, limit = 10, gender = 'all', query: searchQuery,isPublished } = query;
  const skip = (page - 1) * limit;
  this.logger.debug("searchQuery->",isPublished)

  const filter:any=adminFilter(query);
  if(actorRole!==UserType.ADMIN)filter.role=UserType.USER;

  // Execute query with pagination
  const [data, totalItems] = await Promise.all([
    this.userModel
      .find(filter)
.select('-password -otpNumber -otpValidatedAt -connectionGrants -connectionUnlocks -creditedPaymentIds')
      .skip(skip)
      .limit(limit)
      .sort(adminSort(query.sort))
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

async toggleSubscription(id:string,actor:string,actorRole:string=UserType.ADMIN) {
  await this.assertManageableTarget(id,actorRole);
  await this.platform.audit(actor,"membership.admin.toggle",id);
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


async createPayment(pkgId:string,id:string){return this.platform.createPayment(id,pkgId);}
async executePayment(paymentId:string){return this.platform.executePayment(paymentId);}


async createRequestNumber(payload:RequestNumberDto,userId:string){return this.platform.unlock(userId,payload.requestUserId);}

async getMyRequests(userId:string,query:PaginationDto){
 const balance=await this.platform.connections(userId);
 const page=Math.max(1,query.page||1),limit=Math.min(100,Math.max(1,query.limit||10));
 const history=balance.history.slice((page-1)*limit,page*limit);
 const data=await Promise.all(history.map(async x=>{try{return {...x,requestUserId:await this.platform.profile(x.profileId,userId)};}catch{return {...x,requestUserId:null};}}));
 return {data,page,limit,totalItems:balance.history.length,totalPages:Math.ceil(balance.history.length/limit)};
}

async RequestForOtpRestPassword(payload:ReqForDto){return this.identity.resetRequest(payload);}
async ResetPasswordWithOtp(payload:NewPasswordResetWithOtp){return this.identity.reset(payload);}


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
