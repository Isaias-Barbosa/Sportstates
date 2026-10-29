import { deflateSync } from "node:zlib";
// Original pixel lettering: a scoreboard identity without remote fonts or images.
const FONT = {
A:"01110/10001/10001/11111/10001/10001/10001",B:"11110/10001/10001/11110/10001/10001/11110",C:"01111/10000/10000/10000/10000/10000/01111",D:"11110/10001/10001/10001/10001/10001/11110",E:"11111/10000/10000/11110/10000/10000/11111",F:"11111/10000/10000/11110/10000/10000/10000",G:"01111/10000/10000/10111/10001/10001/01111",H:"10001/10001/10001/11111/10001/10001/10001",I:"111/010/010/010/010/010/111",J:"00111/00010/00010/00010/10010/10010/01100",K:"10001/10010/10100/11000/10100/10010/10001",L:"10000/10000/10000/10000/10000/10000/11111",M:"10001/11011/10101/10101/10001/10001/10001",N:"10001/11001/10101/10011/10001/10001/10001",O:"01110/10001/10001/10001/10001/10001/01110",P:"11110/10001/10001/11110/10000/10000/10000",Q:"01110/10001/10001/10001/10101/10010/01101",R:"11110/10001/10001/11110/10100/10010/10001",S:"01111/10000/10000/01110/00001/00001/11110",T:"11111/00100/00100/00100/00100/00100/00100",U:"10001/10001/10001/10001/10001/10001/01110",V:"10001/10001/10001/10001/10001/01010/00100",W:"10001/10001/10001/10101/10101/11011/10001",X:"10001/10001/01010/00100/01010/10001/10001",Y:"10001/10001/01010/00100/00100/00100/00100",Z:"11111/00001/00010/00100/01000/10000/11111",
"0":"01110/10001/10011/10101/11001/10001/01110","1":"010/110/010/010/010/010/111","2":"01110/10001/00001/00010/00100/01000/11111","3":"11110/00001/00001/01110/00001/00001/11110","4":"10010/10010/10010/11111/00010/00010/00010","5":"11111/10000/10000/11110/00001/00001/11110","6":"01110/10000/10000/11110/10001/10001/01110","7":"11111/00001/00010/00100/01000/01000/01000","8":"01110/10001/10001/01110/10001/10001/01110","9":"01110/10001/10001/01111/00001/00001/01110",".":"0/0/0/0/0/1/1","-":"000/000/000/111/000/000/000","/":"00001/00001/00010/00100/01000/10000/10000","?":"11110/00001/00010/00100/00100/00000/00100"
};
export function renderShareImage(meta) {
  const W=1200,H=630,pixels=Buffer.alloc(W*H*3);
  const rect=(x,y,w,h,c)=>{for(let j=Math.max(0,y);j<Math.min(H,y+h);j++)for(let i=Math.max(0,x);i<Math.min(W,x+w);i++){const p=(j*W+i)*3;pixels[p]=c[0];pixels[p+1]=c[1];pixels[p+2]=c[2];}};
  const lime=[199,255,48], white=[242,247,255], muted=[157,174,199];
  for(let y=0;y<H;y++)rect(0,y,W,1,[8+Math.floor(y/80),16+Math.floor(y/60),34+Math.floor(y/30)]);
  for(let x=800;x<1400;x+=55) for(let y=0;y<H;y++)rect(x-Math.floor(y*.4),y,2,1,[32,49,65]);
  rect(0,0,12,H,lime);rect(64,55,49,49,lime);
  const text=(s,x,y,scale,color)=>{
    s=String(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();
    for(const ch of s){if(ch===" "){x+=4*scale;continue;} const rows=(FONT[ch]||FONT["?"]).split("/");for(let j=0;j<rows.length;j++)for(let i=0;i<rows[j].length;i++)if(rows[j][i]==="1")rect(x+i*scale,y+j*scale,scale,scale,color);x+=(rows[0].length+1)*scale;}
  };
  text("S",74,65,4,[8,16,34]); text("SPORTSTATES.",135,65,4,white);
  rect(940,61,190,36,lime);text("PLAY ON",958,70,3,[8,16,34]);
  text(meta.label,66,155,3,lime);
  const normalized=String(meta.heading).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();
  const lines=[];let line="";
  const max=meta.kind==="home"?23:28;
  for(const word of normalized.split(/\s+/)){if((line+" "+word).trim().length>max && line){lines.push(line);line=word;}else line=(line+" "+word).trim();}
  if(line)lines.push(line);
  const scale=meta.kind==="home"?8:6;
  lines.slice(0,3).forEach((s,i)=>text(s.slice(0,max),66,218+i*(scale*9),scale,white));
  rect(66,480,1068,2,[51,68,86]);
  text("PLACARES / TIMES / CLASSIFICACOES",66,511,3,muted);
  text("SPORTSTATES.VERCEL.APP",66,567,3,lime);
  // Stadium floodlights / scoreboard marks.
  for(let i=0;i<5;i++)rect(1008+i*24,562,14,14,i<3?lime:[51,68,86]);
  const crc=b=>{let c=0xffffffff;for(const v of b){c^=v;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;};
  const chunk=(type,data)=>{const name=Buffer.from(type),length=Buffer.alloc(4),sum=Buffer.alloc(4);length.writeUInt32BE(data.length);sum.writeUInt32BE(crc(Buffer.concat([name,data])));return Buffer.concat([length,name,data,sum]);};
  const header=Buffer.alloc(13);header.writeUInt32BE(W,0);header.writeUInt32BE(H,4);header[8]=8;header[9]=2;
  const raw=Buffer.alloc(H*(1+W*3));for(let y=0;y<H;y++)pixels.copy(raw,y*(1+W*3)+1,y*W*3,(y+1)*W*3);
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk("IHDR",header),chunk("IDAT",deflateSync(raw)),chunk("IEND",Buffer.alloc(0))]);
}
