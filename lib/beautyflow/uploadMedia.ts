const MAX_REQUEST_BYTES = 3_200_000;

export async function prepareMediaForm(original: FormData): Promise<FormData> {
 const file=original.get("file");
 if(!(file instanceof File)||!file.size)throw new Error("Избери снимка за качване.");
 if(file.size>16*1024*1024)throw new Error("Снимката трябва да е до 16 MB.");
 const kind=String(original.get("kind")||""),width=({logo:720,cover:1800,staff:900,gallery:1600,service:1300} as Record<string,number>)[kind]||1600;
 const image=new Image();let local="";
 try{
  local=URL.createObjectURL(file);image.src=local;await image.decode();
  let scale=Math.min(1,width/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement("canvas");let output:Blob|null=null;
  for(let attempt=0;attempt<4;attempt++){
   canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
   const context=canvas.getContext("2d");if(!context)throw new Error("Не успяхме да подготвим снимката.");
   context.drawImage(image,0,0,canvas.width,canvas.height);
   output=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/webp",0.8-attempt*0.06));
   if(output&&output.size<=MAX_REQUEST_BYTES)break;scale*=0.75;
  }
  if(!output||output.size>MAX_REQUEST_BYTES)throw new Error("Снимката е прекалено голяма. Избери по-малко изображение.");
  const fd=new FormData();original.forEach((value,key)=>{if(key!=="file")fd.append(key,value)});
  fd.append("file",output,output.type==="image/webp"?"beautyflow-upload.webp":"beautyflow-upload.png");return fd;
 }catch(error){
  if(error instanceof Error&&!(error instanceof DOMException))throw error;
  throw new Error("Телефонът не успя да прочете снимката. Запази я като JPG/PNG и я избери от Снимки или Галерия. При Viber първо я запази на устройството.");
 }finally{if(local)URL.revokeObjectURL(local)}
}

export async function uploadMedia(original:FormData,token:string):Promise<{url:string;path?:string}>{
 const fd=await prepareMediaForm(original);
 for(let attempt=0;attempt<2;attempt++){
  let response:Response;
  try{response=await fetch("/api/business/media",{method:"POST",headers:{Authorization:`Bearer ${token}`},body:fd})}
  catch{if(attempt===1)throw new Error("Качването прекъсна. Провери връзката и опитай отново.");await new Promise(resolve=>setTimeout(resolve,450));continue}
  const result=await response.json().catch(()=>({}));
  if(response.ok&&typeof result.url==="string"&&/^https?:\/\//i.test(result.url))return result;
  if(response.status===413)throw new Error("Снимката надвишава лимита за качване. Избери по-малка снимка.");
  if(attempt===1||response.status<500)throw new Error(result.message||`Снимката не беше качена (HTTP ${response.status}).`);
  await new Promise(resolve=>setTimeout(resolve,450));
 }
 throw new Error("Снимката не беше качена.");
}
