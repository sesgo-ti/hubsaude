/* ── animated connected-nodes network (interoperability motif) ── */
(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce) return;
  var c=document.getElementById('net'),x=c.getContext('2d'),W,H,nodes=[],DPR=Math.min(devicePixelRatio||1,2);
  function size(){W=c.width=innerWidth*DPR;H=c.height=innerHeight*DPR;c.style.width=innerWidth+'px';c.style.height=innerHeight+'px';}
  function init(){
    size();var n=Math.min(56,Math.floor(innerWidth/26));nodes=[];
    for(var i=0;i<n;i++)nodes.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.25*DPR,vy:(Math.random()-.5)*.25*DPR,r:(Math.random()*1.6+.8)*DPR});
  }
  function frame(){
    x.clearRect(0,0,W,H);
    for(var i=0;i<nodes.length;i++){var a=nodes[i];a.x+=a.vx;a.y+=a.vy;
      if(a.x<0||a.x>W)a.vx*=-1;if(a.y<0||a.y>H)a.vy*=-1;
      for(var j=i+1;j<nodes.length;j++){var b=nodes[j],dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy),max=140*DPR;
        if(d<max){x.strokeStyle='rgba(16,185,129,'+(0.18*(1-d/max))+')';x.lineWidth=DPR*.6;
          x.beginPath();x.moveTo(a.x,a.y);x.lineTo(b.x,b.y);x.stroke();}}
      x.fillStyle='rgba(5,150,105,.45)';x.beginPath();x.arc(a.x,a.y,a.r,0,6.283);x.fill();
    }
    requestAnimationFrame(frame);
  }
  addEventListener('resize',init);init();frame();
})();
