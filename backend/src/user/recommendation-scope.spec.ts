import {BadRequestException} from '@nestjs/common';
import {Types} from 'mongoose';
import {PlatformService} from './platform.service';

// These tests cover the actual persisted recipient direction, not only button labels.
describe('Admin recommendation recipient scope',()=>{
  const first='507f1f77bcf86cd799439011';
  const second='507f1f77bcf86cd799439012';
  const users=[
    {_id:new Types.ObjectId(first),userId:'N001',gender:'male',role:'user',isPublished:true,isPublishFromAdmin:true,
      verificationStatus:'approved',isSubscriber:true,phoneNumber:'01712345678'},
    {_id:new Types.ObjectId(second),userId:'N002',gender:'female',role:'user',isPublished:true,isPublishFromAdmin:true,
      verificationStatus:'approved',isSubscriber:true,phoneNumber:'01812345678'},
  ];
  function makeService(){
    const bulkWrite=jest.fn().mockResolvedValue({upsertedIds:{0:'new-source',1:'new-candidate'}});
    const sendSms=jest.fn().mockResolvedValue({success:true});
    const audit=jest.fn().mockResolvedValue(undefined);
    const service=Object.create(PlatformService.prototype) as PlatformService;
    Object.assign(service,{
      users:{find:jest.fn().mockReturnValue({lean:jest.fn().mockResolvedValue(users)})},
      db:{collection:jest.fn().mockReturnValue({bulkWrite})},
      sms:{sendSms},audit,
    });
    return {service,bulkWrite,sendSms,audit};
  }
  it('writes and notifies only searched member for source-only recommendations',async()=>{
    const {service,bulkWrite,sendSms,audit}=makeService();
    const result=await service.recommendPair('admin',first,second,'source');
    const operations=bulkWrite.mock.calls[0][0];
    expect(operations).toHaveLength(1);
    expect(operations[0].updateOne.filter).toEqual({recipientId:first,candidateId:second});
    expect(sendSms).toHaveBeenCalledTimes(1);
    expect(sendSms).toHaveBeenCalledWith(expect.objectContaining({number:'01712345678'}));
    expect(audit).toHaveBeenCalledWith('admin','matching.admin.recommend.source_only',first,second);
    expect(result).toMatchObject({recipientScope:'source',smsSent:1});
  });
  it('retains two-way recommendations as the default',async()=>{
    const {service,bulkWrite,sendSms}=makeService();
    const result=await service.recommendPair('admin',first,second);
    const operations=bulkWrite.mock.calls[0][0];
    expect(operations).toHaveLength(2);
    expect(operations[1].updateOne.filter).toEqual({recipientId:second,candidateId:first});
    expect(sendSms).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({recipientScope:'both',smsSent:2});
  });
  it('does not send SMS again when recommendation already exists',async()=>{
    const {service,bulkWrite,sendSms}=makeService();
    bulkWrite.mockResolvedValueOnce({upsertedIds:{}});
    const result=await service.recommendPair('admin',first,second,'source');
    expect(sendSms).not.toHaveBeenCalled();
    expect(result).toMatchObject({smsSent:0});
  });
  it('rejects unsupported recipient scopes before writing anything',async()=>{
    const {service,bulkWrite,sendSms}=makeService();
    await expect(service.recommendPair('admin',first,second,'candidate' as 'source'))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(bulkWrite).not.toHaveBeenCalled();
    expect(sendSms).not.toHaveBeenCalled();
  });
});
