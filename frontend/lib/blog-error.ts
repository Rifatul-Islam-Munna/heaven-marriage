export function blogErrorMessage(payload:unknown,fallback='Request failed'):string{
  if(typeof payload==='string')return payload||fallback;
  if(Array.isArray(payload))return payload.map(item=>blogErrorMessage(item,'')).filter(Boolean).join('; ')||fallback;
  if(payload&&typeof payload==='object'){
    const data=payload as Record<string,unknown>;
    if(data.message!==undefined)return blogErrorMessage(data.message,fallback);
    if(data.errors!==undefined)return blogErrorMessage(data.errors,fallback);
    if(typeof data.error==='string')return data.error;
    return Object.entries(data).filter(([key])=>key!=='statusCode').map(([key,val])=>
      key+': '+blogErrorMessage(val,'')).filter(Boolean).join('; ')||fallback;
  }
  return fallback;
}
