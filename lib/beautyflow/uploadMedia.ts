export async function uploadMedia(fd:FormData,token:string):Promise<{url:string;path?:string}>{
 for(let attempt=0;attempt<2;attempt++){
  let response:Response;
  try{response=await fetch("/api/business/media",{method:"POST",headers:{Authorization:`Bearer ${token}`},body:fd})}
  catch(error){if(attempt===1)throw error;await new Promise(resolve=>setTimeout(resolve,450));continue}
  const result=await response.json().catch(()=>({}));
  if(response.ok&&typeof result.url==="string")return result;
  if(attempt===1||response.status<500)throw new Error(result.message||"Снимката не беше качена.");
  await new Promise(resolve=>setTimeout(resolve,450));
 }
 throw new Error("Снимката не беше качена.");
}
