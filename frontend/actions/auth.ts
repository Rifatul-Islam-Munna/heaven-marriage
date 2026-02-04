"use server"
import { PostRequestAxios } from "@/api-hooks/api-hooks";
import { cookies } from "next/headers";
import {User, UserInfo} from "@/@types/user"

 type userData ={
    user:User,
    access_token:string,
    message:string
 }
export const loginUser = async (phoneNumber: string, password: string) => {
    const [data, error] = await PostRequestAxios<userData>("/user/login-user",{phoneNumber,password});
    if(data){
    const cookie = await cookies();
   cookie.set("access_token", data?.access_token || "", {  httpOnly: true,secure: true,path:"/", maxAge:60*60*24*10 });
   cookie.set("user", JSON.stringify(data?.user) || "",{  httpOnly: true,secure: true,path:"/", maxAge:60*60*24*10 });
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