import {BadRequestException,NotFoundException} from '@nestjs/common';
import {Types} from 'mongoose';
import {LocationCatalogService,validateLocation} from './location-catalog.service';
describe('custom location options',()=>{
  it('saves a city corporation within a district',()=>{
    expect(validateLocation({kind:'cityCorporation',name:'Test City Corporation',label:'Test',district:'Dhaka'}))
      .toMatchObject({kind:'cityCorporation',district:'Dhaka',enabled:true});
  });
  it('supports a neighborhood under city or upazila',()=>{
    const city=validateLocation({kind:'area',name:'Gulshan',district:'Dhaka',cityCorporation:'Dhaka North City Corporation'});
    expect(city.upazila).toBeUndefined();
    const rural=validateLocation({kind:'area',name:'Ward 12',district:'Dhaka',upazila:'Savar'});
    expect(rural.upazila).toBe('Savar');
  });
  it('supports a ward inside a municipality or city neighborhood',()=>{
    const municipal=validateLocation({kind:'area',name:'Ward 3',district:'Feni',
      upazila:'Feni Sadar',parentArea:'Feni Pourashava'});
    expect(municipal).toMatchObject({kind:'area',district:'Feni',
      upazila:'Feni Sadar',parentArea:'Feni Pourashava'});
    const city=validateLocation({kind:'area',name:'Road 10',district:'Dhaka',
      cityCorporation:'Dhaka North City Corporation',parentArea:'Gulshan'});
    expect(city).toMatchObject({parentArea:'Gulshan',cityCorporation:'Dhaka North City Corporation'});
  });
  it.each([
    {kind:'area',name:'X',district:'Dhaka'},
    {kind:'area',name:'X',district:'Dhaka',cityCorporation:'City A',upazila:'Savar'},
    {kind:'upazila',name:'X',district:'Dhaka',parentArea:'Ward A'},
    {kind:'area',name:'X',district:'Dhaka',upazila:'Savar',parentArea:'X'},
    {kind:'cityCorporation',name:'X',district:''},
    {kind:'upazila',name:'X',district:'Dhaka',cityCorporation:'Bogus'},
    {kind:'bad',name:'X'},
    {kind:'country',name:'<unsafe>'},
  ])('rejects invalid hierarchy: %p',(value)=>expect(()=>validateLocation(value)).toThrow(BadRequestException));
});

describe('permanent deletion of custom locations',()=>{
  const id='507f1f77bcf86cd799439011';
  it('physically removes only the requested stored option and audits the action',async()=>{
    const deleted={_id:new Types.ObjectId(id),kind:'area',name:'Test Ward',
      label:'Test Ward',district:'Dhaka',key:'area|dhaka||||test ward'};
    const findOneAndDelete=jest.fn().mockResolvedValue(deleted);
    const insertOne=jest.fn().mockResolvedValue({acknowledged:true});
    const collection=jest.fn((name:string)=>name==='profile_location_options'
      ?{findOneAndDelete}:{insertOne});
    const service=new LocationCatalogService({collection} as any);
    await expect(service.remove('admin-1',id))
      .resolves.toEqual({message:'Location permanently deleted'});
    expect(findOneAndDelete).toHaveBeenCalledWith({_id:new Types.ObjectId(id)});
    expect(insertOne).toHaveBeenCalledWith(expect.objectContaining({
      actor:'admin-1',action:'location.delete',id,kind:'area',
      name:'Test Ward',district:'Dhaka',createdAt:expect.any(Date),
    }));
    expect(collection).toHaveBeenCalledWith('profile_location_options');
    expect(collection).toHaveBeenCalledWith('profile_location_audit');
  });

  it('rejects invalid IDs without modifying the database',async()=>{
    const collection=jest.fn();
    const service=new LocationCatalogService({collection} as any);
    await expect(service.remove('admin-1','not-a-valid-id'))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(collection).not.toHaveBeenCalled();
  });

  it('returns not found for an already removed location',async()=>{
    const findOneAndDelete=jest.fn().mockResolvedValue(null);
    const audit=jest.fn();
    const service=new LocationCatalogService({collection:jest.fn((name:string)=>
      name==='profile_location_options'?{findOneAndDelete}:{insertOne:audit})} as any);
    await expect(service.remove('admin-1',id)).rejects.toBeInstanceOf(NotFoundException);
    expect(audit).not.toHaveBeenCalled();
  });
});
