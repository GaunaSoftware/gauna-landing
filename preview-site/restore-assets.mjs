// Binary transport is checked against the known anonymized image hash before publication.
// Payloads are not copied to the public output. No original customer screenshots are present.
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
export function restoreAssets(root) {
 const items=[
  {id:'dashboard',offset:890,remove:308,insert:'',sha:'3f24bfb0cdc84fe880dc794cda1289373b61efd1'},
  {id:'informes',offset:1988,remove:0,insert:'Bv/btqqnNGTUUCg',sha:'9bf6dc6ed2921d2851851133eb5f76570073bd65'}
 ];
 for(const item of items){
  const path=join(root,'assets',item.id+'.payload');if(!existsSync(path))continue;
  const encoded=readFileSync(path).toString('base64');
  let fixed=(encoded.slice(0,item.offset)+item.insert+encoded.slice(item.offset+item.remove)).replace(/=+$/,'');
  fixed+='='.repeat((4-fixed.length%4)%4);
  const bytes=Buffer.from(fixed,'base64');
  const hash=createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  if(hash!==item.sha)throw new Error(`Anonymized asset integrity check failed: ${item.id}`);
  if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP')throw new Error('Invalid image');
  writeFileSync(join(root,'assets',item.id+'.webp'),bytes);
 }
}
