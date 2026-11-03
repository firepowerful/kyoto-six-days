
(function(){
'use strict';
if(typeof DAYS==='undefined'||!document.querySelector('.route-info'))return;
var busUrl='https://kyotocity.bus-navigation.jp/wgsys/wgs_kyt/search.htm';
var providerUrl='https://www.city.kyoto.lg.jp/kotsu/page/0000351090.html';
var currentDay=-1;
var selectedId='';
var position=null;
var panel=document.createElement('section');
panel.className='traffic-assistant';
panel.id='traffic-assistant';
panel.setAttribute('aria-label','旅行交通助手');
panel.innerHTML=
'<div class="traffic-head"><h3>旅行交通助手</h3><span class="traffic-kicker">交通路線依查詢當下更新</span></div>'+
'<p class="traffic-description">選擇今天要去的景點，以Google地圖查詢大眾運輸與步行路線。京都市巴士到站位置與擁擠度請使用官方系統。</p>'+
'<div class="traffic-form">'+
'<label class="traffic-field">目的地<select id="ta-destination"></select></label>'+
'<label class="traffic-field">出發地<select id="ta-origin"><option value="current">目前位置（由Google地圖判斷）</option><option value="previous">上一個行程點</option><option value="hotel">烏丸御池站（住宿區示例）</option><option value="gps">網站定位（需同意權限）</option></select></label>'+
'</div>'+
'<div class="traffic-links">'+
'<a id="ta-transit" class="traffic-primary" target="_blank" rel="noopener">查最新大眾運輸↗</a>'+
'<a id="ta-walk" target="_blank" rel="noopener">查看步行路線↗</a>'+
'<button id="ta-gps" type="button">取得目前位置</button>'+
'</div>'+
'<p class="traffic-note" id="ta-geo-status" aria-live="polite">不需要授權本站定位，也能透過Google地圖查路線。使用網站定位時僅存於目前頁面，不會儲存到網站伺服器。</p>'+
'<hr class="traffic-divider">'+
'<h3>行程延後時重新安排</h3>'+
'<div class="traffic-form">'+
'<label class="traffic-field">估計比原計畫延後（分鐘）<input id="ta-delay" type="number" min="0" max="600" step="5" value="0"></label>'+
'<label class="traffic-field">預留交通與候車（分鐘）<input id="ta-buffer" type="number" min="0" max="240" step="5" value="30"></label>'+
'</div>'+
'<p id="ta-reminder" class="traffic-reminder" aria-live="polite"></p>'+
'<p class="traffic-note">上述是依行程表做的手動時間推算，不含即時行車、塞車或到站資料。實際出發前請開啟最新路線，並查詢場館最後入場時間。Google地圖內可選擇偏好較少轉乘。</p>'+
'<hr class="traffic-divider">'+
'<h3>京都市巴士官方即時動態</h3>'+
'<p class="traffic-description">可查公車接近站數、車輛位置及車內擁擠程度。請在官方頁面選擇上車站與公車路線。</p>'+
'<div class="traffic-links"><a id="ta-bus" href="'+busUrl+'" target="_blank" rel="noopener">查官方公車動態↗</a><a href="'+providerUrl+'" target="_blank" rel="noopener">京都市交通局說明↗</a></div>'+
'<p class="traffic-note">本頁沒有直接讀取公車即時API，亦不會假裝提供即時到站秒數。若使用JR、地下鐵或京都巴士，請以各營運業者資訊為準。</p>';
document.querySelector('.route-info').appendChild(panel);
var destination=panel.querySelector('#ta-destination');
var origin=panel.querySelector('#ta-origin');
var transit=panel.querySelector('#ta-transit');
var walk=panel.querySelector('#ta-walk');
var delay=panel.querySelector('#ta-delay');
var buffer=panel.querySelector('#ta-buffer');
var reminder=panel.querySelector('#ta-reminder');
function pad(n){return String(n).padStart(2,'0')}
function formatMinutes(min){return pad(Math.floor((min%1440+1440)%1440/60))+':'+pad((min%60+60)%60)}
function originCoords(s){
 if(origin.value==='hotel')return 'Karasuma Oike Station, Kyoto, Japan';
 if(origin.value==='gps'&&position)return position.latitude+','+position.longitude;
 if(origin.value==='previous'){
  var list=DAYS[day].stops;var index=list.findIndex(function(x){return x.id===s.id});
  if(index>0)return list[index-1].lat+','+list[index-1].lng;
  return 'Karasuma Oike Station, Kyoto, Japan';
 }
 return '';
}
function mapsLink(s,mode){
 var u=new URL('https://www.google.com/maps/dir/');
 u.searchParams.set('api','1');
 u.searchParams.set('destination',s.lat+','+s.lng);
 u.searchParams.set('travelmode',mode);
 var from=originCoords(s);if(from)u.searchParams.set('origin',from);
 if(!from)u.searchParams.set('dir_action','navigate');
 return u.toString();
}
function refresh(){
 var d=DAYS[day];var s=d.stops.find(function(x){return x.id===destination.value})||d.stops[0];
 if(!s)return;
 selectedId=s.id;
 transit.href=mapsLink(s,'transit');
 walk.href=mapsLink(s,'walking');
 var m=/^(\d{1,2}):(\d{2})$/.exec(s.time);
 if(!m){reminder.textContent='這一站沒有確定的原訂時間，請依當天營業時間及交通狀況安排。';return}
 var t=Number(m[1])*60+Number(m[2]);
 var shift=Math.max(0,Math.min(600,Number(delay.value)||0));
 var reserve=Math.max(0,Math.min(240,Number(buffer.value)||0));
 reminder.textContent='原訂'+s.time+'抵達「'+s.name+'」。如延後'+shift+'分鐘，調整為'+formatMinutes(t+shift)+'抵達；若預留'+reserve+'分鐘交通與候車，建議約'+formatMinutes(t+shift-reserve)+'出發。此時間為規劃提醒，請再查實際交通。';
}
function syncDay(force){
 if(currentDay===day&&!force)return;
 currentDay=day;
 var d=DAYS[day];
 var old=selectedId;
 destination.replaceChildren();
 d.stops.forEach(function(s){var option=document.createElement('option');option.value=s.id;option.textContent=s.time+'｜'+s.name;destination.appendChild(option)});
 destination.value=force&&d.stops.some(function(s){return s.id===old})?old:d.stops[0].id;
 refresh();
}
function enhanceCards(){
 var cards=document.querySelectorAll('#stops .stop');
 cards.forEach(function(card){
  if(card.querySelector('[data-traffic-to]'))return;
  var id=card.id.replace(/^stop-/,'');
  var actions=card.querySelector('.actions');if(!actions)return;
  var b=document.createElement('button');
  b.type='button';b.className='btn traffic-mobile-card-link';
  b.textContent='查前往這站的交通';b.setAttribute('data-traffic-to',id);
  b.addEventListener('click',function(){
   syncDay(false);destination.value=id;refresh();
   panel.scrollIntoView({behavior:'smooth',block:'start'});
  });
  actions.appendChild(b);
 });
}
destination.addEventListener('change',refresh);
origin.addEventListener('change',function(){
 if(origin.value==='gps'&&!position)panel.querySelector('#ta-geo-status').textContent='尚未取得位置。點選「取得目前位置」，或改用Google地圖判斷目前位置。';
 refresh();
});
delay.addEventListener('input',refresh);
buffer.addEventListener('input',refresh);
panel.querySelector('#ta-gps').addEventListener('click',function(){
 var status=panel.querySelector('#ta-geo-status');
 if(!navigator.geolocation){status.textContent='瀏覽器不支援網站定位。仍可用Google地圖查路線。';return}
 status.textContent='正在向瀏覽器請求定位權限…';
 navigator.geolocation.getCurrentPosition(function(p){
  position={latitude:p.coords.latitude,longitude:p.coords.longitude};
  origin.value='gps';status.textContent='定位成功。位置只保留在目前開啟的頁面，導航時會交給Google地圖。';
  refresh();
 },function(err){
  status.textContent='無法取得定位（'+(err.code===1?'未授權':err.code===2?'暫時無法定位':'逾時')+'）。可選擇「目前位置」交由Google地圖判斷。';
  origin.value='current';refresh();
 },{enableHighAccuracy:true,timeout:10000,maximumAge:30000});
});
var jump=document.createElement('button');
jump.type='button';jump.className='traffic-jump';jump.textContent='交通助手↗';
jump.addEventListener('click',function(){panel.scrollIntoView({behavior:'smooth',block:'start'})});
var controls=document.querySelector('.controls');if(controls)controls.appendChild(jump);
var label=document.querySelector('#daylabel');
if(label){new MutationObserver(function(){syncDay(false)}).observe(label,{childList:true,characterData:true,subtree:true})}
var stopList=document.querySelector('#stops');
if(stopList){new MutationObserver(function(){enhanceCards()}).observe(stopList,{childList:true,subtree:true})}
syncDay(true);enhanceCards();
})();
