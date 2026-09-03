import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  getDatabase, ref, onValue, set
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";
import {
  getMessaging, getToken, onMessage
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging.js";

/*
  STEP 1:
  Replace the values below with the Firebase Web App config
  from Firebase Console -> Project settings -> Your apps.

  STEP 2:
  Replace VAPID_KEY with the Web Push certificate key generated
  in Firebase Console -> Project settings -> Cloud Messaging.
*/

const firebaseConfig = {
  apiKey: "PASTE_THE_API_KEY_FROM_FIREBASE",
  authDomain: "esp32-radar-4ad7b.firebaseapp.com",
  databaseURL: "https://esp32-radar-4ad7b-default-rtdb.firebaseio.com",
  projectId: "esp32-radar-4ad7b",
  storageBucket: "esp32-radar-4ad7b.firebasestorage.app",
  messagingSenderId: "972770459215",
  appId: "1:972770459215:web:871bec075652d49464743a"
};

const VAPID_KEY = "PASTE_PUBLIC_VAPID_KEY";

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
await signInAnonymously(auth);

const db = getDatabase(app);

const connection = document.getElementById("connection");
const objStatus = document.getElementById("objStatus");
const angleLabel = document.getElementById("angleLabel");
const distLabel = document.getElementById("distLabel");

let lastAngle = 0;
let lastDistance = -1;
let lastObject = false;

const canvas = document.getElementById("radar");
const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;
const cx = W / 2, cy = H - 20;
const radius = Math.min(W / 2 - 20, H - 40);
const maxRange = 200;
let sweepTrail = [];
let detections = [];

function polar(angleDeg, r) {
  const rad = angleDeg * Math.PI / 180;
  return {x: cx - Math.cos(rad) * r, y: cy - Math.sin(rad) * r};
}

function drawGrid() {
  ctx.strokeStyle = "rgba(57,255,106,.35)";
  ctx.lineWidth = 1;
  ctx.font = "10px monospace";
  ctx.fillStyle = "rgba(57,255,106,.6)";

  for (let i=1;i<=5;i++) {
    const r = radius*i/5;
    ctx.beginPath();
    ctx.arc(cx,cy,r,Math.PI,2*Math.PI);
    ctx.stroke();
    ctx.fillText(Math.round(maxRange*i/5)+"cm",cx+r-14,cy-4);
  }

  for(let a=0;a<=180;a+=30){
    const p=polar(a,radius);
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(p.x,p.y);ctx.stroke();
  }
  ctx.beginPath();ctx.moveTo(cx-radius,cy);ctx.lineTo(cx+radius,cy);ctx.stroke();
}

function drawDetections(){
  const now=Date.now();
  detections=detections.filter(d=>now-d.t<4000);
  ctx.fillStyle="rgba(255,45,45,.55)";
  detections.forEach(d=>{
    const r=Math.min(radius,(d.distCm/maxRange)*radius);
    const a1=d.angle-2,a2=d.angle+2;
    ctx.beginPath();ctx.moveTo(cx,cy);
    const p1=polar(a1,r);ctx.lineTo(p1.x,p1.y);
    ctx.arc(cx,cy,r,Math.PI-a1*Math.PI/180,Math.PI-a2*Math.PI/180,true);
    ctx.lineTo(cx,cy);ctx.closePath();ctx.fill();
  });
}

function drawTrail(){
  const now=Date.now();
  sweepTrail=sweepTrail.filter(s=>now-s.t<900);
  sweepTrail.forEach(s=>{
    const alpha=1-(now-s.t)/900;
    const p=polar(s.angle,radius);
    ctx.strokeStyle=`rgba(57,255,106,${alpha.toFixed(2)})`;
    ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(p.x,p.y);ctx.stroke();
  });
}

function draw(){
  ctx.clearRect(0,0,W,H);
  drawGrid(); drawDetections(); drawTrail();
  requestAnimationFrame(draw);
}
draw();

function updateInfo(){
  angleLabel.textContent=`Angle: ${lastAngle}°`;
  distLabel.textContent=`Distance: ${lastDistance>0?lastDistance+" cm":"--"}`;
  objStatus.textContent=lastObject?"Object: In Range":"Object: Out of Range";
  objStatus.classList.toggle("inrange",lastObject);
}

function sendCommand(command){
  return set(ref(db,"radar/command"),{
    ...command,
    sentAt:Date.now()
  });
}

onValue(ref(db,"radar/latest"), snap=>{
  const d=snap.val();
  if(!d){connection.textContent="CLOUD: ONLINE / WAITING";return;}
  connection.textContent="CLOUD: ONLINE";
  lastAngle=Number(d.angle||0);
  lastDistance=Number(d.distance||-1);
  lastObject=Boolean(d.object);
  sweepTrail.push({angle:lastAngle,t:Date.now()});
  if(lastObject && lastDistance>0){
    detections.push({angle:lastAngle,distCm:lastDistance,t:Date.now()});
  }
  updateInfo();
},()=>{
  connection.textContent="CLOUD: ERROR";
});

document.getElementById("btnAuto").onclick=()=>{
  sendCommand({cmd:"auto"});
  btnAuto.classList.add("active");
  btnCustom.classList.remove("active");
};

document.getElementById("btnCustom").onclick=()=>{
  sendCommand({cmd:"custom"});
  btnCustom.classList.add("active");
  btnAuto.classList.remove("active");
};

document.getElementById("btnBuzz").onclick=()=>sendCommand({cmd:"buzz"});

const btnAuto=document.getElementById("btnAuto");
const btnCustom=document.getElementById("btnCustom");

document.getElementById("btnRange").onclick=()=>{
  document.getElementById("rangePanel").classList.toggle("hidden");
};
document.getElementById("rangeSlider").oninput=e=>{
  const value=Number(e.target.value);
  document.getElementById("rangeValue").textContent=value;
  sendCommand({cmd:"threshold",threshold:value});
};

document.getElementById("angleSlider").oninput=e=>{
  const value=Number(e.target.value);
  document.getElementById("angleValue").textContent=value;
  sendCommand({cmd:"angle",angle:value});
};

document.getElementById("btnCustom").addEventListener("click",()=>{
  document.getElementById("customPanel").classList.remove("hidden");
});
document.getElementById("btnAuto").addEventListener("click",()=>{
  document.getElementById("customPanel").classList.add("hidden");
});

async function enableNotifications(){
  const status=document.getElementById("notificationStatus");
  try{
    if(!("Notification" in window)){
      status.textContent="This browser does not support notifications.";
      return;
    }
    const permission=await Notification.requestPermission();
    if(permission!=="granted"){
      status.textContent="Notification permission was not granted.";
      return;
    }

    const messaging=getMessaging(app);
    const token=await getToken(messaging,{vapidKey:VAPID_KEY});
    if(!token){
      status.textContent="Could not create notification token.";
      return;
    }

    await set(ref(db,"notificationTokens/"+encodeURIComponent(token)),{
      token,createdAt:Date.now()
    });
    status.textContent="Notifications enabled.";
  }catch(err){
    console.error(err);
    status.textContent="Notification setup failed. Check Firebase settings.";
  }
}

document.getElementById("enableNotifications").onclick=enableNotifications;

try{
  const messaging=getMessaging(app);
  onMessage(messaging,payload=>{
    const title=payload.notification?.title || "ESP32 Radar";
    const body=payload.notification?.body || "Object detected.";
    if(Notification.permission==="granted") new Notification(title,{body});
  });
}catch(e){
  console.warn("Messaging is not ready yet.",e);
}
