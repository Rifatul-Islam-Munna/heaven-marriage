import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import pagination from "mongoose-paginate-v2"
export enum UserType {
  ADMIN = 'admin',
  EDITOR = 'editor',
  USER = 'user',

}
export type UserDocument = HydratedDocument<User>;
@Schema({ timestamps: true ,autoIndex: true,virtuals:true})
export class User {

    @Prop({required:true})
    name:string
    @Prop()
    userId:string

    @Prop({type: String, enum: UserType, default: UserType.USER})
    role:UserType

    @Prop()
    email:string
    @Prop({required:true,unique:true})
    phoneNumber:string;

    @Prop({required:true})
    password:string;

    @Prop()
    gender:string; // will be enum

    @Prop()
    maritalStatus:string; // will be enum

    @Prop()
    age:number // will be slider enum
    @Prop()
    bloodGroup:string 
    @Prop()
    weight:number 
    @Prop()
    nationality:string 


    @Prop({default:false})
    isOtpVerified:boolean

    @Prop()
    otpNumber:string;
    @Prop()
    otpValidatedAt:Date;

    @Prop()
    isSubscriber:boolean


    // up those for the account creation 

     @Prop({type:Object})
     address?:{
        presentAddress:string, 
        permanentAddress:string
        district:string, // will be enum
        upazila:string; // will be enum
        extraInfo:string
     }

     @Prop({type:Object})
     educationInfo?:{
        educationMethod:string, // will be enum
        highestEducation:string,
        highestEducationBoard:string,
        highestEducationGroup:string,
        highestEducationPassingYear:string,
        currentlyDoingHightEducation:boolean,
        sSCPassingYear:string
        sSCPassingGroup:string;
        sSCResult:string;
        hSCPassingYear:string;
        hSCPassingGroup:string;
        hSCResult:string
    }

   @Prop({type:Object})
    familyInfo?:{
        isFatherAlive:boolean,
        fathersProfession:string,
        isMotherAlive:boolean,
        mothersProfession:string,
        brotherCount:number,
        brotherInformation:string;
        sisterCount:number,
        sisterInformation:string;
        familyFinancial:string; //  will be enum
        familyAssetDetails:string;
        familyReligiousCondition:string;



    }
    @Prop({type:Object})
    personalInformation?:{
        outsideClothes:string;
        womenNiqbYear:string;
        manBeard:string;
        manClothAboveAnkels:boolean;
        prayerFiverTimeFrom:string;
        MissPrayerTime:string;
        maharaNonMahram:string;
        reciteQuran:string;
        fiqhFollow:string; //enum will be
        digitalMedia:string;
        mentalOrPhysicalIssue:string;
        specialWorkOfDeen:string;
        majarBeliveStatus:string;
        islamicBookName:string;
        islamicScholarsName:string;
        extraInfoHobby:string;
        height:number; // will be slider withNumber
        skinTone:string; // will be enum
        islamicStudy:string; // will be enum

    }

   @Prop({type:Object})
    occupational?:{
        profession:string;
        workingDetails:string;
        salary:string;
    }

    @Prop({type:Object})
   marriageInformationWomen?:{
     isGuardiansAgreed:boolean;
     jobAfterMarriage:string;
     studyAfterMarriage:string;
     thoughtsOnMarriage:string;

   }  
    @Prop({type:Object})
   marriageInformationMan?:{
     isGuardiansAgreed:boolean;
     wifeVailAfterMarriage:string;
     allowWifeStudyAfterMarriage:string;
     wifeJobAfterMarriage:string;
     livingPlaceAfterMarriage:string;
     expectedAnyGiftFromMarriage:string;
     thoughtsOnMarriage:string;

   }  

 @Prop({type:Object})
   expectedLifePartner?:{
    age:string;
    complexion:string;
    height:string;
    education:string;
    district:string;
    upazila:string;
   maritalStatus:string;
   profession:string;
    financialCondition:string;
    expectedQuality:string;
   }
   @Prop({type:Object})
   pledge?:{
    youGordianKnowsThis:boolean;
    allTheInformationTrue:boolean;
    anyMisInformationWeAreNotKnowing:boolean;
  
   }


}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ 
  name: 'text',
  email: 'text',
  userId:"text",
  phoneNumber:"text",
  'address.presentAddress': 'text',
  'address.district': 'text',
  'address.upazila': 'text',
  'occupational.profession': 'text',
  'educationInfo.highestEducation': 'text'
}, {
  name: 'user_text_search',
  weights: {
    name: 10,              // Most important
    email: 5,
    userId: 4,
    phoneNumber:5,

    'occupational.profession': 5,
    'address.district': 3,
    'address.upazila': 3,
    'educationInfo.highestEducation': 3,
    'address.presentAddress': 2
  }
});