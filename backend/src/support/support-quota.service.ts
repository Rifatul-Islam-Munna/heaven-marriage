import {Injectable,OnModuleInit,HttpException,HttpStatus,ServiceUnavailableException} from '@nestjs/common';
import {InjectConnection} from '@nestjs/mongoose';
import {Connection} from 'mongoose';
import {createHmac} from 'node:crypto';

const DAY_MS=24*60*60*1000;
export const DAILY_SUPPORT_LIMIT=10;
export function validSupportIdentity(id:string,ip:string,stamp:string,sig:string,secret:string,now=Date.now()):boolean {
 if(!secret||!/^[A-Za-z0-9_-]{20,80}$/.test(id)||!ip||ip.length>110 ||
   !/^\d{13}$/.test(stamp)||!sig||sig.length!==64)return false;
 const ts=Number(stamp);
 if(Math.abs(now-ts)>60000)return false;
 const expected=createHmac('sha256',secret).update(id+'\n'+ip+'\n'+stamp).digest('hex');
 try{
   const crypto=require('node:crypto') as typeof import('node:crypto');
   return crypto.timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(sig,'hex'));
 }catch{return false;}
}
@Injectable()
export class SupportQuotaService implements OnModuleInit {
 constructor(@InjectConnection() private readonly db:Connection){}
 async onModuleInit(){
   await this.db.collection('support_chat_limits').createIndex({expiresAt:1},{expireAfterSeconds:0});
 }
 private token(value:string,secret:string):string {
   return createHmac('sha256',secret).update(value).digest('hex');
 }
 /** Optimistic CAS: exactly one update can advance the 10-message rolling window per identifier. */
 private async takeOne(key:string):Promise<number>{
   const coll=this.db.collection('support_chat_limits');
   for(let tries=0;tries<12;tries++){
     const now=new Date(),cutoff=new Date(now.getTime()-DAY_MS);
     const doc=await coll.findOne({_id:key as any});
     const active:(Date[])=(Array.isArray(doc?.events)?doc.events:[]).map((v:unknown)=>new Date(v as any))
       .filter((d:Date)=>Number.isFinite(d.getTime())&&d>cutoff);
     if(active.length>=DAILY_SUPPORT_LIMIT)throw new HttpException(
       'আপনার আজকের ১০টি প্রশ্ন শেষ। ২৪ ঘণ্টা পরে আবার চেষ্টা করুন অথবা অফিসে যোগাযোগ করুন।',HttpStatus.TOO_MANY_REQUESTS);
     const next=[...active,now];
     if(!doc){
       try{await coll.insertOne({_id:key as any,rev:1,events:next,expiresAt:new Date(now.getTime()+DAY_MS+60000)});return next.length;}
       catch(error:any){if(error?.code===11000)continue;throw error;}
     }
     const updated=await coll.updateOne({_id:key as any,rev:doc.rev},
       {$set:{events:next,expiresAt:new Date(now.getTime()+DAY_MS+60000)},$inc:{rev:1}});
     if(updated.modifiedCount)return next.length;
   }
   throw new HttpException('Too many concurrent questions. Please retry shortly.',HttpStatus.TOO_MANY_REQUESTS);
 }
 async remaining(id:string,ip:string):Promise<{remaining:number;limit:number}>{
   const secret=process.env.SUPPORT_BOT_SECRET;
   if(!secret||secret.length<32)throw new ServiceUnavailableException('Support bot secret is not configured');
   const cutoff=new Date(Date.now()-DAY_MS);
   const keys=[this.token('network:'+ip,secret),this.token('visitor:'+id,secret)];
   const docs=await Promise.all(keys.map(key=>this.db.collection('support_chat_limits').findOne({_id:key as any})));
   const used=Math.max(0,...docs.map(row=>(Array.isArray(row?.events)?row.events:[])
     .filter((stamp:unknown)=>new Date(stamp as any)>=cutoff).length));
   return {remaining:Math.max(0,DAILY_SUPPORT_LIMIT-used),limit:DAILY_SUPPORT_LIMIT};
 }
 async consume(id:string,ip:string):Promise<{remaining:number}>{
   const secret=process.env.SUPPORT_BOT_SECRET;
   if(!secret||secret.length<32)throw new ServiceUnavailableException('Support bot secret is not configured');
   // Network quota stops easy cookie-clearing bypasses. May affect shared networks.
   const network=await this.takeOne(this.token('network:'+ip,secret));
   const visitor=await this.takeOne(this.token('visitor:'+id,secret));
   return {remaining:Math.max(0,DAILY_SUPPORT_LIMIT-Math.max(network,visitor))};
 }
}
