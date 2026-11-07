import {BadRequestException,Injectable,NotFoundException} from '@nestjs/common';
import {InjectConnection,InjectModel} from '@nestjs/mongoose';
import {Connection,Model,Types} from 'mongoose';
import {User,UserDocument,UserType} from './entities/user.entity';
import {PlatformService} from './platform.service';
import {premiumEntitlement,premiumIsActive,PREMIUM_STAGES} from './premium-service';
import {resolvePremiumSettings} from './premium-settings';

@Injectable()
export class PremiumAdminService {
  constructor(@InjectConnection() private readonly db:Connection,
    @InjectModel(User.name) private readonly users:Model<UserDocument>,
    private readonly platform:PlatformService){}
  async list(query='',page=1){
    if(!Number.isInteger(page)||page<1||page>1000)throw new BadRequestException('Invalid page');
    const q=String(query||'').trim().replace(/[^\p{L}\p{N} @_-]/gu,'').slice(0,80);
    const where:any={role:UserType.USER,isSubscriber:true};
    if(q){delete where.isSubscriber;where.$or=[
      {name:{$regex:q,$options:'i'}},{userId:{$regex:q,$options:'i'}},
      {email:{$regex:q,$options:'i'}},{phoneNumber:{$regex:q,$options:'i'}},
    ];}
    const [total,rows]=await Promise.all([
      this.users.countDocuments(where),
      this.users.find(where)
        .select('name userId email phoneNumber isSubscriber isPublishFromAdmin premiumService offlineRecommendations numberOfConnections updatedAt')
        .sort({updatedAt:-1,_id:-1}).skip((page-1)*30).limit(30).lean(),
    ]);
    // Recommendations are indexed by recipientId (a string); batch the
    // counts across the current page instead of doing N separate queries.
    const recipientIds=rows.map(u=>String(u._id));
    const counts=recipientIds.length ? await this.db.collection('member_recommendations').aggregate([
      {$match:{recipientId:{$in:recipientIds}}},
      {$group:{_id:'$recipientId',online:{$sum:1}}},
    ]).toArray() : [];
    const sentById=new Map(counts.map(c=>[String(c._id),Number(c.online)||0]));
    return {total,page,limit:30,members:rows.map(u=>{
      const onlineRecommendations=sentById.get(String(u._id))||0;
      const offlineRecommendations=u.offlineRecommendations||0;
      return {
        id:String(u._id),name:u.name,userId:u.userId,email:u.email||'',
        phoneNumber:u.phoneNumber||'',active:premiumIsActive(u),
        published:!!u.isPublishFromAdmin,service:u.premiumService||null,
        onlineRecommendations,offlineRecommendations,
        totalRecommendations:onlineRecommendations+offlineRecommendations,
        connectionsRemaining:u.numberOfConnections||0,
      };
    })};
  }
  async update(actor:string,id:string,body:unknown){
    if(!Types.ObjectId.isValid(id))throw new BadRequestException('Invalid member ID');
    if(!body||typeof body!=='object'||Array.isArray(body))throw new BadRequestException('Invalid update');
    const p=body as Record<string,unknown>;
    const reason=typeof p.reason==='string'?p.reason.trim():'';
    if(reason.length<6||reason.length>500)throw new BadRequestException('Reason must contain 6–500 characters');
    const allowed=new Set(['reason','activate','stage','assistedUsed','adminNotes','expiresAt','offlineRecommendations']);
    for(const key of Object.keys(p))if(!allowed.has(key))
      throw new BadRequestException('Unsupported property');
    const member=await this.users.findOne({_id:id,role:UserType.USER})
      .select('isSubscriber premiumService offlineRecommendations').lean();
    if(!member)throw new NotFoundException('Member unavailable');
    const now=new Date();
    const update:Record<string,unknown>={};
    if(p.offlineRecommendations!==undefined){
      if(!Number.isSafeInteger(p.offlineRecommendations) || (p.offlineRecommendations as number)<0 ||
        (p.offlineRecommendations as number)>1_000_000)
        throw new BadRequestException('Offline recommendation count must be a whole number from 0 to 1000000');
      update.offlineRecommendations=p.offlineRecommendations;
    }
    let service=member.premiumService;
    if(p.activate!==undefined){
      if(typeof p.activate!=='boolean')throw new BadRequestException('Activation must be a boolean');
      if(p.activate && (!premiumIsActive(member) || !service)){
        const settings=resolvePremiumSettings((await this.db.collection('platform_settings')
          .findOne({key:'public'}))?.premium);
        service=premiumEntitlement(settings,now,'admin');
        update.premiumService=service;
      }
      update.isSubscriber=p.activate;
      if(!p.activate && service)update['premiumService.stage']='paused';
    }
    if((p.stage!==undefined||p.assistedUsed!==undefined||p.adminNotes!==undefined||p.expiresAt!==undefined) &&
      !service)throw new BadRequestException('Activate premium first');
    if(p.stage!==undefined){
      if(!PREMIUM_STAGES.includes(p.stage as any))throw new BadRequestException('Invalid premium stage');
      update['premiumService.stage']=p.stage;
    }
    if(p.assistedUsed!==undefined){
      const allowance=service?.assistedAllowance||0;
      if(!Number.isSafeInteger(p.assistedUsed)||(p.assistedUsed as number)<0||
        (p.assistedUsed as number)>allowance)
        throw new BadRequestException('Assisted connections used cannot exceed allowance');
      update['premiumService.assistedUsed']=p.assistedUsed;
    }
    if(p.adminNotes!==undefined){
      if(typeof p.adminNotes!=='string'||p.adminNotes.length>3000)
        throw new BadRequestException('Notes must contain at most 3000 characters');
      update['premiumService.adminNotes']=p.adminNotes.trim();
    }
    if(p.expiresAt!==undefined){
      if(typeof p.expiresAt!=='string')throw new BadRequestException('Invalid expiry');
      const expiry=new Date(p.expiresAt);
      if(!Number.isFinite(expiry.getTime())||expiry.getTime()<now.getTime()-86400000||
        expiry.getTime()>now.getTime()+3650*86400000)
        throw new BadRequestException('Expiry must be a valid date within 10 years');
      update['premiumService.expiresAt']=expiry;
    }
    if(!Object.keys(update).length)throw new BadRequestException('No changes');
    if(update.premiumService){
      // A newly-created subdocument must not be mixed with dot-notation writes.
      const merged={...service};
      for(const key of Object.keys(update)){
        if(key.startsWith('premiumService.')){
          (merged as Record<string,unknown>)[key.split('.')[1]]=update[key];delete update[key];
        }
      }
      update.premiumService=merged;
    } else if(service && Object.keys(update).some(key=>key.startsWith('premiumService.')))
      update['premiumService.updatedAt']=now;
    await this.users.updateOne({_id:id,role:UserType.USER},{$set:update});
    if(update.offlineRecommendations!==undefined){
      await this.platform.audit(actor,'matching.admin.offline_count_updated',id,
        `Offline ${member.offlineRecommendations||0} -> ${update.offlineRecommendations}; ${reason}`);
    }
    if(Object.keys(update).some(key=>key!=='offlineRecommendations'))
      await this.platform.audit(actor,'premium.admin.update',id,reason);
    return {message:'Premium member updated',memberId:id};
  }
}
