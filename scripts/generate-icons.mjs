// 決定的なローカルPNG処理。元画像・人物・色を再生成しない。Windows Edgeのみ使用。
import {readFileSync,writeFileSync,mkdtempSync,existsSync,rmSync,mkdirSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
const source=readFileSync('yoribi-icon.png');
const profile=mkdtempSync(join(tmpdir(),'yoribi-icon-build-'));
const child=spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
let socket,sequence=0;const pending=new Map();
const pause=ms=>new Promise(done=>setTimeout(done,ms));
try {
  for(let i=0;i<150&&!existsSync(join(profile,'DevToolsActivePort'));i++)await pause(100);
  const port=readFileSync(join(profile,'DevToolsActivePort'),'utf8').split('\n')[0];
  const targets=await(await fetch(`http://127.0.0.1:${port}/json`)).json();
  socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((done,fail)=>{socket.onopen=done;socket.onerror=fail;});
  socket.onmessage=({data})=>{const m=JSON.parse(data);if(pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}};
  const command=(method,params)=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  const result=await command('Runtime.evaluate',{awaitPromise:true,returnByValue:true,expression:`(async()=>{
    const img=new Image();img.src='data:image/png;base64,${source.toString('base64')}';await img.decode();
    if(img.width!==img.height)throw Error('Source must be square');
    const margin=Math.round(img.width*.051),side=img.width-2*margin;
    const base=document.createElement('canvas');base.width=base.height=side;
    const ctx=base.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,margin,margin,side,side,0,0,side,side);
    const original=ctx.getImageData(0,0,side,side),pixels=new Uint8ClampedArray(original.data),radius=Math.round(side*.28);
    let changed=0,changedArtwork=0;
    for(let y=0;y<side;y++)for(let x=0;x<side;x++){
      const cx=x<radius?radius:x>=side-radius?side-radius-1:x;
      const cy=y<radius?radius:y>=side-radius?side-radius-1:y;
      const dx=x-cx,dy=y-cy,d=Math.hypot(dx,dy);
      if(d<=radius-5)continue;
      const ratio=(radius-22)/d,sx=Math.round(cx+dx*ratio),sy=Math.round(cy+dy*ratio),i=(y*side+x)*4,j=(sy*side+sx)*4;
      const color=[pixels[i],pixels[i+1],pixels[i+2]];
      if(Math.max(...color)-Math.min(...color)>45)changedArtwork++;
      original.data.set(pixels.subarray(j,j+4),i);original.data[i+3]=255;changed++;
    }
    if(changedArtwork)throw Error('Background adjustment intersects artwork');
    ctx.putImageData(original,0,0);
    const bg=ctx.getImageData(Math.floor(side/2),25,1,1).data,background='rgb('+bg[0]+','+bg[1]+','+bg[2]+')';
    let artworkRadius=0;for(let y=0;y<side;y++)for(let x=0;x<side;x++){const i=(y*side+x)*4,c=[pixels[i],pixels[i+1],pixels[i+2]];
      if(Math.max(...c)-Math.min(...c)>45)artworkRadius=Math.max(artworkRadius,Math.hypot(x-side/2,y-side/2)/side);}
    if(artworkRadius*.78>.4)throw Error('Artwork outside maskable safe circle');
    const render=(size,scale=1)=>{const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';const edge=size*scale,pad=(size-edge)/2;
      if(pad){
        // 端の画素を外へ延長。中央画像と塗り足しの間に四角い色境界を作らない。
        g.drawImage(base,0,0,1,1,0,0,pad,pad);g.drawImage(base,side-1,0,1,1,size-pad,0,pad,pad);
        g.drawImage(base,0,side-1,1,1,0,size-pad,pad,pad);g.drawImage(base,side-1,side-1,1,1,size-pad,size-pad,pad,pad);
        g.drawImage(base,0,0,side,1,pad,0,edge,pad);g.drawImage(base,0,side-1,side,1,pad,size-pad,edge,pad);
        g.drawImage(base,0,0,1,side,0,pad,pad,edge);g.drawImage(base,side-1,0,1,side,size-pad,pad,pad,edge);
      }
      g.drawImage(base,pad,pad,edge,edge);return c;};
    const files={};for(const [name,size,scale] of [['icon-192.png',192,1],['icon-512.png',512,1],['apple-touch-icon.png',180,1],['icon-maskable-512.png',512,.78],['favicon-48.png',48,1]])files[name]=render(size,scale).toDataURL('image/png').split(',')[1];
    const preview=document.createElement('canvas');preview.width=1100;preview.height=650;const g=preview.getContext('2d');g.fillStyle='#dedde6';g.fillRect(0,0,1100,650);g.fillStyle='#292735';g.font='20px sans-serif';
    g.fillText('Square PNG',35,35);g.drawImage(render(300),35,55);g.fillText('iPhone-style mask (simulation)',375,35);
    g.save();g.beginPath();g.roundRect(375,55,300,300,66);g.clip();g.drawImage(render(300),375,55);g.restore();
    g.fillText('Android safe circle (simulation)',725,35);g.save();g.beginPath();g.arc(875,205,150,0,Math.PI*2);g.clip();g.drawImage(render(300,.78),725,55);g.restore();
    g.fillText('48px favicon',35,410);g.drawImage(render(48),35,430);g.fillText('192px PNG',180,410);g.drawImage(render(192),180,430);
    return {files,preview:preview.toDataURL('image/png').split(',')[1],report:{source:[img.width,img.height],margin,side,background,changedBackgroundPixels:changed,changedArtworkPixels:changedArtwork,maskableScale:.78,maskableArtworkRadius:artworkRadius*.78}};
  })()`});
  if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));
  mkdirSync('test-artifacts',{recursive:true});
  for(const[name,base64]of Object.entries(result.result.value.files))writeFileSync(join('public/icons',name),Buffer.from(base64,'base64'));
  writeFileSync('test-artifacts/yoribi-icon-comparison.png',Buffer.from(result.result.value.preview,'base64'));
  writeFileSync('test-artifacts/yoribi-icon-report.json',JSON.stringify(result.result.value.report,null,2));
  console.log(JSON.stringify(result.result.value.report));
} finally {socket?.close();child.kill();if(profile.startsWith(resolve(tmpdir())+sep)&&profile.includes('yoribi-icon-build-'))try{rmSync(profile,{recursive:true,force:true});}catch{/* Edge解放待ちの場合のみ一時プロファイルが残る */}}
