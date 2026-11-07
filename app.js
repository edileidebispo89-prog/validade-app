import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { LocalNotifications } from '@capacitor/local-notifications';
import { TextRecognition } from '@capacitor-mlkit/text-recognition';
const $=s=>document.querySelector(s);
const PL=()=>Capacitor.isNativePlatform()?{Camera,LocalNotifications,TextRecognition}:{};
let S,cur=null;
function load(){try{S=JSON.parse(localStorage.getItem('validade2')||'null')}catch(e){S=null}if(!S||!Array.isArray(S.items))S={items:[],next:1}}
function save(){try{localStorage.setItem('validade2',JSON.stringify(S))}catch(e){alert('Sem espaço para salvar. Exclua produtos antigos.')}}
const pad=n=>String(n).padStart(2,'0');
const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parse=s=>{const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const today=()=>{const t=new Date();return new Date(t.getFullYear(),t.getMonth(),t.getDate())};
const left=s=>Math.round((parse(s)-today())/864e5);
const fmt=s=>parse(s).toLocaleDateString('pt-BR');
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
//P1
const MES={jan:1,fev:2,feb:2,mar:3,abr:4,apr:4,mai:5,may:5,jun:6,jul:7,ago:8,aug:8,set:9,sep:9,out:10,oct:10,nov:11,dez:12,dec:12};
function mk(y,m,d){y=+y;m=+m;d=+d;if(y<100)y+=2000;if(m<1||m>12||y<2020||y>2045)return null;
  if(!d)d=new Date(y,m,0).getDate();const t=new Date(y,m-1,d);return t.getMonth()==m-1?t:null}
function findDate(txt){
  let t=txt.replace(/(?<=\d)[oO](?![a-zA-Z])|(?<![a-zA-Z])[oO](?=\d)/g,'0').toLowerCase(),out=[];
  const pass=(re,fn)=>{t=t.replace(re,(...a)=>{const d=fn(a);if(d){out.push(d);return ' '}return a[0]})};
  pass(/(\d{1,2})\s*[\/.\-]\s*(\d{1,2})\s*[\/.\-]\s*(\d{4}|\d{2})(?!\d)/g,a=>mk(a[3],a[2],a[1]));
  pass(/(\d{1,2})\s*[\/.\-]?\s*([a-zç]{3})[a-zç]*\s*[\/.\-]?\s*(\d{4}|\d{2})(?!\d)/g,a=>MES[a[2]]&&mk(a[3],MES[a[2]],a[1]));
  pass(/([a-zç]{3})[a-zç]*\s*[\/.\-]?\s*(\d{4}|\d{2})(?!\d)/g,a=>MES[a[1]]&&mk(a[2],MES[a[1]],0));
  pass(/(?<!\d)(\d{1,2})\s*[\/.\-]\s*(\d{4}|\d{2})(?!\d)/g,a=>mk(a[2],a[1],0));
  return out.length?iso(out.sort((a,b)=>b-a)[0]):null}
//P2
function thumb(src){return new Promise(r=>{const i=new Image();i.onload=()=>{const k=Math.min(1,320/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=i.width*k;c.height=i.height*k;c.getContext('2d').drawImage(i,0,0,c.width,c.height);r(c.toDataURL('image/jpeg',.6))};i.onerror=()=>r('');i.src=src})}
function lab(n){if(n<0)return{b:-n,s:n==-1?'dia de atraso':'dias de atraso'};if(n==0)return{b:'Hoje',s:'vence'};return{b:n,s:n==1?'dia':'dias'}}
const nm=it=>esc(it.name||'Produto sem nome');
function row(it){const n=left(it.date),c=n<0?'late':n<=7?'soon':'',l=lab(n);
  return `<div class="item ${c}"><div class="rail"></div><img class="ph" src="${it.img||''}" alt=""><div><div class="name">${nm(it)}</div><div class="date">${fmt(it.date)}</div><button class="btn use" data-a="use" data-id="${it.id}">Já usei</button></div><div class="days"><div class="big">${l.b}</div><div class="small">${l.s}</div></div></div>`}
function rowUsed(it){return `<div class="item usedrow"><div class="rail"></div><img class="ph" src="${it.img||''}" alt=""><div><div class="name">${nm(it)}</div><div class="date">${fmt(it.date)}</div><button class="btn" data-a="undo" data-id="${it.id}">Desmarcar</button><button class="btn" data-a="del" data-id="${it.id}">Excluir</button></div><div></div></div>`}
function render(){
  const act=S.items.filter(i=>!i.used).sort((a,b)=>a.date<b.date?-1:1),used=S.items.filter(i=>i.used);
  const g=[['Vencidos',act.filter(i=>left(i.date)<0)],['Vencem em até 7 dias',act.filter(i=>{const n=left(i.date);return n>=0&&n<=7})],['Em dia',act.filter(i=>left(i.date)>7)]];
  let h=g.filter(x=>x[1].length).map(x=>`<h2>${x[0]}</h2>`+x[1].map(row).join('')).join('');
  if(used.length)h+='<h2>Já usados</h2>'+used.map(rowUsed).join('');
  $('#list').innerHTML=h||'<div class="empty">Nenhum produto ainda. Toque em Fotografar a validade e aponte a câmera para a data impressa na embalagem.</div>';
  const a=g[0][1].length,b=g[1][1].length;
  $('#sum').textContent=!act.length?'Nenhum produto sendo vigiado':a?`${a} vencido${a>1?'s':''}, ${b} vence${b==1?'':'m'} em até 7 dias`:b?`${b} produto${b>1?'s':''} vence${b>1?'m':''} em até 7 dias`:'Tudo em dia';
}
async function sched(it){const L=PL().LocalNotifications;if(!L)return;try{
  const e=parse(it.date),now=new Date();let at=new Date(e.getFullYear(),e.getMonth(),e.getDate()-5,9,0),n=5;
  if(at<=now){n=left(it.date);if(n<0)return;at=new Date(now.getTime()+10000)}
  await L.schedule({notifications:[{id:it.id,title:it.name||'Produto perto de vencer',body:'Vence '+(n==0?'hoje':'em '+n+(n==1?' dia':' dias'))+' ('+fmt(it.date)+'). Toque para abrir e marcar se já usou.',schedule:{at,allowWhileIdle:true}}]})}catch(e){console.warn(e)}}
async function unsched(id){const L=PL().LocalNotifications;if(!L)return;try{await L.cancel({notifications:[{id}]})}catch(e){}}
function openAdd(img,date,msg){cur={img};$('#pv').src=img;$('#dt').value=date||'';$('#nm').value='';$('#st').textContent=msg;if(!$('#dAdd').open)$('#dAdd').showModal()}
async function snap(){
  const P=PL();if(P.LocalNotifications){try{await P.LocalNotifications.requestPermissions()}catch(e){}}
  if(!P.Camera){$('#file').click();return}
  let p;try{p=await P.Camera.getPhoto({quality:85,resultType:'uri',source:'CAMERA'})}catch(e){return}
  const img=await thumb(p.webPath);openAdd(img,'','Lendo a data da foto...');
  let d=null;
  if(P.TextRecognition){for(const path of [p.path,(p.path||'').replace('file://',''),p.webPath]){if(!path)continue;try{const r=await P.TextRecognition.processImage({path});d=findDate(r.text||'');break}catch(e){}}}
  $('#dt').value=d||'';$('#st').textContent=d?'Li esta data. Confira antes de salvar.':'Não consegui ler a data. Digite abaixo.'}
$('#snap').onclick=snap;
$('#file').onchange=async e=>{const f=e.target.files[0];if(!f)return;openAdd(await thumb(URL.createObjectURL(f)),'','Digite a data de validade.');e.target.value=''};
$('#cAdd').onclick=()=>$('#dAdd').close();
$('#fAdd').onsubmit=e=>{e.preventDefault();const it={id:S.next++,name:$('#nm').value.trim(),date:$('#dt').value,img:cur.img,used:false};S.items.push(it);save();render();sched(it);$('#dAdd').close()};
$('#list').onclick=e=>{const a=e.target.dataset.a,id=+e.target.dataset.id;if(!a)return;const i=S.items.findIndex(x=>x.id==id);if(i<0)return;const it=S.items[i];
  if(a=='use'){it.used=true;unsched(id)}else if(a=='undo'){it.used=false;sched(it)}else if(a=='del'){if(!confirm('Excluir este produto?'))return;S.items.splice(i,1);unsched(id)}
  save();render()};
document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
load();render();
