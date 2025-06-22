const map = L.map('map').setView([36.2048,138.2529],5);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:'©OpenStreetMap contributors'
}).addTo(map);

const waveCanvas = document.getElementById('wave-canvas');
const ctx = waveCanvas.getContext('2d');
let cw, ch;
function resizeCanvas(){
  cw=waveCanvas.width=window.innerWidth;
  ch=waveCanvas.height=window.innerHeight;
}
window.addEventListener('resize',resizeCanvas);
resizeCanvas();

let quakeData = null;
let originTime = null;
let userPos = null;
let originMarker = null;
let userMarker = null;

function getDistance(lat1, lon1, lat2, lon2){
  const R=6371;
  const dLat=(lat2-lat1)*Math.PI/180;
  const dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  const c=2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  return R * c;
}

function animate(){
  requestAnimationFrame(animate);
  ctx.clearRect(0,0,cw,ch);
  if(!quakeData || !originTime) return;

  const elapsed=(Date.now() - originTime)/1000;
  const pR=elapsed*6*1000;
  const sR=elapsed*3.5*1000;

  const orig = map.latLngToContainerPoint([quakeData.lat, quakeData.lon]);
  ctx.beginPath();
  ctx.strokeStyle='rgba(0,0,255,0.5)';
  ctx.lineWidth=2;
  ctx.arc(orig.x, orig.y, pR*map.getZoom()/50000, 0,2*Math.PI);
  ctx.stroke();

  ctx.beginPath();
  ctx.strokeStyle='rgba(255,0,0,0.4)';
  ctx.lineWidth=2;
  ctx.arc(orig.x, orig.y, sR*map.getZoom()/50000, 0,2*Math.PI);
  ctx.stroke();
}
animate();

function updateUserPosition(){
  if(!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(pos=>{
    userPos = {lat:pos.coords.latitude, lon:pos.coords.longitude};
    if(userMarker) map.removeLayer(userMarker);
    userMarker = L.marker([userPos.lat, userPos.lon]).addTo(map)
      .bindPopup('あなたの位置').openPopup();
    checkShindo();
  });
}
updateUserPosition();

function checkShindo(){
  if(!quakeData || !userPos) return;
  const D = getDistance(quakeData.lat, quakeData.lon, userPos.lon, userPos.lat);
  const I = Math.max(0, Math.floor(quakeData.mag*2 - Math.log10(D)*1.5));
  document.getElementById('quake-info').innerHTML += `<p>あなたの推定震度: <strong>${I}</strong></p>`;
}

async function fetchEEW(){
  try {
    const res = await fetch('https://api.open-eew.com/latest');
    if(!res.ok) throw '';
    const d = await res.json();
    quakeData = {
      lat: d.origin.latitude,
      lon: d.origin.longitude,
      mag: d.origin.magnitude
    };
    originTime = new Date(d.origin.time).getTime();
    if(originMarker) map.removeLayer(originMarker);
    originMarker = L.marker([quakeData.lat, quakeData.lon]).addTo(map)
      .bindPopup(`震源 M${quakeData.mag}`).openPopup();
    document.getElementById('quake-info').innerHTML = `
      <p>発生時刻: ${new Date(originTime).toLocaleString()}</p>
      <p>震源地: ${d.origin.area.name}</p>
      <p>マグニチュード: ${quakeData.mag}</p>
    `;
    checkShindo();
  } catch(e){
    console.warn('取得エラー', e);
  }
}

setInterval(fetchEEW, 5000);
fetchEEW();
map.on('move', () => {}); // 再描画対応
