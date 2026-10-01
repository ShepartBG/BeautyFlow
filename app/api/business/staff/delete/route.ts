import {NextResponse} from "next/server";
import {requireBusinessOwner} from "@/lib/beautyflow/businessAuth";
export async function DELETE(req:Request){
 const auth=await requireBusinessOwner(req);if(!auth.ok)return NextResponse.json({message:auth.message},{status:auth.status});
 try{const body=await req.json();const{error}=await auth.admin.rpc("beautyflow_remove_staff",{p_salon:auth.business.id,p_staff:String(body.id||"")});if(error)return NextResponse.json({message:error.message},{status:409});return NextResponse.json({ok:true,message:"Специалистът е премахнат от екипа. Историята на миналите часове е запазена."})}
 catch{return NextResponse.json({message:"Не успяхме да премахнем специалиста."},{status:500})}
}
