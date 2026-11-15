"use server"
import { PostRequestAxios } from "@/api-hooks/api-hooks";
import { cookies } from "next/headers";
import {User, UserInfo} from "@/@types/user"
import type { PurchaseReceipt, TrackingUser } from "@/lib/tracking-customer";

 type userData ={
    user:User,
    access_token:string,
    message:string,
    isNewUser?:boolean
 }
export const loginUser = async (phoneNumber: string, password: string) => {
    const [data, error] = await PostRequestAxios<userData>("/user/login-user",{phoneNumber,password},false);
    if(data){
    const cookie = await cookies();
   cookie.set("access_token", data?.access_token || "", {  httpOnly: true,secure: process.env.NODE_ENV === "production",sameSite:"lax",path:"/", maxAge:60*60*24*10 });
   cookie.set("user", JSON.stringify(data?.user) || "",{  httpOnly: true,secure: process.env.NODE_ENV === "production",sameSite:"lax",path:"/", maxAge:60*60*24*10 });
    }
   
   return {data,error};

}
export const loginWithGoogle = async (idToken:string)=>{

    const [data, error] = await PostRequestAxios<userData>("/user/login-user-with-google",{id:idToken},false);
    if(data){

    const cookie = await cookies();
   cookie.set("access_token", data?.access_token || "", {  httpOnly: true,secure: process.env.NODE_ENV === "production",sameSite:"lax",path:"/", maxAge:60*60*24*10 });
   const userSaveData = {
    _id:data?.user?._id,
    name:data?.user?.name,
    email:data?.user?.email,
    phoneNumber:data?.user?.phoneNumber,
    isOtpVerified:data?.user?.isOtpVerified,
    numberOfConnections:data?.user?.numberOfConnections,
    role:data?.user?.role,
    gender:data?.user?.gender
   }
   cookie.set("user", JSON.stringify(userSaveData) || "",{  httpOnly: true,secure: process.env.NODE_ENV === "production",sameSite:"lax",path:"/", maxAge:60*60*24*10 });
    }
   
   return {data,error};
}

export const logOutUser = async ()=>{
        const cookie = await cookies();
 cookie.delete("access_token");
 cookie.delete("user");
 return true
}

export const getUser = async ()=>{
    const cookie = await cookies();
    const userString = cookie.get("user")?.value;
    const UserData:UserInfo | null = userString ? JSON.parse(userString) : null;

    return UserData;
}

// Optional tracking must not redirect the user when their session has expired.
async function trackingRequest<T>(path: string): Promise<T | null> {
    const token = (await cookies()).get("access_token")?.value;
    if (!token) return null;
    if (!process.env.BASE_URL) throw new Error("Tracking API is unavailable");
    const response = await fetch(process.env.BASE_URL + path, {
        cache: "no-store", headers: { access_token: token }, signal: AbortSignal.timeout(5000),
    });
    if ([401, 403, 404].includes(response.status)) return null;
    if (!response.ok) throw new Error("Tracking API is unavailable");
    return response.json();
}

export const getTrackingUser = async (): Promise<TrackingUser | null> =>
    trackingRequest<TrackingUser>("/platform/tracking/user");

export const getTrackingPurchase = async (paymentId: string, purpose: "premium" | "connections") =>
    trackingRequest<PurchaseReceipt>("/platform/tracking/purchase?paymentId=" +
        encodeURIComponent(paymentId) + "&purpose=" + encodeURIComponent(purpose));

export const requestNumber = async (payoad:{userId:string, requestUserId:string}) => {
    const [data, error] = await PostRequestAxios<{userData:Record<string,unknown>}>("/user/request-for-number",payoad);

    if(data){
        const cookie = await cookies();

        cookie.set("user", JSON.stringify(data?.userData) || "",{  httpOnly: true,secure: process.env.NODE_ENV === "production",sameSite:"lax",path:"/", maxAge:60*60*24*10 });
    }
    return {data,error};
}

export const setUserData = async (data:Record<string,any>) =>{
     const cookie = await cookies();

        cookie.set("user", JSON.stringify(data) || "",{  httpOnly: true,secure: process.env.NODE_ENV === "production",sameSite:"lax",path:"/", maxAge:60*60*24*10 });
}

export const setOtpData = async (payoad:Record<string,any>) =>{
    const [data, error] = await PostRequestAxios<{data:User,access_token:string}>("/user/verify-otp",payoad);
    if(data){
        const cookie = await cookies();
        cookie.set("user", JSON.stringify(data?.data) || "",{  httpOnly: true,secure: process.env.NODE_ENV === "production",sameSite:"lax",path:"/", maxAge:60*60*24*10 });
           cookie.set("access_token", data?.access_token || "", {  httpOnly: true,secure: process.env.NODE_ENV === "production",sameSite:"lax",path:"/", maxAge:60*60*24*10 });
    }

    return {data,error};
}
