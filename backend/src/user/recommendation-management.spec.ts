import {BadRequestException,NotFoundException} from '@nestjs/common';
import {PlatformService} from './platform.service';
import {PremiumAdminService} from './premium-admin.service';

const candidate='507f1f77bcf86cd799439012';
const member='507f1f77bcf86cd799439011';

describe('Agency recommendation management',()=>{
  it('dismisses only the authenticated member\'s recommendation, without deletion',async()=>{
    const updateOne=jest.fn().mockResolvedValue({matchedCount:1,modifiedCount:1});
    const service=Object.create(PlatformService.prototype) as PlatformService;
    Object.assign(service,{db:{collection:jest.fn().mockReturnValue({updateOne})}});
    await expect(service.dismissRecommendation(member,candidate))
      .resolves.toMatchObject({message:expect.any(String)});
    expect(updateOne).toHaveBeenCalledWith(
      {recipientId:member,candidateId:candidate,dismissedAt:{$exists:false}},
      {$set:{dismissedAt:expect.any(Date)}},
    );
  });

  it('rejects invalid identifiers and unknown/not-owned recommendations',async()=>{
    const updateOne=jest.fn().mockResolvedValue({matchedCount:0});
    const service=Object.create(PlatformService.prototype) as PlatformService;
    Object.assign(service,{db:{collection:jest.fn().mockReturnValue({updateOne})}});
    await expect(service.dismissRecommendation(member,'bad-id'))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(updateOne).not.toHaveBeenCalled();
    await expect(service.dismissRecommendation(member,candidate))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not return dismissed items to either member',async()=>{
    const find=jest.fn().mockReturnValue({
      sort:jest.fn().mockReturnValue({
        limit:jest.fn().mockReturnValue({toArray:jest.fn().mockResolvedValue([])}),
      }),
    });
    const service=Object.create(PlatformService.prototype) as PlatformService;
    Object.assign(service,{
      db:{collection:jest.fn().mockReturnValue({find})},
      users:{find:jest.fn().mockReturnValue({lean:jest.fn().mockResolvedValue([])})},
      questionConfig:{get:jest.fn().mockResolvedValue({questions:[]})},
    });
    expect(await service.myRecommendations(member)).toEqual({recommendations:[]});
    expect(find).toHaveBeenCalledWith({recipientId:member,dismissedAt:{$exists:false}});
  });

  it('allows audited, separate offline count adjustment without changing assisted or wallet',async()=>{
    const audit=jest.fn().mockResolvedValue(undefined);
    const updateOne=jest.fn().mockResolvedValue({matchedCount:1});
    const users={
      findOne:jest.fn().mockReturnValue({select:jest.fn().mockReturnValue({
        lean:jest.fn().mockResolvedValue({isSubscriber:true,offlineRecommendations:2,premiumService:{stage:'onboarding'}}),
      })}),
      updateOne,
    };
    const admin=Object.create(PremiumAdminService.prototype) as PremiumAdminService;
    Object.assign(admin,{users,platform:{audit}});
    await admin.update('admin-id',member,{reason:'Three introductions made offline',offlineRecommendations:5});
    expect(updateOne).toHaveBeenCalledWith(
      {_id:member,role:'user'},{$set:{offlineRecommendations:5}},
    );
    expect(audit).toHaveBeenCalledWith(
      'admin-id','matching.admin.offline_count_updated',member,
      expect.stringContaining('Offline 2 -> 5'),
    );
    await expect(admin.update('admin-id',member,{reason:'Invalid offline record',offlineRecommendations:-1}))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('counts online recommendations even when dismissed and combines offline totals',async()=>{
    const users={
      countDocuments:jest.fn().mockResolvedValue(1),
      find:jest.fn().mockReturnValue({
        select:jest.fn().mockReturnValue({
          sort:jest.fn().mockReturnValue({
            skip:jest.fn().mockReturnValue({
              limit:jest.fn().mockReturnValue({
                lean:jest.fn().mockResolvedValue([{_id:member,name:'Test',role:'user',
                  isSubscriber:true,offlineRecommendations:3,numberOfConnections:4}]),
              }),
            }),
          }),
        }),
      }),
    };
    const aggregate=jest.fn().mockReturnValue({
      toArray:jest.fn().mockResolvedValue([{_id:member,online:2}]),
    });
    const admin=Object.create(PremiumAdminService.prototype) as PremiumAdminService;
    Object.assign(admin,{users,db:{collection:jest.fn().mockReturnValue({aggregate})}});
    const result=await admin.list('',1);
    expect(aggregate).toHaveBeenCalledWith([
      {$match:{recipientId:{$in:[member]}}},
      {$group:{_id:'$recipientId',online:{$sum:1}}},
    ]);
    expect(result.members[0]).toMatchObject({
      onlineRecommendations:2,offlineRecommendations:3,totalRecommendations:5,
      connectionsRemaining:4,
    });
  });
});
