"use server"
import { PostRequestAxios } from "@/api-hooks/api-hooks";
import { cookies } from "next/headers";
import {User} from "@/@types/user"

 type userData ={
    user:User,
    access_token:string,
    message:string
 }
export const loginUser = async (phoneNumber: string, password: string) => {
    const [data, error] = await PostRequestAxios<userData>("/user/login-user",{phoneNumber,password});
    if(data){
    const cookie = await cookies();
   cookie.set("access_token", data?.access_token || "");
   cookie.set("user", JSON.stringify(data?.user) || "");
    }
   
   return {data,error};

}