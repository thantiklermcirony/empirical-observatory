import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {mayEditFramework} from '@/lib/framework-proposals';
export const dynamic='force-dynamic';
export async function GET(){const user=await getChatGPTUser(),allowlist=(env as {OBSERVATORY_EDITOR_IDS?:string}).OBSERVATORY_EDITOR_IDS;return Response.json({signedIn:!!user,editor:mayEditFramework(user?.userId,allowlist),configured:!!allowlist?.trim(),setupId:!allowlist?.trim()?user?.userId??null:null},{headers:{'Cache-Control':'no-store'}});}
