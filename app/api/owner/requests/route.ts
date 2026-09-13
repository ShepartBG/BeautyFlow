import { NextResponse } from "next/server";
import { requirePlatformOwner } from "@/lib/ownerAuth";

export async function GET(req:Request){
 const auth=await requirePlatformOwner(req); if(!auth.ok)return NextResponse.json({message:auth.message},{status:auth.status});
 const {data,error}=await auth.admin.from("access_requests").select("*").order("created_at",{ascending:false});
 if(error)return NextResponse.json({message:error.message},{status:500});
 return NextResponse.json({requests:data||[]});
}
