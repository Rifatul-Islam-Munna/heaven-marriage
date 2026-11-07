import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';

export const LOCATION_KINDS = ['country','district','upazila','cityCorporation','area'] as const;
export type LocationKind = typeof LOCATION_KINDS[number];
export interface LocationEntry {
  kind: LocationKind;
  name: string;
  label: string;
  district?: string;
  cityCorporation?: string;
  upazila?: string;
  parentArea?: string;
  enabled: boolean;
}
const field = (value: unknown, title: string, required = false) => {
  if (value === undefined || value === null || value === '') {
    if (required) throw new BadRequestException(title + ' is required');
    return '';
  }
  if (typeof value !== 'string' || value.length > 120 || /[<>\x00-\x1F]/u.test(value))
    throw new BadRequestException('Invalid ' + title);
  const text = value.trim().replace(/\s+/gu, ' ');
  if (required && !text) throw new BadRequestException(title + ' is required');
  return text;
};
export function validateLocation(input: unknown): LocationEntry {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new BadRequestException('Invalid location option');
  const row = input as Record<string,unknown>;
  if (!LOCATION_KINDS.includes(row.kind as LocationKind))
    throw new BadRequestException('Invalid location type');
  const kind = row.kind as LocationKind;
  const name = field(row.name, 'name', true);
  const label = field(row.label || row.name, 'label', true);
  const district = field(row.district, 'district');
  const cityCorporation = field(row.cityCorporation, 'city corporation');
  const upazila = field(row.upazila, 'upazila');
  const parentArea = field(row.parentArea, 'parent area');
  if (['upazila','cityCorporation','area'].includes(kind) && !district)
    throw new BadRequestException('District must be selected');
  if (kind === 'area' && (!cityCorporation && !upazila || !!cityCorporation && !!upazila))
    throw new BadRequestException('An area requires one parent: a city corporation or an upazila');
  if (kind === 'cityCorporation' && (cityCorporation || upazila))
    throw new BadRequestException('City corporation must belong directly to a district');
  if (kind === 'upazila' && (cityCorporation || upazila))
    throw new BadRequestException('Upazila must belong directly to a district');
  if (parentArea && kind!=='area')
    throw new BadRequestException('Only an area can have a parent neighborhood or municipality');
  if (parentArea && parentArea.toLowerCase()===name.toLowerCase())
    throw new BadRequestException('An area cannot be its own parent');
  return {kind,name,label,enabled:true,
    ...(district?{district}:{}),
    ...(cityCorporation?{cityCorporation}:{}),
    ...(upazila?{upazila}:{}),
    ...(parentArea?{parentArea}:{})};
}
function locationKey(row: LocationEntry) {
  return [row.kind,row.district || '',row.cityCorporation || '',
    row.upazila || '',row.parentArea || '',row.name].map(v=>v.trim().toLocaleLowerCase('en')).join('|');
}
@Injectable()
export class LocationCatalogService {
  constructor(@InjectConnection() private readonly db: Connection){}
  private get locations() {return this.db.collection('profile_location_options');}
  async list(admin = false) {
    const entries = await this.locations.find(admin ? {} : {enabled:{$ne:false}})
      .sort({kind:1,district:1,name:1}).limit(2000).toArray();
    // Only the admin can see database IDs and edit metadata. Public form
    // options must not leak staff IDs, audit keys or internal timestamps.
    return {entries:admin ? entries : entries.map(row=>({
      kind:row.kind,name:row.name,label:row.label,district:row.district,
      cityCorporation:row.cityCorporation,upazila:row.upazila,
      parentArea:row.parentArea,enabled:row.enabled,
    }))};
  }
  async add(actor: string, input: unknown) {
    const row=validateLocation(input);
    await this.locations.createIndex({key:1},{unique:true});
    const key=locationKey(row);
    try {
      const result=await this.locations.updateOne({key},
        {$setOnInsert:{...row,key,createdAt:new Date(),createdBy:actor}},
        {upsert:true});
      if(!result.upsertedCount)throw new ConflictException('This location already exists; edit it instead.');
    } catch(error:any) {
      if(error?.code===11000)throw new ConflictException('This location already exists.');
      throw error;
    }
    await this.db.collection('profile_location_audit').insertOne({
      actor,action:'location.add',key,createdAt:new Date()});
    return {message:'Location added',...await this.list(true)};
  }
  async update(actor: string,id: string,input: unknown) {
    if(!Types.ObjectId.isValid(id))throw new BadRequestException('Invalid location ID');
    if(!input||typeof input!=='object'||Array.isArray(input))
      throw new BadRequestException('Invalid location update');
    const p=input as Record<string,unknown>;
    const change: Record<string,unknown>={updatedAt:new Date(),updatedBy:actor};
    if(p.label!==undefined)change.label=field(p.label,'label',true);
    if(p.enabled!==undefined) {
      if(typeof p.enabled!=='boolean')throw new BadRequestException('Invalid status');
      change.enabled=p.enabled;
    }
    if(Object.keys(change).length===2)throw new BadRequestException('Nothing to update');
    const result=await this.locations.updateOne({_id:new Types.ObjectId(id)},{$set:change});
    if(!result.matchedCount)throw new NotFoundException('Location unavailable');
    await this.db.collection('profile_location_audit').insertOne({
      actor,action:'location.update',id,createdAt:new Date()});
    return {message:'Location updated',...await this.list(true)};
  }
  /** Permanently remove only an admin-created option, never built-in locations.
   * Existing member biodata stores its answer independently and is not edited. */
  async remove(actor:string,id:string) {
    if(!Types.ObjectId.isValid(id))throw new BadRequestException('Invalid location ID');
    const deleted=await this.locations.findOneAndDelete({_id:new Types.ObjectId(id)});
    if(!deleted)throw new NotFoundException('Location unavailable');
    await this.db.collection('profile_location_audit').insertOne({
      actor,action:'location.delete',id,kind:deleted.kind,name:deleted.name,
      district:deleted.district||'',key:deleted.key,createdAt:new Date(),
    });
    return {message:'Location permanently deleted'};
  }
}
