import { registerSW } from 'virtual:pwa-register';
import { audioAssets } from './audio';
let updater: ((reloadPage?: boolean) => Promise<void>) | null = null;
export function registerOffline(onReady:()=>void,onUpdate:()=>void,onError:(err:unknown)=>void) {
 if (!('serviceWorker' in navigator)) return;
 updater=registerSW({immediate:true,onOfflineReady:()=>{void verifyOffline().then(ok=>{if(ok)onReady()})},onNeedRefresh:onUpdate,onRegisterError:onError});
 navigator.serviceWorker.ready.then(()=>verifyOffline()).then(ok=>{if(ok)onReady()}).catch(onError);
}
export async function applyUpdate(){await updater?.(true)}
export async function verifyOffline():Promise<boolean>{
 if(!('caches' in window)||!navigator.serviceWorker?.controller)return false;
 const cacheNames=await caches.keys();
 const appCaches=await Promise.all(cacheNames.filter(n=>n.includes('workbox-precache')).map(n=>caches.open(n)));
 if(!appCaches.length)return false;
 const requests=(await Promise.all(appCaches.map(c=>c.keys()))).flat();
 const paths=new Set(requests.map(r=>new URL(r.url).pathname));
 const required=['/index.html','/manifest.webmanifest','/icons/icon-192.png',...audioAssets()];
 return required.every(path=>paths.has(path))&&[...paths].some(p=>p.includes('/assets/solver.worker-'))&&[...paths].some(p=>p.includes('/assets/three-'))&&[...paths].some(p=>p.endsWith('.css'));
}
