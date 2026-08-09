var Qr=Object.defineProperty;var tl=(s,t,e)=>t in s?Qr(s,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):s[t]=e;var C=(s,t,e)=>tl(s,typeof t!="symbol"?t+"":t,e);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))n(i);new MutationObserver(i=>{for(const o of i)if(o.type==="childList")for(const a of o.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function e(i){const o={};return i.integrity&&(o.integrity=i.integrity),i.referrerPolicy&&(o.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?o.credentials="include":i.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function n(i){if(i.ep)return;i.ep=!0;const o=e(i);fetch(i.href,o)}})();/*!
 * @kurkle/color v0.3.4
 * https://github.com/kurkle/color#readme
 * (c) 2024 Jukka Kurkela
 * Released under the MIT License
 */function As(s){return s+.5|0}const ue=(s,t,e)=>Math.max(Math.min(s,e),t);function as(s){return ue(As(s*2.55),0,255)}function be(s){return ue(As(s*255),0,255)}function ee(s){return ue(As(s/2.55)/100,0,1)}function Do(s){return ue(As(s*100),0,100)}const $t={0:0,1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,A:10,B:11,C:12,D:13,E:14,F:15,a:10,b:11,c:12,d:13,e:14,f:15},zn=[..."0123456789ABCDEF"],el=s=>zn[s&15],sl=s=>zn[(s&240)>>4]+zn[s&15],Ts=s=>(s&240)>>4===(s&15),nl=s=>Ts(s.r)&&Ts(s.g)&&Ts(s.b)&&Ts(s.a);function il(s){var t=s.length,e;return s[0]==="#"&&(t===4||t===5?e={r:255&$t[s[1]]*17,g:255&$t[s[2]]*17,b:255&$t[s[3]]*17,a:t===5?$t[s[4]]*17:255}:(t===7||t===9)&&(e={r:$t[s[1]]<<4|$t[s[2]],g:$t[s[3]]<<4|$t[s[4]],b:$t[s[5]]<<4|$t[s[6]],a:t===9?$t[s[7]]<<4|$t[s[8]]:255})),e}const ol=(s,t)=>s<255?t(s):"";function al(s){var t=nl(s)?el:sl;return s?"#"+t(s.r)+t(s.g)+t(s.b)+ol(s.a,t):void 0}const rl=/^(hsla?|hwb|hsv)\(\s*([-+.e\d]+)(?:deg)?[\s,]+([-+.e\d]+)%[\s,]+([-+.e\d]+)%(?:[\s,]+([-+.e\d]+)(%)?)?\s*\)$/;function Za(s,t,e){const n=t*Math.min(e,1-e),i=(o,a=(o+s/30)%12)=>e-n*Math.max(Math.min(a-3,9-a,1),-1);return[i(0),i(8),i(4)]}function ll(s,t,e){const n=(i,o=(i+s/60)%6)=>e-e*t*Math.max(Math.min(o,4-o,1),0);return[n(5),n(3),n(1)]}function cl(s,t,e){const n=Za(s,1,.5);let i;for(t+e>1&&(i=1/(t+e),t*=i,e*=i),i=0;i<3;i++)n[i]*=1-t-e,n[i]+=t;return n}function dl(s,t,e,n,i){return s===i?(t-e)/n+(t<e?6:0):t===i?(e-s)/n+2:(s-t)/n+4}function ai(s){const e=s.r/255,n=s.g/255,i=s.b/255,o=Math.max(e,n,i),a=Math.min(e,n,i),r=(o+a)/2;let l,c,d;return o!==a&&(d=o-a,c=r>.5?d/(2-o-a):d/(o+a),l=dl(e,n,i,d,o),l=l*60+.5),[l|0,c||0,r]}function ri(s,t,e,n){return(Array.isArray(t)?s(t[0],t[1],t[2]):s(t,e,n)).map(be)}function li(s,t,e){return ri(Za,s,t,e)}function hl(s,t,e){return ri(cl,s,t,e)}function ul(s,t,e){return ri(ll,s,t,e)}function Qa(s){return(s%360+360)%360}function fl(s){const t=rl.exec(s);let e=255,n;if(!t)return;t[5]!==n&&(e=t[6]?as(+t[5]):be(+t[5]));const i=Qa(+t[2]),o=+t[3]/100,a=+t[4]/100;return t[1]==="hwb"?n=hl(i,o,a):t[1]==="hsv"?n=ul(i,o,a):n=li(i,o,a),{r:n[0],g:n[1],b:n[2],a:e}}function pl(s,t){var e=ai(s);e[0]=Qa(e[0]+t),e=li(e),s.r=e[0],s.g=e[1],s.b=e[2]}function gl(s){if(!s)return;const t=ai(s),e=t[0],n=Do(t[1]),i=Do(t[2]);return s.a<255?`hsla(${e}, ${n}%, ${i}%, ${ee(s.a)})`:`hsl(${e}, ${n}%, ${i}%)`}const To={x:"dark",Z:"light",Y:"re",X:"blu",W:"gr",V:"medium",U:"slate",A:"ee",T:"ol",S:"or",B:"ra",C:"lateg",D:"ights",R:"in",Q:"turquois",E:"hi",P:"ro",O:"al",N:"le",M:"de",L:"yello",F:"en",K:"ch",G:"arks",H:"ea",I:"ightg",J:"wh"},Lo={OiceXe:"f0f8ff",antiquewEte:"faebd7",aqua:"ffff",aquamarRe:"7fffd4",azuY:"f0ffff",beige:"f5f5dc",bisque:"ffe4c4",black:"0",blanKedOmond:"ffebcd",Xe:"ff",XeviTet:"8a2be2",bPwn:"a52a2a",burlywood:"deb887",caMtXe:"5f9ea0",KartYuse:"7fff00",KocTate:"d2691e",cSO:"ff7f50",cSnflowerXe:"6495ed",cSnsilk:"fff8dc",crimson:"dc143c",cyan:"ffff",xXe:"8b",xcyan:"8b8b",xgTMnPd:"b8860b",xWay:"a9a9a9",xgYF:"6400",xgYy:"a9a9a9",xkhaki:"bdb76b",xmagFta:"8b008b",xTivegYF:"556b2f",xSange:"ff8c00",xScEd:"9932cc",xYd:"8b0000",xsOmon:"e9967a",xsHgYF:"8fbc8f",xUXe:"483d8b",xUWay:"2f4f4f",xUgYy:"2f4f4f",xQe:"ced1",xviTet:"9400d3",dAppRk:"ff1493",dApskyXe:"bfff",dimWay:"696969",dimgYy:"696969",dodgerXe:"1e90ff",fiYbrick:"b22222",flSOwEte:"fffaf0",foYstWAn:"228b22",fuKsia:"ff00ff",gaRsbSo:"dcdcdc",ghostwEte:"f8f8ff",gTd:"ffd700",gTMnPd:"daa520",Way:"808080",gYF:"8000",gYFLw:"adff2f",gYy:"808080",honeyMw:"f0fff0",hotpRk:"ff69b4",RdianYd:"cd5c5c",Rdigo:"4b0082",ivSy:"fffff0",khaki:"f0e68c",lavFMr:"e6e6fa",lavFMrXsh:"fff0f5",lawngYF:"7cfc00",NmoncEffon:"fffacd",ZXe:"add8e6",ZcSO:"f08080",Zcyan:"e0ffff",ZgTMnPdLw:"fafad2",ZWay:"d3d3d3",ZgYF:"90ee90",ZgYy:"d3d3d3",ZpRk:"ffb6c1",ZsOmon:"ffa07a",ZsHgYF:"20b2aa",ZskyXe:"87cefa",ZUWay:"778899",ZUgYy:"778899",ZstAlXe:"b0c4de",ZLw:"ffffe0",lime:"ff00",limegYF:"32cd32",lRF:"faf0e6",magFta:"ff00ff",maPon:"800000",VaquamarRe:"66cdaa",VXe:"cd",VScEd:"ba55d3",VpurpN:"9370db",VsHgYF:"3cb371",VUXe:"7b68ee",VsprRggYF:"fa9a",VQe:"48d1cc",VviTetYd:"c71585",midnightXe:"191970",mRtcYam:"f5fffa",mistyPse:"ffe4e1",moccasR:"ffe4b5",navajowEte:"ffdead",navy:"80",Tdlace:"fdf5e6",Tive:"808000",TivedBb:"6b8e23",Sange:"ffa500",SangeYd:"ff4500",ScEd:"da70d6",pOegTMnPd:"eee8aa",pOegYF:"98fb98",pOeQe:"afeeee",pOeviTetYd:"db7093",papayawEp:"ffefd5",pHKpuff:"ffdab9",peru:"cd853f",pRk:"ffc0cb",plum:"dda0dd",powMrXe:"b0e0e6",purpN:"800080",YbeccapurpN:"663399",Yd:"ff0000",Psybrown:"bc8f8f",PyOXe:"4169e1",saddNbPwn:"8b4513",sOmon:"fa8072",sandybPwn:"f4a460",sHgYF:"2e8b57",sHshell:"fff5ee",siFna:"a0522d",silver:"c0c0c0",skyXe:"87ceeb",UXe:"6a5acd",UWay:"708090",UgYy:"708090",snow:"fffafa",sprRggYF:"ff7f",stAlXe:"4682b4",tan:"d2b48c",teO:"8080",tEstN:"d8bfd8",tomato:"ff6347",Qe:"40e0d0",viTet:"ee82ee",JHt:"f5deb3",wEte:"ffffff",wEtesmoke:"f5f5f5",Lw:"ffff00",LwgYF:"9acd32"};function ml(){const s={},t=Object.keys(Lo),e=Object.keys(To);let n,i,o,a,r;for(n=0;n<t.length;n++){for(a=r=t[n],i=0;i<e.length;i++)o=e[i],r=r.replace(o,To[o]);o=parseInt(Lo[a],16),s[r]=[o>>16&255,o>>8&255,o&255]}return s}let Ls;function bl(s){Ls||(Ls=ml(),Ls.transparent=[0,0,0,0]);const t=Ls[s.toLowerCase()];return t&&{r:t[0],g:t[1],b:t[2],a:t.length===4?t[3]:255}}const xl=/^rgba?\(\s*([-+.\d]+)(%)?[\s,]+([-+.e\d]+)(%)?[\s,]+([-+.e\d]+)(%)?(?:[\s,/]+([-+.e\d]+)(%)?)?\s*\)$/;function yl(s){const t=xl.exec(s);let e=255,n,i,o;if(t){if(t[7]!==n){const a=+t[7];e=t[8]?as(a):ue(a*255,0,255)}return n=+t[1],i=+t[3],o=+t[5],n=255&(t[2]?as(n):ue(n,0,255)),i=255&(t[4]?as(i):ue(i,0,255)),o=255&(t[6]?as(o):ue(o,0,255)),{r:n,g:i,b:o,a:e}}}function vl(s){return s&&(s.a<255?`rgba(${s.r}, ${s.g}, ${s.b}, ${ee(s.a)})`:`rgb(${s.r}, ${s.g}, ${s.b})`)}const _n=s=>s<=.0031308?s*12.92:Math.pow(s,1/2.4)*1.055-.055,Ne=s=>s<=.04045?s/12.92:Math.pow((s+.055)/1.055,2.4);function _l(s,t,e){const n=Ne(ee(s.r)),i=Ne(ee(s.g)),o=Ne(ee(s.b));return{r:be(_n(n+e*(Ne(ee(t.r))-n))),g:be(_n(i+e*(Ne(ee(t.g))-i))),b:be(_n(o+e*(Ne(ee(t.b))-o))),a:s.a+e*(t.a-s.a)}}function Is(s,t,e){if(s){let n=ai(s);n[t]=Math.max(0,Math.min(n[t]+n[t]*e,t===0?360:1)),n=li(n),s.r=n[0],s.g=n[1],s.b=n[2]}}function tr(s,t){return s&&Object.assign(t||{},s)}function Io(s){var t={r:0,g:0,b:0,a:255};return Array.isArray(s)?s.length>=3&&(t={r:s[0],g:s[1],b:s[2],a:255},s.length>3&&(t.a=be(s[3]))):(t=tr(s,{r:0,g:0,b:0,a:1}),t.a=be(t.a)),t}function wl(s){return s.charAt(0)==="r"?yl(s):fl(s)}class vs{constructor(t){if(t instanceof vs)return t;const e=typeof t;let n;e==="object"?n=Io(t):e==="string"&&(n=il(t)||bl(t)||wl(t)),this._rgb=n,this._valid=!!n}get valid(){return this._valid}get rgb(){var t=tr(this._rgb);return t&&(t.a=ee(t.a)),t}set rgb(t){this._rgb=Io(t)}rgbString(){return this._valid?vl(this._rgb):void 0}hexString(){return this._valid?al(this._rgb):void 0}hslString(){return this._valid?gl(this._rgb):void 0}mix(t,e){if(t){const n=this.rgb,i=t.rgb;let o;const a=e===o?.5:e,r=2*a-1,l=n.a-i.a,c=((r*l===-1?r:(r+l)/(1+r*l))+1)/2;o=1-c,n.r=255&c*n.r+o*i.r+.5,n.g=255&c*n.g+o*i.g+.5,n.b=255&c*n.b+o*i.b+.5,n.a=a*n.a+(1-a)*i.a,this.rgb=n}return this}interpolate(t,e){return t&&(this._rgb=_l(this._rgb,t._rgb,e)),this}clone(){return new vs(this.rgb)}alpha(t){return this._rgb.a=be(t),this}clearer(t){const e=this._rgb;return e.a*=1-t,this}greyscale(){const t=this._rgb,e=As(t.r*.3+t.g*.59+t.b*.11);return t.r=t.g=t.b=e,this}opaquer(t){const e=this._rgb;return e.a*=1+t,this}negate(){const t=this._rgb;return t.r=255-t.r,t.g=255-t.g,t.b=255-t.b,this}lighten(t){return Is(this._rgb,2,t),this}darken(t){return Is(this._rgb,2,-t),this}saturate(t){return Is(this._rgb,1,t),this}desaturate(t){return Is(this._rgb,1,-t),this}rotate(t){return pl(this._rgb,t),this}}/*!
 * Chart.js v4.5.1
 * https://www.chartjs.org
 * (c) 2025 Chart.js Contributors
 * Released under the MIT License
 */function Jt(){}const kl=(()=>{let s=0;return()=>s++})();function j(s){return s==null}function Q(s){if(Array.isArray&&Array.isArray(s))return!0;const t=Object.prototype.toString.call(s);return t.slice(0,7)==="[object"&&t.slice(-6)==="Array]"}function N(s){return s!==null&&Object.prototype.toString.call(s)==="[object Object]"}function st(s){return(typeof s=="number"||s instanceof Number)&&isFinite(+s)}function It(s,t){return st(s)?s:t}function B(s,t){return typeof s>"u"?t:s}const Ml=(s,t)=>typeof s=="string"&&s.endsWith("%")?parseFloat(s)/100:+s/t,er=(s,t)=>typeof s=="string"&&s.endsWith("%")?parseFloat(s)/100*t:+s;function G(s,t,e){if(s&&typeof s.call=="function")return s.apply(e,t)}function U(s,t,e,n){let i,o,a;if(Q(s))for(o=s.length,i=0;i<o;i++)t.call(e,s[i],i);else if(N(s))for(a=Object.keys(s),o=a.length,i=0;i<o;i++)t.call(e,s[a[i]],a[i])}function nn(s,t){let e,n,i,o;if(!s||!t||s.length!==t.length)return!1;for(e=0,n=s.length;e<n;++e)if(i=s[e],o=t[e],i.datasetIndex!==o.datasetIndex||i.index!==o.index)return!1;return!0}function on(s){if(Q(s))return s.map(on);if(N(s)){const t=Object.create(null),e=Object.keys(s),n=e.length;let i=0;for(;i<n;++i)t[e[i]]=on(s[e[i]]);return t}return s}function sr(s){return["__proto__","prototype","constructor"].indexOf(s)===-1}function Sl(s,t,e,n){if(!sr(s))return;const i=t[s],o=e[s];N(i)&&N(o)?_s(i,o,n):t[s]=on(o)}function _s(s,t,e){const n=Q(t)?t:[t],i=n.length;if(!N(s))return s;e=e||{};const o=e.merger||Sl;let a;for(let r=0;r<i;++r){if(a=n[r],!N(a))continue;const l=Object.keys(a);for(let c=0,d=l.length;c<d;++c)o(l[c],s,a,e)}return s}function ps(s,t){return _s(s,t,{merger:Cl})}function Cl(s,t,e){if(!sr(s))return;const n=t[s],i=e[s];N(n)&&N(i)?ps(n,i):Object.prototype.hasOwnProperty.call(t,s)||(t[s]=on(i))}const $o={"":s=>s,x:s=>s.x,y:s=>s.y};function El(s){const t=s.split("."),e=[];let n="";for(const i of t)n+=i,n.endsWith("\\")?n=n.slice(0,-1)+".":(e.push(n),n="");return e}function Al(s){const t=El(s);return e=>{for(const n of t){if(n==="")break;e=e&&e[n]}return e}}function xe(s,t){return($o[t]||($o[t]=Al(t)))(s)}function ci(s){return s.charAt(0).toUpperCase()+s.slice(1)}const ws=s=>typeof s<"u",ye=s=>typeof s=="function",Oo=(s,t)=>{if(s.size!==t.size)return!1;for(const e of s)if(!t.has(e))return!1;return!0};function Pl(s){return s.type==="mouseup"||s.type==="click"||s.type==="contextmenu"}const V=Math.PI,K=2*V,Dl=K+V,an=Number.POSITIVE_INFINITY,Tl=V/180,rt=V/2,Ce=V/4,Bo=V*2/3,fe=Math.log10,qt=Math.sign;function gs(s,t,e){return Math.abs(s-t)<e}function Ro(s){const t=Math.round(s);s=gs(s,t,s/1e3)?t:s;const e=Math.pow(10,Math.floor(fe(s))),n=s/e;return(n<=1?1:n<=2?2:n<=5?5:10)*e}function Ll(s){const t=[],e=Math.sqrt(s);let n;for(n=1;n<e;n++)s%n===0&&(t.push(n),t.push(s/n));return e===(e|0)&&t.push(e),t.sort((i,o)=>i-o).pop(),t}function Il(s){return typeof s=="symbol"||typeof s=="object"&&s!==null&&!(Symbol.toPrimitive in s||"toString"in s||"valueOf"in s)}function Ke(s){return!Il(s)&&!isNaN(parseFloat(s))&&isFinite(s)}function $l(s,t){const e=Math.round(s);return e-t<=s&&e+t>=s}function nr(s,t,e){let n,i,o;for(n=0,i=s.length;n<i;n++)o=s[n][e],isNaN(o)||(t.min=Math.min(t.min,o),t.max=Math.max(t.max,o))}function zt(s){return s*(V/180)}function di(s){return s*(180/V)}function Fo(s){if(!st(s))return;let t=1,e=0;for(;Math.round(s*t)/t!==s;)t*=10,e++;return e}function ir(s,t){const e=t.x-s.x,n=t.y-s.y,i=Math.sqrt(e*e+n*n);let o=Math.atan2(n,e);return o<-.5*V&&(o+=K),{angle:o,distance:i}}function jn(s,t){return Math.sqrt(Math.pow(t.x-s.x,2)+Math.pow(t.y-s.y,2))}function Ol(s,t){return(s-t+Dl)%K-V}function _t(s){return(s%K+K)%K}function ks(s,t,e,n){const i=_t(s),o=_t(t),a=_t(e),r=_t(o-i),l=_t(a-i),c=_t(i-o),d=_t(i-a);return i===o||i===a||n&&o===a||r>l&&c<d}function mt(s,t,e){return Math.max(t,Math.min(e,s))}function Bl(s){return mt(s,-32768,32767)}function se(s,t,e,n=1e-6){return s>=Math.min(t,e)-n&&s<=Math.max(t,e)+n}function hi(s,t,e){e=e||(a=>s[a]<t);let n=s.length-1,i=0,o;for(;n-i>1;)o=i+n>>1,e(o)?i=o:n=o;return{lo:i,hi:n}}const ne=(s,t,e,n)=>hi(s,e,n?i=>{const o=s[i][t];return o<e||o===e&&s[i+1][t]===e}:i=>s[i][t]<e),Rl=(s,t,e)=>hi(s,e,n=>s[n][t]>=e);function Fl(s,t,e){let n=0,i=s.length;for(;n<i&&s[n]<t;)n++;for(;i>n&&s[i-1]>e;)i--;return n>0||i<s.length?s.slice(n,i):s}const or=["push","pop","shift","splice","unshift"];function zl(s,t){if(s._chartjs){s._chartjs.listeners.push(t);return}Object.defineProperty(s,"_chartjs",{configurable:!0,enumerable:!1,value:{listeners:[t]}}),or.forEach(e=>{const n="_onData"+ci(e),i=s[e];Object.defineProperty(s,e,{configurable:!0,enumerable:!1,value(...o){const a=i.apply(this,o);return s._chartjs.listeners.forEach(r=>{typeof r[n]=="function"&&r[n](...o)}),a}})})}function zo(s,t){const e=s._chartjs;if(!e)return;const n=e.listeners,i=n.indexOf(t);i!==-1&&n.splice(i,1),!(n.length>0)&&(or.forEach(o=>{delete s[o]}),delete s._chartjs)}function ar(s){const t=new Set(s);return t.size===s.length?s:Array.from(t)}const rr=(function(){return typeof window>"u"?function(s){return s()}:window.requestAnimationFrame})();function lr(s,t){let e=[],n=!1;return function(...i){e=i,n||(n=!0,rr.call(window,()=>{n=!1,s.apply(t,e)}))}}function jl(s,t){let e;return function(...n){return t?(clearTimeout(e),e=setTimeout(s,t,n)):s.apply(this,n),t}}const ui=s=>s==="start"?"left":s==="end"?"right":"center",yt=(s,t,e)=>s==="start"?t:s==="end"?e:(t+e)/2,Nl=(s,t,e,n)=>s===(n?"left":"right")?e:s==="center"?(t+e)/2:t;function cr(s,t,e){const n=t.length;let i=0,o=n;if(s._sorted){const{iScale:a,vScale:r,_parsed:l}=s,c=s.dataset&&s.dataset.options?s.dataset.options.spanGaps:null,d=a.axis,{min:h,max:u,minDefined:f,maxDefined:p}=a.getUserBounds();if(f){if(i=Math.min(ne(l,d,h).lo,e?n:ne(t,d,a.getPixelForValue(h)).lo),c){const g=l.slice(0,i+1).reverse().findIndex(m=>!j(m[r.axis]));i-=Math.max(0,g)}i=mt(i,0,n-1)}if(p){let g=Math.max(ne(l,a.axis,u,!0).hi+1,e?0:ne(t,d,a.getPixelForValue(u),!0).hi+1);if(c){const m=l.slice(g-1).findIndex(b=>!j(b[r.axis]));g+=Math.max(0,m)}o=mt(g,i,n)-i}else o=n-i}return{start:i,count:o}}function dr(s){const{xScale:t,yScale:e,_scaleRanges:n}=s,i={xmin:t.min,xmax:t.max,ymin:e.min,ymax:e.max};if(!n)return s._scaleRanges=i,!0;const o=n.xmin!==t.min||n.xmax!==t.max||n.ymin!==e.min||n.ymax!==e.max;return Object.assign(n,i),o}const $s=s=>s===0||s===1,jo=(s,t,e)=>-(Math.pow(2,10*(s-=1))*Math.sin((s-t)*K/e)),No=(s,t,e)=>Math.pow(2,-10*s)*Math.sin((s-t)*K/e)+1,ms={linear:s=>s,easeInQuad:s=>s*s,easeOutQuad:s=>-s*(s-2),easeInOutQuad:s=>(s/=.5)<1?.5*s*s:-.5*(--s*(s-2)-1),easeInCubic:s=>s*s*s,easeOutCubic:s=>(s-=1)*s*s+1,easeInOutCubic:s=>(s/=.5)<1?.5*s*s*s:.5*((s-=2)*s*s+2),easeInQuart:s=>s*s*s*s,easeOutQuart:s=>-((s-=1)*s*s*s-1),easeInOutQuart:s=>(s/=.5)<1?.5*s*s*s*s:-.5*((s-=2)*s*s*s-2),easeInQuint:s=>s*s*s*s*s,easeOutQuint:s=>(s-=1)*s*s*s*s+1,easeInOutQuint:s=>(s/=.5)<1?.5*s*s*s*s*s:.5*((s-=2)*s*s*s*s+2),easeInSine:s=>-Math.cos(s*rt)+1,easeOutSine:s=>Math.sin(s*rt),easeInOutSine:s=>-.5*(Math.cos(V*s)-1),easeInExpo:s=>s===0?0:Math.pow(2,10*(s-1)),easeOutExpo:s=>s===1?1:-Math.pow(2,-10*s)+1,easeInOutExpo:s=>$s(s)?s:s<.5?.5*Math.pow(2,10*(s*2-1)):.5*(-Math.pow(2,-10*(s*2-1))+2),easeInCirc:s=>s>=1?s:-(Math.sqrt(1-s*s)-1),easeOutCirc:s=>Math.sqrt(1-(s-=1)*s),easeInOutCirc:s=>(s/=.5)<1?-.5*(Math.sqrt(1-s*s)-1):.5*(Math.sqrt(1-(s-=2)*s)+1),easeInElastic:s=>$s(s)?s:jo(s,.075,.3),easeOutElastic:s=>$s(s)?s:No(s,.075,.3),easeInOutElastic(s){return $s(s)?s:s<.5?.5*jo(s*2,.1125,.45):.5+.5*No(s*2-1,.1125,.45)},easeInBack(s){return s*s*((1.70158+1)*s-1.70158)},easeOutBack(s){return(s-=1)*s*((1.70158+1)*s+1.70158)+1},easeInOutBack(s){let t=1.70158;return(s/=.5)<1?.5*(s*s*(((t*=1.525)+1)*s-t)):.5*((s-=2)*s*(((t*=1.525)+1)*s+t)+2)},easeInBounce:s=>1-ms.easeOutBounce(1-s),easeOutBounce(s){return s<1/2.75?7.5625*s*s:s<2/2.75?7.5625*(s-=1.5/2.75)*s+.75:s<2.5/2.75?7.5625*(s-=2.25/2.75)*s+.9375:7.5625*(s-=2.625/2.75)*s+.984375},easeInOutBounce:s=>s<.5?ms.easeInBounce(s*2)*.5:ms.easeOutBounce(s*2-1)*.5+.5};function fi(s){if(s&&typeof s=="object"){const t=s.toString();return t==="[object CanvasPattern]"||t==="[object CanvasGradient]"}return!1}function Vo(s){return fi(s)?s:new vs(s)}function wn(s){return fi(s)?s:new vs(s).saturate(.5).darken(.1).hexString()}const Vl=["x","y","borderWidth","radius","tension"],Wl=["color","borderColor","backgroundColor"];function Hl(s){s.set("animation",{delay:void 0,duration:1e3,easing:"easeOutQuart",fn:void 0,from:void 0,loop:void 0,to:void 0,type:void 0}),s.describe("animation",{_fallback:!1,_indexable:!1,_scriptable:t=>t!=="onProgress"&&t!=="onComplete"&&t!=="fn"}),s.set("animations",{colors:{type:"color",properties:Wl},numbers:{type:"number",properties:Vl}}),s.describe("animations",{_fallback:"animation"}),s.set("transitions",{active:{animation:{duration:400}},resize:{animation:{duration:0}},show:{animations:{colors:{from:"transparent"},visible:{type:"boolean",duration:0}}},hide:{animations:{colors:{to:"transparent"},visible:{type:"boolean",easing:"linear",fn:t=>t|0}}}})}function Yl(s){s.set("layout",{autoPadding:!0,padding:{top:0,right:0,bottom:0,left:0}})}const Wo=new Map;function Ul(s,t){t=t||{};const e=s+JSON.stringify(t);let n=Wo.get(e);return n||(n=new Intl.NumberFormat(s,t),Wo.set(e,n)),n}function Ps(s,t,e){return Ul(t,e).format(s)}const hr={values(s){return Q(s)?s:""+s},numeric(s,t,e){if(s===0)return"0";const n=this.chart.options.locale;let i,o=s;if(e.length>1){const c=Math.max(Math.abs(e[0].value),Math.abs(e[e.length-1].value));(c<1e-4||c>1e15)&&(i="scientific"),o=Xl(s,e)}const a=fe(Math.abs(o)),r=isNaN(a)?1:Math.max(Math.min(-1*Math.floor(a),20),0),l={notation:i,minimumFractionDigits:r,maximumFractionDigits:r};return Object.assign(l,this.options.ticks.format),Ps(s,n,l)},logarithmic(s,t,e){if(s===0)return"0";const n=e[t].significand||s/Math.pow(10,Math.floor(fe(s)));return[1,2,3,5,10,15].includes(n)||t>.8*e.length?hr.numeric.call(this,s,t,e):""}};function Xl(s,t){let e=t.length>3?t[2].value-t[1].value:t[1].value-t[0].value;return Math.abs(e)>=1&&s!==Math.floor(s)&&(e=s-Math.floor(s)),e}var pn={formatters:hr};function ql(s){s.set("scale",{display:!0,offset:!1,reverse:!1,beginAtZero:!1,bounds:"ticks",clip:!0,grace:0,grid:{display:!0,lineWidth:1,drawOnChartArea:!0,drawTicks:!0,tickLength:8,tickWidth:(t,e)=>e.lineWidth,tickColor:(t,e)=>e.color,offset:!1},border:{display:!0,dash:[],dashOffset:0,width:1},title:{display:!1,text:"",padding:{top:4,bottom:4}},ticks:{minRotation:0,maxRotation:50,mirror:!1,textStrokeWidth:0,textStrokeColor:"",padding:3,display:!0,autoSkip:!0,autoSkipPadding:3,labelOffset:0,callback:pn.formatters.values,minor:{},major:{},align:"center",crossAlign:"near",showLabelBackdrop:!1,backdropColor:"rgba(255, 255, 255, 0.75)",backdropPadding:2}}),s.route("scale.ticks","color","","color"),s.route("scale.grid","color","","borderColor"),s.route("scale.border","color","","borderColor"),s.route("scale.title","color","","color"),s.describe("scale",{_fallback:!1,_scriptable:t=>!t.startsWith("before")&&!t.startsWith("after")&&t!=="callback"&&t!=="parser",_indexable:t=>t!=="borderDash"&&t!=="tickBorderDash"&&t!=="dash"}),s.describe("scales",{_fallback:"scale"}),s.describe("scale.ticks",{_scriptable:t=>t!=="backdropPadding"&&t!=="callback",_indexable:t=>t!=="backdropPadding"})}const Fe=Object.create(null),Nn=Object.create(null);function bs(s,t){if(!t)return s;const e=t.split(".");for(let n=0,i=e.length;n<i;++n){const o=e[n];s=s[o]||(s[o]=Object.create(null))}return s}function kn(s,t,e){return typeof t=="string"?_s(bs(s,t),e):_s(bs(s,""),t)}class Gl{constructor(t,e){this.animation=void 0,this.backgroundColor="rgba(0,0,0,0.1)",this.borderColor="rgba(0,0,0,0.1)",this.color="#666",this.datasets={},this.devicePixelRatio=n=>n.chart.platform.getDevicePixelRatio(),this.elements={},this.events=["mousemove","mouseout","click","touchstart","touchmove"],this.font={family:"'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",size:12,style:"normal",lineHeight:1.2,weight:null},this.hover={},this.hoverBackgroundColor=(n,i)=>wn(i.backgroundColor),this.hoverBorderColor=(n,i)=>wn(i.borderColor),this.hoverColor=(n,i)=>wn(i.color),this.indexAxis="x",this.interaction={mode:"nearest",intersect:!0,includeInvisible:!1},this.maintainAspectRatio=!0,this.onHover=null,this.onClick=null,this.parsing=!0,this.plugins={},this.responsive=!0,this.scale=void 0,this.scales={},this.showLine=!0,this.drawActiveElementsOnTop=!0,this.describe(t),this.apply(e)}set(t,e){return kn(this,t,e)}get(t){return bs(this,t)}describe(t,e){return kn(Nn,t,e)}override(t,e){return kn(Fe,t,e)}route(t,e,n,i){const o=bs(this,t),a=bs(this,n),r="_"+e;Object.defineProperties(o,{[r]:{value:o[e],writable:!0},[e]:{enumerable:!0,get(){const l=this[r],c=a[i];return N(l)?Object.assign({},c,l):B(l,c)},set(l){this[r]=l}}})}apply(t){t.forEach(e=>e(this))}}var tt=new Gl({_scriptable:s=>!s.startsWith("on"),_indexable:s=>s!=="events",hover:{_fallback:"interaction"},interaction:{_scriptable:!1,_indexable:!1}},[Hl,Yl,ql]);function Kl(s){return!s||j(s.size)||j(s.family)?null:(s.style?s.style+" ":"")+(s.weight?s.weight+" ":"")+s.size+"px "+s.family}function rn(s,t,e,n,i){let o=t[i];return o||(o=t[i]=s.measureText(i).width,e.push(i)),o>n&&(n=o),n}function Jl(s,t,e,n){n=n||{};let i=n.data=n.data||{},o=n.garbageCollect=n.garbageCollect||[];n.font!==t&&(i=n.data={},o=n.garbageCollect=[],n.font=t),s.save(),s.font=t;let a=0;const r=e.length;let l,c,d,h,u;for(l=0;l<r;l++)if(h=e[l],h!=null&&!Q(h))a=rn(s,i,o,a,h);else if(Q(h))for(c=0,d=h.length;c<d;c++)u=h[c],u!=null&&!Q(u)&&(a=rn(s,i,o,a,u));s.restore();const f=o.length/2;if(f>e.length){for(l=0;l<f;l++)delete i[o[l]];o.splice(0,f)}return a}function Ee(s,t,e){const n=s.currentDevicePixelRatio,i=e!==0?Math.max(e/2,.5):0;return Math.round((t-i)*n)/n+i}function Ho(s,t){!t&&!s||(t=t||s.getContext("2d"),t.save(),t.resetTransform(),t.clearRect(0,0,s.width,s.height),t.restore())}function Vn(s,t,e,n){ur(s,t,e,n,null)}function ur(s,t,e,n,i){let o,a,r,l,c,d,h,u;const f=t.pointStyle,p=t.rotation,g=t.radius;let m=(p||0)*Tl;if(f&&typeof f=="object"&&(o=f.toString(),o==="[object HTMLImageElement]"||o==="[object HTMLCanvasElement]")){s.save(),s.translate(e,n),s.rotate(m),s.drawImage(f,-f.width/2,-f.height/2,f.width,f.height),s.restore();return}if(!(isNaN(g)||g<=0)){switch(s.beginPath(),f){default:i?s.ellipse(e,n,i/2,g,0,0,K):s.arc(e,n,g,0,K),s.closePath();break;case"triangle":d=i?i/2:g,s.moveTo(e+Math.sin(m)*d,n-Math.cos(m)*g),m+=Bo,s.lineTo(e+Math.sin(m)*d,n-Math.cos(m)*g),m+=Bo,s.lineTo(e+Math.sin(m)*d,n-Math.cos(m)*g),s.closePath();break;case"rectRounded":c=g*.516,l=g-c,a=Math.cos(m+Ce)*l,h=Math.cos(m+Ce)*(i?i/2-c:l),r=Math.sin(m+Ce)*l,u=Math.sin(m+Ce)*(i?i/2-c:l),s.arc(e-h,n-r,c,m-V,m-rt),s.arc(e+u,n-a,c,m-rt,m),s.arc(e+h,n+r,c,m,m+rt),s.arc(e-u,n+a,c,m+rt,m+V),s.closePath();break;case"rect":if(!p){l=Math.SQRT1_2*g,d=i?i/2:l,s.rect(e-d,n-l,2*d,2*l);break}m+=Ce;case"rectRot":h=Math.cos(m)*(i?i/2:g),a=Math.cos(m)*g,r=Math.sin(m)*g,u=Math.sin(m)*(i?i/2:g),s.moveTo(e-h,n-r),s.lineTo(e+u,n-a),s.lineTo(e+h,n+r),s.lineTo(e-u,n+a),s.closePath();break;case"crossRot":m+=Ce;case"cross":h=Math.cos(m)*(i?i/2:g),a=Math.cos(m)*g,r=Math.sin(m)*g,u=Math.sin(m)*(i?i/2:g),s.moveTo(e-h,n-r),s.lineTo(e+h,n+r),s.moveTo(e+u,n-a),s.lineTo(e-u,n+a);break;case"star":h=Math.cos(m)*(i?i/2:g),a=Math.cos(m)*g,r=Math.sin(m)*g,u=Math.sin(m)*(i?i/2:g),s.moveTo(e-h,n-r),s.lineTo(e+h,n+r),s.moveTo(e+u,n-a),s.lineTo(e-u,n+a),m+=Ce,h=Math.cos(m)*(i?i/2:g),a=Math.cos(m)*g,r=Math.sin(m)*g,u=Math.sin(m)*(i?i/2:g),s.moveTo(e-h,n-r),s.lineTo(e+h,n+r),s.moveTo(e+u,n-a),s.lineTo(e-u,n+a);break;case"line":a=i?i/2:Math.cos(m)*g,r=Math.sin(m)*g,s.moveTo(e-a,n-r),s.lineTo(e+a,n+r);break;case"dash":s.moveTo(e,n),s.lineTo(e+Math.cos(m)*(i?i/2:g),n+Math.sin(m)*g);break;case!1:s.closePath();break}s.fill(),t.borderWidth>0&&s.stroke()}}function ie(s,t,e){return e=e||.5,!t||s&&s.x>t.left-e&&s.x<t.right+e&&s.y>t.top-e&&s.y<t.bottom+e}function gn(s,t){s.save(),s.beginPath(),s.rect(t.left,t.top,t.right-t.left,t.bottom-t.top),s.clip()}function mn(s){s.restore()}function Zl(s,t,e,n,i){if(!t)return s.lineTo(e.x,e.y);if(i==="middle"){const o=(t.x+e.x)/2;s.lineTo(o,t.y),s.lineTo(o,e.y)}else i==="after"!=!!n?s.lineTo(t.x,e.y):s.lineTo(e.x,t.y);s.lineTo(e.x,e.y)}function Ql(s,t,e,n){if(!t)return s.lineTo(e.x,e.y);s.bezierCurveTo(n?t.cp1x:t.cp2x,n?t.cp1y:t.cp2y,n?e.cp2x:e.cp1x,n?e.cp2y:e.cp1y,e.x,e.y)}function tc(s,t){t.translation&&s.translate(t.translation[0],t.translation[1]),j(t.rotation)||s.rotate(t.rotation),t.color&&(s.fillStyle=t.color),t.textAlign&&(s.textAlign=t.textAlign),t.textBaseline&&(s.textBaseline=t.textBaseline)}function ec(s,t,e,n,i){if(i.strikethrough||i.underline){const o=s.measureText(n),a=t-o.actualBoundingBoxLeft,r=t+o.actualBoundingBoxRight,l=e-o.actualBoundingBoxAscent,c=e+o.actualBoundingBoxDescent,d=i.strikethrough?(l+c)/2:c;s.strokeStyle=s.fillStyle,s.beginPath(),s.lineWidth=i.decorationWidth||2,s.moveTo(a,d),s.lineTo(r,d),s.stroke()}}function sc(s,t){const e=s.fillStyle;s.fillStyle=t.color,s.fillRect(t.left,t.top,t.width,t.height),s.fillStyle=e}function ze(s,t,e,n,i,o={}){const a=Q(t)?t:[t],r=o.strokeWidth>0&&o.strokeColor!=="";let l,c;for(s.save(),s.font=i.string,tc(s,o),l=0;l<a.length;++l)c=a[l],o.backdrop&&sc(s,o.backdrop),r&&(o.strokeColor&&(s.strokeStyle=o.strokeColor),j(o.strokeWidth)||(s.lineWidth=o.strokeWidth),s.strokeText(c,e,n,o.maxWidth)),s.fillText(c,e,n,o.maxWidth),ec(s,e,n,c,o),n+=Number(i.lineHeight);s.restore()}function Ms(s,t){const{x:e,y:n,w:i,h:o,radius:a}=t;s.arc(e+a.topLeft,n+a.topLeft,a.topLeft,1.5*V,V,!0),s.lineTo(e,n+o-a.bottomLeft),s.arc(e+a.bottomLeft,n+o-a.bottomLeft,a.bottomLeft,V,rt,!0),s.lineTo(e+i-a.bottomRight,n+o),s.arc(e+i-a.bottomRight,n+o-a.bottomRight,a.bottomRight,rt,0,!0),s.lineTo(e+i,n+a.topRight),s.arc(e+i-a.topRight,n+a.topRight,a.topRight,0,-rt,!0),s.lineTo(e+a.topLeft,n)}const nc=/^(normal|(\d+(?:\.\d+)?)(px|em|%)?)$/,ic=/^(normal|italic|initial|inherit|unset|(oblique( -?[0-9]?[0-9]deg)?))$/;function oc(s,t){const e=(""+s).match(nc);if(!e||e[1]==="normal")return t*1.2;switch(s=+e[2],e[3]){case"px":return s;case"%":s/=100;break}return t*s}const ac=s=>+s||0;function pi(s,t){const e={},n=N(t),i=n?Object.keys(t):t,o=N(s)?n?a=>B(s[a],s[t[a]]):a=>s[a]:()=>s;for(const a of i)e[a]=ac(o(a));return e}function fr(s){return pi(s,{top:"y",right:"x",bottom:"y",left:"x"})}function Be(s){return pi(s,["topLeft","topRight","bottomLeft","bottomRight"])}function Mt(s){const t=fr(s);return t.width=t.left+t.right,t.height=t.top+t.bottom,t}function pt(s,t){s=s||{},t=t||tt.font;let e=B(s.size,t.size);typeof e=="string"&&(e=parseInt(e,10));let n=B(s.style,t.style);n&&!(""+n).match(ic)&&(console.warn('Invalid font style specified: "'+n+'"'),n=void 0);const i={family:B(s.family,t.family),lineHeight:oc(B(s.lineHeight,t.lineHeight),e),size:e,style:n,weight:B(s.weight,t.weight),string:""};return i.string=Kl(i),i}function rs(s,t,e,n){let i,o,a;for(i=0,o=s.length;i<o;++i)if(a=s[i],a!==void 0&&a!==void 0)return a}function rc(s,t,e){const{min:n,max:i}=s,o=er(t,(i-n)/2),a=(r,l)=>e&&r===0?0:r+l;return{min:a(n,-Math.abs(o)),max:a(i,o)}}function Me(s,t){return Object.assign(Object.create(s),t)}function gi(s,t=[""],e,n,i=()=>s[0]){const o=e||s;typeof n>"u"&&(n=br("_fallback",s));const a={[Symbol.toStringTag]:"Object",_cacheable:!0,_scopes:s,_rootScopes:o,_fallback:n,_getTarget:i,override:r=>gi([r,...s],t,o,n)};return new Proxy(a,{deleteProperty(r,l){return delete r[l],delete r._keys,delete s[0][l],!0},get(r,l){return gr(r,l,()=>gc(l,t,s,r))},getOwnPropertyDescriptor(r,l){return Reflect.getOwnPropertyDescriptor(r._scopes[0],l)},getPrototypeOf(){return Reflect.getPrototypeOf(s[0])},has(r,l){return Uo(r).includes(l)},ownKeys(r){return Uo(r)},set(r,l,c){const d=r._storage||(r._storage=i());return r[l]=d[l]=c,delete r._keys,!0}})}function Je(s,t,e,n){const i={_cacheable:!1,_proxy:s,_context:t,_subProxy:e,_stack:new Set,_descriptors:pr(s,n),setContext:o=>Je(s,o,e,n),override:o=>Je(s.override(o),t,e,n)};return new Proxy(i,{deleteProperty(o,a){return delete o[a],delete s[a],!0},get(o,a,r){return gr(o,a,()=>cc(o,a,r))},getOwnPropertyDescriptor(o,a){return o._descriptors.allKeys?Reflect.has(s,a)?{enumerable:!0,configurable:!0}:void 0:Reflect.getOwnPropertyDescriptor(s,a)},getPrototypeOf(){return Reflect.getPrototypeOf(s)},has(o,a){return Reflect.has(s,a)},ownKeys(){return Reflect.ownKeys(s)},set(o,a,r){return s[a]=r,delete o[a],!0}})}function pr(s,t={scriptable:!0,indexable:!0}){const{_scriptable:e=t.scriptable,_indexable:n=t.indexable,_allKeys:i=t.allKeys}=s;return{allKeys:i,scriptable:e,indexable:n,isScriptable:ye(e)?e:()=>e,isIndexable:ye(n)?n:()=>n}}const lc=(s,t)=>s?s+ci(t):t,mi=(s,t)=>N(t)&&s!=="adapters"&&(Object.getPrototypeOf(t)===null||t.constructor===Object);function gr(s,t,e){if(Object.prototype.hasOwnProperty.call(s,t)||t==="constructor")return s[t];const n=e();return s[t]=n,n}function cc(s,t,e){const{_proxy:n,_context:i,_subProxy:o,_descriptors:a}=s;let r=n[t];return ye(r)&&a.isScriptable(t)&&(r=dc(t,r,s,e)),Q(r)&&r.length&&(r=hc(t,r,s,a.isIndexable)),mi(t,r)&&(r=Je(r,i,o&&o[t],a)),r}function dc(s,t,e,n){const{_proxy:i,_context:o,_subProxy:a,_stack:r}=e;if(r.has(s))throw new Error("Recursion detected: "+Array.from(r).join("->")+"->"+s);r.add(s);let l=t(o,a||n);return r.delete(s),mi(s,l)&&(l=bi(i._scopes,i,s,l)),l}function hc(s,t,e,n){const{_proxy:i,_context:o,_subProxy:a,_descriptors:r}=e;if(typeof o.index<"u"&&n(s))return t[o.index%t.length];if(N(t[0])){const l=t,c=i._scopes.filter(d=>d!==l);t=[];for(const d of l){const h=bi(c,i,s,d);t.push(Je(h,o,a&&a[s],r))}}return t}function mr(s,t,e){return ye(s)?s(t,e):s}const uc=(s,t)=>s===!0?t:typeof s=="string"?xe(t,s):void 0;function fc(s,t,e,n,i){for(const o of t){const a=uc(e,o);if(a){s.add(a);const r=mr(a._fallback,e,i);if(typeof r<"u"&&r!==e&&r!==n)return r}else if(a===!1&&typeof n<"u"&&e!==n)return null}return!1}function bi(s,t,e,n){const i=t._rootScopes,o=mr(t._fallback,e,n),a=[...s,...i],r=new Set;r.add(n);let l=Yo(r,a,e,o||e,n);return l===null||typeof o<"u"&&o!==e&&(l=Yo(r,a,o,l,n),l===null)?!1:gi(Array.from(r),[""],i,o,()=>pc(t,e,n))}function Yo(s,t,e,n,i){for(;e;)e=fc(s,t,e,n,i);return e}function pc(s,t,e){const n=s._getTarget();t in n||(n[t]={});const i=n[t];return Q(i)&&N(e)?e:i||{}}function gc(s,t,e,n){let i;for(const o of t)if(i=br(lc(o,s),e),typeof i<"u")return mi(s,i)?bi(e,n,s,i):i}function br(s,t){for(const e of t){if(!e)continue;const n=e[s];if(typeof n<"u")return n}}function Uo(s){let t=s._keys;return t||(t=s._keys=mc(s._scopes)),t}function mc(s){const t=new Set;for(const e of s)for(const n of Object.keys(e).filter(i=>!i.startsWith("_")))t.add(n);return Array.from(t)}function xr(s,t,e,n){const{iScale:i}=s,{key:o="r"}=this._parsing,a=new Array(n);let r,l,c,d;for(r=0,l=n;r<l;++r)c=r+e,d=t[c],a[r]={r:i.parse(xe(d,o),c)};return a}const bc=Number.EPSILON||1e-14,Ze=(s,t)=>t<s.length&&!s[t].skip&&s[t],yr=s=>s==="x"?"y":"x";function xc(s,t,e,n){const i=s.skip?t:s,o=t,a=e.skip?t:e,r=jn(o,i),l=jn(a,o);let c=r/(r+l),d=l/(r+l);c=isNaN(c)?0:c,d=isNaN(d)?0:d;const h=n*c,u=n*d;return{previous:{x:o.x-h*(a.x-i.x),y:o.y-h*(a.y-i.y)},next:{x:o.x+u*(a.x-i.x),y:o.y+u*(a.y-i.y)}}}function yc(s,t,e){const n=s.length;let i,o,a,r,l,c=Ze(s,0);for(let d=0;d<n-1;++d)if(l=c,c=Ze(s,d+1),!(!l||!c)){if(gs(t[d],0,bc)){e[d]=e[d+1]=0;continue}i=e[d]/t[d],o=e[d+1]/t[d],r=Math.pow(i,2)+Math.pow(o,2),!(r<=9)&&(a=3/Math.sqrt(r),e[d]=i*a*t[d],e[d+1]=o*a*t[d])}}function vc(s,t,e="x"){const n=yr(e),i=s.length;let o,a,r,l=Ze(s,0);for(let c=0;c<i;++c){if(a=r,r=l,l=Ze(s,c+1),!r)continue;const d=r[e],h=r[n];a&&(o=(d-a[e])/3,r[`cp1${e}`]=d-o,r[`cp1${n}`]=h-o*t[c]),l&&(o=(l[e]-d)/3,r[`cp2${e}`]=d+o,r[`cp2${n}`]=h+o*t[c])}}function _c(s,t="x"){const e=yr(t),n=s.length,i=Array(n).fill(0),o=Array(n);let a,r,l,c=Ze(s,0);for(a=0;a<n;++a)if(r=l,l=c,c=Ze(s,a+1),!!l){if(c){const d=c[t]-l[t];i[a]=d!==0?(c[e]-l[e])/d:0}o[a]=r?c?qt(i[a-1])!==qt(i[a])?0:(i[a-1]+i[a])/2:i[a-1]:i[a]}yc(s,i,o),vc(s,o,t)}function Os(s,t,e){return Math.max(Math.min(s,e),t)}function wc(s,t){let e,n,i,o,a,r=ie(s[0],t);for(e=0,n=s.length;e<n;++e)a=o,o=r,r=e<n-1&&ie(s[e+1],t),o&&(i=s[e],a&&(i.cp1x=Os(i.cp1x,t.left,t.right),i.cp1y=Os(i.cp1y,t.top,t.bottom)),r&&(i.cp2x=Os(i.cp2x,t.left,t.right),i.cp2y=Os(i.cp2y,t.top,t.bottom)))}function kc(s,t,e,n,i){let o,a,r,l;if(t.spanGaps&&(s=s.filter(c=>!c.skip)),t.cubicInterpolationMode==="monotone")_c(s,i);else{let c=n?s[s.length-1]:s[0];for(o=0,a=s.length;o<a;++o)r=s[o],l=xc(c,r,s[Math.min(o+1,a-(n?0:1))%a],t.tension),r.cp1x=l.previous.x,r.cp1y=l.previous.y,r.cp2x=l.next.x,r.cp2y=l.next.y,c=r}t.capBezierPoints&&wc(s,e)}function xi(){return typeof window<"u"&&typeof document<"u"}function yi(s){let t=s.parentNode;return t&&t.toString()==="[object ShadowRoot]"&&(t=t.host),t}function ln(s,t,e){let n;return typeof s=="string"?(n=parseInt(s,10),s.indexOf("%")!==-1&&(n=n/100*t.parentNode[e])):n=s,n}const bn=s=>s.ownerDocument.defaultView.getComputedStyle(s,null);function Mc(s,t){return bn(s).getPropertyValue(t)}const Sc=["top","right","bottom","left"];function Re(s,t,e){const n={};e=e?"-"+e:"";for(let i=0;i<4;i++){const o=Sc[i];n[o]=parseFloat(s[t+"-"+o+e])||0}return n.width=n.left+n.right,n.height=n.top+n.bottom,n}const Cc=(s,t,e)=>(s>0||t>0)&&(!e||!e.shadowRoot);function Ec(s,t){const e=s.touches,n=e&&e.length?e[0]:s,{offsetX:i,offsetY:o}=n;let a=!1,r,l;if(Cc(i,o,s.target))r=i,l=o;else{const c=t.getBoundingClientRect();r=n.clientX-c.left,l=n.clientY-c.top,a=!0}return{x:r,y:l,box:a}}function De(s,t){if("native"in s)return s;const{canvas:e,currentDevicePixelRatio:n}=t,i=bn(e),o=i.boxSizing==="border-box",a=Re(i,"padding"),r=Re(i,"border","width"),{x:l,y:c,box:d}=Ec(s,e),h=a.left+(d&&r.left),u=a.top+(d&&r.top);let{width:f,height:p}=t;return o&&(f-=a.width+r.width,p-=a.height+r.height),{x:Math.round((l-h)/f*e.width/n),y:Math.round((c-u)/p*e.height/n)}}function Ac(s,t,e){let n,i;if(t===void 0||e===void 0){const o=s&&yi(s);if(!o)t=s.clientWidth,e=s.clientHeight;else{const a=o.getBoundingClientRect(),r=bn(o),l=Re(r,"border","width"),c=Re(r,"padding");t=a.width-c.width-l.width,e=a.height-c.height-l.height,n=ln(r.maxWidth,o,"clientWidth"),i=ln(r.maxHeight,o,"clientHeight")}}return{width:t,height:e,maxWidth:n||an,maxHeight:i||an}}const pe=s=>Math.round(s*10)/10;function Pc(s,t,e,n){const i=bn(s),o=Re(i,"margin"),a=ln(i.maxWidth,s,"clientWidth")||an,r=ln(i.maxHeight,s,"clientHeight")||an,l=Ac(s,t,e);let{width:c,height:d}=l;if(i.boxSizing==="content-box"){const u=Re(i,"border","width"),f=Re(i,"padding");c-=f.width+u.width,d-=f.height+u.height}return c=Math.max(0,c-o.width),d=Math.max(0,n?c/n:d-o.height),c=pe(Math.min(c,a,l.maxWidth)),d=pe(Math.min(d,r,l.maxHeight)),c&&!d&&(d=pe(c/2)),(t!==void 0||e!==void 0)&&n&&l.height&&d>l.height&&(d=l.height,c=pe(Math.floor(d*n))),{width:c,height:d}}function Xo(s,t,e){const n=t||1,i=pe(s.height*n),o=pe(s.width*n);s.height=pe(s.height),s.width=pe(s.width);const a=s.canvas;return a.style&&(e||!a.style.height&&!a.style.width)&&(a.style.height=`${s.height}px`,a.style.width=`${s.width}px`),s.currentDevicePixelRatio!==n||a.height!==i||a.width!==o?(s.currentDevicePixelRatio=n,a.height=i,a.width=o,s.ctx.setTransform(n,0,0,n,0,0),!0):!1}const Dc=(function(){let s=!1;try{const t={get passive(){return s=!0,!1}};xi()&&(window.addEventListener("test",null,t),window.removeEventListener("test",null,t))}catch{}return s})();function qo(s,t){const e=Mc(s,t),n=e&&e.match(/^(\d+)(\.\d+)?px$/);return n?+n[1]:void 0}function Te(s,t,e,n){return{x:s.x+e*(t.x-s.x),y:s.y+e*(t.y-s.y)}}function Tc(s,t,e,n){return{x:s.x+e*(t.x-s.x),y:n==="middle"?e<.5?s.y:t.y:n==="after"?e<1?s.y:t.y:e>0?t.y:s.y}}function Lc(s,t,e,n){const i={x:s.cp2x,y:s.cp2y},o={x:t.cp1x,y:t.cp1y},a=Te(s,i,e),r=Te(i,o,e),l=Te(o,t,e),c=Te(a,r,e),d=Te(r,l,e);return Te(c,d,e)}const Ic=function(s,t){return{x(e){return s+s+t-e},setWidth(e){t=e},textAlign(e){return e==="center"?e:e==="right"?"left":"right"},xPlus(e,n){return e-n},leftForLtr(e,n){return e-n}}},$c=function(){return{x(s){return s},setWidth(s){},textAlign(s){return s},xPlus(s,t){return s+t},leftForLtr(s,t){return s}}};function qe(s,t,e){return s?Ic(t,e):$c()}function vr(s,t){let e,n;(t==="ltr"||t==="rtl")&&(e=s.canvas.style,n=[e.getPropertyValue("direction"),e.getPropertyPriority("direction")],e.setProperty("direction",t,"important"),s.prevTextDirection=n)}function _r(s,t){t!==void 0&&(delete s.prevTextDirection,s.canvas.style.setProperty("direction",t[0],t[1]))}function wr(s){return s==="angle"?{between:ks,compare:Ol,normalize:_t}:{between:se,compare:(t,e)=>t-e,normalize:t=>t}}function Go({start:s,end:t,count:e,loop:n,style:i}){return{start:s%e,end:t%e,loop:n&&(t-s+1)%e===0,style:i}}function Oc(s,t,e){const{property:n,start:i,end:o}=e,{between:a,normalize:r}=wr(n),l=t.length;let{start:c,end:d,loop:h}=s,u,f;if(h){for(c+=l,d+=l,u=0,f=l;u<f&&a(r(t[c%l][n]),i,o);++u)c--,d--;c%=l,d%=l}return d<c&&(d+=l),{start:c,end:d,loop:h,style:s.style}}function kr(s,t,e){if(!e)return[s];const{property:n,start:i,end:o}=e,a=t.length,{compare:r,between:l,normalize:c}=wr(n),{start:d,end:h,loop:u,style:f}=Oc(s,t,e),p=[];let g=!1,m=null,b,v,M;const k=()=>l(i,M,b)&&r(i,M)!==0,w=()=>r(o,b)===0||l(o,M,b),E=()=>g||k(),A=()=>!g||w();for(let D=d,I=d;D<=h;++D)v=t[D%a],!v.skip&&(b=c(v[n]),b!==M&&(g=l(b,i,o),m===null&&E()&&(m=r(b,i)===0?D:I),m!==null&&A()&&(p.push(Go({start:m,end:D,loop:u,count:a,style:f})),m=null),I=D,M=b));return m!==null&&p.push(Go({start:m,end:h,loop:u,count:a,style:f})),p}function Mr(s,t){const e=[],n=s.segments;for(let i=0;i<n.length;i++){const o=kr(n[i],s.points,t);o.length&&e.push(...o)}return e}function Bc(s,t,e,n){let i=0,o=t-1;if(e&&!n)for(;i<t&&!s[i].skip;)i++;for(;i<t&&s[i].skip;)i++;for(i%=t,e&&(o+=i);o>i&&s[o%t].skip;)o--;return o%=t,{start:i,end:o}}function Rc(s,t,e,n){const i=s.length,o=[];let a=t,r=s[t],l;for(l=t+1;l<=e;++l){const c=s[l%i];c.skip||c.stop?r.skip||(n=!1,o.push({start:t%i,end:(l-1)%i,loop:n}),t=a=c.stop?l:null):(a=l,r.skip&&(t=l)),r=c}return a!==null&&o.push({start:t%i,end:a%i,loop:n}),o}function Fc(s,t){const e=s.points,n=s.options.spanGaps,i=e.length;if(!i)return[];const o=!!s._loop,{start:a,end:r}=Bc(e,i,o,n);if(n===!0)return Ko(s,[{start:a,end:r,loop:o}],e,t);const l=r<a?r+i:r,c=!!s._fullLoop&&a===0&&r===i-1;return Ko(s,Rc(e,a,l,c),e,t)}function Ko(s,t,e,n){return!n||!n.setContext||!e?t:zc(s,t,e,n)}function zc(s,t,e,n){const i=s._chart.getContext(),o=Jo(s.options),{_datasetIndex:a,options:{spanGaps:r}}=s,l=e.length,c=[];let d=o,h=t[0].start,u=h;function f(p,g,m,b){const v=r?-1:1;if(p!==g){for(p+=l;e[p%l].skip;)p-=v;for(;e[g%l].skip;)g+=v;p%l!==g%l&&(c.push({start:p%l,end:g%l,loop:m,style:b}),d=b,h=g%l)}}for(const p of t){h=r?h:p.start;let g=e[h%l],m;for(u=h+1;u<=p.end;u++){const b=e[u%l];m=Jo(n.setContext(Me(i,{type:"segment",p0:g,p1:b,p0DataIndex:(u-1)%l,p1DataIndex:u%l,datasetIndex:a}))),jc(m,d)&&f(h,u-1,p.loop,d),g=b,d=m}h<u-1&&f(h,u-1,p.loop,d)}return c}function Jo(s){return{backgroundColor:s.backgroundColor,borderCapStyle:s.borderCapStyle,borderDash:s.borderDash,borderDashOffset:s.borderDashOffset,borderJoinStyle:s.borderJoinStyle,borderWidth:s.borderWidth,borderColor:s.borderColor}}function jc(s,t){if(!t)return!1;const e=[],n=function(i,o){return fi(o)?(e.includes(o)||e.push(o),e.indexOf(o)):o};return JSON.stringify(s,n)!==JSON.stringify(t,n)}function Bs(s,t,e){return s.options.clip?s[e]:t[e]}function Nc(s,t){const{xScale:e,yScale:n}=s;return e&&n?{left:Bs(e,t,"left"),right:Bs(e,t,"right"),top:Bs(n,t,"top"),bottom:Bs(n,t,"bottom")}:t}function Sr(s,t){const e=t._clip;if(e.disabled)return!1;const n=Nc(t,s.chartArea);return{left:e.left===!1?0:n.left-(e.left===!0?0:e.left),right:e.right===!1?s.width:n.right+(e.right===!0?0:e.right),top:e.top===!1?0:n.top-(e.top===!0?0:e.top),bottom:e.bottom===!1?s.height:n.bottom+(e.bottom===!0?0:e.bottom)}}/*!
 * Chart.js v4.5.1
 * https://www.chartjs.org
 * (c) 2025 Chart.js Contributors
 * Released under the MIT License
 */class Vc{constructor(){this._request=null,this._charts=new Map,this._running=!1,this._lastDate=void 0}_notify(t,e,n,i){const o=e.listeners[i],a=e.duration;o.forEach(r=>r({chart:t,initial:e.initial,numSteps:a,currentStep:Math.min(n-e.start,a)}))}_refresh(){this._request||(this._running=!0,this._request=rr.call(window,()=>{this._update(),this._request=null,this._running&&this._refresh()}))}_update(t=Date.now()){let e=0;this._charts.forEach((n,i)=>{if(!n.running||!n.items.length)return;const o=n.items;let a=o.length-1,r=!1,l;for(;a>=0;--a)l=o[a],l._active?(l._total>n.duration&&(n.duration=l._total),l.tick(t),r=!0):(o[a]=o[o.length-1],o.pop());r&&(i.draw(),this._notify(i,n,t,"progress")),o.length||(n.running=!1,this._notify(i,n,t,"complete"),n.initial=!1),e+=o.length}),this._lastDate=t,e===0&&(this._running=!1)}_getAnims(t){const e=this._charts;let n=e.get(t);return n||(n={running:!1,initial:!0,items:[],listeners:{complete:[],progress:[]}},e.set(t,n)),n}listen(t,e,n){this._getAnims(t).listeners[e].push(n)}add(t,e){!e||!e.length||this._getAnims(t).items.push(...e)}has(t){return this._getAnims(t).items.length>0}start(t){const e=this._charts.get(t);e&&(e.running=!0,e.start=Date.now(),e.duration=e.items.reduce((n,i)=>Math.max(n,i._duration),0),this._refresh())}running(t){if(!this._running)return!1;const e=this._charts.get(t);return!(!e||!e.running||!e.items.length)}stop(t){const e=this._charts.get(t);if(!e||!e.items.length)return;const n=e.items;let i=n.length-1;for(;i>=0;--i)n[i].cancel();e.items=[],this._notify(t,e,Date.now(),"complete")}remove(t){return this._charts.delete(t)}}var Zt=new Vc;const Zo="transparent",Wc={boolean(s,t,e){return e>.5?t:s},color(s,t,e){const n=Vo(s||Zo),i=n.valid&&Vo(t||Zo);return i&&i.valid?i.mix(n,e).hexString():t},number(s,t,e){return s+(t-s)*e}};class Hc{constructor(t,e,n,i){const o=e[n];i=rs([t.to,i,o,t.from]);const a=rs([t.from,o,i]);this._active=!0,this._fn=t.fn||Wc[t.type||typeof a],this._easing=ms[t.easing]||ms.linear,this._start=Math.floor(Date.now()+(t.delay||0)),this._duration=this._total=Math.floor(t.duration),this._loop=!!t.loop,this._target=e,this._prop=n,this._from=a,this._to=i,this._promises=void 0}active(){return this._active}update(t,e,n){if(this._active){this._notify(!1);const i=this._target[this._prop],o=n-this._start,a=this._duration-o;this._start=n,this._duration=Math.floor(Math.max(a,t.duration)),this._total+=o,this._loop=!!t.loop,this._to=rs([t.to,e,i,t.from]),this._from=rs([t.from,i,e])}}cancel(){this._active&&(this.tick(Date.now()),this._active=!1,this._notify(!1))}tick(t){const e=t-this._start,n=this._duration,i=this._prop,o=this._from,a=this._loop,r=this._to;let l;if(this._active=o!==r&&(a||e<n),!this._active){this._target[i]=r,this._notify(!0);return}if(e<0){this._target[i]=o;return}l=e/n%2,l=a&&l>1?2-l:l,l=this._easing(Math.min(1,Math.max(0,l))),this._target[i]=this._fn(o,r,l)}wait(){const t=this._promises||(this._promises=[]);return new Promise((e,n)=>{t.push({res:e,rej:n})})}_notify(t){const e=t?"res":"rej",n=this._promises||[];for(let i=0;i<n.length;i++)n[i][e]()}}class Cr{constructor(t,e){this._chart=t,this._properties=new Map,this.configure(e)}configure(t){if(!N(t))return;const e=Object.keys(tt.animation),n=this._properties;Object.getOwnPropertyNames(t).forEach(i=>{const o=t[i];if(!N(o))return;const a={};for(const r of e)a[r]=o[r];(Q(o.properties)&&o.properties||[i]).forEach(r=>{(r===i||!n.has(r))&&n.set(r,a)})})}_animateOptions(t,e){const n=e.options,i=Uc(t,n);if(!i)return[];const o=this._createAnimations(i,n);return n.$shared&&Yc(t.options.$animations,n).then(()=>{t.options=n},()=>{}),o}_createAnimations(t,e){const n=this._properties,i=[],o=t.$animations||(t.$animations={}),a=Object.keys(e),r=Date.now();let l;for(l=a.length-1;l>=0;--l){const c=a[l];if(c.charAt(0)==="$")continue;if(c==="options"){i.push(...this._animateOptions(t,e));continue}const d=e[c];let h=o[c];const u=n.get(c);if(h)if(u&&h.active()){h.update(u,d,r);continue}else h.cancel();if(!u||!u.duration){t[c]=d;continue}o[c]=h=new Hc(u,t,c,d),i.push(h)}return i}update(t,e){if(this._properties.size===0){Object.assign(t,e);return}const n=this._createAnimations(t,e);if(n.length)return Zt.add(this._chart,n),!0}}function Yc(s,t){const e=[],n=Object.keys(t);for(let i=0;i<n.length;i++){const o=s[n[i]];o&&o.active()&&e.push(o.wait())}return Promise.all(e)}function Uc(s,t){if(!t)return;let e=s.options;if(!e){s.options=t;return}return e.$shared&&(s.options=e=Object.assign({},e,{$shared:!1,$animations:{}})),e}function Qo(s,t){const e=s&&s.options||{},n=e.reverse,i=e.min===void 0?t:0,o=e.max===void 0?t:0;return{start:n?o:i,end:n?i:o}}function Xc(s,t,e){if(e===!1)return!1;const n=Qo(s,e),i=Qo(t,e);return{top:i.end,right:n.end,bottom:i.start,left:n.start}}function qc(s){let t,e,n,i;return N(s)?(t=s.top,e=s.right,n=s.bottom,i=s.left):t=e=n=i=s,{top:t,right:e,bottom:n,left:i,disabled:s===!1}}function Er(s,t){const e=[],n=s._getSortedDatasetMetas(t);let i,o;for(i=0,o=n.length;i<o;++i)e.push(n[i].index);return e}function ta(s,t,e,n={}){const i=s.keys,o=n.mode==="single";let a,r,l,c;if(t===null)return;let d=!1;for(a=0,r=i.length;a<r;++a){if(l=+i[a],l===e){if(d=!0,n.all)continue;break}c=s.values[l],st(c)&&(o||t===0||qt(t)===qt(c))&&(t+=c)}return!d&&!n.all?0:t}function Gc(s,t){const{iScale:e,vScale:n}=t,i=e.axis==="x"?"x":"y",o=n.axis==="x"?"x":"y",a=Object.keys(s),r=new Array(a.length);let l,c,d;for(l=0,c=a.length;l<c;++l)d=a[l],r[l]={[i]:d,[o]:s[d]};return r}function Mn(s,t){const e=s&&s.options.stacked;return e||e===void 0&&t.stack!==void 0}function Kc(s,t,e){return`${s.id}.${t.id}.${e.stack||e.type}`}function Jc(s){const{min:t,max:e,minDefined:n,maxDefined:i}=s.getUserBounds();return{min:n?t:Number.NEGATIVE_INFINITY,max:i?e:Number.POSITIVE_INFINITY}}function Zc(s,t,e){const n=s[t]||(s[t]={});return n[e]||(n[e]={})}function ea(s,t,e,n){for(const i of t.getMatchingVisibleMetas(n).reverse()){const o=s[i.index];if(e&&o>0||!e&&o<0)return i.index}return null}function sa(s,t){const{chart:e,_cachedMeta:n}=s,i=e._stacks||(e._stacks={}),{iScale:o,vScale:a,index:r}=n,l=o.axis,c=a.axis,d=Kc(o,a,n),h=t.length;let u;for(let f=0;f<h;++f){const p=t[f],{[l]:g,[c]:m}=p,b=p._stacks||(p._stacks={});u=b[c]=Zc(i,d,g),u[r]=m,u._top=ea(u,a,!0,n.type),u._bottom=ea(u,a,!1,n.type);const v=u._visualValues||(u._visualValues={});v[r]=m}}function Sn(s,t){const e=s.scales;return Object.keys(e).filter(n=>e[n].axis===t).shift()}function Qc(s,t){return Me(s,{active:!1,dataset:void 0,datasetIndex:t,index:t,mode:"default",type:"dataset"})}function td(s,t,e){return Me(s,{active:!1,dataIndex:t,parsed:void 0,raw:void 0,element:e,index:t,mode:"default",type:"data"})}function ts(s,t){const e=s.controller.index,n=s.vScale&&s.vScale.axis;if(n){t=t||s._parsed;for(const i of t){const o=i._stacks;if(!o||o[n]===void 0||o[n][e]===void 0)return;delete o[n][e],o[n]._visualValues!==void 0&&o[n]._visualValues[e]!==void 0&&delete o[n]._visualValues[e]}}}const Cn=s=>s==="reset"||s==="none",na=(s,t)=>t?s:Object.assign({},s),ed=(s,t,e)=>s&&!t.hidden&&t._stacked&&{keys:Er(e,!0),values:null};class jt{constructor(t,e){this.chart=t,this._ctx=t.ctx,this.index=e,this._cachedDataOpts={},this._cachedMeta=this.getMeta(),this._type=this._cachedMeta.type,this.options=void 0,this._parsing=!1,this._data=void 0,this._objectData=void 0,this._sharedOptions=void 0,this._drawStart=void 0,this._drawCount=void 0,this.enableOptionSharing=!1,this.supportsDecimation=!1,this.$context=void 0,this._syncList=[],this.datasetElementType=new.target.datasetElementType,this.dataElementType=new.target.dataElementType,this.initialize()}initialize(){const t=this._cachedMeta;this.configure(),this.linkScales(),t._stacked=Mn(t.vScale,t),this.addElements(),this.options.fill&&!this.chart.isPluginEnabled("filler")&&console.warn("Tried to use the 'fill' option without the 'Filler' plugin enabled. Please import and register the 'Filler' plugin and make sure it is not disabled in the options")}updateIndex(t){this.index!==t&&ts(this._cachedMeta),this.index=t}linkScales(){const t=this.chart,e=this._cachedMeta,n=this.getDataset(),i=(h,u,f,p)=>h==="x"?u:h==="r"?p:f,o=e.xAxisID=B(n.xAxisID,Sn(t,"x")),a=e.yAxisID=B(n.yAxisID,Sn(t,"y")),r=e.rAxisID=B(n.rAxisID,Sn(t,"r")),l=e.indexAxis,c=e.iAxisID=i(l,o,a,r),d=e.vAxisID=i(l,a,o,r);e.xScale=this.getScaleForId(o),e.yScale=this.getScaleForId(a),e.rScale=this.getScaleForId(r),e.iScale=this.getScaleForId(c),e.vScale=this.getScaleForId(d)}getDataset(){return this.chart.data.datasets[this.index]}getMeta(){return this.chart.getDatasetMeta(this.index)}getScaleForId(t){return this.chart.scales[t]}_getOtherScale(t){const e=this._cachedMeta;return t===e.iScale?e.vScale:e.iScale}reset(){this._update("reset")}_destroy(){const t=this._cachedMeta;this._data&&zo(this._data,this),t._stacked&&ts(t)}_dataCheck(){const t=this.getDataset(),e=t.data||(t.data=[]),n=this._data;if(N(e)){const i=this._cachedMeta;this._data=Gc(e,i)}else if(n!==e){if(n){zo(n,this);const i=this._cachedMeta;ts(i),i._parsed=[]}e&&Object.isExtensible(e)&&zl(e,this),this._syncList=[],this._data=e}}addElements(){const t=this._cachedMeta;this._dataCheck(),this.datasetElementType&&(t.dataset=new this.datasetElementType)}buildOrUpdateElements(t){const e=this._cachedMeta,n=this.getDataset();let i=!1;this._dataCheck();const o=e._stacked;e._stacked=Mn(e.vScale,e),e.stack!==n.stack&&(i=!0,ts(e),e.stack=n.stack),this._resyncElements(t),(i||o!==e._stacked)&&(sa(this,e._parsed),e._stacked=Mn(e.vScale,e))}configure(){const t=this.chart.config,e=t.datasetScopeKeys(this._type),n=t.getOptionScopes(this.getDataset(),e,!0);this.options=t.createResolver(n,this.getContext()),this._parsing=this.options.parsing,this._cachedDataOpts={}}parse(t,e){const{_cachedMeta:n,_data:i}=this,{iScale:o,_stacked:a}=n,r=o.axis;let l=t===0&&e===i.length?!0:n._sorted,c=t>0&&n._parsed[t-1],d,h,u;if(this._parsing===!1)n._parsed=i,n._sorted=!0,u=i;else{Q(i[t])?u=this.parseArrayData(n,i,t,e):N(i[t])?u=this.parseObjectData(n,i,t,e):u=this.parsePrimitiveData(n,i,t,e);const f=()=>h[r]===null||c&&h[r]<c[r];for(d=0;d<e;++d)n._parsed[d+t]=h=u[d],l&&(f()&&(l=!1),c=h);n._sorted=l}a&&sa(this,u)}parsePrimitiveData(t,e,n,i){const{iScale:o,vScale:a}=t,r=o.axis,l=a.axis,c=o.getLabels(),d=o===a,h=new Array(i);let u,f,p;for(u=0,f=i;u<f;++u)p=u+n,h[u]={[r]:d||o.parse(c[p],p),[l]:a.parse(e[p],p)};return h}parseArrayData(t,e,n,i){const{xScale:o,yScale:a}=t,r=new Array(i);let l,c,d,h;for(l=0,c=i;l<c;++l)d=l+n,h=e[d],r[l]={x:o.parse(h[0],d),y:a.parse(h[1],d)};return r}parseObjectData(t,e,n,i){const{xScale:o,yScale:a}=t,{xAxisKey:r="x",yAxisKey:l="y"}=this._parsing,c=new Array(i);let d,h,u,f;for(d=0,h=i;d<h;++d)u=d+n,f=e[u],c[d]={x:o.parse(xe(f,r),u),y:a.parse(xe(f,l),u)};return c}getParsed(t){return this._cachedMeta._parsed[t]}getDataElement(t){return this._cachedMeta.data[t]}applyStack(t,e,n){const i=this.chart,o=this._cachedMeta,a=e[t.axis],r={keys:Er(i,!0),values:e._stacks[t.axis]._visualValues};return ta(r,a,o.index,{mode:n})}updateRangeFromParsed(t,e,n,i){const o=n[e.axis];let a=o===null?NaN:o;const r=i&&n._stacks[e.axis];i&&r&&(i.values=r,a=ta(i,o,this._cachedMeta.index)),t.min=Math.min(t.min,a),t.max=Math.max(t.max,a)}getMinMax(t,e){const n=this._cachedMeta,i=n._parsed,o=n._sorted&&t===n.iScale,a=i.length,r=this._getOtherScale(t),l=ed(e,n,this.chart),c={min:Number.POSITIVE_INFINITY,max:Number.NEGATIVE_INFINITY},{min:d,max:h}=Jc(r);let u,f;function p(){f=i[u];const g=f[r.axis];return!st(f[t.axis])||d>g||h<g}for(u=0;u<a&&!(!p()&&(this.updateRangeFromParsed(c,t,f,l),o));++u);if(o){for(u=a-1;u>=0;--u)if(!p()){this.updateRangeFromParsed(c,t,f,l);break}}return c}getAllParsedValues(t){const e=this._cachedMeta._parsed,n=[];let i,o,a;for(i=0,o=e.length;i<o;++i)a=e[i][t.axis],st(a)&&n.push(a);return n}getMaxOverflow(){return!1}getLabelAndValue(t){const e=this._cachedMeta,n=e.iScale,i=e.vScale,o=this.getParsed(t);return{label:n?""+n.getLabelForValue(o[n.axis]):"",value:i?""+i.getLabelForValue(o[i.axis]):""}}_update(t){const e=this._cachedMeta;this.update(t||"default"),e._clip=qc(B(this.options.clip,Xc(e.xScale,e.yScale,this.getMaxOverflow())))}update(t){}draw(){const t=this._ctx,e=this.chart,n=this._cachedMeta,i=n.data||[],o=e.chartArea,a=[],r=this._drawStart||0,l=this._drawCount||i.length-r,c=this.options.drawActiveElementsOnTop;let d;for(n.dataset&&n.dataset.draw(t,o,r,l),d=r;d<r+l;++d){const h=i[d];h.hidden||(h.active&&c?a.push(h):h.draw(t,o))}for(d=0;d<a.length;++d)a[d].draw(t,o)}getStyle(t,e){const n=e?"active":"default";return t===void 0&&this._cachedMeta.dataset?this.resolveDatasetElementOptions(n):this.resolveDataElementOptions(t||0,n)}getContext(t,e,n){const i=this.getDataset();let o;if(t>=0&&t<this._cachedMeta.data.length){const a=this._cachedMeta.data[t];o=a.$context||(a.$context=td(this.getContext(),t,a)),o.parsed=this.getParsed(t),o.raw=i.data[t],o.index=o.dataIndex=t}else o=this.$context||(this.$context=Qc(this.chart.getContext(),this.index)),o.dataset=i,o.index=o.datasetIndex=this.index;return o.active=!!e,o.mode=n,o}resolveDatasetElementOptions(t){return this._resolveElementOptions(this.datasetElementType.id,t)}resolveDataElementOptions(t,e){return this._resolveElementOptions(this.dataElementType.id,e,t)}_resolveElementOptions(t,e="default",n){const i=e==="active",o=this._cachedDataOpts,a=t+"-"+e,r=o[a],l=this.enableOptionSharing&&ws(n);if(r)return na(r,l);const c=this.chart.config,d=c.datasetElementScopeKeys(this._type,t),h=i?[`${t}Hover`,"hover",t,""]:[t,""],u=c.getOptionScopes(this.getDataset(),d),f=Object.keys(tt.elements[t]),p=()=>this.getContext(n,i,e),g=c.resolveNamedOptions(u,f,p,h);return g.$shared&&(g.$shared=l,o[a]=Object.freeze(na(g,l))),g}_resolveAnimations(t,e,n){const i=this.chart,o=this._cachedDataOpts,a=`animation-${e}`,r=o[a];if(r)return r;let l;if(i.options.animation!==!1){const d=this.chart.config,h=d.datasetAnimationScopeKeys(this._type,e),u=d.getOptionScopes(this.getDataset(),h);l=d.createResolver(u,this.getContext(t,n,e))}const c=new Cr(i,l&&l.animations);return l&&l._cacheable&&(o[a]=Object.freeze(c)),c}getSharedOptions(t){if(t.$shared)return this._sharedOptions||(this._sharedOptions=Object.assign({},t))}includeOptions(t,e){return!e||Cn(t)||this.chart._animationsDisabled}_getSharedOptions(t,e){const n=this.resolveDataElementOptions(t,e),i=this._sharedOptions,o=this.getSharedOptions(n),a=this.includeOptions(e,o)||o!==i;return this.updateSharedOptions(o,e,n),{sharedOptions:o,includeOptions:a}}updateElement(t,e,n,i){Cn(i)?Object.assign(t,n):this._resolveAnimations(e,i).update(t,n)}updateSharedOptions(t,e,n){t&&!Cn(e)&&this._resolveAnimations(void 0,e).update(t,n)}_setStyle(t,e,n,i){t.active=i;const o=this.getStyle(e,i);this._resolveAnimations(e,n,i).update(t,{options:!i&&this.getSharedOptions(o)||o})}removeHoverStyle(t,e,n){this._setStyle(t,n,"active",!1)}setHoverStyle(t,e,n){this._setStyle(t,n,"active",!0)}_removeDatasetHoverStyle(){const t=this._cachedMeta.dataset;t&&this._setStyle(t,void 0,"active",!1)}_setDatasetHoverStyle(){const t=this._cachedMeta.dataset;t&&this._setStyle(t,void 0,"active",!0)}_resyncElements(t){const e=this._data,n=this._cachedMeta.data;for(const[r,l,c]of this._syncList)this[r](l,c);this._syncList=[];const i=n.length,o=e.length,a=Math.min(o,i);a&&this.parse(0,a),o>i?this._insertElements(i,o-i,t):o<i&&this._removeElements(o,i-o)}_insertElements(t,e,n=!0){const i=this._cachedMeta,o=i.data,a=t+e;let r;const l=c=>{for(c.length+=e,r=c.length-1;r>=a;r--)c[r]=c[r-e]};for(l(o),r=t;r<a;++r)o[r]=new this.dataElementType;this._parsing&&l(i._parsed),this.parse(t,e),n&&this.updateElements(o,t,e,"reset")}updateElements(t,e,n,i){}_removeElements(t,e){const n=this._cachedMeta;if(this._parsing){const i=n._parsed.splice(t,e);n._stacked&&ts(n,i)}n.data.splice(t,e)}_sync(t){if(this._parsing)this._syncList.push(t);else{const[e,n,i]=t;this[e](n,i)}this.chart._dataChanges.push([this.index,...t])}_onDataPush(){const t=arguments.length;this._sync(["_insertElements",this.getDataset().data.length-t,t])}_onDataPop(){this._sync(["_removeElements",this._cachedMeta.data.length-1,1])}_onDataShift(){this._sync(["_removeElements",0,1])}_onDataSplice(t,e){e&&this._sync(["_removeElements",t,e]);const n=arguments.length-2;n&&this._sync(["_insertElements",t,n])}_onDataUnshift(){this._sync(["_insertElements",0,arguments.length])}}C(jt,"defaults",{}),C(jt,"datasetElementType",null),C(jt,"dataElementType",null);function sd(s,t){if(!s._cache.$bar){const e=s.getMatchingVisibleMetas(t);let n=[];for(let i=0,o=e.length;i<o;i++)n=n.concat(e[i].controller.getAllParsedValues(s));s._cache.$bar=ar(n.sort((i,o)=>i-o))}return s._cache.$bar}function nd(s){const t=s.iScale,e=sd(t,s.type);let n=t._length,i,o,a,r;const l=()=>{a===32767||a===-32768||(ws(r)&&(n=Math.min(n,Math.abs(a-r)||n)),r=a)};for(i=0,o=e.length;i<o;++i)a=t.getPixelForValue(e[i]),l();for(r=void 0,i=0,o=t.ticks.length;i<o;++i)a=t.getPixelForTick(i),l();return n}function id(s,t,e,n){const i=e.barThickness;let o,a;return j(i)?(o=t.min*e.categoryPercentage,a=e.barPercentage):(o=i*n,a=1),{chunk:o/n,ratio:a,start:t.pixels[s]-o/2}}function od(s,t,e,n){const i=t.pixels,o=i[s];let a=s>0?i[s-1]:null,r=s<i.length-1?i[s+1]:null;const l=e.categoryPercentage;a===null&&(a=o-(r===null?t.end-t.start:r-o)),r===null&&(r=o+o-a);const c=o-(o-Math.min(a,r))/2*l;return{chunk:Math.abs(r-a)/2*l/n,ratio:e.barPercentage,start:c}}function ad(s,t,e,n){const i=e.parse(s[0],n),o=e.parse(s[1],n),a=Math.min(i,o),r=Math.max(i,o);let l=a,c=r;Math.abs(a)>Math.abs(r)&&(l=r,c=a),t[e.axis]=c,t._custom={barStart:l,barEnd:c,start:i,end:o,min:a,max:r}}function Ar(s,t,e,n){return Q(s)?ad(s,t,e,n):t[e.axis]=e.parse(s,n),t}function ia(s,t,e,n){const i=s.iScale,o=s.vScale,a=i.getLabels(),r=i===o,l=[];let c,d,h,u;for(c=e,d=e+n;c<d;++c)u=t[c],h={},h[i.axis]=r||i.parse(a[c],c),l.push(Ar(u,h,o,c));return l}function En(s){return s&&s.barStart!==void 0&&s.barEnd!==void 0}function rd(s,t,e){return s!==0?qt(s):(t.isHorizontal()?1:-1)*(t.min>=e?1:-1)}function ld(s){let t,e,n,i,o;return s.horizontal?(t=s.base>s.x,e="left",n="right"):(t=s.base<s.y,e="bottom",n="top"),t?(i="end",o="start"):(i="start",o="end"),{start:e,end:n,reverse:t,top:i,bottom:o}}function cd(s,t,e,n){let i=t.borderSkipped;const o={};if(!i){s.borderSkipped=o;return}if(i===!0){s.borderSkipped={top:!0,right:!0,bottom:!0,left:!0};return}const{start:a,end:r,reverse:l,top:c,bottom:d}=ld(s);i==="middle"&&e&&(s.enableBorderRadius=!0,(e._top||0)===n?i=c:(e._bottom||0)===n?i=d:(o[oa(d,a,r,l)]=!0,i=c)),o[oa(i,a,r,l)]=!0,s.borderSkipped=o}function oa(s,t,e,n){return n?(s=dd(s,t,e),s=aa(s,e,t)):s=aa(s,t,e),s}function dd(s,t,e){return s===t?e:s===e?t:s}function aa(s,t,e){return s==="start"?t:s==="end"?e:s}function hd(s,{inflateAmount:t},e){s.inflateAmount=t==="auto"?e===1?.33:0:t}class Hs extends jt{parsePrimitiveData(t,e,n,i){return ia(t,e,n,i)}parseArrayData(t,e,n,i){return ia(t,e,n,i)}parseObjectData(t,e,n,i){const{iScale:o,vScale:a}=t,{xAxisKey:r="x",yAxisKey:l="y"}=this._parsing,c=o.axis==="x"?r:l,d=a.axis==="x"?r:l,h=[];let u,f,p,g;for(u=n,f=n+i;u<f;++u)g=e[u],p={},p[o.axis]=o.parse(xe(g,c),u),h.push(Ar(xe(g,d),p,a,u));return h}updateRangeFromParsed(t,e,n,i){super.updateRangeFromParsed(t,e,n,i);const o=n._custom;o&&e===this._cachedMeta.vScale&&(t.min=Math.min(t.min,o.min),t.max=Math.max(t.max,o.max))}getMaxOverflow(){return 0}getLabelAndValue(t){const e=this._cachedMeta,{iScale:n,vScale:i}=e,o=this.getParsed(t),a=o._custom,r=En(a)?"["+a.start+", "+a.end+"]":""+i.getLabelForValue(o[i.axis]);return{label:""+n.getLabelForValue(o[n.axis]),value:r}}initialize(){this.enableOptionSharing=!0,super.initialize();const t=this._cachedMeta;t.stack=this.getDataset().stack}update(t){const e=this._cachedMeta;this.updateElements(e.data,0,e.data.length,t)}updateElements(t,e,n,i){const o=i==="reset",{index:a,_cachedMeta:{vScale:r}}=this,l=r.getBasePixel(),c=r.isHorizontal(),d=this._getRuler(),{sharedOptions:h,includeOptions:u}=this._getSharedOptions(e,i);for(let f=e;f<e+n;f++){const p=this.getParsed(f),g=o||j(p[r.axis])?{base:l,head:l}:this._calculateBarValuePixels(f),m=this._calculateBarIndexPixels(f,d),b=(p._stacks||{})[r.axis],v={horizontal:c,base:g.base,enableBorderRadius:!b||En(p._custom)||a===b._top||a===b._bottom,x:c?g.head:m.center,y:c?m.center:g.head,height:c?m.size:Math.abs(g.size),width:c?Math.abs(g.size):m.size};u&&(v.options=h||this.resolveDataElementOptions(f,t[f].active?"active":i));const M=v.options||t[f].options;cd(v,M,b,a),hd(v,M,d.ratio),this.updateElement(t[f],f,v,i)}}_getStacks(t,e){const{iScale:n}=this._cachedMeta,i=n.getMatchingVisibleMetas(this._type).filter(d=>d.controller.options.grouped),o=n.options.stacked,a=[],r=this._cachedMeta.controller.getParsed(e),l=r&&r[n.axis],c=d=>{const h=d._parsed.find(f=>f[n.axis]===l),u=h&&h[d.vScale.axis];if(j(u)||isNaN(u))return!0};for(const d of i)if(!(e!==void 0&&c(d))&&((o===!1||a.indexOf(d.stack)===-1||o===void 0&&d.stack===void 0)&&a.push(d.stack),d.index===t))break;return a.length||a.push(void 0),a}_getStackCount(t){return this._getStacks(void 0,t).length}_getAxisCount(){return this._getAxis().length}getFirstScaleIdForIndexAxis(){const t=this.chart.scales,e=this.chart.options.indexAxis;return Object.keys(t).filter(n=>t[n].axis===e).shift()}_getAxis(){const t={},e=this.getFirstScaleIdForIndexAxis();for(const n of this.chart.data.datasets)t[B(this.chart.options.indexAxis==="x"?n.xAxisID:n.yAxisID,e)]=!0;return Object.keys(t)}_getStackIndex(t,e,n){const i=this._getStacks(t,n),o=e!==void 0?i.indexOf(e):-1;return o===-1?i.length-1:o}_getRuler(){const t=this.options,e=this._cachedMeta,n=e.iScale,i=[];let o,a;for(o=0,a=e.data.length;o<a;++o)i.push(n.getPixelForValue(this.getParsed(o)[n.axis],o));const r=t.barThickness;return{min:r||nd(e),pixels:i,start:n._startPixel,end:n._endPixel,stackCount:this._getStackCount(),scale:n,grouped:t.grouped,ratio:r?1:t.categoryPercentage*t.barPercentage}}_calculateBarValuePixels(t){const{_cachedMeta:{vScale:e,_stacked:n,index:i},options:{base:o,minBarLength:a}}=this,r=o||0,l=this.getParsed(t),c=l._custom,d=En(c);let h=l[e.axis],u=0,f=n?this.applyStack(e,l,n):h,p,g;f!==h&&(u=f-h,f=h),d&&(h=c.barStart,f=c.barEnd-c.barStart,h!==0&&qt(h)!==qt(c.barEnd)&&(u=0),u+=h);const m=!j(o)&&!d?o:u;let b=e.getPixelForValue(m);if(this.chart.getDataVisibility(t)?p=e.getPixelForValue(u+f):p=b,g=p-b,Math.abs(g)<a){g=rd(g,e,r)*a,h===r&&(b-=g/2);const v=e.getPixelForDecimal(0),M=e.getPixelForDecimal(1),k=Math.min(v,M),w=Math.max(v,M);b=Math.max(Math.min(b,w),k),p=b+g,n&&!d&&(l._stacks[e.axis]._visualValues[i]=e.getValueForPixel(p)-e.getValueForPixel(b))}if(b===e.getPixelForValue(r)){const v=qt(g)*e.getLineWidthForValue(r)/2;b+=v,g-=v}return{size:g,base:b,head:p,center:p+g/2}}_calculateBarIndexPixels(t,e){const n=e.scale,i=this.options,o=i.skipNull,a=B(i.maxBarThickness,1/0);let r,l;const c=this._getAxisCount();if(e.grouped){const d=o?this._getStackCount(t):e.stackCount,h=i.barThickness==="flex"?od(t,e,i,d*c):id(t,e,i,d*c),u=this.chart.options.indexAxis==="x"?this.getDataset().xAxisID:this.getDataset().yAxisID,f=this._getAxis().indexOf(B(u,this.getFirstScaleIdForIndexAxis())),p=this._getStackIndex(this.index,this._cachedMeta.stack,o?t:void 0)+f;r=h.start+h.chunk*p+h.chunk/2,l=Math.min(a,h.chunk*h.ratio)}else r=n.getPixelForValue(this.getParsed(t)[n.axis],t),l=Math.min(a,e.min*e.ratio);return{base:r-l/2,head:r+l/2,center:r,size:l}}draw(){const t=this._cachedMeta,e=t.vScale,n=t.data,i=n.length;let o=0;for(;o<i;++o)this.getParsed(o)[e.axis]!==null&&!n[o].hidden&&n[o].draw(this._ctx)}}C(Hs,"id","bar"),C(Hs,"defaults",{datasetElementType:!1,dataElementType:"bar",categoryPercentage:.8,barPercentage:.9,grouped:!0,animations:{numbers:{type:"number",properties:["x","y","base","width","height"]}}}),C(Hs,"overrides",{scales:{_index_:{type:"category",offset:!0,grid:{offset:!0}},_value_:{type:"linear",beginAtZero:!0}}});class Ys extends jt{initialize(){this.enableOptionSharing=!0,super.initialize()}parsePrimitiveData(t,e,n,i){const o=super.parsePrimitiveData(t,e,n,i);for(let a=0;a<o.length;a++)o[a]._custom=this.resolveDataElementOptions(a+n).radius;return o}parseArrayData(t,e,n,i){const o=super.parseArrayData(t,e,n,i);for(let a=0;a<o.length;a++){const r=e[n+a];o[a]._custom=B(r[2],this.resolveDataElementOptions(a+n).radius)}return o}parseObjectData(t,e,n,i){const o=super.parseObjectData(t,e,n,i);for(let a=0;a<o.length;a++){const r=e[n+a];o[a]._custom=B(r&&r.r&&+r.r,this.resolveDataElementOptions(a+n).radius)}return o}getMaxOverflow(){const t=this._cachedMeta.data;let e=0;for(let n=t.length-1;n>=0;--n)e=Math.max(e,t[n].size(this.resolveDataElementOptions(n))/2);return e>0&&e}getLabelAndValue(t){const e=this._cachedMeta,n=this.chart.data.labels||[],{xScale:i,yScale:o}=e,a=this.getParsed(t),r=i.getLabelForValue(a.x),l=o.getLabelForValue(a.y),c=a._custom;return{label:n[t]||"",value:"("+r+", "+l+(c?", "+c:"")+")"}}update(t){const e=this._cachedMeta.data;this.updateElements(e,0,e.length,t)}updateElements(t,e,n,i){const o=i==="reset",{iScale:a,vScale:r}=this._cachedMeta,{sharedOptions:l,includeOptions:c}=this._getSharedOptions(e,i),d=a.axis,h=r.axis;for(let u=e;u<e+n;u++){const f=t[u],p=!o&&this.getParsed(u),g={},m=g[d]=o?a.getPixelForDecimal(.5):a.getPixelForValue(p[d]),b=g[h]=o?r.getBasePixel():r.getPixelForValue(p[h]);g.skip=isNaN(m)||isNaN(b),c&&(g.options=l||this.resolveDataElementOptions(u,f.active?"active":i),o&&(g.options.radius=0)),this.updateElement(f,u,g,i)}}resolveDataElementOptions(t,e){const n=this.getParsed(t);let i=super.resolveDataElementOptions(t,e);i.$shared&&(i=Object.assign({},i,{$shared:!1}));const o=i.radius;return e!=="active"&&(i.radius=0),i.radius+=B(n&&n._custom,o),i}}C(Ys,"id","bubble"),C(Ys,"defaults",{datasetElementType:!1,dataElementType:"point",animations:{numbers:{type:"number",properties:["x","y","borderWidth","radius"]}}}),C(Ys,"overrides",{scales:{x:{type:"linear"},y:{type:"linear"}}});function ud(s,t,e){let n=1,i=1,o=0,a=0;if(t<K){const r=s,l=r+t,c=Math.cos(r),d=Math.sin(r),h=Math.cos(l),u=Math.sin(l),f=(M,k,w)=>ks(M,r,l,!0)?1:Math.max(k,k*e,w,w*e),p=(M,k,w)=>ks(M,r,l,!0)?-1:Math.min(k,k*e,w,w*e),g=f(0,c,h),m=f(rt,d,u),b=p(V,c,h),v=p(V+rt,d,u);n=(g-b)/2,i=(m-v)/2,o=-(g+b)/2,a=-(m+v)/2}return{ratioX:n,ratioY:i,offsetX:o,offsetY:a}}class Ie extends jt{constructor(t,e){super(t,e),this.enableOptionSharing=!0,this.innerRadius=void 0,this.outerRadius=void 0,this.offsetX=void 0,this.offsetY=void 0}linkScales(){}parse(t,e){const n=this.getDataset().data,i=this._cachedMeta;if(this._parsing===!1)i._parsed=n;else{let o=l=>+n[l];if(N(n[t])){const{key:l="value"}=this._parsing;o=c=>+xe(n[c],l)}let a,r;for(a=t,r=t+e;a<r;++a)i._parsed[a]=o(a)}}_getRotation(){return zt(this.options.rotation-90)}_getCircumference(){return zt(this.options.circumference)}_getRotationExtents(){let t=K,e=-K;for(let n=0;n<this.chart.data.datasets.length;++n)if(this.chart.isDatasetVisible(n)&&this.chart.getDatasetMeta(n).type===this._type){const i=this.chart.getDatasetMeta(n).controller,o=i._getRotation(),a=i._getCircumference();t=Math.min(t,o),e=Math.max(e,o+a)}return{rotation:t,circumference:e-t}}update(t){const e=this.chart,{chartArea:n}=e,i=this._cachedMeta,o=i.data,a=this.getMaxBorderWidth()+this.getMaxOffset(o)+this.options.spacing,r=Math.max((Math.min(n.width,n.height)-a)/2,0),l=Math.min(Ml(this.options.cutout,r),1),c=this._getRingWeight(this.index),{circumference:d,rotation:h}=this._getRotationExtents(),{ratioX:u,ratioY:f,offsetX:p,offsetY:g}=ud(h,d,l),m=(n.width-a)/u,b=(n.height-a)/f,v=Math.max(Math.min(m,b)/2,0),M=er(this.options.radius,v),k=Math.max(M*l,0),w=(M-k)/this._getVisibleDatasetWeightTotal();this.offsetX=p*M,this.offsetY=g*M,i.total=this.calculateTotal(),this.outerRadius=M-w*this._getRingWeightOffset(this.index),this.innerRadius=Math.max(this.outerRadius-w*c,0),this.updateElements(o,0,o.length,t)}_circumference(t,e){const n=this.options,i=this._cachedMeta,o=this._getCircumference();return e&&n.animation.animateRotate||!this.chart.getDataVisibility(t)||i._parsed[t]===null||i.data[t].hidden?0:this.calculateCircumference(i._parsed[t]*o/K)}updateElements(t,e,n,i){const o=i==="reset",a=this.chart,r=a.chartArea,c=a.options.animation,d=(r.left+r.right)/2,h=(r.top+r.bottom)/2,u=o&&c.animateScale,f=u?0:this.innerRadius,p=u?0:this.outerRadius,{sharedOptions:g,includeOptions:m}=this._getSharedOptions(e,i);let b=this._getRotation(),v;for(v=0;v<e;++v)b+=this._circumference(v,o);for(v=e;v<e+n;++v){const M=this._circumference(v,o),k=t[v],w={x:d+this.offsetX,y:h+this.offsetY,startAngle:b,endAngle:b+M,circumference:M,outerRadius:p,innerRadius:f};m&&(w.options=g||this.resolveDataElementOptions(v,k.active?"active":i)),b+=M,this.updateElement(k,v,w,i)}}calculateTotal(){const t=this._cachedMeta,e=t.data;let n=0,i;for(i=0;i<e.length;i++){const o=t._parsed[i];o!==null&&!isNaN(o)&&this.chart.getDataVisibility(i)&&!e[i].hidden&&(n+=Math.abs(o))}return n}calculateCircumference(t){const e=this._cachedMeta.total;return e>0&&!isNaN(t)?K*(Math.abs(t)/e):0}getLabelAndValue(t){const e=this._cachedMeta,n=this.chart,i=n.data.labels||[],o=Ps(e._parsed[t],n.options.locale);return{label:i[t]||"",value:o}}getMaxBorderWidth(t){let e=0;const n=this.chart;let i,o,a,r,l;if(!t){for(i=0,o=n.data.datasets.length;i<o;++i)if(n.isDatasetVisible(i)){a=n.getDatasetMeta(i),t=a.data,r=a.controller;break}}if(!t)return 0;for(i=0,o=t.length;i<o;++i)l=r.resolveDataElementOptions(i),l.borderAlign!=="inner"&&(e=Math.max(e,l.borderWidth||0,l.hoverBorderWidth||0));return e}getMaxOffset(t){let e=0;for(let n=0,i=t.length;n<i;++n){const o=this.resolveDataElementOptions(n);e=Math.max(e,o.offset||0,o.hoverOffset||0)}return e}_getRingWeightOffset(t){let e=0;for(let n=0;n<t;++n)this.chart.isDatasetVisible(n)&&(e+=this._getRingWeight(n));return e}_getRingWeight(t){return Math.max(B(this.chart.data.datasets[t].weight,1),0)}_getVisibleDatasetWeightTotal(){return this._getRingWeightOffset(this.chart.data.datasets.length)||1}}C(Ie,"id","doughnut"),C(Ie,"defaults",{datasetElementType:!1,dataElementType:"arc",animation:{animateRotate:!0,animateScale:!1},animations:{numbers:{type:"number",properties:["circumference","endAngle","innerRadius","outerRadius","startAngle","x","y","offset","borderWidth","spacing"]}},cutout:"50%",rotation:0,circumference:360,radius:"100%",spacing:0,indexAxis:"r"}),C(Ie,"descriptors",{_scriptable:t=>t!=="spacing",_indexable:t=>t!=="spacing"&&!t.startsWith("borderDash")&&!t.startsWith("hoverBorderDash")}),C(Ie,"overrides",{aspectRatio:1,plugins:{legend:{labels:{generateLabels(t){const e=t.data,{labels:{pointStyle:n,textAlign:i,color:o,useBorderRadius:a,borderRadius:r}}=t.legend.options;return e.labels.length&&e.datasets.length?e.labels.map((l,c)=>{const h=t.getDatasetMeta(0).controller.getStyle(c);return{text:l,fillStyle:h.backgroundColor,fontColor:o,hidden:!t.getDataVisibility(c),lineDash:h.borderDash,lineDashOffset:h.borderDashOffset,lineJoin:h.borderJoinStyle,lineWidth:h.borderWidth,strokeStyle:h.borderColor,textAlign:i,pointStyle:n,borderRadius:a&&(r||h.borderRadius),index:c}}):[]}},onClick(t,e,n){n.chart.toggleDataVisibility(e.index),n.chart.update()}}}});class Us extends jt{initialize(){this.enableOptionSharing=!0,this.supportsDecimation=!0,super.initialize()}update(t){const e=this._cachedMeta,{dataset:n,data:i=[],_dataset:o}=e,a=this.chart._animationsDisabled;let{start:r,count:l}=cr(e,i,a);this._drawStart=r,this._drawCount=l,dr(e)&&(r=0,l=i.length),n._chart=this.chart,n._datasetIndex=this.index,n._decimated=!!o._decimated,n.points=i;const c=this.resolveDatasetElementOptions(t);this.options.showLine||(c.borderWidth=0),c.segment=this.options.segment,this.updateElement(n,void 0,{animated:!a,options:c},t),this.updateElements(i,r,l,t)}updateElements(t,e,n,i){const o=i==="reset",{iScale:a,vScale:r,_stacked:l,_dataset:c}=this._cachedMeta,{sharedOptions:d,includeOptions:h}=this._getSharedOptions(e,i),u=a.axis,f=r.axis,{spanGaps:p,segment:g}=this.options,m=Ke(p)?p:Number.POSITIVE_INFINITY,b=this.chart._animationsDisabled||o||i==="none",v=e+n,M=t.length;let k=e>0&&this.getParsed(e-1);for(let w=0;w<M;++w){const E=t[w],A=b?E:{};if(w<e||w>=v){A.skip=!0;continue}const D=this.getParsed(w),I=j(D[f]),R=A[u]=a.getPixelForValue(D[u],w),F=A[f]=o||I?r.getBasePixel():r.getPixelForValue(l?this.applyStack(r,D,l):D[f],w);A.skip=isNaN(R)||isNaN(F)||I,A.stop=w>0&&Math.abs(D[u]-k[u])>m,g&&(A.parsed=D,A.raw=c.data[w]),h&&(A.options=d||this.resolveDataElementOptions(w,E.active?"active":i)),b||this.updateElement(E,w,A,i),k=D}}getMaxOverflow(){const t=this._cachedMeta,e=t.dataset,n=e.options&&e.options.borderWidth||0,i=t.data||[];if(!i.length)return n;const o=i[0].size(this.resolveDataElementOptions(0)),a=i[i.length-1].size(this.resolveDataElementOptions(i.length-1));return Math.max(n,o,a)/2}draw(){const t=this._cachedMeta;t.dataset.updateControlPoints(this.chart.chartArea,t.iScale.axis),super.draw()}}C(Us,"id","line"),C(Us,"defaults",{datasetElementType:"line",dataElementType:"point",showLine:!0,spanGaps:!1}),C(Us,"overrides",{scales:{_index_:{type:"category"},_value_:{type:"linear"}}});class xs extends jt{constructor(t,e){super(t,e),this.innerRadius=void 0,this.outerRadius=void 0}getLabelAndValue(t){const e=this._cachedMeta,n=this.chart,i=n.data.labels||[],o=Ps(e._parsed[t].r,n.options.locale);return{label:i[t]||"",value:o}}parseObjectData(t,e,n,i){return xr.bind(this)(t,e,n,i)}update(t){const e=this._cachedMeta.data;this._updateRadius(),this.updateElements(e,0,e.length,t)}getMinMax(){const t=this._cachedMeta,e={min:Number.POSITIVE_INFINITY,max:Number.NEGATIVE_INFINITY};return t.data.forEach((n,i)=>{const o=this.getParsed(i).r;!isNaN(o)&&this.chart.getDataVisibility(i)&&(o<e.min&&(e.min=o),o>e.max&&(e.max=o))}),e}_updateRadius(){const t=this.chart,e=t.chartArea,n=t.options,i=Math.min(e.right-e.left,e.bottom-e.top),o=Math.max(i/2,0),a=Math.max(n.cutoutPercentage?o/100*n.cutoutPercentage:1,0),r=(o-a)/t.getVisibleDatasetCount();this.outerRadius=o-r*this.index,this.innerRadius=this.outerRadius-r}updateElements(t,e,n,i){const o=i==="reset",a=this.chart,l=a.options.animation,c=this._cachedMeta.rScale,d=c.xCenter,h=c.yCenter,u=c.getIndexAngle(0)-.5*V;let f=u,p;const g=360/this.countVisibleElements();for(p=0;p<e;++p)f+=this._computeAngle(p,i,g);for(p=e;p<e+n;p++){const m=t[p];let b=f,v=f+this._computeAngle(p,i,g),M=a.getDataVisibility(p)?c.getDistanceFromCenterForValue(this.getParsed(p).r):0;f=v,o&&(l.animateScale&&(M=0),l.animateRotate&&(b=v=u));const k={x:d,y:h,innerRadius:0,outerRadius:M,startAngle:b,endAngle:v,options:this.resolveDataElementOptions(p,m.active?"active":i)};this.updateElement(m,p,k,i)}}countVisibleElements(){const t=this._cachedMeta;let e=0;return t.data.forEach((n,i)=>{!isNaN(this.getParsed(i).r)&&this.chart.getDataVisibility(i)&&e++}),e}_computeAngle(t,e,n){return this.chart.getDataVisibility(t)?zt(this.resolveDataElementOptions(t,e).angle||n):0}}C(xs,"id","polarArea"),C(xs,"defaults",{dataElementType:"arc",animation:{animateRotate:!0,animateScale:!0},animations:{numbers:{type:"number",properties:["x","y","startAngle","endAngle","innerRadius","outerRadius"]}},indexAxis:"r",startAngle:0}),C(xs,"overrides",{aspectRatio:1,plugins:{legend:{labels:{generateLabels(t){const e=t.data;if(e.labels.length&&e.datasets.length){const{labels:{pointStyle:n,color:i}}=t.legend.options;return e.labels.map((o,a)=>{const l=t.getDatasetMeta(0).controller.getStyle(a);return{text:o,fillStyle:l.backgroundColor,strokeStyle:l.borderColor,fontColor:i,lineWidth:l.borderWidth,pointStyle:n,hidden:!t.getDataVisibility(a),index:a}})}return[]}},onClick(t,e,n){n.chart.toggleDataVisibility(e.index),n.chart.update()}}},scales:{r:{type:"radialLinear",angleLines:{display:!1},beginAtZero:!0,grid:{circular:!0},pointLabels:{display:!1},startAngle:0}}});class Wn extends Ie{}C(Wn,"id","pie"),C(Wn,"defaults",{cutout:0,rotation:0,circumference:360,radius:"100%"});class Xs extends jt{getLabelAndValue(t){const e=this._cachedMeta.vScale,n=this.getParsed(t);return{label:e.getLabels()[t],value:""+e.getLabelForValue(n[e.axis])}}parseObjectData(t,e,n,i){return xr.bind(this)(t,e,n,i)}update(t){const e=this._cachedMeta,n=e.dataset,i=e.data||[],o=e.iScale.getLabels();if(n.points=i,t!=="resize"){const a=this.resolveDatasetElementOptions(t);this.options.showLine||(a.borderWidth=0);const r={_loop:!0,_fullLoop:o.length===i.length,options:a};this.updateElement(n,void 0,r,t)}this.updateElements(i,0,i.length,t)}updateElements(t,e,n,i){const o=this._cachedMeta.rScale,a=i==="reset";for(let r=e;r<e+n;r++){const l=t[r],c=this.resolveDataElementOptions(r,l.active?"active":i),d=o.getPointPositionForValue(r,this.getParsed(r).r),h=a?o.xCenter:d.x,u=a?o.yCenter:d.y,f={x:h,y:u,angle:d.angle,skip:isNaN(h)||isNaN(u),options:c};this.updateElement(l,r,f,i)}}}C(Xs,"id","radar"),C(Xs,"defaults",{datasetElementType:"line",dataElementType:"point",indexAxis:"r",showLine:!0,elements:{line:{fill:"start"}}}),C(Xs,"overrides",{aspectRatio:1,scales:{r:{type:"radialLinear"}}});class qs extends jt{getLabelAndValue(t){const e=this._cachedMeta,n=this.chart.data.labels||[],{xScale:i,yScale:o}=e,a=this.getParsed(t),r=i.getLabelForValue(a.x),l=o.getLabelForValue(a.y);return{label:n[t]||"",value:"("+r+", "+l+")"}}update(t){const e=this._cachedMeta,{data:n=[]}=e,i=this.chart._animationsDisabled;let{start:o,count:a}=cr(e,n,i);if(this._drawStart=o,this._drawCount=a,dr(e)&&(o=0,a=n.length),this.options.showLine){this.datasetElementType||this.addElements();const{dataset:r,_dataset:l}=e;r._chart=this.chart,r._datasetIndex=this.index,r._decimated=!!l._decimated,r.points=n;const c=this.resolveDatasetElementOptions(t);c.segment=this.options.segment,this.updateElement(r,void 0,{animated:!i,options:c},t)}else this.datasetElementType&&(delete e.dataset,this.datasetElementType=!1);this.updateElements(n,o,a,t)}addElements(){const{showLine:t}=this.options;!this.datasetElementType&&t&&(this.datasetElementType=this.chart.registry.getElement("line")),super.addElements()}updateElements(t,e,n,i){const o=i==="reset",{iScale:a,vScale:r,_stacked:l,_dataset:c}=this._cachedMeta,d=this.resolveDataElementOptions(e,i),h=this.getSharedOptions(d),u=this.includeOptions(i,h),f=a.axis,p=r.axis,{spanGaps:g,segment:m}=this.options,b=Ke(g)?g:Number.POSITIVE_INFINITY,v=this.chart._animationsDisabled||o||i==="none";let M=e>0&&this.getParsed(e-1);for(let k=e;k<e+n;++k){const w=t[k],E=this.getParsed(k),A=v?w:{},D=j(E[p]),I=A[f]=a.getPixelForValue(E[f],k),R=A[p]=o||D?r.getBasePixel():r.getPixelForValue(l?this.applyStack(r,E,l):E[p],k);A.skip=isNaN(I)||isNaN(R)||D,A.stop=k>0&&Math.abs(E[f]-M[f])>b,m&&(A.parsed=E,A.raw=c.data[k]),u&&(A.options=h||this.resolveDataElementOptions(k,w.active?"active":i)),v||this.updateElement(w,k,A,i),M=E}this.updateSharedOptions(h,i,d)}getMaxOverflow(){const t=this._cachedMeta,e=t.data||[];if(!this.options.showLine){let r=0;for(let l=e.length-1;l>=0;--l)r=Math.max(r,e[l].size(this.resolveDataElementOptions(l))/2);return r>0&&r}const n=t.dataset,i=n.options&&n.options.borderWidth||0;if(!e.length)return i;const o=e[0].size(this.resolveDataElementOptions(0)),a=e[e.length-1].size(this.resolveDataElementOptions(e.length-1));return Math.max(i,o,a)/2}}C(qs,"id","scatter"),C(qs,"defaults",{datasetElementType:!1,dataElementType:"point",showLine:!1,fill:!1}),C(qs,"overrides",{interaction:{mode:"point"},scales:{x:{type:"linear"},y:{type:"linear"}}});var fd=Object.freeze({__proto__:null,BarController:Hs,BubbleController:Ys,DoughnutController:Ie,LineController:Us,PieController:Wn,PolarAreaController:xs,RadarController:Xs,ScatterController:qs});function Ae(){throw new Error("This method is not implemented: Check that a complete date adapter is provided.")}class vi{constructor(t){C(this,"options");this.options=t||{}}static override(t){Object.assign(vi.prototype,t)}init(){}formats(){return Ae()}parse(){return Ae()}format(){return Ae()}add(){return Ae()}diff(){return Ae()}startOf(){return Ae()}endOf(){return Ae()}}var pd={_date:vi};function gd(s,t,e,n){const{controller:i,data:o,_sorted:a}=s,r=i._cachedMeta.iScale,l=s.dataset&&s.dataset.options?s.dataset.options.spanGaps:null;if(r&&t===r.axis&&t!=="r"&&a&&o.length){const c=r._reversePixels?Rl:ne;if(n){if(i._sharedOptions){const d=o[0],h=typeof d.getRange=="function"&&d.getRange(t);if(h){const u=c(o,t,e-h),f=c(o,t,e+h);return{lo:u.lo,hi:f.hi}}}}else{const d=c(o,t,e);if(l){const{vScale:h}=i._cachedMeta,{_parsed:u}=s,f=u.slice(0,d.lo+1).reverse().findIndex(g=>!j(g[h.axis]));d.lo-=Math.max(0,f);const p=u.slice(d.hi).findIndex(g=>!j(g[h.axis]));d.hi+=Math.max(0,p)}return d}}return{lo:0,hi:o.length-1}}function xn(s,t,e,n,i){const o=s.getSortedVisibleDatasetMetas(),a=e[t];for(let r=0,l=o.length;r<l;++r){const{index:c,data:d}=o[r],{lo:h,hi:u}=gd(o[r],t,a,i);for(let f=h;f<=u;++f){const p=d[f];p.skip||n(p,c,f)}}}function md(s){const t=s.indexOf("x")!==-1,e=s.indexOf("y")!==-1;return function(n,i){const o=t?Math.abs(n.x-i.x):0,a=e?Math.abs(n.y-i.y):0;return Math.sqrt(Math.pow(o,2)+Math.pow(a,2))}}function An(s,t,e,n,i){const o=[];return!i&&!s.isPointInArea(t)||xn(s,e,t,function(r,l,c){!i&&!ie(r,s.chartArea,0)||r.inRange(t.x,t.y,n)&&o.push({element:r,datasetIndex:l,index:c})},!0),o}function bd(s,t,e,n){let i=[];function o(a,r,l){const{startAngle:c,endAngle:d}=a.getProps(["startAngle","endAngle"],n),{angle:h}=ir(a,{x:t.x,y:t.y});ks(h,c,d)&&i.push({element:a,datasetIndex:r,index:l})}return xn(s,e,t,o),i}function xd(s,t,e,n,i,o){let a=[];const r=md(e);let l=Number.POSITIVE_INFINITY;function c(d,h,u){const f=d.inRange(t.x,t.y,i);if(n&&!f)return;const p=d.getCenterPoint(i);if(!(!!o||s.isPointInArea(p))&&!f)return;const m=r(t,p);m<l?(a=[{element:d,datasetIndex:h,index:u}],l=m):m===l&&a.push({element:d,datasetIndex:h,index:u})}return xn(s,e,t,c),a}function Pn(s,t,e,n,i,o){return!o&&!s.isPointInArea(t)?[]:e==="r"&&!n?bd(s,t,e,i):xd(s,t,e,n,i,o)}function ra(s,t,e,n,i){const o=[],a=e==="x"?"inXRange":"inYRange";let r=!1;return xn(s,e,t,(l,c,d)=>{l[a]&&l[a](t[e],i)&&(o.push({element:l,datasetIndex:c,index:d}),r=r||l.inRange(t.x,t.y,i))}),n&&!r?[]:o}var yd={modes:{index(s,t,e,n){const i=De(t,s),o=e.axis||"x",a=e.includeInvisible||!1,r=e.intersect?An(s,i,o,n,a):Pn(s,i,o,!1,n,a),l=[];return r.length?(s.getSortedVisibleDatasetMetas().forEach(c=>{const d=r[0].index,h=c.data[d];h&&!h.skip&&l.push({element:h,datasetIndex:c.index,index:d})}),l):[]},dataset(s,t,e,n){const i=De(t,s),o=e.axis||"xy",a=e.includeInvisible||!1;let r=e.intersect?An(s,i,o,n,a):Pn(s,i,o,!1,n,a);if(r.length>0){const l=r[0].datasetIndex,c=s.getDatasetMeta(l).data;r=[];for(let d=0;d<c.length;++d)r.push({element:c[d],datasetIndex:l,index:d})}return r},point(s,t,e,n){const i=De(t,s),o=e.axis||"xy",a=e.includeInvisible||!1;return An(s,i,o,n,a)},nearest(s,t,e,n){const i=De(t,s),o=e.axis||"xy",a=e.includeInvisible||!1;return Pn(s,i,o,e.intersect,n,a)},x(s,t,e,n){const i=De(t,s);return ra(s,i,"x",e.intersect,n)},y(s,t,e,n){const i=De(t,s);return ra(s,i,"y",e.intersect,n)}}};const Pr=["left","top","right","bottom"];function es(s,t){return s.filter(e=>e.pos===t)}function la(s,t){return s.filter(e=>Pr.indexOf(e.pos)===-1&&e.box.axis===t)}function ss(s,t){return s.sort((e,n)=>{const i=t?n:e,o=t?e:n;return i.weight===o.weight?i.index-o.index:i.weight-o.weight})}function vd(s){const t=[];let e,n,i,o,a,r;for(e=0,n=(s||[]).length;e<n;++e)i=s[e],{position:o,options:{stack:a,stackWeight:r=1}}=i,t.push({index:e,box:i,pos:o,horizontal:i.isHorizontal(),weight:i.weight,stack:a&&o+a,stackWeight:r});return t}function _d(s){const t={};for(const e of s){const{stack:n,pos:i,stackWeight:o}=e;if(!n||!Pr.includes(i))continue;const a=t[n]||(t[n]={count:0,placed:0,weight:0,size:0});a.count++,a.weight+=o}return t}function wd(s,t){const e=_d(s),{vBoxMaxWidth:n,hBoxMaxHeight:i}=t;let o,a,r;for(o=0,a=s.length;o<a;++o){r=s[o];const{fullSize:l}=r.box,c=e[r.stack],d=c&&r.stackWeight/c.weight;r.horizontal?(r.width=d?d*n:l&&t.availableWidth,r.height=i):(r.width=n,r.height=d?d*i:l&&t.availableHeight)}return e}function kd(s){const t=vd(s),e=ss(t.filter(c=>c.box.fullSize),!0),n=ss(es(t,"left"),!0),i=ss(es(t,"right")),o=ss(es(t,"top"),!0),a=ss(es(t,"bottom")),r=la(t,"x"),l=la(t,"y");return{fullSize:e,leftAndTop:n.concat(o),rightAndBottom:i.concat(l).concat(a).concat(r),chartArea:es(t,"chartArea"),vertical:n.concat(i).concat(l),horizontal:o.concat(a).concat(r)}}function ca(s,t,e,n){return Math.max(s[e],t[e])+Math.max(s[n],t[n])}function Dr(s,t){s.top=Math.max(s.top,t.top),s.left=Math.max(s.left,t.left),s.bottom=Math.max(s.bottom,t.bottom),s.right=Math.max(s.right,t.right)}function Md(s,t,e,n){const{pos:i,box:o}=e,a=s.maxPadding;if(!N(i)){e.size&&(s[i]-=e.size);const h=n[e.stack]||{size:0,count:1};h.size=Math.max(h.size,e.horizontal?o.height:o.width),e.size=h.size/h.count,s[i]+=e.size}o.getPadding&&Dr(a,o.getPadding());const r=Math.max(0,t.outerWidth-ca(a,s,"left","right")),l=Math.max(0,t.outerHeight-ca(a,s,"top","bottom")),c=r!==s.w,d=l!==s.h;return s.w=r,s.h=l,e.horizontal?{same:c,other:d}:{same:d,other:c}}function Sd(s){const t=s.maxPadding;function e(n){const i=Math.max(t[n]-s[n],0);return s[n]+=i,i}s.y+=e("top"),s.x+=e("left"),e("right"),e("bottom")}function Cd(s,t){const e=t.maxPadding;function n(i){const o={left:0,top:0,right:0,bottom:0};return i.forEach(a=>{o[a]=Math.max(t[a],e[a])}),o}return n(s?["left","right"]:["top","bottom"])}function ls(s,t,e,n){const i=[];let o,a,r,l,c,d;for(o=0,a=s.length,c=0;o<a;++o){r=s[o],l=r.box,l.update(r.width||t.w,r.height||t.h,Cd(r.horizontal,t));const{same:h,other:u}=Md(t,e,r,n);c|=h&&i.length,d=d||u,l.fullSize||i.push(r)}return c&&ls(i,t,e,n)||d}function Rs(s,t,e,n,i){s.top=e,s.left=t,s.right=t+n,s.bottom=e+i,s.width=n,s.height=i}function da(s,t,e,n){const i=e.padding;let{x:o,y:a}=t;for(const r of s){const l=r.box,c=n[r.stack]||{placed:0,weight:1},d=r.stackWeight/c.weight||1;if(r.horizontal){const h=t.w*d,u=c.size||l.height;ws(c.start)&&(a=c.start),l.fullSize?Rs(l,i.left,a,e.outerWidth-i.right-i.left,u):Rs(l,t.left+c.placed,a,h,u),c.start=a,c.placed+=h,a=l.bottom}else{const h=t.h*d,u=c.size||l.width;ws(c.start)&&(o=c.start),l.fullSize?Rs(l,o,i.top,u,e.outerHeight-i.bottom-i.top):Rs(l,o,t.top+c.placed,u,h),c.start=o,c.placed+=h,o=l.right}}t.x=o,t.y=a}var kt={addBox(s,t){s.boxes||(s.boxes=[]),t.fullSize=t.fullSize||!1,t.position=t.position||"top",t.weight=t.weight||0,t._layers=t._layers||function(){return[{z:0,draw(e){t.draw(e)}}]},s.boxes.push(t)},removeBox(s,t){const e=s.boxes?s.boxes.indexOf(t):-1;e!==-1&&s.boxes.splice(e,1)},configure(s,t,e){t.fullSize=e.fullSize,t.position=e.position,t.weight=e.weight},update(s,t,e,n){if(!s)return;const i=Mt(s.options.layout.padding),o=Math.max(t-i.width,0),a=Math.max(e-i.height,0),r=kd(s.boxes),l=r.vertical,c=r.horizontal;U(s.boxes,g=>{typeof g.beforeLayout=="function"&&g.beforeLayout()});const d=l.reduce((g,m)=>m.box.options&&m.box.options.display===!1?g:g+1,0)||1,h=Object.freeze({outerWidth:t,outerHeight:e,padding:i,availableWidth:o,availableHeight:a,vBoxMaxWidth:o/2/d,hBoxMaxHeight:a/2}),u=Object.assign({},i);Dr(u,Mt(n));const f=Object.assign({maxPadding:u,w:o,h:a,x:i.left,y:i.top},i),p=wd(l.concat(c),h);ls(r.fullSize,f,h,p),ls(l,f,h,p),ls(c,f,h,p)&&ls(l,f,h,p),Sd(f),da(r.leftAndTop,f,h,p),f.x+=f.w,f.y+=f.h,da(r.rightAndBottom,f,h,p),s.chartArea={left:f.left,top:f.top,right:f.left+f.w,bottom:f.top+f.h,height:f.h,width:f.w},U(r.chartArea,g=>{const m=g.box;Object.assign(m,s.chartArea),m.update(f.w,f.h,{left:0,top:0,right:0,bottom:0})})}};class Tr{acquireContext(t,e){}releaseContext(t){return!1}addEventListener(t,e,n){}removeEventListener(t,e,n){}getDevicePixelRatio(){return 1}getMaximumSize(t,e,n,i){return e=Math.max(0,e||t.width),n=n||t.height,{width:e,height:Math.max(0,i?Math.floor(e/i):n)}}isAttached(t){return!0}updateConfig(t){}}class Ed extends Tr{acquireContext(t){return t&&t.getContext&&t.getContext("2d")||null}updateConfig(t){t.options.animation=!1}}const Gs="$chartjs",Ad={touchstart:"mousedown",touchmove:"mousemove",touchend:"mouseup",pointerenter:"mouseenter",pointerdown:"mousedown",pointermove:"mousemove",pointerup:"mouseup",pointerleave:"mouseout",pointerout:"mouseout"},ha=s=>s===null||s==="";function Pd(s,t){const e=s.style,n=s.getAttribute("height"),i=s.getAttribute("width");if(s[Gs]={initial:{height:n,width:i,style:{display:e.display,height:e.height,width:e.width}}},e.display=e.display||"block",e.boxSizing=e.boxSizing||"border-box",ha(i)){const o=qo(s,"width");o!==void 0&&(s.width=o)}if(ha(n))if(s.style.height==="")s.height=s.width/(t||2);else{const o=qo(s,"height");o!==void 0&&(s.height=o)}return s}const Lr=Dc?{passive:!0}:!1;function Dd(s,t,e){s&&s.addEventListener(t,e,Lr)}function Td(s,t,e){s&&s.canvas&&s.canvas.removeEventListener(t,e,Lr)}function Ld(s,t){const e=Ad[s.type]||s.type,{x:n,y:i}=De(s,t);return{type:e,chart:t,native:s,x:n!==void 0?n:null,y:i!==void 0?i:null}}function cn(s,t){for(const e of s)if(e===t||e.contains(t))return!0}function Id(s,t,e){const n=s.canvas,i=new MutationObserver(o=>{let a=!1;for(const r of o)a=a||cn(r.addedNodes,n),a=a&&!cn(r.removedNodes,n);a&&e()});return i.observe(document,{childList:!0,subtree:!0}),i}function $d(s,t,e){const n=s.canvas,i=new MutationObserver(o=>{let a=!1;for(const r of o)a=a||cn(r.removedNodes,n),a=a&&!cn(r.addedNodes,n);a&&e()});return i.observe(document,{childList:!0,subtree:!0}),i}const Ss=new Map;let ua=0;function Ir(){const s=window.devicePixelRatio;s!==ua&&(ua=s,Ss.forEach((t,e)=>{e.currentDevicePixelRatio!==s&&t()}))}function Od(s,t){Ss.size||window.addEventListener("resize",Ir),Ss.set(s,t)}function Bd(s){Ss.delete(s),Ss.size||window.removeEventListener("resize",Ir)}function Rd(s,t,e){const n=s.canvas,i=n&&yi(n);if(!i)return;const o=lr((r,l)=>{const c=i.clientWidth;e(r,l),c<i.clientWidth&&e()},window),a=new ResizeObserver(r=>{const l=r[0],c=l.contentRect.width,d=l.contentRect.height;c===0&&d===0||o(c,d)});return a.observe(i),Od(s,o),a}function Dn(s,t,e){e&&e.disconnect(),t==="resize"&&Bd(s)}function Fd(s,t,e){const n=s.canvas,i=lr(o=>{s.ctx!==null&&e(Ld(o,s))},s);return Dd(n,t,i),i}class zd extends Tr{acquireContext(t,e){const n=t&&t.getContext&&t.getContext("2d");return n&&n.canvas===t?(Pd(t,e),n):null}releaseContext(t){const e=t.canvas;if(!e[Gs])return!1;const n=e[Gs].initial;["height","width"].forEach(o=>{const a=n[o];j(a)?e.removeAttribute(o):e.setAttribute(o,a)});const i=n.style||{};return Object.keys(i).forEach(o=>{e.style[o]=i[o]}),e.width=e.width,delete e[Gs],!0}addEventListener(t,e,n){this.removeEventListener(t,e);const i=t.$proxies||(t.$proxies={}),a={attach:Id,detach:$d,resize:Rd}[e]||Fd;i[e]=a(t,e,n)}removeEventListener(t,e){const n=t.$proxies||(t.$proxies={}),i=n[e];if(!i)return;({attach:Dn,detach:Dn,resize:Dn}[e]||Td)(t,e,i),n[e]=void 0}getDevicePixelRatio(){return window.devicePixelRatio}getMaximumSize(t,e,n,i){return Pc(t,e,n,i)}isAttached(t){const e=t&&yi(t);return!!(e&&e.isConnected)}}function jd(s){return!xi()||typeof OffscreenCanvas<"u"&&s instanceof OffscreenCanvas?Ed:zd}class Nt{constructor(){C(this,"x");C(this,"y");C(this,"active",!1);C(this,"options");C(this,"$animations")}tooltipPosition(t){const{x:e,y:n}=this.getProps(["x","y"],t);return{x:e,y:n}}hasValue(){return Ke(this.x)&&Ke(this.y)}getProps(t,e){const n=this.$animations;if(!e||!n)return this;const i={};return t.forEach(o=>{i[o]=n[o]&&n[o].active()?n[o]._to:this[o]}),i}}C(Nt,"defaults",{}),C(Nt,"defaultRoutes");function Nd(s,t){const e=s.options.ticks,n=Vd(s),i=Math.min(e.maxTicksLimit||n,n),o=e.major.enabled?Hd(t):[],a=o.length,r=o[0],l=o[a-1],c=[];if(a>i)return Yd(t,c,o,a/i),c;const d=Wd(o,t,i);if(a>0){let h,u;const f=a>1?Math.round((l-r)/(a-1)):null;for(Fs(t,c,d,j(f)?0:r-f,r),h=0,u=a-1;h<u;h++)Fs(t,c,d,o[h],o[h+1]);return Fs(t,c,d,l,j(f)?t.length:l+f),c}return Fs(t,c,d),c}function Vd(s){const t=s.options.offset,e=s._tickSize(),n=s._length/e+(t?0:1),i=s._maxLength/e;return Math.floor(Math.min(n,i))}function Wd(s,t,e){const n=Ud(s),i=t.length/e;if(!n)return Math.max(i,1);const o=Ll(n);for(let a=0,r=o.length-1;a<r;a++){const l=o[a];if(l>i)return l}return Math.max(i,1)}function Hd(s){const t=[];let e,n;for(e=0,n=s.length;e<n;e++)s[e].major&&t.push(e);return t}function Yd(s,t,e,n){let i=0,o=e[0],a;for(n=Math.ceil(n),a=0;a<s.length;a++)a===o&&(t.push(s[a]),i++,o=e[i*n])}function Fs(s,t,e,n,i){const o=B(n,0),a=Math.min(B(i,s.length),s.length);let r=0,l,c,d;for(e=Math.ceil(e),i&&(l=i-n,e=l/Math.floor(l/e)),d=o;d<0;)r++,d=Math.round(o+r*e);for(c=Math.max(o,0);c<a;c++)c===d&&(t.push(s[c]),r++,d=Math.round(o+r*e))}function Ud(s){const t=s.length;let e,n;if(t<2)return!1;for(n=s[0],e=1;e<t;++e)if(s[e]-s[e-1]!==n)return!1;return n}const Xd=s=>s==="left"?"right":s==="right"?"left":s,fa=(s,t,e)=>t==="top"||t==="left"?s[t]+e:s[t]-e,pa=(s,t)=>Math.min(t||s,s);function ga(s,t){const e=[],n=s.length/t,i=s.length;let o=0;for(;o<i;o+=n)e.push(s[Math.floor(o)]);return e}function qd(s,t,e){const n=s.ticks.length,i=Math.min(t,n-1),o=s._startPixel,a=s._endPixel,r=1e-6;let l=s.getPixelForTick(i),c;if(!(e&&(n===1?c=Math.max(l-o,a-l):t===0?c=(s.getPixelForTick(1)-l)/2:c=(l-s.getPixelForTick(i-1))/2,l+=i<t?c:-c,l<o-r||l>a+r)))return l}function Gd(s,t){U(s,e=>{const n=e.gc,i=n.length/2;let o;if(i>t){for(o=0;o<i;++o)delete e.data[n[o]];n.splice(0,i)}})}function ns(s){return s.drawTicks?s.tickLength:0}function ma(s,t){if(!s.display)return 0;const e=pt(s.font,t),n=Mt(s.padding);return(Q(s.text)?s.text.length:1)*e.lineHeight+n.height}function Kd(s,t){return Me(s,{scale:t,type:"scale"})}function Jd(s,t,e){return Me(s,{tick:e,index:t,type:"tick"})}function Zd(s,t,e){let n=ui(s);return(e&&t!=="right"||!e&&t==="right")&&(n=Xd(n)),n}function Qd(s,t,e,n){const{top:i,left:o,bottom:a,right:r,chart:l}=s,{chartArea:c,scales:d}=l;let h=0,u,f,p;const g=a-i,m=r-o;if(s.isHorizontal()){if(f=yt(n,o,r),N(e)){const b=Object.keys(e)[0],v=e[b];p=d[b].getPixelForValue(v)+g-t}else e==="center"?p=(c.bottom+c.top)/2+g-t:p=fa(s,e,t);u=r-o}else{if(N(e)){const b=Object.keys(e)[0],v=e[b];f=d[b].getPixelForValue(v)-m+t}else e==="center"?f=(c.left+c.right)/2-m+t:f=fa(s,e,t);p=yt(n,a,i),h=e==="left"?-rt:rt}return{titleX:f,titleY:p,maxWidth:u,rotation:h}}class je extends Nt{constructor(t){super(),this.id=t.id,this.type=t.type,this.options=void 0,this.ctx=t.ctx,this.chart=t.chart,this.top=void 0,this.bottom=void 0,this.left=void 0,this.right=void 0,this.width=void 0,this.height=void 0,this._margins={left:0,right:0,top:0,bottom:0},this.maxWidth=void 0,this.maxHeight=void 0,this.paddingTop=void 0,this.paddingBottom=void 0,this.paddingLeft=void 0,this.paddingRight=void 0,this.axis=void 0,this.labelRotation=void 0,this.min=void 0,this.max=void 0,this._range=void 0,this.ticks=[],this._gridLineItems=null,this._labelItems=null,this._labelSizes=null,this._length=0,this._maxLength=0,this._longestTextCache={},this._startPixel=void 0,this._endPixel=void 0,this._reversePixels=!1,this._userMax=void 0,this._userMin=void 0,this._suggestedMax=void 0,this._suggestedMin=void 0,this._ticksLength=0,this._borderValue=0,this._cache={},this._dataLimitsCached=!1,this.$context=void 0}init(t){this.options=t.setContext(this.getContext()),this.axis=t.axis,this._userMin=this.parse(t.min),this._userMax=this.parse(t.max),this._suggestedMin=this.parse(t.suggestedMin),this._suggestedMax=this.parse(t.suggestedMax)}parse(t,e){return t}getUserBounds(){let{_userMin:t,_userMax:e,_suggestedMin:n,_suggestedMax:i}=this;return t=It(t,Number.POSITIVE_INFINITY),e=It(e,Number.NEGATIVE_INFINITY),n=It(n,Number.POSITIVE_INFINITY),i=It(i,Number.NEGATIVE_INFINITY),{min:It(t,n),max:It(e,i),minDefined:st(t),maxDefined:st(e)}}getMinMax(t){let{min:e,max:n,minDefined:i,maxDefined:o}=this.getUserBounds(),a;if(i&&o)return{min:e,max:n};const r=this.getMatchingVisibleMetas();for(let l=0,c=r.length;l<c;++l)a=r[l].controller.getMinMax(this,t),i||(e=Math.min(e,a.min)),o||(n=Math.max(n,a.max));return e=o&&e>n?n:e,n=i&&e>n?e:n,{min:It(e,It(n,e)),max:It(n,It(e,n))}}getPadding(){return{left:this.paddingLeft||0,top:this.paddingTop||0,right:this.paddingRight||0,bottom:this.paddingBottom||0}}getTicks(){return this.ticks}getLabels(){const t=this.chart.data;return this.options.labels||(this.isHorizontal()?t.xLabels:t.yLabels)||t.labels||[]}getLabelItems(t=this.chart.chartArea){return this._labelItems||(this._labelItems=this._computeLabelItems(t))}beforeLayout(){this._cache={},this._dataLimitsCached=!1}beforeUpdate(){G(this.options.beforeUpdate,[this])}update(t,e,n){const{beginAtZero:i,grace:o,ticks:a}=this.options,r=a.sampleSize;this.beforeUpdate(),this.maxWidth=t,this.maxHeight=e,this._margins=n=Object.assign({left:0,right:0,top:0,bottom:0},n),this.ticks=null,this._labelSizes=null,this._gridLineItems=null,this._labelItems=null,this.beforeSetDimensions(),this.setDimensions(),this.afterSetDimensions(),this._maxLength=this.isHorizontal()?this.width+n.left+n.right:this.height+n.top+n.bottom,this._dataLimitsCached||(this.beforeDataLimits(),this.determineDataLimits(),this.afterDataLimits(),this._range=rc(this,o,i),this._dataLimitsCached=!0),this.beforeBuildTicks(),this.ticks=this.buildTicks()||[],this.afterBuildTicks();const l=r<this.ticks.length;this._convertTicksToLabels(l?ga(this.ticks,r):this.ticks),this.configure(),this.beforeCalculateLabelRotation(),this.calculateLabelRotation(),this.afterCalculateLabelRotation(),a.display&&(a.autoSkip||a.source==="auto")&&(this.ticks=Nd(this,this.ticks),this._labelSizes=null,this.afterAutoSkip()),l&&this._convertTicksToLabels(this.ticks),this.beforeFit(),this.fit(),this.afterFit(),this.afterUpdate()}configure(){let t=this.options.reverse,e,n;this.isHorizontal()?(e=this.left,n=this.right):(e=this.top,n=this.bottom,t=!t),this._startPixel=e,this._endPixel=n,this._reversePixels=t,this._length=n-e,this._alignToPixels=this.options.alignToPixels}afterUpdate(){G(this.options.afterUpdate,[this])}beforeSetDimensions(){G(this.options.beforeSetDimensions,[this])}setDimensions(){this.isHorizontal()?(this.width=this.maxWidth,this.left=0,this.right=this.width):(this.height=this.maxHeight,this.top=0,this.bottom=this.height),this.paddingLeft=0,this.paddingTop=0,this.paddingRight=0,this.paddingBottom=0}afterSetDimensions(){G(this.options.afterSetDimensions,[this])}_callHooks(t){this.chart.notifyPlugins(t,this.getContext()),G(this.options[t],[this])}beforeDataLimits(){this._callHooks("beforeDataLimits")}determineDataLimits(){}afterDataLimits(){this._callHooks("afterDataLimits")}beforeBuildTicks(){this._callHooks("beforeBuildTicks")}buildTicks(){return[]}afterBuildTicks(){this._callHooks("afterBuildTicks")}beforeTickToLabelConversion(){G(this.options.beforeTickToLabelConversion,[this])}generateTickLabels(t){const e=this.options.ticks;let n,i,o;for(n=0,i=t.length;n<i;n++)o=t[n],o.label=G(e.callback,[o.value,n,t],this)}afterTickToLabelConversion(){G(this.options.afterTickToLabelConversion,[this])}beforeCalculateLabelRotation(){G(this.options.beforeCalculateLabelRotation,[this])}calculateLabelRotation(){const t=this.options,e=t.ticks,n=pa(this.ticks.length,t.ticks.maxTicksLimit),i=e.minRotation||0,o=e.maxRotation;let a=i,r,l,c;if(!this._isVisible()||!e.display||i>=o||n<=1||!this.isHorizontal()){this.labelRotation=i;return}const d=this._getLabelSizes(),h=d.widest.width,u=d.highest.height,f=mt(this.chart.width-h,0,this.maxWidth);r=t.offset?this.maxWidth/n:f/(n-1),h+6>r&&(r=f/(n-(t.offset?.5:1)),l=this.maxHeight-ns(t.grid)-e.padding-ma(t.title,this.chart.options.font),c=Math.sqrt(h*h+u*u),a=di(Math.min(Math.asin(mt((d.highest.height+6)/r,-1,1)),Math.asin(mt(l/c,-1,1))-Math.asin(mt(u/c,-1,1)))),a=Math.max(i,Math.min(o,a))),this.labelRotation=a}afterCalculateLabelRotation(){G(this.options.afterCalculateLabelRotation,[this])}afterAutoSkip(){}beforeFit(){G(this.options.beforeFit,[this])}fit(){const t={width:0,height:0},{chart:e,options:{ticks:n,title:i,grid:o}}=this,a=this._isVisible(),r=this.isHorizontal();if(a){const l=ma(i,e.options.font);if(r?(t.width=this.maxWidth,t.height=ns(o)+l):(t.height=this.maxHeight,t.width=ns(o)+l),n.display&&this.ticks.length){const{first:c,last:d,widest:h,highest:u}=this._getLabelSizes(),f=n.padding*2,p=zt(this.labelRotation),g=Math.cos(p),m=Math.sin(p);if(r){const b=n.mirror?0:m*h.width+g*u.height;t.height=Math.min(this.maxHeight,t.height+b+f)}else{const b=n.mirror?0:g*h.width+m*u.height;t.width=Math.min(this.maxWidth,t.width+b+f)}this._calculatePadding(c,d,m,g)}}this._handleMargins(),r?(this.width=this._length=e.width-this._margins.left-this._margins.right,this.height=t.height):(this.width=t.width,this.height=this._length=e.height-this._margins.top-this._margins.bottom)}_calculatePadding(t,e,n,i){const{ticks:{align:o,padding:a},position:r}=this.options,l=this.labelRotation!==0,c=r!=="top"&&this.axis==="x";if(this.isHorizontal()){const d=this.getPixelForTick(0)-this.left,h=this.right-this.getPixelForTick(this.ticks.length-1);let u=0,f=0;l?c?(u=i*t.width,f=n*e.height):(u=n*t.height,f=i*e.width):o==="start"?f=e.width:o==="end"?u=t.width:o!=="inner"&&(u=t.width/2,f=e.width/2),this.paddingLeft=Math.max((u-d+a)*this.width/(this.width-d),0),this.paddingRight=Math.max((f-h+a)*this.width/(this.width-h),0)}else{let d=e.height/2,h=t.height/2;o==="start"?(d=0,h=t.height):o==="end"&&(d=e.height,h=0),this.paddingTop=d+a,this.paddingBottom=h+a}}_handleMargins(){this._margins&&(this._margins.left=Math.max(this.paddingLeft,this._margins.left),this._margins.top=Math.max(this.paddingTop,this._margins.top),this._margins.right=Math.max(this.paddingRight,this._margins.right),this._margins.bottom=Math.max(this.paddingBottom,this._margins.bottom))}afterFit(){G(this.options.afterFit,[this])}isHorizontal(){const{axis:t,position:e}=this.options;return e==="top"||e==="bottom"||t==="x"}isFullSize(){return this.options.fullSize}_convertTicksToLabels(t){this.beforeTickToLabelConversion(),this.generateTickLabels(t);let e,n;for(e=0,n=t.length;e<n;e++)j(t[e].label)&&(t.splice(e,1),n--,e--);this.afterTickToLabelConversion()}_getLabelSizes(){let t=this._labelSizes;if(!t){const e=this.options.ticks.sampleSize;let n=this.ticks;e<n.length&&(n=ga(n,e)),this._labelSizes=t=this._computeLabelSizes(n,n.length,this.options.ticks.maxTicksLimit)}return t}_computeLabelSizes(t,e,n){const{ctx:i,_longestTextCache:o}=this,a=[],r=[],l=Math.floor(e/pa(e,n));let c=0,d=0,h,u,f,p,g,m,b,v,M,k,w;for(h=0;h<e;h+=l){if(p=t[h].label,g=this._resolveTickFontOptions(h),i.font=m=g.string,b=o[m]=o[m]||{data:{},gc:[]},v=g.lineHeight,M=k=0,!j(p)&&!Q(p))M=rn(i,b.data,b.gc,M,p),k=v;else if(Q(p))for(u=0,f=p.length;u<f;++u)w=p[u],!j(w)&&!Q(w)&&(M=rn(i,b.data,b.gc,M,w),k+=v);a.push(M),r.push(k),c=Math.max(M,c),d=Math.max(k,d)}Gd(o,e);const E=a.indexOf(c),A=r.indexOf(d),D=I=>({width:a[I]||0,height:r[I]||0});return{first:D(0),last:D(e-1),widest:D(E),highest:D(A),widths:a,heights:r}}getLabelForValue(t){return t}getPixelForValue(t,e){return NaN}getValueForPixel(t){}getPixelForTick(t){const e=this.ticks;return t<0||t>e.length-1?null:this.getPixelForValue(e[t].value)}getPixelForDecimal(t){this._reversePixels&&(t=1-t);const e=this._startPixel+t*this._length;return Bl(this._alignToPixels?Ee(this.chart,e,0):e)}getDecimalForPixel(t){const e=(t-this._startPixel)/this._length;return this._reversePixels?1-e:e}getBasePixel(){return this.getPixelForValue(this.getBaseValue())}getBaseValue(){const{min:t,max:e}=this;return t<0&&e<0?e:t>0&&e>0?t:0}getContext(t){const e=this.ticks||[];if(t>=0&&t<e.length){const n=e[t];return n.$context||(n.$context=Jd(this.getContext(),t,n))}return this.$context||(this.$context=Kd(this.chart.getContext(),this))}_tickSize(){const t=this.options.ticks,e=zt(this.labelRotation),n=Math.abs(Math.cos(e)),i=Math.abs(Math.sin(e)),o=this._getLabelSizes(),a=t.autoSkipPadding||0,r=o?o.widest.width+a:0,l=o?o.highest.height+a:0;return this.isHorizontal()?l*n>r*i?r/n:l/i:l*i<r*n?l/n:r/i}_isVisible(){const t=this.options.display;return t!=="auto"?!!t:this.getMatchingVisibleMetas().length>0}_computeGridLineItems(t){const e=this.axis,n=this.chart,i=this.options,{grid:o,position:a,border:r}=i,l=o.offset,c=this.isHorizontal(),h=this.ticks.length+(l?1:0),u=ns(o),f=[],p=r.setContext(this.getContext()),g=p.display?p.width:0,m=g/2,b=function(X){return Ee(n,X,g)};let v,M,k,w,E,A,D,I,R,F,z,lt;if(a==="top")v=b(this.bottom),A=this.bottom-u,I=v-m,F=b(t.top)+m,lt=t.bottom;else if(a==="bottom")v=b(this.top),F=t.top,lt=b(t.bottom)-m,A=v+m,I=this.top+u;else if(a==="left")v=b(this.right),E=this.right-u,D=v-m,R=b(t.left)+m,z=t.right;else if(a==="right")v=b(this.left),R=t.left,z=b(t.right)-m,E=v+m,D=this.left+u;else if(e==="x"){if(a==="center")v=b((t.top+t.bottom)/2+.5);else if(N(a)){const X=Object.keys(a)[0],J=a[X];v=b(this.chart.scales[X].getPixelForValue(J))}F=t.top,lt=t.bottom,A=v+m,I=A+u}else if(e==="y"){if(a==="center")v=b((t.left+t.right)/2);else if(N(a)){const X=Object.keys(a)[0],J=a[X];v=b(this.chart.scales[X].getPixelForValue(J))}E=v-m,D=E-u,R=t.left,z=t.right}const xt=B(i.ticks.maxTicksLimit,h),W=Math.max(1,Math.ceil(h/xt));for(M=0;M<h;M+=W){const X=this.getContext(M),J=o.setContext(X),Et=r.setContext(X),ht=J.lineWidth,Gt=J.color,Se=Et.dash||[],Kt=Et.dashOffset,oe=J.tickWidth,Wt=J.tickColor,ae=J.tickBorderDash||[],Ht=J.tickBorderDashOffset;k=qd(this,M,l),k!==void 0&&(w=Ee(n,k,ht),c?E=D=R=z=w:A=I=F=lt=w,f.push({tx1:E,ty1:A,tx2:D,ty2:I,x1:R,y1:F,x2:z,y2:lt,width:ht,color:Gt,borderDash:Se,borderDashOffset:Kt,tickWidth:oe,tickColor:Wt,tickBorderDash:ae,tickBorderDashOffset:Ht}))}return this._ticksLength=h,this._borderValue=v,f}_computeLabelItems(t){const e=this.axis,n=this.options,{position:i,ticks:o}=n,a=this.isHorizontal(),r=this.ticks,{align:l,crossAlign:c,padding:d,mirror:h}=o,u=ns(n.grid),f=u+d,p=h?-d:f,g=-zt(this.labelRotation),m=[];let b,v,M,k,w,E,A,D,I,R,F,z,lt="middle";if(i==="top")E=this.bottom-p,A=this._getXAxisLabelAlignment();else if(i==="bottom")E=this.top+p,A=this._getXAxisLabelAlignment();else if(i==="left"){const W=this._getYAxisLabelAlignment(u);A=W.textAlign,w=W.x}else if(i==="right"){const W=this._getYAxisLabelAlignment(u);A=W.textAlign,w=W.x}else if(e==="x"){if(i==="center")E=(t.top+t.bottom)/2+f;else if(N(i)){const W=Object.keys(i)[0],X=i[W];E=this.chart.scales[W].getPixelForValue(X)+f}A=this._getXAxisLabelAlignment()}else if(e==="y"){if(i==="center")w=(t.left+t.right)/2-f;else if(N(i)){const W=Object.keys(i)[0],X=i[W];w=this.chart.scales[W].getPixelForValue(X)}A=this._getYAxisLabelAlignment(u).textAlign}e==="y"&&(l==="start"?lt="top":l==="end"&&(lt="bottom"));const xt=this._getLabelSizes();for(b=0,v=r.length;b<v;++b){M=r[b],k=M.label;const W=o.setContext(this.getContext(b));D=this.getPixelForTick(b)+o.labelOffset,I=this._resolveTickFontOptions(b),R=I.lineHeight,F=Q(k)?k.length:1;const X=F/2,J=W.color,Et=W.textStrokeColor,ht=W.textStrokeWidth;let Gt=A;a?(w=D,A==="inner"&&(b===v-1?Gt=this.options.reverse?"left":"right":b===0?Gt=this.options.reverse?"right":"left":Gt="center"),i==="top"?c==="near"||g!==0?z=-F*R+R/2:c==="center"?z=-xt.highest.height/2-X*R+R:z=-xt.highest.height+R/2:c==="near"||g!==0?z=R/2:c==="center"?z=xt.highest.height/2-X*R:z=xt.highest.height-F*R,h&&(z*=-1),g!==0&&!W.showLabelBackdrop&&(w+=R/2*Math.sin(g))):(E=D,z=(1-F)*R/2);let Se;if(W.showLabelBackdrop){const Kt=Mt(W.backdropPadding),oe=xt.heights[b],Wt=xt.widths[b];let ae=z-Kt.top,Ht=0-Kt.left;switch(lt){case"middle":ae-=oe/2;break;case"bottom":ae-=oe;break}switch(A){case"center":Ht-=Wt/2;break;case"right":Ht-=Wt;break;case"inner":b===v-1?Ht-=Wt:b>0&&(Ht-=Wt/2);break}Se={left:Ht,top:ae,width:Wt+Kt.width,height:oe+Kt.height,color:W.backdropColor}}m.push({label:k,font:I,textOffset:z,options:{rotation:g,color:J,strokeColor:Et,strokeWidth:ht,textAlign:Gt,textBaseline:lt,translation:[w,E],backdrop:Se}})}return m}_getXAxisLabelAlignment(){const{position:t,ticks:e}=this.options;if(-zt(this.labelRotation))return t==="top"?"left":"right";let i="center";return e.align==="start"?i="left":e.align==="end"?i="right":e.align==="inner"&&(i="inner"),i}_getYAxisLabelAlignment(t){const{position:e,ticks:{crossAlign:n,mirror:i,padding:o}}=this.options,a=this._getLabelSizes(),r=t+o,l=a.widest.width;let c,d;return e==="left"?i?(d=this.right+o,n==="near"?c="left":n==="center"?(c="center",d+=l/2):(c="right",d+=l)):(d=this.right-r,n==="near"?c="right":n==="center"?(c="center",d-=l/2):(c="left",d=this.left)):e==="right"?i?(d=this.left+o,n==="near"?c="right":n==="center"?(c="center",d-=l/2):(c="left",d-=l)):(d=this.left+r,n==="near"?c="left":n==="center"?(c="center",d+=l/2):(c="right",d=this.right)):c="right",{textAlign:c,x:d}}_computeLabelArea(){if(this.options.ticks.mirror)return;const t=this.chart,e=this.options.position;if(e==="left"||e==="right")return{top:0,left:this.left,bottom:t.height,right:this.right};if(e==="top"||e==="bottom")return{top:this.top,left:0,bottom:this.bottom,right:t.width}}drawBackground(){const{ctx:t,options:{backgroundColor:e},left:n,top:i,width:o,height:a}=this;e&&(t.save(),t.fillStyle=e,t.fillRect(n,i,o,a),t.restore())}getLineWidthForValue(t){const e=this.options.grid;if(!this._isVisible()||!e.display)return 0;const i=this.ticks.findIndex(o=>o.value===t);return i>=0?e.setContext(this.getContext(i)).lineWidth:0}drawGrid(t){const e=this.options.grid,n=this.ctx,i=this._gridLineItems||(this._gridLineItems=this._computeGridLineItems(t));let o,a;const r=(l,c,d)=>{!d.width||!d.color||(n.save(),n.lineWidth=d.width,n.strokeStyle=d.color,n.setLineDash(d.borderDash||[]),n.lineDashOffset=d.borderDashOffset,n.beginPath(),n.moveTo(l.x,l.y),n.lineTo(c.x,c.y),n.stroke(),n.restore())};if(e.display)for(o=0,a=i.length;o<a;++o){const l=i[o];e.drawOnChartArea&&r({x:l.x1,y:l.y1},{x:l.x2,y:l.y2},l),e.drawTicks&&r({x:l.tx1,y:l.ty1},{x:l.tx2,y:l.ty2},{color:l.tickColor,width:l.tickWidth,borderDash:l.tickBorderDash,borderDashOffset:l.tickBorderDashOffset})}}drawBorder(){const{chart:t,ctx:e,options:{border:n,grid:i}}=this,o=n.setContext(this.getContext()),a=n.display?o.width:0;if(!a)return;const r=i.setContext(this.getContext(0)).lineWidth,l=this._borderValue;let c,d,h,u;this.isHorizontal()?(c=Ee(t,this.left,a)-a/2,d=Ee(t,this.right,r)+r/2,h=u=l):(h=Ee(t,this.top,a)-a/2,u=Ee(t,this.bottom,r)+r/2,c=d=l),e.save(),e.lineWidth=o.width,e.strokeStyle=o.color,e.beginPath(),e.moveTo(c,h),e.lineTo(d,u),e.stroke(),e.restore()}drawLabels(t){if(!this.options.ticks.display)return;const n=this.ctx,i=this._computeLabelArea();i&&gn(n,i);const o=this.getLabelItems(t);for(const a of o){const r=a.options,l=a.font,c=a.label,d=a.textOffset;ze(n,c,0,d,l,r)}i&&mn(n)}drawTitle(){const{ctx:t,options:{position:e,title:n,reverse:i}}=this;if(!n.display)return;const o=pt(n.font),a=Mt(n.padding),r=n.align;let l=o.lineHeight/2;e==="bottom"||e==="center"||N(e)?(l+=a.bottom,Q(n.text)&&(l+=o.lineHeight*(n.text.length-1))):l+=a.top;const{titleX:c,titleY:d,maxWidth:h,rotation:u}=Qd(this,l,e,r);ze(t,n.text,0,0,o,{color:n.color,maxWidth:h,rotation:u,textAlign:Zd(r,e,i),textBaseline:"middle",translation:[c,d]})}draw(t){this._isVisible()&&(this.drawBackground(),this.drawGrid(t),this.drawBorder(),this.drawTitle(),this.drawLabels(t))}_layers(){const t=this.options,e=t.ticks&&t.ticks.z||0,n=B(t.grid&&t.grid.z,-1),i=B(t.border&&t.border.z,0);return!this._isVisible()||this.draw!==je.prototype.draw?[{z:e,draw:o=>{this.draw(o)}}]:[{z:n,draw:o=>{this.drawBackground(),this.drawGrid(o),this.drawTitle()}},{z:i,draw:()=>{this.drawBorder()}},{z:e,draw:o=>{this.drawLabels(o)}}]}getMatchingVisibleMetas(t){const e=this.chart.getSortedVisibleDatasetMetas(),n=this.axis+"AxisID",i=[];let o,a;for(o=0,a=e.length;o<a;++o){const r=e[o];r[n]===this.id&&(!t||r.type===t)&&i.push(r)}return i}_resolveTickFontOptions(t){const e=this.options.ticks.setContext(this.getContext(t));return pt(e.font)}_maxDigits(){const t=this._resolveTickFontOptions(0).lineHeight;return(this.isHorizontal()?this.width:this.height)/t}}class zs{constructor(t,e,n){this.type=t,this.scope=e,this.override=n,this.items=Object.create(null)}isForType(t){return Object.prototype.isPrototypeOf.call(this.type.prototype,t.prototype)}register(t){const e=Object.getPrototypeOf(t);let n;sh(e)&&(n=this.register(e));const i=this.items,o=t.id,a=this.scope+"."+o;if(!o)throw new Error("class does not have id: "+t);return o in i||(i[o]=t,th(t,a,n),this.override&&tt.override(t.id,t.overrides)),a}get(t){return this.items[t]}unregister(t){const e=this.items,n=t.id,i=this.scope;n in e&&delete e[n],i&&n in tt[i]&&(delete tt[i][n],this.override&&delete Fe[n])}}function th(s,t,e){const n=_s(Object.create(null),[e?tt.get(e):{},tt.get(t),s.defaults]);tt.set(t,n),s.defaultRoutes&&eh(t,s.defaultRoutes),s.descriptors&&tt.describe(t,s.descriptors)}function eh(s,t){Object.keys(t).forEach(e=>{const n=e.split("."),i=n.pop(),o=[s].concat(n).join("."),a=t[e].split("."),r=a.pop(),l=a.join(".");tt.route(o,i,l,r)})}function sh(s){return"id"in s&&"defaults"in s}class nh{constructor(){this.controllers=new zs(jt,"datasets",!0),this.elements=new zs(Nt,"elements"),this.plugins=new zs(Object,"plugins"),this.scales=new zs(je,"scales"),this._typedRegistries=[this.controllers,this.scales,this.elements]}add(...t){this._each("register",t)}remove(...t){this._each("unregister",t)}addControllers(...t){this._each("register",t,this.controllers)}addElements(...t){this._each("register",t,this.elements)}addPlugins(...t){this._each("register",t,this.plugins)}addScales(...t){this._each("register",t,this.scales)}getController(t){return this._get(t,this.controllers,"controller")}getElement(t){return this._get(t,this.elements,"element")}getPlugin(t){return this._get(t,this.plugins,"plugin")}getScale(t){return this._get(t,this.scales,"scale")}removeControllers(...t){this._each("unregister",t,this.controllers)}removeElements(...t){this._each("unregister",t,this.elements)}removePlugins(...t){this._each("unregister",t,this.plugins)}removeScales(...t){this._each("unregister",t,this.scales)}_each(t,e,n){[...e].forEach(i=>{const o=n||this._getRegistryForType(i);n||o.isForType(i)||o===this.plugins&&i.id?this._exec(t,o,i):U(i,a=>{const r=n||this._getRegistryForType(a);this._exec(t,r,a)})})}_exec(t,e,n){const i=ci(t);G(n["before"+i],[],n),e[t](n),G(n["after"+i],[],n)}_getRegistryForType(t){for(let e=0;e<this._typedRegistries.length;e++){const n=this._typedRegistries[e];if(n.isForType(t))return n}return this.plugins}_get(t,e,n){const i=e.get(t);if(i===void 0)throw new Error('"'+t+'" is not a registered '+n+".");return i}}var Ut=new nh;class ih{constructor(){this._init=void 0}notify(t,e,n,i){if(e==="beforeInit"&&(this._init=this._createDescriptors(t,!0),this._notify(this._init,t,"install")),this._init===void 0)return;const o=i?this._descriptors(t).filter(i):this._descriptors(t),a=this._notify(o,t,e,n);return e==="afterDestroy"&&(this._notify(o,t,"stop"),this._notify(this._init,t,"uninstall"),this._init=void 0),a}_notify(t,e,n,i){i=i||{};for(const o of t){const a=o.plugin,r=a[n],l=[e,i,o.options];if(G(r,l,a)===!1&&i.cancelable)return!1}return!0}invalidate(){j(this._cache)||(this._oldCache=this._cache,this._cache=void 0)}_descriptors(t){if(this._cache)return this._cache;const e=this._cache=this._createDescriptors(t);return this._notifyStateChanges(t),e}_createDescriptors(t,e){const n=t&&t.config,i=B(n.options&&n.options.plugins,{}),o=oh(n);return i===!1&&!e?[]:rh(t,o,i,e)}_notifyStateChanges(t){const e=this._oldCache||[],n=this._cache,i=(o,a)=>o.filter(r=>!a.some(l=>r.plugin.id===l.plugin.id));this._notify(i(e,n),t,"stop"),this._notify(i(n,e),t,"start")}}function oh(s){const t={},e=[],n=Object.keys(Ut.plugins.items);for(let o=0;o<n.length;o++)e.push(Ut.getPlugin(n[o]));const i=s.plugins||[];for(let o=0;o<i.length;o++){const a=i[o];e.indexOf(a)===-1&&(e.push(a),t[a.id]=!0)}return{plugins:e,localIds:t}}function ah(s,t){return!t&&s===!1?null:s===!0?{}:s}function rh(s,{plugins:t,localIds:e},n,i){const o=[],a=s.getContext();for(const r of t){const l=r.id,c=ah(n[l],i);c!==null&&o.push({plugin:r,options:lh(s.config,{plugin:r,local:e[l]},c,a)})}return o}function lh(s,{plugin:t,local:e},n,i){const o=s.pluginScopeKeys(t),a=s.getOptionScopes(n,o);return e&&t.defaults&&a.push(t.defaults),s.createResolver(a,i,[""],{scriptable:!1,indexable:!1,allKeys:!0})}function Hn(s,t){const e=tt.datasets[s]||{};return((t.datasets||{})[s]||{}).indexAxis||t.indexAxis||e.indexAxis||"x"}function ch(s,t){let e=s;return s==="_index_"?e=t:s==="_value_"&&(e=t==="x"?"y":"x"),e}function dh(s,t){return s===t?"_index_":"_value_"}function ba(s){if(s==="x"||s==="y"||s==="r")return s}function hh(s){if(s==="top"||s==="bottom")return"x";if(s==="left"||s==="right")return"y"}function Yn(s,...t){if(ba(s))return s;for(const e of t){const n=e.axis||hh(e.position)||s.length>1&&ba(s[0].toLowerCase());if(n)return n}throw new Error(`Cannot determine type of '${s}' axis. Please provide 'axis' or 'position' option.`)}function xa(s,t,e){if(e[t+"AxisID"]===s)return{axis:t}}function uh(s,t){if(t.data&&t.data.datasets){const e=t.data.datasets.filter(n=>n.xAxisID===s||n.yAxisID===s);if(e.length)return xa(s,"x",e[0])||xa(s,"y",e[0])}return{}}function fh(s,t){const e=Fe[s.type]||{scales:{}},n=t.scales||{},i=Hn(s.type,t),o=Object.create(null);return Object.keys(n).forEach(a=>{const r=n[a];if(!N(r))return console.error(`Invalid scale configuration for scale: ${a}`);if(r._proxy)return console.warn(`Ignoring resolver passed as options for scale: ${a}`);const l=Yn(a,r,uh(a,s),tt.scales[r.type]),c=dh(l,i),d=e.scales||{};o[a]=ps(Object.create(null),[{axis:l},r,d[l],d[c]])}),s.data.datasets.forEach(a=>{const r=a.type||s.type,l=a.indexAxis||Hn(r,t),d=(Fe[r]||{}).scales||{};Object.keys(d).forEach(h=>{const u=ch(h,l),f=a[u+"AxisID"]||u;o[f]=o[f]||Object.create(null),ps(o[f],[{axis:u},n[f],d[h]])})}),Object.keys(o).forEach(a=>{const r=o[a];ps(r,[tt.scales[r.type],tt.scale])}),o}function $r(s){const t=s.options||(s.options={});t.plugins=B(t.plugins,{}),t.scales=fh(s,t)}function Or(s){return s=s||{},s.datasets=s.datasets||[],s.labels=s.labels||[],s}function ph(s){return s=s||{},s.data=Or(s.data),$r(s),s}const ya=new Map,Br=new Set;function js(s,t){let e=ya.get(s);return e||(e=t(),ya.set(s,e),Br.add(e)),e}const is=(s,t,e)=>{const n=xe(t,e);n!==void 0&&s.add(n)};class gh{constructor(t){this._config=ph(t),this._scopeCache=new Map,this._resolverCache=new Map}get platform(){return this._config.platform}get type(){return this._config.type}set type(t){this._config.type=t}get data(){return this._config.data}set data(t){this._config.data=Or(t)}get options(){return this._config.options}set options(t){this._config.options=t}get plugins(){return this._config.plugins}update(){const t=this._config;this.clearCache(),$r(t)}clearCache(){this._scopeCache.clear(),this._resolverCache.clear()}datasetScopeKeys(t){return js(t,()=>[[`datasets.${t}`,""]])}datasetAnimationScopeKeys(t,e){return js(`${t}.transition.${e}`,()=>[[`datasets.${t}.transitions.${e}`,`transitions.${e}`],[`datasets.${t}`,""]])}datasetElementScopeKeys(t,e){return js(`${t}-${e}`,()=>[[`datasets.${t}.elements.${e}`,`datasets.${t}`,`elements.${e}`,""]])}pluginScopeKeys(t){const e=t.id,n=this.type;return js(`${n}-plugin-${e}`,()=>[[`plugins.${e}`,...t.additionalOptionScopes||[]]])}_cachedScopes(t,e){const n=this._scopeCache;let i=n.get(t);return(!i||e)&&(i=new Map,n.set(t,i)),i}getOptionScopes(t,e,n){const{options:i,type:o}=this,a=this._cachedScopes(t,n),r=a.get(e);if(r)return r;const l=new Set;e.forEach(d=>{t&&(l.add(t),d.forEach(h=>is(l,t,h))),d.forEach(h=>is(l,i,h)),d.forEach(h=>is(l,Fe[o]||{},h)),d.forEach(h=>is(l,tt,h)),d.forEach(h=>is(l,Nn,h))});const c=Array.from(l);return c.length===0&&c.push(Object.create(null)),Br.has(e)&&a.set(e,c),c}chartOptionScopes(){const{options:t,type:e}=this;return[t,Fe[e]||{},tt.datasets[e]||{},{type:e},tt,Nn]}resolveNamedOptions(t,e,n,i=[""]){const o={$shared:!0},{resolver:a,subPrefixes:r}=va(this._resolverCache,t,i);let l=a;if(bh(a,e)){o.$shared=!1,n=ye(n)?n():n;const c=this.createResolver(t,n,r);l=Je(a,n,c)}for(const c of e)o[c]=l[c];return o}createResolver(t,e,n=[""],i){const{resolver:o}=va(this._resolverCache,t,n);return N(e)?Je(o,e,void 0,i):o}}function va(s,t,e){let n=s.get(t);n||(n=new Map,s.set(t,n));const i=e.join();let o=n.get(i);return o||(o={resolver:gi(t,e),subPrefixes:e.filter(r=>!r.toLowerCase().includes("hover"))},n.set(i,o)),o}const mh=s=>N(s)&&Object.getOwnPropertyNames(s).some(t=>ye(s[t]));function bh(s,t){const{isScriptable:e,isIndexable:n}=pr(s);for(const i of t){const o=e(i),a=n(i),r=(a||o)&&s[i];if(o&&(ye(r)||mh(r))||a&&Q(r))return!0}return!1}var xh="4.5.1";const yh=["top","bottom","left","right","chartArea"];function _a(s,t){return s==="top"||s==="bottom"||yh.indexOf(s)===-1&&t==="x"}function wa(s,t){return function(e,n){return e[s]===n[s]?e[t]-n[t]:e[s]-n[s]}}function ka(s){const t=s.chart,e=t.options.animation;t.notifyPlugins("afterRender"),G(e&&e.onComplete,[s],t)}function vh(s){const t=s.chart,e=t.options.animation;G(e&&e.onProgress,[s],t)}function Rr(s){return xi()&&typeof s=="string"?s=document.getElementById(s):s&&s.length&&(s=s[0]),s&&s.canvas&&(s=s.canvas),s}const Ks={},Ma=s=>{const t=Rr(s);return Object.values(Ks).filter(e=>e.canvas===t).pop()};function _h(s,t,e){const n=Object.keys(s);for(const i of n){const o=+i;if(o>=t){const a=s[i];delete s[i],(e>0||o>t)&&(s[o+e]=a)}}}function wh(s,t,e,n){return!e||s.type==="mouseout"?null:n?t:s}class Ot{static register(...t){Ut.add(...t),Sa()}static unregister(...t){Ut.remove(...t),Sa()}constructor(t,e){const n=this.config=new gh(e),i=Rr(t),o=Ma(i);if(o)throw new Error("Canvas is already in use. Chart with ID '"+o.id+"' must be destroyed before the canvas with ID '"+o.canvas.id+"' can be reused.");const a=n.createResolver(n.chartOptionScopes(),this.getContext());this.platform=new(n.platform||jd(i)),this.platform.updateConfig(n);const r=this.platform.acquireContext(i,a.aspectRatio),l=r&&r.canvas,c=l&&l.height,d=l&&l.width;if(this.id=kl(),this.ctx=r,this.canvas=l,this.width=d,this.height=c,this._options=a,this._aspectRatio=this.aspectRatio,this._layers=[],this._metasets=[],this._stacks=void 0,this.boxes=[],this.currentDevicePixelRatio=void 0,this.chartArea=void 0,this._active=[],this._lastEvent=void 0,this._listeners={},this._responsiveListeners=void 0,this._sortedMetasets=[],this.scales={},this._plugins=new ih,this.$proxies={},this._hiddenIndices={},this.attached=!1,this._animationsDisabled=void 0,this.$context=void 0,this._doResize=jl(h=>this.update(h),a.resizeDelay||0),this._dataChanges=[],Ks[this.id]=this,!r||!l){console.error("Failed to create chart: can't acquire context from the given item");return}Zt.listen(this,"complete",ka),Zt.listen(this,"progress",vh),this._initialize(),this.attached&&this.update()}get aspectRatio(){const{options:{aspectRatio:t,maintainAspectRatio:e},width:n,height:i,_aspectRatio:o}=this;return j(t)?e&&o?o:i?n/i:null:t}get data(){return this.config.data}set data(t){this.config.data=t}get options(){return this._options}set options(t){this.config.options=t}get registry(){return Ut}_initialize(){return this.notifyPlugins("beforeInit"),this.options.responsive?this.resize():Xo(this,this.options.devicePixelRatio),this.bindEvents(),this.notifyPlugins("afterInit"),this}clear(){return Ho(this.canvas,this.ctx),this}stop(){return Zt.stop(this),this}resize(t,e){Zt.running(this)?this._resizeBeforeDraw={width:t,height:e}:this._resize(t,e)}_resize(t,e){const n=this.options,i=this.canvas,o=n.maintainAspectRatio&&this.aspectRatio,a=this.platform.getMaximumSize(i,t,e,o),r=n.devicePixelRatio||this.platform.getDevicePixelRatio(),l=this.width?"resize":"attach";this.width=a.width,this.height=a.height,this._aspectRatio=this.aspectRatio,Xo(this,r,!0)&&(this.notifyPlugins("resize",{size:a}),G(n.onResize,[this,a],this),this.attached&&this._doResize(l)&&this.render())}ensureScalesHaveIDs(){const e=this.options.scales||{};U(e,(n,i)=>{n.id=i})}buildOrUpdateScales(){const t=this.options,e=t.scales,n=this.scales,i=Object.keys(n).reduce((a,r)=>(a[r]=!1,a),{});let o=[];e&&(o=o.concat(Object.keys(e).map(a=>{const r=e[a],l=Yn(a,r),c=l==="r",d=l==="x";return{options:r,dposition:c?"chartArea":d?"bottom":"left",dtype:c?"radialLinear":d?"category":"linear"}}))),U(o,a=>{const r=a.options,l=r.id,c=Yn(l,r),d=B(r.type,a.dtype);(r.position===void 0||_a(r.position,c)!==_a(a.dposition))&&(r.position=a.dposition),i[l]=!0;let h=null;if(l in n&&n[l].type===d)h=n[l];else{const u=Ut.getScale(d);h=new u({id:l,type:d,ctx:this.ctx,chart:this}),n[h.id]=h}h.init(r,t)}),U(i,(a,r)=>{a||delete n[r]}),U(n,a=>{kt.configure(this,a,a.options),kt.addBox(this,a)})}_updateMetasets(){const t=this._metasets,e=this.data.datasets.length,n=t.length;if(t.sort((i,o)=>i.index-o.index),n>e){for(let i=e;i<n;++i)this._destroyDatasetMeta(i);t.splice(e,n-e)}this._sortedMetasets=t.slice(0).sort(wa("order","index"))}_removeUnreferencedMetasets(){const{_metasets:t,data:{datasets:e}}=this;t.length>e.length&&delete this._stacks,t.forEach((n,i)=>{e.filter(o=>o===n._dataset).length===0&&this._destroyDatasetMeta(i)})}buildOrUpdateControllers(){const t=[],e=this.data.datasets;let n,i;for(this._removeUnreferencedMetasets(),n=0,i=e.length;n<i;n++){const o=e[n];let a=this.getDatasetMeta(n);const r=o.type||this.config.type;if(a.type&&a.type!==r&&(this._destroyDatasetMeta(n),a=this.getDatasetMeta(n)),a.type=r,a.indexAxis=o.indexAxis||Hn(r,this.options),a.order=o.order||0,a.index=n,a.label=""+o.label,a.visible=this.isDatasetVisible(n),a.controller)a.controller.updateIndex(n),a.controller.linkScales();else{const l=Ut.getController(r),{datasetElementType:c,dataElementType:d}=tt.datasets[r];Object.assign(l,{dataElementType:Ut.getElement(d),datasetElementType:c&&Ut.getElement(c)}),a.controller=new l(this,n),t.push(a.controller)}}return this._updateMetasets(),t}_resetElements(){U(this.data.datasets,(t,e)=>{this.getDatasetMeta(e).controller.reset()},this)}reset(){this._resetElements(),this.notifyPlugins("reset")}update(t){const e=this.config;e.update();const n=this._options=e.createResolver(e.chartOptionScopes(),this.getContext()),i=this._animationsDisabled=!n.animation;if(this._updateScales(),this._checkEventBindings(),this._updateHiddenIndices(),this._plugins.invalidate(),this.notifyPlugins("beforeUpdate",{mode:t,cancelable:!0})===!1)return;const o=this.buildOrUpdateControllers();this.notifyPlugins("beforeElementsUpdate");let a=0;for(let c=0,d=this.data.datasets.length;c<d;c++){const{controller:h}=this.getDatasetMeta(c),u=!i&&o.indexOf(h)===-1;h.buildOrUpdateElements(u),a=Math.max(+h.getMaxOverflow(),a)}a=this._minPadding=n.layout.autoPadding?a:0,this._updateLayout(a),i||U(o,c=>{c.reset()}),this._updateDatasets(t),this.notifyPlugins("afterUpdate",{mode:t}),this._layers.sort(wa("z","_idx"));const{_active:r,_lastEvent:l}=this;l?this._eventHandler(l,!0):r.length&&this._updateHoverStyles(r,r,!0),this.render()}_updateScales(){U(this.scales,t=>{kt.removeBox(this,t)}),this.ensureScalesHaveIDs(),this.buildOrUpdateScales()}_checkEventBindings(){const t=this.options,e=new Set(Object.keys(this._listeners)),n=new Set(t.events);(!Oo(e,n)||!!this._responsiveListeners!==t.responsive)&&(this.unbindEvents(),this.bindEvents())}_updateHiddenIndices(){const{_hiddenIndices:t}=this,e=this._getUniformDataChanges()||[];for(const{method:n,start:i,count:o}of e){const a=n==="_removeElements"?-o:o;_h(t,i,a)}}_getUniformDataChanges(){const t=this._dataChanges;if(!t||!t.length)return;this._dataChanges=[];const e=this.data.datasets.length,n=o=>new Set(t.filter(a=>a[0]===o).map((a,r)=>r+","+a.splice(1).join(","))),i=n(0);for(let o=1;o<e;o++)if(!Oo(i,n(o)))return;return Array.from(i).map(o=>o.split(",")).map(o=>({method:o[1],start:+o[2],count:+o[3]}))}_updateLayout(t){if(this.notifyPlugins("beforeLayout",{cancelable:!0})===!1)return;kt.update(this,this.width,this.height,t);const e=this.chartArea,n=e.width<=0||e.height<=0;this._layers=[],U(this.boxes,i=>{n&&i.position==="chartArea"||(i.configure&&i.configure(),this._layers.push(...i._layers()))},this),this._layers.forEach((i,o)=>{i._idx=o}),this.notifyPlugins("afterLayout")}_updateDatasets(t){if(this.notifyPlugins("beforeDatasetsUpdate",{mode:t,cancelable:!0})!==!1){for(let e=0,n=this.data.datasets.length;e<n;++e)this.getDatasetMeta(e).controller.configure();for(let e=0,n=this.data.datasets.length;e<n;++e)this._updateDataset(e,ye(t)?t({datasetIndex:e}):t);this.notifyPlugins("afterDatasetsUpdate",{mode:t})}}_updateDataset(t,e){const n=this.getDatasetMeta(t),i={meta:n,index:t,mode:e,cancelable:!0};this.notifyPlugins("beforeDatasetUpdate",i)!==!1&&(n.controller._update(e),i.cancelable=!1,this.notifyPlugins("afterDatasetUpdate",i))}render(){this.notifyPlugins("beforeRender",{cancelable:!0})!==!1&&(Zt.has(this)?this.attached&&!Zt.running(this)&&Zt.start(this):(this.draw(),ka({chart:this})))}draw(){let t;if(this._resizeBeforeDraw){const{width:n,height:i}=this._resizeBeforeDraw;this._resizeBeforeDraw=null,this._resize(n,i)}if(this.clear(),this.width<=0||this.height<=0||this.notifyPlugins("beforeDraw",{cancelable:!0})===!1)return;const e=this._layers;for(t=0;t<e.length&&e[t].z<=0;++t)e[t].draw(this.chartArea);for(this._drawDatasets();t<e.length;++t)e[t].draw(this.chartArea);this.notifyPlugins("afterDraw")}_getSortedDatasetMetas(t){const e=this._sortedMetasets,n=[];let i,o;for(i=0,o=e.length;i<o;++i){const a=e[i];(!t||a.visible)&&n.push(a)}return n}getSortedVisibleDatasetMetas(){return this._getSortedDatasetMetas(!0)}_drawDatasets(){if(this.notifyPlugins("beforeDatasetsDraw",{cancelable:!0})===!1)return;const t=this.getSortedVisibleDatasetMetas();for(let e=t.length-1;e>=0;--e)this._drawDataset(t[e]);this.notifyPlugins("afterDatasetsDraw")}_drawDataset(t){const e=this.ctx,n={meta:t,index:t.index,cancelable:!0},i=Sr(this,t);this.notifyPlugins("beforeDatasetDraw",n)!==!1&&(i&&gn(e,i),t.controller.draw(),i&&mn(e),n.cancelable=!1,this.notifyPlugins("afterDatasetDraw",n))}isPointInArea(t){return ie(t,this.chartArea,this._minPadding)}getElementsAtEventForMode(t,e,n,i){const o=yd.modes[e];return typeof o=="function"?o(this,t,n,i):[]}getDatasetMeta(t){const e=this.data.datasets[t],n=this._metasets;let i=n.filter(o=>o&&o._dataset===e).pop();return i||(i={type:null,data:[],dataset:null,controller:null,hidden:null,xAxisID:null,yAxisID:null,order:e&&e.order||0,index:t,_dataset:e,_parsed:[],_sorted:!1},n.push(i)),i}getContext(){return this.$context||(this.$context=Me(null,{chart:this,type:"chart"}))}getVisibleDatasetCount(){return this.getSortedVisibleDatasetMetas().length}isDatasetVisible(t){const e=this.data.datasets[t];if(!e)return!1;const n=this.getDatasetMeta(t);return typeof n.hidden=="boolean"?!n.hidden:!e.hidden}setDatasetVisibility(t,e){const n=this.getDatasetMeta(t);n.hidden=!e}toggleDataVisibility(t){this._hiddenIndices[t]=!this._hiddenIndices[t]}getDataVisibility(t){return!this._hiddenIndices[t]}_updateVisibility(t,e,n){const i=n?"show":"hide",o=this.getDatasetMeta(t),a=o.controller._resolveAnimations(void 0,i);ws(e)?(o.data[e].hidden=!n,this.update()):(this.setDatasetVisibility(t,n),a.update(o,{visible:n}),this.update(r=>r.datasetIndex===t?i:void 0))}hide(t,e){this._updateVisibility(t,e,!1)}show(t,e){this._updateVisibility(t,e,!0)}_destroyDatasetMeta(t){const e=this._metasets[t];e&&e.controller&&e.controller._destroy(),delete this._metasets[t]}_stop(){let t,e;for(this.stop(),Zt.remove(this),t=0,e=this.data.datasets.length;t<e;++t)this._destroyDatasetMeta(t)}destroy(){this.notifyPlugins("beforeDestroy");const{canvas:t,ctx:e}=this;this._stop(),this.config.clearCache(),t&&(this.unbindEvents(),Ho(t,e),this.platform.releaseContext(e),this.canvas=null,this.ctx=null),delete Ks[this.id],this.notifyPlugins("afterDestroy")}toBase64Image(...t){return this.canvas.toDataURL(...t)}bindEvents(){this.bindUserEvents(),this.options.responsive?this.bindResponsiveEvents():this.attached=!0}bindUserEvents(){const t=this._listeners,e=this.platform,n=(o,a)=>{e.addEventListener(this,o,a),t[o]=a},i=(o,a,r)=>{o.offsetX=a,o.offsetY=r,this._eventHandler(o)};U(this.options.events,o=>n(o,i))}bindResponsiveEvents(){this._responsiveListeners||(this._responsiveListeners={});const t=this._responsiveListeners,e=this.platform,n=(l,c)=>{e.addEventListener(this,l,c),t[l]=c},i=(l,c)=>{t[l]&&(e.removeEventListener(this,l,c),delete t[l])},o=(l,c)=>{this.canvas&&this.resize(l,c)};let a;const r=()=>{i("attach",r),this.attached=!0,this.resize(),n("resize",o),n("detach",a)};a=()=>{this.attached=!1,i("resize",o),this._stop(),this._resize(0,0),n("attach",r)},e.isAttached(this.canvas)?r():a()}unbindEvents(){U(this._listeners,(t,e)=>{this.platform.removeEventListener(this,e,t)}),this._listeners={},U(this._responsiveListeners,(t,e)=>{this.platform.removeEventListener(this,e,t)}),this._responsiveListeners=void 0}updateHoverStyle(t,e,n){const i=n?"set":"remove";let o,a,r,l;for(e==="dataset"&&(o=this.getDatasetMeta(t[0].datasetIndex),o.controller["_"+i+"DatasetHoverStyle"]()),r=0,l=t.length;r<l;++r){a=t[r];const c=a&&this.getDatasetMeta(a.datasetIndex).controller;c&&c[i+"HoverStyle"](a.element,a.datasetIndex,a.index)}}getActiveElements(){return this._active||[]}setActiveElements(t){const e=this._active||[],n=t.map(({datasetIndex:o,index:a})=>{const r=this.getDatasetMeta(o);if(!r)throw new Error("No dataset found at index "+o);return{datasetIndex:o,element:r.data[a],index:a}});!nn(n,e)&&(this._active=n,this._lastEvent=null,this._updateHoverStyles(n,e))}notifyPlugins(t,e,n){return this._plugins.notify(this,t,e,n)}isPluginEnabled(t){return this._plugins._cache.filter(e=>e.plugin.id===t).length===1}_updateHoverStyles(t,e,n){const i=this.options.hover,o=(l,c)=>l.filter(d=>!c.some(h=>d.datasetIndex===h.datasetIndex&&d.index===h.index)),a=o(e,t),r=n?t:o(t,e);a.length&&this.updateHoverStyle(a,i.mode,!1),r.length&&i.mode&&this.updateHoverStyle(r,i.mode,!0)}_eventHandler(t,e){const n={event:t,replay:e,cancelable:!0,inChartArea:this.isPointInArea(t)},i=a=>(a.options.events||this.options.events).includes(t.native.type);if(this.notifyPlugins("beforeEvent",n,i)===!1)return;const o=this._handleEvent(t,e,n.inChartArea);return n.cancelable=!1,this.notifyPlugins("afterEvent",n,i),(o||n.changed)&&this.render(),this}_handleEvent(t,e,n){const{_active:i=[],options:o}=this,a=e,r=this._getActiveElements(t,i,n,a),l=Pl(t),c=wh(t,this._lastEvent,n,l);n&&(this._lastEvent=null,G(o.onHover,[t,r,this],this),l&&G(o.onClick,[t,r,this],this));const d=!nn(r,i);return(d||e)&&(this._active=r,this._updateHoverStyles(r,i,e)),this._lastEvent=c,d}_getActiveElements(t,e,n,i){if(t.type==="mouseout")return[];if(!n)return e;const o=this.options.hover;return this.getElementsAtEventForMode(t,o.mode,o,i)}}C(Ot,"defaults",tt),C(Ot,"instances",Ks),C(Ot,"overrides",Fe),C(Ot,"registry",Ut),C(Ot,"version",xh),C(Ot,"getChart",Ma);function Sa(){return U(Ot.instances,s=>s._plugins.invalidate())}function kh(s,t,e){const{startAngle:n,x:i,y:o,outerRadius:a,innerRadius:r,options:l}=t,{borderWidth:c,borderJoinStyle:d}=l,h=Math.min(c/a,_t(n-e));if(s.beginPath(),s.arc(i,o,a-c/2,n+h/2,e-h/2),r>0){const u=Math.min(c/r,_t(n-e));s.arc(i,o,r+c/2,e-u/2,n+u/2,!0)}else{const u=Math.min(c/2,a*_t(n-e));if(d==="round")s.arc(i,o,u,e-V/2,n+V/2,!0);else if(d==="bevel"){const f=2*u*u,p=-f*Math.cos(e+V/2)+i,g=-f*Math.sin(e+V/2)+o,m=f*Math.cos(n+V/2)+i,b=f*Math.sin(n+V/2)+o;s.lineTo(p,g),s.lineTo(m,b)}}s.closePath(),s.moveTo(0,0),s.rect(0,0,s.canvas.width,s.canvas.height),s.clip("evenodd")}function Mh(s,t,e){const{startAngle:n,pixelMargin:i,x:o,y:a,outerRadius:r,innerRadius:l}=t;let c=i/r;s.beginPath(),s.arc(o,a,r,n-c,e+c),l>i?(c=i/l,s.arc(o,a,l,e+c,n-c,!0)):s.arc(o,a,i,e+rt,n-rt),s.closePath(),s.clip()}function Sh(s){return pi(s,["outerStart","outerEnd","innerStart","innerEnd"])}function Ch(s,t,e,n){const i=Sh(s.options.borderRadius),o=(e-t)/2,a=Math.min(o,n*t/2),r=l=>{const c=(e-Math.min(o,l))*n/2;return mt(l,0,Math.min(o,c))};return{outerStart:r(i.outerStart),outerEnd:r(i.outerEnd),innerStart:mt(i.innerStart,0,a),innerEnd:mt(i.innerEnd,0,a)}}function Ve(s,t,e,n){return{x:e+s*Math.cos(t),y:n+s*Math.sin(t)}}function dn(s,t,e,n,i,o){const{x:a,y:r,startAngle:l,pixelMargin:c,innerRadius:d}=t,h=Math.max(t.outerRadius+n+e-c,0),u=d>0?d+n+e+c:0;let f=0;const p=i-l;if(n){const W=d>0?d-n:0,X=h>0?h-n:0,J=(W+X)/2,Et=J!==0?p*J/(J+n):p;f=(p-Et)/2}const g=Math.max(.001,p*h-e/V)/h,m=(p-g)/2,b=l+m+f,v=i-m-f,{outerStart:M,outerEnd:k,innerStart:w,innerEnd:E}=Ch(t,u,h,v-b),A=h-M,D=h-k,I=b+M/A,R=v-k/D,F=u+w,z=u+E,lt=b+w/F,xt=v-E/z;if(s.beginPath(),o){const W=(I+R)/2;if(s.arc(a,r,h,I,W),s.arc(a,r,h,W,R),k>0){const ht=Ve(D,R,a,r);s.arc(ht.x,ht.y,k,R,v+rt)}const X=Ve(z,v,a,r);if(s.lineTo(X.x,X.y),E>0){const ht=Ve(z,xt,a,r);s.arc(ht.x,ht.y,E,v+rt,xt+Math.PI)}const J=(v-E/u+(b+w/u))/2;if(s.arc(a,r,u,v-E/u,J,!0),s.arc(a,r,u,J,b+w/u,!0),w>0){const ht=Ve(F,lt,a,r);s.arc(ht.x,ht.y,w,lt+Math.PI,b-rt)}const Et=Ve(A,b,a,r);if(s.lineTo(Et.x,Et.y),M>0){const ht=Ve(A,I,a,r);s.arc(ht.x,ht.y,M,b-rt,I)}}else{s.moveTo(a,r);const W=Math.cos(I)*h+a,X=Math.sin(I)*h+r;s.lineTo(W,X);const J=Math.cos(R)*h+a,Et=Math.sin(R)*h+r;s.lineTo(J,Et)}s.closePath()}function Eh(s,t,e,n,i){const{fullCircles:o,startAngle:a,circumference:r}=t;let l=t.endAngle;if(o){dn(s,t,e,n,l,i);for(let c=0;c<o;++c)s.fill();isNaN(r)||(l=a+(r%K||K))}return dn(s,t,e,n,l,i),s.fill(),l}function Ah(s,t,e,n,i){const{fullCircles:o,startAngle:a,circumference:r,options:l}=t,{borderWidth:c,borderJoinStyle:d,borderDash:h,borderDashOffset:u,borderRadius:f}=l,p=l.borderAlign==="inner";if(!c)return;s.setLineDash(h||[]),s.lineDashOffset=u,p?(s.lineWidth=c*2,s.lineJoin=d||"round"):(s.lineWidth=c,s.lineJoin=d||"bevel");let g=t.endAngle;if(o){dn(s,t,e,n,g,i);for(let m=0;m<o;++m)s.stroke();isNaN(r)||(g=a+(r%K||K))}p&&Mh(s,t,g),l.selfJoin&&g-a>=V&&f===0&&d!=="miter"&&kh(s,t,g),o||(dn(s,t,e,n,g,i),s.stroke())}class cs extends Nt{constructor(e){super();C(this,"circumference");C(this,"endAngle");C(this,"fullCircles");C(this,"innerRadius");C(this,"outerRadius");C(this,"pixelMargin");C(this,"startAngle");this.options=void 0,this.circumference=void 0,this.startAngle=void 0,this.endAngle=void 0,this.innerRadius=void 0,this.outerRadius=void 0,this.pixelMargin=0,this.fullCircles=0,e&&Object.assign(this,e)}inRange(e,n,i){const o=this.getProps(["x","y"],i),{angle:a,distance:r}=ir(o,{x:e,y:n}),{startAngle:l,endAngle:c,innerRadius:d,outerRadius:h,circumference:u}=this.getProps(["startAngle","endAngle","innerRadius","outerRadius","circumference"],i),f=(this.options.spacing+this.options.borderWidth)/2,p=B(u,c-l),g=ks(a,l,c)&&l!==c,m=p>=K||g,b=se(r,d+f,h+f);return m&&b}getCenterPoint(e){const{x:n,y:i,startAngle:o,endAngle:a,innerRadius:r,outerRadius:l}=this.getProps(["x","y","startAngle","endAngle","innerRadius","outerRadius"],e),{offset:c,spacing:d}=this.options,h=(o+a)/2,u=(r+l+d+c)/2;return{x:n+Math.cos(h)*u,y:i+Math.sin(h)*u}}tooltipPosition(e){return this.getCenterPoint(e)}draw(e){const{options:n,circumference:i}=this,o=(n.offset||0)/4,a=(n.spacing||0)/2,r=n.circular;if(this.pixelMargin=n.borderAlign==="inner"?.33:0,this.fullCircles=i>K?Math.floor(i/K):0,i===0||this.innerRadius<0||this.outerRadius<0)return;e.save();const l=(this.startAngle+this.endAngle)/2;e.translate(Math.cos(l)*o,Math.sin(l)*o);const c=1-Math.sin(Math.min(V,i||0)),d=o*c;e.fillStyle=n.backgroundColor,e.strokeStyle=n.borderColor,Eh(e,this,d,a,r),Ah(e,this,d,a,r),e.restore()}}C(cs,"id","arc"),C(cs,"defaults",{borderAlign:"center",borderColor:"#fff",borderDash:[],borderDashOffset:0,borderJoinStyle:void 0,borderRadius:0,borderWidth:2,offset:0,spacing:0,angle:void 0,circular:!0,selfJoin:!1}),C(cs,"defaultRoutes",{backgroundColor:"backgroundColor"}),C(cs,"descriptors",{_scriptable:!0,_indexable:e=>e!=="borderDash"});function Fr(s,t,e=t){s.lineCap=B(e.borderCapStyle,t.borderCapStyle),s.setLineDash(B(e.borderDash,t.borderDash)),s.lineDashOffset=B(e.borderDashOffset,t.borderDashOffset),s.lineJoin=B(e.borderJoinStyle,t.borderJoinStyle),s.lineWidth=B(e.borderWidth,t.borderWidth),s.strokeStyle=B(e.borderColor,t.borderColor)}function Ph(s,t,e){s.lineTo(e.x,e.y)}function Dh(s){return s.stepped?Zl:s.tension||s.cubicInterpolationMode==="monotone"?Ql:Ph}function zr(s,t,e={}){const n=s.length,{start:i=0,end:o=n-1}=e,{start:a,end:r}=t,l=Math.max(i,a),c=Math.min(o,r),d=i<a&&o<a||i>r&&o>r;return{count:n,start:l,loop:t.loop,ilen:c<l&&!d?n+c-l:c-l}}function Th(s,t,e,n){const{points:i,options:o}=t,{count:a,start:r,loop:l,ilen:c}=zr(i,e,n),d=Dh(o);let{move:h=!0,reverse:u}=n||{},f,p,g;for(f=0;f<=c;++f)p=i[(r+(u?c-f:f))%a],!p.skip&&(h?(s.moveTo(p.x,p.y),h=!1):d(s,g,p,u,o.stepped),g=p);return l&&(p=i[(r+(u?c:0))%a],d(s,g,p,u,o.stepped)),!!l}function Lh(s,t,e,n){const i=t.points,{count:o,start:a,ilen:r}=zr(i,e,n),{move:l=!0,reverse:c}=n||{};let d=0,h=0,u,f,p,g,m,b;const v=k=>(a+(c?r-k:k))%o,M=()=>{g!==m&&(s.lineTo(d,m),s.lineTo(d,g),s.lineTo(d,b))};for(l&&(f=i[v(0)],s.moveTo(f.x,f.y)),u=0;u<=r;++u){if(f=i[v(u)],f.skip)continue;const k=f.x,w=f.y,E=k|0;E===p?(w<g?g=w:w>m&&(m=w),d=(h*d+k)/++h):(M(),s.lineTo(k,w),p=E,h=0,g=m=w),b=w}M()}function Un(s){const t=s.options,e=t.borderDash&&t.borderDash.length;return!s._decimated&&!s._loop&&!t.tension&&t.cubicInterpolationMode!=="monotone"&&!t.stepped&&!e?Lh:Th}function Ih(s){return s.stepped?Tc:s.tension||s.cubicInterpolationMode==="monotone"?Lc:Te}function $h(s,t,e,n){let i=t._path;i||(i=t._path=new Path2D,t.path(i,e,n)&&i.closePath()),Fr(s,t.options),s.stroke(i)}function Oh(s,t,e,n){const{segments:i,options:o}=t,a=Un(t);for(const r of i)Fr(s,o,r.style),s.beginPath(),a(s,t,r,{start:e,end:e+n-1})&&s.closePath(),s.stroke()}const Bh=typeof Path2D=="function";function Rh(s,t,e,n){Bh&&!t.options.segment?$h(s,t,e,n):Oh(s,t,e,n)}class ge extends Nt{constructor(t){super(),this.animated=!0,this.options=void 0,this._chart=void 0,this._loop=void 0,this._fullLoop=void 0,this._path=void 0,this._points=void 0,this._segments=void 0,this._decimated=!1,this._pointsUpdated=!1,this._datasetIndex=void 0,t&&Object.assign(this,t)}updateControlPoints(t,e){const n=this.options;if((n.tension||n.cubicInterpolationMode==="monotone")&&!n.stepped&&!this._pointsUpdated){const i=n.spanGaps?this._loop:this._fullLoop;kc(this._points,n,t,i,e),this._pointsUpdated=!0}}set points(t){this._points=t,delete this._segments,delete this._path,this._pointsUpdated=!1}get points(){return this._points}get segments(){return this._segments||(this._segments=Fc(this,this.options.segment))}first(){const t=this.segments,e=this.points;return t.length&&e[t[0].start]}last(){const t=this.segments,e=this.points,n=t.length;return n&&e[t[n-1].end]}interpolate(t,e){const n=this.options,i=t[e],o=this.points,a=Mr(this,{property:e,start:i,end:i});if(!a.length)return;const r=[],l=Ih(n);let c,d;for(c=0,d=a.length;c<d;++c){const{start:h,end:u}=a[c],f=o[h],p=o[u];if(f===p){r.push(f);continue}const g=Math.abs((i-f[e])/(p[e]-f[e])),m=l(f,p,g,n.stepped);m[e]=t[e],r.push(m)}return r.length===1?r[0]:r}pathSegment(t,e,n){return Un(this)(t,this,e,n)}path(t,e,n){const i=this.segments,o=Un(this);let a=this._loop;e=e||0,n=n||this.points.length-e;for(const r of i)a&=o(t,this,r,{start:e,end:e+n-1});return!!a}draw(t,e,n,i){const o=this.options||{};(this.points||[]).length&&o.borderWidth&&(t.save(),Rh(t,this,n,i),t.restore()),this.animated&&(this._pointsUpdated=!1,this._path=void 0)}}C(ge,"id","line"),C(ge,"defaults",{borderCapStyle:"butt",borderDash:[],borderDashOffset:0,borderJoinStyle:"miter",borderWidth:3,capBezierPoints:!0,cubicInterpolationMode:"default",fill:!1,spanGaps:!1,stepped:!1,tension:0}),C(ge,"defaultRoutes",{backgroundColor:"backgroundColor",borderColor:"borderColor"}),C(ge,"descriptors",{_scriptable:!0,_indexable:t=>t!=="borderDash"&&t!=="fill"});function Ca(s,t,e,n){const i=s.options,{[e]:o}=s.getProps([e],n);return Math.abs(t-o)<i.radius+i.hitRadius}class Js extends Nt{constructor(e){super();C(this,"parsed");C(this,"skip");C(this,"stop");this.options=void 0,this.parsed=void 0,this.skip=void 0,this.stop=void 0,e&&Object.assign(this,e)}inRange(e,n,i){const o=this.options,{x:a,y:r}=this.getProps(["x","y"],i);return Math.pow(e-a,2)+Math.pow(n-r,2)<Math.pow(o.hitRadius+o.radius,2)}inXRange(e,n){return Ca(this,e,"x",n)}inYRange(e,n){return Ca(this,e,"y",n)}getCenterPoint(e){const{x:n,y:i}=this.getProps(["x","y"],e);return{x:n,y:i}}size(e){e=e||this.options||{};let n=e.radius||0;n=Math.max(n,n&&e.hoverRadius||0);const i=n&&e.borderWidth||0;return(n+i)*2}draw(e,n){const i=this.options;this.skip||i.radius<.1||!ie(this,n,this.size(i)/2)||(e.strokeStyle=i.borderColor,e.lineWidth=i.borderWidth,e.fillStyle=i.backgroundColor,Vn(e,i,this.x,this.y))}getRange(){const e=this.options||{};return e.radius+e.hitRadius}}C(Js,"id","point"),C(Js,"defaults",{borderWidth:1,hitRadius:1,hoverBorderWidth:1,hoverRadius:4,pointStyle:"circle",radius:3,rotation:0}),C(Js,"defaultRoutes",{backgroundColor:"backgroundColor",borderColor:"borderColor"});function jr(s,t){const{x:e,y:n,base:i,width:o,height:a}=s.getProps(["x","y","base","width","height"],t);let r,l,c,d,h;return s.horizontal?(h=a/2,r=Math.min(e,i),l=Math.max(e,i),c=n-h,d=n+h):(h=o/2,r=e-h,l=e+h,c=Math.min(n,i),d=Math.max(n,i)),{left:r,top:c,right:l,bottom:d}}function me(s,t,e,n){return s?0:mt(t,e,n)}function Fh(s,t,e){const n=s.options.borderWidth,i=s.borderSkipped,o=fr(n);return{t:me(i.top,o.top,0,e),r:me(i.right,o.right,0,t),b:me(i.bottom,o.bottom,0,e),l:me(i.left,o.left,0,t)}}function zh(s,t,e){const{enableBorderRadius:n}=s.getProps(["enableBorderRadius"]),i=s.options.borderRadius,o=Be(i),a=Math.min(t,e),r=s.borderSkipped,l=n||N(i);return{topLeft:me(!l||r.top||r.left,o.topLeft,0,a),topRight:me(!l||r.top||r.right,o.topRight,0,a),bottomLeft:me(!l||r.bottom||r.left,o.bottomLeft,0,a),bottomRight:me(!l||r.bottom||r.right,o.bottomRight,0,a)}}function jh(s){const t=jr(s),e=t.right-t.left,n=t.bottom-t.top,i=Fh(s,e/2,n/2),o=zh(s,e/2,n/2);return{outer:{x:t.left,y:t.top,w:e,h:n,radius:o},inner:{x:t.left+i.l,y:t.top+i.t,w:e-i.l-i.r,h:n-i.t-i.b,radius:{topLeft:Math.max(0,o.topLeft-Math.max(i.t,i.l)),topRight:Math.max(0,o.topRight-Math.max(i.t,i.r)),bottomLeft:Math.max(0,o.bottomLeft-Math.max(i.b,i.l)),bottomRight:Math.max(0,o.bottomRight-Math.max(i.b,i.r))}}}}function Tn(s,t,e,n){const i=t===null,o=e===null,r=s&&!(i&&o)&&jr(s,n);return r&&(i||se(t,r.left,r.right))&&(o||se(e,r.top,r.bottom))}function Nh(s){return s.topLeft||s.topRight||s.bottomLeft||s.bottomRight}function Vh(s,t){s.rect(t.x,t.y,t.w,t.h)}function Ln(s,t,e={}){const n=s.x!==e.x?-t:0,i=s.y!==e.y?-t:0,o=(s.x+s.w!==e.x+e.w?t:0)-n,a=(s.y+s.h!==e.y+e.h?t:0)-i;return{x:s.x+n,y:s.y+i,w:s.w+o,h:s.h+a,radius:s.radius}}class Zs extends Nt{constructor(t){super(),this.options=void 0,this.horizontal=void 0,this.base=void 0,this.width=void 0,this.height=void 0,this.inflateAmount=void 0,t&&Object.assign(this,t)}draw(t){const{inflateAmount:e,options:{borderColor:n,backgroundColor:i}}=this,{inner:o,outer:a}=jh(this),r=Nh(a.radius)?Ms:Vh;t.save(),(a.w!==o.w||a.h!==o.h)&&(t.beginPath(),r(t,Ln(a,e,o)),t.clip(),r(t,Ln(o,-e,a)),t.fillStyle=n,t.fill("evenodd")),t.beginPath(),r(t,Ln(o,e)),t.fillStyle=i,t.fill(),t.restore()}inRange(t,e,n){return Tn(this,t,e,n)}inXRange(t,e){return Tn(this,t,null,e)}inYRange(t,e){return Tn(this,null,t,e)}getCenterPoint(t){const{x:e,y:n,base:i,horizontal:o}=this.getProps(["x","y","base","horizontal"],t);return{x:o?(e+i)/2:e,y:o?n:(n+i)/2}}getRange(t){return t==="x"?this.width/2:this.height/2}}C(Zs,"id","bar"),C(Zs,"defaults",{borderSkipped:"start",borderWidth:0,borderRadius:0,inflateAmount:"auto",pointStyle:void 0}),C(Zs,"defaultRoutes",{backgroundColor:"backgroundColor",borderColor:"borderColor"});var Wh=Object.freeze({__proto__:null,ArcElement:cs,BarElement:Zs,LineElement:ge,PointElement:Js});const Xn=["rgb(54, 162, 235)","rgb(255, 99, 132)","rgb(255, 159, 64)","rgb(255, 205, 86)","rgb(75, 192, 192)","rgb(153, 102, 255)","rgb(201, 203, 207)"],Ea=Xn.map(s=>s.replace("rgb(","rgba(").replace(")",", 0.5)"));function Nr(s){return Xn[s%Xn.length]}function Vr(s){return Ea[s%Ea.length]}function Hh(s,t){return s.borderColor=Nr(t),s.backgroundColor=Vr(t),++t}function Yh(s,t){return s.backgroundColor=s.data.map(()=>Nr(t++)),t}function Uh(s,t){return s.backgroundColor=s.data.map(()=>Vr(t++)),t}function Xh(s){let t=0;return(e,n)=>{const i=s.getDatasetMeta(n).controller;i instanceof Ie?t=Yh(e,t):i instanceof xs?t=Uh(e,t):i&&(t=Hh(e,t))}}function Aa(s){let t;for(t in s)if(s[t].borderColor||s[t].backgroundColor)return!0;return!1}function qh(s){return s&&(s.borderColor||s.backgroundColor)}function Gh(){return tt.borderColor!=="rgba(0,0,0,0.1)"||tt.backgroundColor!=="rgba(0,0,0,0.1)"}var Kh={id:"colors",defaults:{enabled:!0,forceOverride:!1},beforeLayout(s,t,e){if(!e.enabled)return;const{data:{datasets:n},options:i}=s.config,{elements:o}=i,a=Aa(n)||qh(i)||o&&Aa(o)||Gh();if(!e.forceOverride&&a)return;const r=Xh(s);n.forEach(r)}};function Jh(s,t,e,n,i){const o=i.samples||n;if(o>=e)return s.slice(t,t+e);const a=[],r=(e-2)/(o-2);let l=0;const c=t+e-1;let d=t,h,u,f,p,g;for(a[l++]=s[d],h=0;h<o-2;h++){let m=0,b=0,v;const M=Math.floor((h+1)*r)+1+t,k=Math.min(Math.floor((h+2)*r)+1,e)+t,w=k-M;for(v=M;v<k;v++)m+=s[v].x,b+=s[v].y;m/=w,b/=w;const E=Math.floor(h*r)+1+t,A=Math.min(Math.floor((h+1)*r)+1,e)+t,{x:D,y:I}=s[d];for(f=p=-1,v=E;v<A;v++)p=.5*Math.abs((D-m)*(s[v].y-I)-(D-s[v].x)*(b-I)),p>f&&(f=p,u=s[v],g=v);a[l++]=u,d=g}return a[l++]=s[c],a}function Zh(s,t,e,n){let i=0,o=0,a,r,l,c,d,h,u,f,p,g;const m=[],b=t+e-1,v=s[t].x,k=s[b].x-v;for(a=t;a<t+e;++a){r=s[a],l=(r.x-v)/k*n,c=r.y;const w=l|0;if(w===d)c<p?(p=c,h=a):c>g&&(g=c,u=a),i=(o*i+r.x)/++o;else{const E=a-1;if(!j(h)&&!j(u)){const A=Math.min(h,u),D=Math.max(h,u);A!==f&&A!==E&&m.push({...s[A],x:i}),D!==f&&D!==E&&m.push({...s[D],x:i})}a>0&&E!==f&&m.push(s[E]),m.push(r),d=w,o=0,p=g=c,h=u=f=a}}return m}function Wr(s){if(s._decimated){const t=s._data;delete s._decimated,delete s._data,Object.defineProperty(s,"data",{configurable:!0,enumerable:!0,writable:!0,value:t})}}function Pa(s){s.data.datasets.forEach(t=>{Wr(t)})}function Qh(s,t){const e=t.length;let n=0,i;const{iScale:o}=s,{min:a,max:r,minDefined:l,maxDefined:c}=o.getUserBounds();return l&&(n=mt(ne(t,o.axis,a).lo,0,e-1)),c?i=mt(ne(t,o.axis,r).hi+1,n,e)-n:i=e-n,{start:n,count:i}}var tu={id:"decimation",defaults:{algorithm:"min-max",enabled:!1},beforeElementsUpdate:(s,t,e)=>{if(!e.enabled){Pa(s);return}const n=s.width;s.data.datasets.forEach((i,o)=>{const{_data:a,indexAxis:r}=i,l=s.getDatasetMeta(o),c=a||i.data;if(rs([r,s.options.indexAxis])==="y"||!l.controller.supportsDecimation)return;const d=s.scales[l.xAxisID];if(d.type!=="linear"&&d.type!=="time"||s.options.parsing)return;let{start:h,count:u}=Qh(l,c);const f=e.threshold||4*n;if(u<=f){Wr(i);return}j(a)&&(i._data=c,delete i.data,Object.defineProperty(i,"data",{configurable:!0,enumerable:!0,get:function(){return this._decimated},set:function(g){this._data=g}}));let p;switch(e.algorithm){case"lttb":p=Jh(c,h,u,n,e);break;case"min-max":p=Zh(c,h,u,n);break;default:throw new Error(`Unsupported decimation algorithm '${e.algorithm}'`)}i._decimated=p})},destroy(s){Pa(s)}};function eu(s,t,e){const n=s.segments,i=s.points,o=t.points,a=[];for(const r of n){let{start:l,end:c}=r;c=yn(l,c,i);const d=qn(e,i[l],i[c],r.loop);if(!t.segments){a.push({source:r,target:d,start:i[l],end:i[c]});continue}const h=Mr(t,d);for(const u of h){const f=qn(e,o[u.start],o[u.end],u.loop),p=kr(r,i,f);for(const g of p)a.push({source:g,target:u,start:{[e]:Da(d,f,"start",Math.max)},end:{[e]:Da(d,f,"end",Math.min)}})}}return a}function qn(s,t,e,n){if(n)return;let i=t[s],o=e[s];return s==="angle"&&(i=_t(i),o=_t(o)),{property:s,start:i,end:o}}function su(s,t){const{x:e=null,y:n=null}=s||{},i=t.points,o=[];return t.segments.forEach(({start:a,end:r})=>{r=yn(a,r,i);const l=i[a],c=i[r];n!==null?(o.push({x:l.x,y:n}),o.push({x:c.x,y:n})):e!==null&&(o.push({x:e,y:l.y}),o.push({x:e,y:c.y}))}),o}function yn(s,t,e){for(;t>s;t--){const n=e[t];if(!isNaN(n.x)&&!isNaN(n.y))break}return t}function Da(s,t,e,n){return s&&t?n(s[e],t[e]):s?s[e]:t?t[e]:0}function Hr(s,t){let e=[],n=!1;return Q(s)?(n=!0,e=s):e=su(s,t),e.length?new ge({points:e,options:{tension:0},_loop:n,_fullLoop:n}):null}function Ta(s){return s&&s.fill!==!1}function nu(s,t,e){let i=s[t].fill;const o=[t];let a;if(!e)return i;for(;i!==!1&&o.indexOf(i)===-1;){if(!st(i))return i;if(a=s[i],!a)return!1;if(a.visible)return i;o.push(i),i=a.fill}return!1}function iu(s,t,e){const n=lu(s);if(N(n))return isNaN(n.value)?!1:n;let i=parseFloat(n);return st(i)&&Math.floor(i)===i?ou(n[0],t,i,e):["origin","start","end","stack","shape"].indexOf(n)>=0&&n}function ou(s,t,e,n){return(s==="-"||s==="+")&&(e=t+e),e===t||e<0||e>=n?!1:e}function au(s,t){let e=null;return s==="start"?e=t.bottom:s==="end"?e=t.top:N(s)?e=t.getPixelForValue(s.value):t.getBasePixel&&(e=t.getBasePixel()),e}function ru(s,t,e){let n;return s==="start"?n=e:s==="end"?n=t.options.reverse?t.min:t.max:N(s)?n=s.value:n=t.getBaseValue(),n}function lu(s){const t=s.options,e=t.fill;let n=B(e&&e.target,e);return n===void 0&&(n=!!t.backgroundColor),n===!1||n===null?!1:n===!0?"origin":n}function cu(s){const{scale:t,index:e,line:n}=s,i=[],o=n.segments,a=n.points,r=du(t,e);r.push(Hr({x:null,y:t.bottom},n));for(let l=0;l<o.length;l++){const c=o[l];for(let d=c.start;d<=c.end;d++)hu(i,a[d],r)}return new ge({points:i,options:{}})}function du(s,t){const e=[],n=s.getMatchingVisibleMetas("line");for(let i=0;i<n.length;i++){const o=n[i];if(o.index===t)break;o.hidden||e.unshift(o.dataset)}return e}function hu(s,t,e){const n=[];for(let i=0;i<e.length;i++){const o=e[i],{first:a,last:r,point:l}=uu(o,t,"x");if(!(!l||a&&r)){if(a)n.unshift(l);else if(s.push(l),!r)break}}s.push(...n)}function uu(s,t,e){const n=s.interpolate(t,e);if(!n)return{};const i=n[e],o=s.segments,a=s.points;let r=!1,l=!1;for(let c=0;c<o.length;c++){const d=o[c],h=a[d.start][e],u=a[d.end][e];if(se(i,h,u)){r=i===h,l=i===u;break}}return{first:r,last:l,point:n}}class Yr{constructor(t){this.x=t.x,this.y=t.y,this.radius=t.radius}pathSegment(t,e,n){const{x:i,y:o,radius:a}=this;return e=e||{start:0,end:K},t.arc(i,o,a,e.end,e.start,!0),!n.bounds}interpolate(t){const{x:e,y:n,radius:i}=this,o=t.angle;return{x:e+Math.cos(o)*i,y:n+Math.sin(o)*i,angle:o}}}function fu(s){const{chart:t,fill:e,line:n}=s;if(st(e))return pu(t,e);if(e==="stack")return cu(s);if(e==="shape")return!0;const i=gu(s);return i instanceof Yr?i:Hr(i,n)}function pu(s,t){const e=s.getDatasetMeta(t);return e&&s.isDatasetVisible(t)?e.dataset:null}function gu(s){return(s.scale||{}).getPointPositionForValue?bu(s):mu(s)}function mu(s){const{scale:t={},fill:e}=s,n=au(e,t);if(st(n)){const i=t.isHorizontal();return{x:i?n:null,y:i?null:n}}return null}function bu(s){const{scale:t,fill:e}=s,n=t.options,i=t.getLabels().length,o=n.reverse?t.max:t.min,a=ru(e,t,o),r=[];if(n.grid.circular){const l=t.getPointPositionForValue(0,o);return new Yr({x:l.x,y:l.y,radius:t.getDistanceFromCenterForValue(a)})}for(let l=0;l<i;++l)r.push(t.getPointPositionForValue(l,a));return r}function In(s,t,e){const n=fu(t),{chart:i,index:o,line:a,scale:r,axis:l}=t,c=a.options,d=c.fill,h=c.backgroundColor,{above:u=h,below:f=h}=d||{},p=i.getDatasetMeta(o),g=Sr(i,p);n&&a.points.length&&(gn(s,e),xu(s,{line:a,target:n,above:u,below:f,area:e,scale:r,axis:l,clip:g}),mn(s))}function xu(s,t){const{line:e,target:n,above:i,below:o,area:a,scale:r,clip:l}=t,c=e._loop?"angle":t.axis;s.save();let d=o;o!==i&&(c==="x"?(La(s,n,a.top),$n(s,{line:e,target:n,color:i,scale:r,property:c,clip:l}),s.restore(),s.save(),La(s,n,a.bottom)):c==="y"&&(Ia(s,n,a.left),$n(s,{line:e,target:n,color:o,scale:r,property:c,clip:l}),s.restore(),s.save(),Ia(s,n,a.right),d=i)),$n(s,{line:e,target:n,color:d,scale:r,property:c,clip:l}),s.restore()}function La(s,t,e){const{segments:n,points:i}=t;let o=!0,a=!1;s.beginPath();for(const r of n){const{start:l,end:c}=r,d=i[l],h=i[yn(l,c,i)];o?(s.moveTo(d.x,d.y),o=!1):(s.lineTo(d.x,e),s.lineTo(d.x,d.y)),a=!!t.pathSegment(s,r,{move:a}),a?s.closePath():s.lineTo(h.x,e)}s.lineTo(t.first().x,e),s.closePath(),s.clip()}function Ia(s,t,e){const{segments:n,points:i}=t;let o=!0,a=!1;s.beginPath();for(const r of n){const{start:l,end:c}=r,d=i[l],h=i[yn(l,c,i)];o?(s.moveTo(d.x,d.y),o=!1):(s.lineTo(e,d.y),s.lineTo(d.x,d.y)),a=!!t.pathSegment(s,r,{move:a}),a?s.closePath():s.lineTo(e,h.y)}s.lineTo(e,t.first().y),s.closePath(),s.clip()}function $n(s,t){const{line:e,target:n,property:i,color:o,scale:a,clip:r}=t,l=eu(e,n,i);for(const{source:c,target:d,start:h,end:u}of l){const{style:{backgroundColor:f=o}={}}=c,p=n!==!0;s.save(),s.fillStyle=f,yu(s,a,r,p&&qn(i,h,u)),s.beginPath();const g=!!e.pathSegment(s,c);let m;if(p){g?s.closePath():$a(s,n,u,i);const b=!!n.pathSegment(s,d,{move:g,reverse:!0});m=g&&b,m||$a(s,n,h,i)}s.closePath(),s.fill(m?"evenodd":"nonzero"),s.restore()}}function yu(s,t,e,n){const i=t.chart.chartArea,{property:o,start:a,end:r}=n||{};if(o==="x"||o==="y"){let l,c,d,h;o==="x"?(l=a,c=i.top,d=r,h=i.bottom):(l=i.left,c=a,d=i.right,h=r),s.beginPath(),e&&(l=Math.max(l,e.left),d=Math.min(d,e.right),c=Math.max(c,e.top),h=Math.min(h,e.bottom)),s.rect(l,c,d-l,h-c),s.clip()}}function $a(s,t,e,n){const i=t.interpolate(e,n);i&&s.lineTo(i.x,i.y)}var vu={id:"filler",afterDatasetsUpdate(s,t,e){const n=(s.data.datasets||[]).length,i=[];let o,a,r,l;for(a=0;a<n;++a)o=s.getDatasetMeta(a),r=o.dataset,l=null,r&&r.options&&r instanceof ge&&(l={visible:s.isDatasetVisible(a),index:a,fill:iu(r,a,n),chart:s,axis:o.controller.options.indexAxis,scale:o.vScale,line:r}),o.$filler=l,i.push(l);for(a=0;a<n;++a)l=i[a],!(!l||l.fill===!1)&&(l.fill=nu(i,a,e.propagate))},beforeDraw(s,t,e){const n=e.drawTime==="beforeDraw",i=s.getSortedVisibleDatasetMetas(),o=s.chartArea;for(let a=i.length-1;a>=0;--a){const r=i[a].$filler;r&&(r.line.updateControlPoints(o,r.axis),n&&r.fill&&In(s.ctx,r,o))}},beforeDatasetsDraw(s,t,e){if(e.drawTime!=="beforeDatasetsDraw")return;const n=s.getSortedVisibleDatasetMetas();for(let i=n.length-1;i>=0;--i){const o=n[i].$filler;Ta(o)&&In(s.ctx,o,s.chartArea)}},beforeDatasetDraw(s,t,e){const n=t.meta.$filler;!Ta(n)||e.drawTime!=="beforeDatasetDraw"||In(s.ctx,n,s.chartArea)},defaults:{propagate:!0,drawTime:"beforeDatasetDraw"}};const Oa=(s,t)=>{let{boxHeight:e=t,boxWidth:n=t}=s;return s.usePointStyle&&(e=Math.min(e,t),n=s.pointStyleWidth||Math.min(n,t)),{boxWidth:n,boxHeight:e,itemHeight:Math.max(t,e)}},_u=(s,t)=>s!==null&&t!==null&&s.datasetIndex===t.datasetIndex&&s.index===t.index;class Ba extends Nt{constructor(t){super(),this._added=!1,this.legendHitBoxes=[],this._hoveredItem=null,this.doughnutMode=!1,this.chart=t.chart,this.options=t.options,this.ctx=t.ctx,this.legendItems=void 0,this.columnSizes=void 0,this.lineWidths=void 0,this.maxHeight=void 0,this.maxWidth=void 0,this.top=void 0,this.bottom=void 0,this.left=void 0,this.right=void 0,this.height=void 0,this.width=void 0,this._margins=void 0,this.position=void 0,this.weight=void 0,this.fullSize=void 0}update(t,e,n){this.maxWidth=t,this.maxHeight=e,this._margins=n,this.setDimensions(),this.buildLabels(),this.fit()}setDimensions(){this.isHorizontal()?(this.width=this.maxWidth,this.left=this._margins.left,this.right=this.width):(this.height=this.maxHeight,this.top=this._margins.top,this.bottom=this.height)}buildLabels(){const t=this.options.labels||{};let e=G(t.generateLabels,[this.chart],this)||[];t.filter&&(e=e.filter(n=>t.filter(n,this.chart.data))),t.sort&&(e=e.sort((n,i)=>t.sort(n,i,this.chart.data))),this.options.reverse&&e.reverse(),this.legendItems=e}fit(){const{options:t,ctx:e}=this;if(!t.display){this.width=this.height=0;return}const n=t.labels,i=pt(n.font),o=i.size,a=this._computeTitleHeight(),{boxWidth:r,itemHeight:l}=Oa(n,o);let c,d;e.font=i.string,this.isHorizontal()?(c=this.maxWidth,d=this._fitRows(a,o,r,l)+10):(d=this.maxHeight,c=this._fitCols(a,i,r,l)+10),this.width=Math.min(c,t.maxWidth||this.maxWidth),this.height=Math.min(d,t.maxHeight||this.maxHeight)}_fitRows(t,e,n,i){const{ctx:o,maxWidth:a,options:{labels:{padding:r}}}=this,l=this.legendHitBoxes=[],c=this.lineWidths=[0],d=i+r;let h=t;o.textAlign="left",o.textBaseline="middle";let u=-1,f=-d;return this.legendItems.forEach((p,g)=>{const m=n+e/2+o.measureText(p.text).width;(g===0||c[c.length-1]+m+2*r>a)&&(h+=d,c[c.length-(g>0?0:1)]=0,f+=d,u++),l[g]={left:0,top:f,row:u,width:m,height:i},c[c.length-1]+=m+r}),h}_fitCols(t,e,n,i){const{ctx:o,maxHeight:a,options:{labels:{padding:r}}}=this,l=this.legendHitBoxes=[],c=this.columnSizes=[],d=a-t;let h=r,u=0,f=0,p=0,g=0;return this.legendItems.forEach((m,b)=>{const{itemWidth:v,itemHeight:M}=wu(n,e,o,m,i);b>0&&f+M+2*r>d&&(h+=u+r,c.push({width:u,height:f}),p+=u+r,g++,u=f=0),l[b]={left:p,top:f,col:g,width:v,height:M},u=Math.max(u,v),f+=M+r}),h+=u,c.push({width:u,height:f}),h}adjustHitBoxes(){if(!this.options.display)return;const t=this._computeTitleHeight(),{legendHitBoxes:e,options:{align:n,labels:{padding:i},rtl:o}}=this,a=qe(o,this.left,this.width);if(this.isHorizontal()){let r=0,l=yt(n,this.left+i,this.right-this.lineWidths[r]);for(const c of e)r!==c.row&&(r=c.row,l=yt(n,this.left+i,this.right-this.lineWidths[r])),c.top+=this.top+t+i,c.left=a.leftForLtr(a.x(l),c.width),l+=c.width+i}else{let r=0,l=yt(n,this.top+t+i,this.bottom-this.columnSizes[r].height);for(const c of e)c.col!==r&&(r=c.col,l=yt(n,this.top+t+i,this.bottom-this.columnSizes[r].height)),c.top=l,c.left+=this.left+i,c.left=a.leftForLtr(a.x(c.left),c.width),l+=c.height+i}}isHorizontal(){return this.options.position==="top"||this.options.position==="bottom"}draw(){if(this.options.display){const t=this.ctx;gn(t,this),this._draw(),mn(t)}}_draw(){const{options:t,columnSizes:e,lineWidths:n,ctx:i}=this,{align:o,labels:a}=t,r=tt.color,l=qe(t.rtl,this.left,this.width),c=pt(a.font),{padding:d}=a,h=c.size,u=h/2;let f;this.drawTitle(),i.textAlign=l.textAlign("left"),i.textBaseline="middle",i.lineWidth=.5,i.font=c.string;const{boxWidth:p,boxHeight:g,itemHeight:m}=Oa(a,h),b=function(E,A,D){if(isNaN(p)||p<=0||isNaN(g)||g<0)return;i.save();const I=B(D.lineWidth,1);if(i.fillStyle=B(D.fillStyle,r),i.lineCap=B(D.lineCap,"butt"),i.lineDashOffset=B(D.lineDashOffset,0),i.lineJoin=B(D.lineJoin,"miter"),i.lineWidth=I,i.strokeStyle=B(D.strokeStyle,r),i.setLineDash(B(D.lineDash,[])),a.usePointStyle){const R={radius:g*Math.SQRT2/2,pointStyle:D.pointStyle,rotation:D.rotation,borderWidth:I},F=l.xPlus(E,p/2),z=A+u;ur(i,R,F,z,a.pointStyleWidth&&p)}else{const R=A+Math.max((h-g)/2,0),F=l.leftForLtr(E,p),z=Be(D.borderRadius);i.beginPath(),Object.values(z).some(lt=>lt!==0)?Ms(i,{x:F,y:R,w:p,h:g,radius:z}):i.rect(F,R,p,g),i.fill(),I!==0&&i.stroke()}i.restore()},v=function(E,A,D){ze(i,D.text,E,A+m/2,c,{strikethrough:D.hidden,textAlign:l.textAlign(D.textAlign)})},M=this.isHorizontal(),k=this._computeTitleHeight();M?f={x:yt(o,this.left+d,this.right-n[0]),y:this.top+d+k,line:0}:f={x:this.left+d,y:yt(o,this.top+k+d,this.bottom-e[0].height),line:0},vr(this.ctx,t.textDirection);const w=m+d;this.legendItems.forEach((E,A)=>{i.strokeStyle=E.fontColor,i.fillStyle=E.fontColor;const D=i.measureText(E.text).width,I=l.textAlign(E.textAlign||(E.textAlign=a.textAlign)),R=p+u+D;let F=f.x,z=f.y;l.setWidth(this.width),M?A>0&&F+R+d>this.right&&(z=f.y+=w,f.line++,F=f.x=yt(o,this.left+d,this.right-n[f.line])):A>0&&z+w>this.bottom&&(F=f.x=F+e[f.line].width+d,f.line++,z=f.y=yt(o,this.top+k+d,this.bottom-e[f.line].height));const lt=l.x(F);if(b(lt,z,E),F=Nl(I,F+p+u,M?F+R:this.right,t.rtl),v(l.x(F),z,E),M)f.x+=R+d;else if(typeof E.text!="string"){const xt=c.lineHeight;f.y+=Ur(E,xt)+d}else f.y+=w}),_r(this.ctx,t.textDirection)}drawTitle(){const t=this.options,e=t.title,n=pt(e.font),i=Mt(e.padding);if(!e.display)return;const o=qe(t.rtl,this.left,this.width),a=this.ctx,r=e.position,l=n.size/2,c=i.top+l;let d,h=this.left,u=this.width;if(this.isHorizontal())u=Math.max(...this.lineWidths),d=this.top+c,h=yt(t.align,h,this.right-u);else{const p=this.columnSizes.reduce((g,m)=>Math.max(g,m.height),0);d=c+yt(t.align,this.top,this.bottom-p-t.labels.padding-this._computeTitleHeight())}const f=yt(r,h,h+u);a.textAlign=o.textAlign(ui(r)),a.textBaseline="middle",a.strokeStyle=e.color,a.fillStyle=e.color,a.font=n.string,ze(a,e.text,f,d,n)}_computeTitleHeight(){const t=this.options.title,e=pt(t.font),n=Mt(t.padding);return t.display?e.lineHeight+n.height:0}_getLegendItemAt(t,e){let n,i,o;if(se(t,this.left,this.right)&&se(e,this.top,this.bottom)){for(o=this.legendHitBoxes,n=0;n<o.length;++n)if(i=o[n],se(t,i.left,i.left+i.width)&&se(e,i.top,i.top+i.height))return this.legendItems[n]}return null}handleEvent(t){const e=this.options;if(!Su(t.type,e))return;const n=this._getLegendItemAt(t.x,t.y);if(t.type==="mousemove"||t.type==="mouseout"){const i=this._hoveredItem,o=_u(i,n);i&&!o&&G(e.onLeave,[t,i,this],this),this._hoveredItem=n,n&&!o&&G(e.onHover,[t,n,this],this)}else n&&G(e.onClick,[t,n,this],this)}}function wu(s,t,e,n,i){const o=ku(n,s,t,e),a=Mu(i,n,t.lineHeight);return{itemWidth:o,itemHeight:a}}function ku(s,t,e,n){let i=s.text;return i&&typeof i!="string"&&(i=i.reduce((o,a)=>o.length>a.length?o:a)),t+e.size/2+n.measureText(i).width}function Mu(s,t,e){let n=s;return typeof t.text!="string"&&(n=Ur(t,e)),n}function Ur(s,t){const e=s.text?s.text.length:0;return t*e}function Su(s,t){return!!((s==="mousemove"||s==="mouseout")&&(t.onHover||t.onLeave)||t.onClick&&(s==="click"||s==="mouseup"))}var Cu={id:"legend",_element:Ba,start(s,t,e){const n=s.legend=new Ba({ctx:s.ctx,options:e,chart:s});kt.configure(s,n,e),kt.addBox(s,n)},stop(s){kt.removeBox(s,s.legend),delete s.legend},beforeUpdate(s,t,e){const n=s.legend;kt.configure(s,n,e),n.options=e},afterUpdate(s){const t=s.legend;t.buildLabels(),t.adjustHitBoxes()},afterEvent(s,t){t.replay||s.legend.handleEvent(t.event)},defaults:{display:!0,position:"top",align:"center",fullSize:!0,reverse:!1,weight:1e3,onClick(s,t,e){const n=t.datasetIndex,i=e.chart;i.isDatasetVisible(n)?(i.hide(n),t.hidden=!0):(i.show(n),t.hidden=!1)},onHover:null,onLeave:null,labels:{color:s=>s.chart.options.color,boxWidth:40,padding:10,generateLabels(s){const t=s.data.datasets,{labels:{usePointStyle:e,pointStyle:n,textAlign:i,color:o,useBorderRadius:a,borderRadius:r}}=s.legend.options;return s._getSortedDatasetMetas().map(l=>{const c=l.controller.getStyle(e?0:void 0),d=Mt(c.borderWidth);return{text:t[l.index].label,fillStyle:c.backgroundColor,fontColor:o,hidden:!l.visible,lineCap:c.borderCapStyle,lineDash:c.borderDash,lineDashOffset:c.borderDashOffset,lineJoin:c.borderJoinStyle,lineWidth:(d.width+d.height)/4,strokeStyle:c.borderColor,pointStyle:n||c.pointStyle,rotation:c.rotation,textAlign:i||c.textAlign,borderRadius:a&&(r||c.borderRadius),datasetIndex:l.index}},this)}},title:{color:s=>s.chart.options.color,display:!1,position:"center",text:""}},descriptors:{_scriptable:s=>!s.startsWith("on"),labels:{_scriptable:s=>!["generateLabels","filter","sort"].includes(s)}}};class _i extends Nt{constructor(t){super(),this.chart=t.chart,this.options=t.options,this.ctx=t.ctx,this._padding=void 0,this.top=void 0,this.bottom=void 0,this.left=void 0,this.right=void 0,this.width=void 0,this.height=void 0,this.position=void 0,this.weight=void 0,this.fullSize=void 0}update(t,e){const n=this.options;if(this.left=0,this.top=0,!n.display){this.width=this.height=this.right=this.bottom=0;return}this.width=this.right=t,this.height=this.bottom=e;const i=Q(n.text)?n.text.length:1;this._padding=Mt(n.padding);const o=i*pt(n.font).lineHeight+this._padding.height;this.isHorizontal()?this.height=o:this.width=o}isHorizontal(){const t=this.options.position;return t==="top"||t==="bottom"}_drawArgs(t){const{top:e,left:n,bottom:i,right:o,options:a}=this,r=a.align;let l=0,c,d,h;return this.isHorizontal()?(d=yt(r,n,o),h=e+t,c=o-n):(a.position==="left"?(d=n+t,h=yt(r,i,e),l=V*-.5):(d=o-t,h=yt(r,e,i),l=V*.5),c=i-e),{titleX:d,titleY:h,maxWidth:c,rotation:l}}draw(){const t=this.ctx,e=this.options;if(!e.display)return;const n=pt(e.font),o=n.lineHeight/2+this._padding.top,{titleX:a,titleY:r,maxWidth:l,rotation:c}=this._drawArgs(o);ze(t,e.text,0,0,n,{color:e.color,maxWidth:l,rotation:c,textAlign:ui(e.align),textBaseline:"middle",translation:[a,r]})}}function Eu(s,t){const e=new _i({ctx:s.ctx,options:t,chart:s});kt.configure(s,e,t),kt.addBox(s,e),s.titleBlock=e}var Au={id:"title",_element:_i,start(s,t,e){Eu(s,e)},stop(s){const t=s.titleBlock;kt.removeBox(s,t),delete s.titleBlock},beforeUpdate(s,t,e){const n=s.titleBlock;kt.configure(s,n,e),n.options=e},defaults:{align:"center",display:!1,font:{weight:"bold"},fullSize:!0,padding:10,position:"top",text:"",weight:2e3},defaultRoutes:{color:"color"},descriptors:{_scriptable:!0,_indexable:!1}};const Ns=new WeakMap;var Pu={id:"subtitle",start(s,t,e){const n=new _i({ctx:s.ctx,options:e,chart:s});kt.configure(s,n,e),kt.addBox(s,n),Ns.set(s,n)},stop(s){kt.removeBox(s,Ns.get(s)),Ns.delete(s)},beforeUpdate(s,t,e){const n=Ns.get(s);kt.configure(s,n,e),n.options=e},defaults:{align:"center",display:!1,font:{weight:"normal"},fullSize:!0,padding:0,position:"top",text:"",weight:1500},defaultRoutes:{color:"color"},descriptors:{_scriptable:!0,_indexable:!1}};const ds={average(s){if(!s.length)return!1;let t,e,n=new Set,i=0,o=0;for(t=0,e=s.length;t<e;++t){const r=s[t].element;if(r&&r.hasValue()){const l=r.tooltipPosition();n.add(l.x),i+=l.y,++o}}return o===0||n.size===0?!1:{x:[...n].reduce((r,l)=>r+l)/n.size,y:i/o}},nearest(s,t){if(!s.length)return!1;let e=t.x,n=t.y,i=Number.POSITIVE_INFINITY,o,a,r;for(o=0,a=s.length;o<a;++o){const l=s[o].element;if(l&&l.hasValue()){const c=l.getCenterPoint(),d=jn(t,c);d<i&&(i=d,r=l)}}if(r){const l=r.tooltipPosition();e=l.x,n=l.y}return{x:e,y:n}}};function Yt(s,t){return t&&(Q(t)?Array.prototype.push.apply(s,t):s.push(t)),s}function Qt(s){return(typeof s=="string"||s instanceof String)&&s.indexOf(`
`)>-1?s.split(`
`):s}function Du(s,t){const{element:e,datasetIndex:n,index:i}=t,o=s.getDatasetMeta(n).controller,{label:a,value:r}=o.getLabelAndValue(i);return{chart:s,label:a,parsed:o.getParsed(i),raw:s.data.datasets[n].data[i],formattedValue:r,dataset:o.getDataset(),dataIndex:i,datasetIndex:n,element:e}}function Ra(s,t){const e=s.chart.ctx,{body:n,footer:i,title:o}=s,{boxWidth:a,boxHeight:r}=t,l=pt(t.bodyFont),c=pt(t.titleFont),d=pt(t.footerFont),h=o.length,u=i.length,f=n.length,p=Mt(t.padding);let g=p.height,m=0,b=n.reduce((k,w)=>k+w.before.length+w.lines.length+w.after.length,0);if(b+=s.beforeBody.length+s.afterBody.length,h&&(g+=h*c.lineHeight+(h-1)*t.titleSpacing+t.titleMarginBottom),b){const k=t.displayColors?Math.max(r,l.lineHeight):l.lineHeight;g+=f*k+(b-f)*l.lineHeight+(b-1)*t.bodySpacing}u&&(g+=t.footerMarginTop+u*d.lineHeight+(u-1)*t.footerSpacing);let v=0;const M=function(k){m=Math.max(m,e.measureText(k).width+v)};return e.save(),e.font=c.string,U(s.title,M),e.font=l.string,U(s.beforeBody.concat(s.afterBody),M),v=t.displayColors?a+2+t.boxPadding:0,U(n,k=>{U(k.before,M),U(k.lines,M),U(k.after,M)}),v=0,e.font=d.string,U(s.footer,M),e.restore(),m+=p.width,{width:m,height:g}}function Tu(s,t){const{y:e,height:n}=t;return e<n/2?"top":e>s.height-n/2?"bottom":"center"}function Lu(s,t,e,n){const{x:i,width:o}=n,a=e.caretSize+e.caretPadding;if(s==="left"&&i+o+a>t.width||s==="right"&&i-o-a<0)return!0}function Iu(s,t,e,n){const{x:i,width:o}=e,{width:a,chartArea:{left:r,right:l}}=s;let c="center";return n==="center"?c=i<=(r+l)/2?"left":"right":i<=o/2?c="left":i>=a-o/2&&(c="right"),Lu(c,s,t,e)&&(c="center"),c}function Fa(s,t,e){const n=e.yAlign||t.yAlign||Tu(s,e);return{xAlign:e.xAlign||t.xAlign||Iu(s,t,e,n),yAlign:n}}function $u(s,t){let{x:e,width:n}=s;return t==="right"?e-=n:t==="center"&&(e-=n/2),e}function Ou(s,t,e){let{y:n,height:i}=s;return t==="top"?n+=e:t==="bottom"?n-=i+e:n-=i/2,n}function za(s,t,e,n){const{caretSize:i,caretPadding:o,cornerRadius:a}=s,{xAlign:r,yAlign:l}=e,c=i+o,{topLeft:d,topRight:h,bottomLeft:u,bottomRight:f}=Be(a);let p=$u(t,r);const g=Ou(t,l,c);return l==="center"?r==="left"?p+=c:r==="right"&&(p-=c):r==="left"?p-=Math.max(d,u)+i:r==="right"&&(p+=Math.max(h,f)+i),{x:mt(p,0,n.width-t.width),y:mt(g,0,n.height-t.height)}}function Vs(s,t,e){const n=Mt(e.padding);return t==="center"?s.x+s.width/2:t==="right"?s.x+s.width-n.right:s.x+n.left}function ja(s){return Yt([],Qt(s))}function Bu(s,t,e){return Me(s,{tooltip:t,tooltipItems:e,type:"tooltip"})}function Na(s,t){const e=t&&t.dataset&&t.dataset.tooltip&&t.dataset.tooltip.callbacks;return e?s.override(e):s}const Xr={beforeTitle:Jt,title(s){if(s.length>0){const t=s[0],e=t.chart.data.labels,n=e?e.length:0;if(this&&this.options&&this.options.mode==="dataset")return t.dataset.label||"";if(t.label)return t.label;if(n>0&&t.dataIndex<n)return e[t.dataIndex]}return""},afterTitle:Jt,beforeBody:Jt,beforeLabel:Jt,label(s){if(this&&this.options&&this.options.mode==="dataset")return s.label+": "+s.formattedValue||s.formattedValue;let t=s.dataset.label||"";t&&(t+=": ");const e=s.formattedValue;return j(e)||(t+=e),t},labelColor(s){const e=s.chart.getDatasetMeta(s.datasetIndex).controller.getStyle(s.dataIndex);return{borderColor:e.borderColor,backgroundColor:e.backgroundColor,borderWidth:e.borderWidth,borderDash:e.borderDash,borderDashOffset:e.borderDashOffset,borderRadius:0}},labelTextColor(){return this.options.bodyColor},labelPointStyle(s){const e=s.chart.getDatasetMeta(s.datasetIndex).controller.getStyle(s.dataIndex);return{pointStyle:e.pointStyle,rotation:e.rotation}},afterLabel:Jt,afterBody:Jt,beforeFooter:Jt,footer:Jt,afterFooter:Jt};function At(s,t,e,n){const i=s[t].call(e,n);return typeof i>"u"?Xr[t].call(e,n):i}class Gn extends Nt{constructor(t){super(),this.opacity=0,this._active=[],this._eventPosition=void 0,this._size=void 0,this._cachedAnimations=void 0,this._tooltipItems=[],this.$animations=void 0,this.$context=void 0,this.chart=t.chart,this.options=t.options,this.dataPoints=void 0,this.title=void 0,this.beforeBody=void 0,this.body=void 0,this.afterBody=void 0,this.footer=void 0,this.xAlign=void 0,this.yAlign=void 0,this.x=void 0,this.y=void 0,this.height=void 0,this.width=void 0,this.caretX=void 0,this.caretY=void 0,this.labelColors=void 0,this.labelPointStyles=void 0,this.labelTextColors=void 0}initialize(t){this.options=t,this._cachedAnimations=void 0,this.$context=void 0}_resolveAnimations(){const t=this._cachedAnimations;if(t)return t;const e=this.chart,n=this.options.setContext(this.getContext()),i=n.enabled&&e.options.animation&&n.animations,o=new Cr(this.chart,i);return i._cacheable&&(this._cachedAnimations=Object.freeze(o)),o}getContext(){return this.$context||(this.$context=Bu(this.chart.getContext(),this,this._tooltipItems))}getTitle(t,e){const{callbacks:n}=e,i=At(n,"beforeTitle",this,t),o=At(n,"title",this,t),a=At(n,"afterTitle",this,t);let r=[];return r=Yt(r,Qt(i)),r=Yt(r,Qt(o)),r=Yt(r,Qt(a)),r}getBeforeBody(t,e){return ja(At(e.callbacks,"beforeBody",this,t))}getBody(t,e){const{callbacks:n}=e,i=[];return U(t,o=>{const a={before:[],lines:[],after:[]},r=Na(n,o);Yt(a.before,Qt(At(r,"beforeLabel",this,o))),Yt(a.lines,At(r,"label",this,o)),Yt(a.after,Qt(At(r,"afterLabel",this,o))),i.push(a)}),i}getAfterBody(t,e){return ja(At(e.callbacks,"afterBody",this,t))}getFooter(t,e){const{callbacks:n}=e,i=At(n,"beforeFooter",this,t),o=At(n,"footer",this,t),a=At(n,"afterFooter",this,t);let r=[];return r=Yt(r,Qt(i)),r=Yt(r,Qt(o)),r=Yt(r,Qt(a)),r}_createItems(t){const e=this._active,n=this.chart.data,i=[],o=[],a=[];let r=[],l,c;for(l=0,c=e.length;l<c;++l)r.push(Du(this.chart,e[l]));return t.filter&&(r=r.filter((d,h,u)=>t.filter(d,h,u,n))),t.itemSort&&(r=r.sort((d,h)=>t.itemSort(d,h,n))),U(r,d=>{const h=Na(t.callbacks,d);i.push(At(h,"labelColor",this,d)),o.push(At(h,"labelPointStyle",this,d)),a.push(At(h,"labelTextColor",this,d))}),this.labelColors=i,this.labelPointStyles=o,this.labelTextColors=a,this.dataPoints=r,r}update(t,e){const n=this.options.setContext(this.getContext()),i=this._active;let o,a=[];if(!i.length)this.opacity!==0&&(o={opacity:0});else{const r=ds[n.position].call(this,i,this._eventPosition);a=this._createItems(n),this.title=this.getTitle(a,n),this.beforeBody=this.getBeforeBody(a,n),this.body=this.getBody(a,n),this.afterBody=this.getAfterBody(a,n),this.footer=this.getFooter(a,n);const l=this._size=Ra(this,n),c=Object.assign({},r,l),d=Fa(this.chart,n,c),h=za(n,c,d,this.chart);this.xAlign=d.xAlign,this.yAlign=d.yAlign,o={opacity:1,x:h.x,y:h.y,width:l.width,height:l.height,caretX:r.x,caretY:r.y}}this._tooltipItems=a,this.$context=void 0,o&&this._resolveAnimations().update(this,o),t&&n.external&&n.external.call(this,{chart:this.chart,tooltip:this,replay:e})}drawCaret(t,e,n,i){const o=this.getCaretPosition(t,n,i);e.lineTo(o.x1,o.y1),e.lineTo(o.x2,o.y2),e.lineTo(o.x3,o.y3)}getCaretPosition(t,e,n){const{xAlign:i,yAlign:o}=this,{caretSize:a,cornerRadius:r}=n,{topLeft:l,topRight:c,bottomLeft:d,bottomRight:h}=Be(r),{x:u,y:f}=t,{width:p,height:g}=e;let m,b,v,M,k,w;return o==="center"?(k=f+g/2,i==="left"?(m=u,b=m-a,M=k+a,w=k-a):(m=u+p,b=m+a,M=k-a,w=k+a),v=m):(i==="left"?b=u+Math.max(l,d)+a:i==="right"?b=u+p-Math.max(c,h)-a:b=this.caretX,o==="top"?(M=f,k=M-a,m=b-a,v=b+a):(M=f+g,k=M+a,m=b+a,v=b-a),w=M),{x1:m,x2:b,x3:v,y1:M,y2:k,y3:w}}drawTitle(t,e,n){const i=this.title,o=i.length;let a,r,l;if(o){const c=qe(n.rtl,this.x,this.width);for(t.x=Vs(this,n.titleAlign,n),e.textAlign=c.textAlign(n.titleAlign),e.textBaseline="middle",a=pt(n.titleFont),r=n.titleSpacing,e.fillStyle=n.titleColor,e.font=a.string,l=0;l<o;++l)e.fillText(i[l],c.x(t.x),t.y+a.lineHeight/2),t.y+=a.lineHeight+r,l+1===o&&(t.y+=n.titleMarginBottom-r)}}_drawColorBox(t,e,n,i,o){const a=this.labelColors[n],r=this.labelPointStyles[n],{boxHeight:l,boxWidth:c}=o,d=pt(o.bodyFont),h=Vs(this,"left",o),u=i.x(h),f=l<d.lineHeight?(d.lineHeight-l)/2:0,p=e.y+f;if(o.usePointStyle){const g={radius:Math.min(c,l)/2,pointStyle:r.pointStyle,rotation:r.rotation,borderWidth:1},m=i.leftForLtr(u,c)+c/2,b=p+l/2;t.strokeStyle=o.multiKeyBackground,t.fillStyle=o.multiKeyBackground,Vn(t,g,m,b),t.strokeStyle=a.borderColor,t.fillStyle=a.backgroundColor,Vn(t,g,m,b)}else{t.lineWidth=N(a.borderWidth)?Math.max(...Object.values(a.borderWidth)):a.borderWidth||1,t.strokeStyle=a.borderColor,t.setLineDash(a.borderDash||[]),t.lineDashOffset=a.borderDashOffset||0;const g=i.leftForLtr(u,c),m=i.leftForLtr(i.xPlus(u,1),c-2),b=Be(a.borderRadius);Object.values(b).some(v=>v!==0)?(t.beginPath(),t.fillStyle=o.multiKeyBackground,Ms(t,{x:g,y:p,w:c,h:l,radius:b}),t.fill(),t.stroke(),t.fillStyle=a.backgroundColor,t.beginPath(),Ms(t,{x:m,y:p+1,w:c-2,h:l-2,radius:b}),t.fill()):(t.fillStyle=o.multiKeyBackground,t.fillRect(g,p,c,l),t.strokeRect(g,p,c,l),t.fillStyle=a.backgroundColor,t.fillRect(m,p+1,c-2,l-2))}t.fillStyle=this.labelTextColors[n]}drawBody(t,e,n){const{body:i}=this,{bodySpacing:o,bodyAlign:a,displayColors:r,boxHeight:l,boxWidth:c,boxPadding:d}=n,h=pt(n.bodyFont);let u=h.lineHeight,f=0;const p=qe(n.rtl,this.x,this.width),g=function(D){e.fillText(D,p.x(t.x+f),t.y+u/2),t.y+=u+o},m=p.textAlign(a);let b,v,M,k,w,E,A;for(e.textAlign=a,e.textBaseline="middle",e.font=h.string,t.x=Vs(this,m,n),e.fillStyle=n.bodyColor,U(this.beforeBody,g),f=r&&m!=="right"?a==="center"?c/2+d:c+2+d:0,k=0,E=i.length;k<E;++k){for(b=i[k],v=this.labelTextColors[k],e.fillStyle=v,U(b.before,g),M=b.lines,r&&M.length&&(this._drawColorBox(e,t,k,p,n),u=Math.max(h.lineHeight,l)),w=0,A=M.length;w<A;++w)g(M[w]),u=h.lineHeight;U(b.after,g)}f=0,u=h.lineHeight,U(this.afterBody,g),t.y-=o}drawFooter(t,e,n){const i=this.footer,o=i.length;let a,r;if(o){const l=qe(n.rtl,this.x,this.width);for(t.x=Vs(this,n.footerAlign,n),t.y+=n.footerMarginTop,e.textAlign=l.textAlign(n.footerAlign),e.textBaseline="middle",a=pt(n.footerFont),e.fillStyle=n.footerColor,e.font=a.string,r=0;r<o;++r)e.fillText(i[r],l.x(t.x),t.y+a.lineHeight/2),t.y+=a.lineHeight+n.footerSpacing}}drawBackground(t,e,n,i){const{xAlign:o,yAlign:a}=this,{x:r,y:l}=t,{width:c,height:d}=n,{topLeft:h,topRight:u,bottomLeft:f,bottomRight:p}=Be(i.cornerRadius);e.fillStyle=i.backgroundColor,e.strokeStyle=i.borderColor,e.lineWidth=i.borderWidth,e.beginPath(),e.moveTo(r+h,l),a==="top"&&this.drawCaret(t,e,n,i),e.lineTo(r+c-u,l),e.quadraticCurveTo(r+c,l,r+c,l+u),a==="center"&&o==="right"&&this.drawCaret(t,e,n,i),e.lineTo(r+c,l+d-p),e.quadraticCurveTo(r+c,l+d,r+c-p,l+d),a==="bottom"&&this.drawCaret(t,e,n,i),e.lineTo(r+f,l+d),e.quadraticCurveTo(r,l+d,r,l+d-f),a==="center"&&o==="left"&&this.drawCaret(t,e,n,i),e.lineTo(r,l+h),e.quadraticCurveTo(r,l,r+h,l),e.closePath(),e.fill(),i.borderWidth>0&&e.stroke()}_updateAnimationTarget(t){const e=this.chart,n=this.$animations,i=n&&n.x,o=n&&n.y;if(i||o){const a=ds[t.position].call(this,this._active,this._eventPosition);if(!a)return;const r=this._size=Ra(this,t),l=Object.assign({},a,this._size),c=Fa(e,t,l),d=za(t,l,c,e);(i._to!==d.x||o._to!==d.y)&&(this.xAlign=c.xAlign,this.yAlign=c.yAlign,this.width=r.width,this.height=r.height,this.caretX=a.x,this.caretY=a.y,this._resolveAnimations().update(this,d))}}_willRender(){return!!this.opacity}draw(t){const e=this.options.setContext(this.getContext());let n=this.opacity;if(!n)return;this._updateAnimationTarget(e);const i={width:this.width,height:this.height},o={x:this.x,y:this.y};n=Math.abs(n)<.001?0:n;const a=Mt(e.padding),r=this.title.length||this.beforeBody.length||this.body.length||this.afterBody.length||this.footer.length;e.enabled&&r&&(t.save(),t.globalAlpha=n,this.drawBackground(o,t,i,e),vr(t,e.textDirection),o.y+=a.top,this.drawTitle(o,t,e),this.drawBody(o,t,e),this.drawFooter(o,t,e),_r(t,e.textDirection),t.restore())}getActiveElements(){return this._active||[]}setActiveElements(t,e){const n=this._active,i=t.map(({datasetIndex:r,index:l})=>{const c=this.chart.getDatasetMeta(r);if(!c)throw new Error("Cannot find a dataset at index "+r);return{datasetIndex:r,element:c.data[l],index:l}}),o=!nn(n,i),a=this._positionChanged(i,e);(o||a)&&(this._active=i,this._eventPosition=e,this._ignoreReplayEvents=!0,this.update(!0))}handleEvent(t,e,n=!0){if(e&&this._ignoreReplayEvents)return!1;this._ignoreReplayEvents=!1;const i=this.options,o=this._active||[],a=this._getActiveElements(t,o,e,n),r=this._positionChanged(a,t),l=e||!nn(a,o)||r;return l&&(this._active=a,(i.enabled||i.external)&&(this._eventPosition={x:t.x,y:t.y},this.update(!0,e))),l}_getActiveElements(t,e,n,i){const o=this.options;if(t.type==="mouseout")return[];if(!i)return e.filter(r=>this.chart.data.datasets[r.datasetIndex]&&this.chart.getDatasetMeta(r.datasetIndex).controller.getParsed(r.index)!==void 0);const a=this.chart.getElementsAtEventForMode(t,o.mode,o,n);return o.reverse&&a.reverse(),a}_positionChanged(t,e){const{caretX:n,caretY:i,options:o}=this,a=ds[o.position].call(this,t,e);return a!==!1&&(n!==a.x||i!==a.y)}}C(Gn,"positioners",ds);var Ru={id:"tooltip",_element:Gn,positioners:ds,afterInit(s,t,e){e&&(s.tooltip=new Gn({chart:s,options:e}))},beforeUpdate(s,t,e){s.tooltip&&s.tooltip.initialize(e)},reset(s,t,e){s.tooltip&&s.tooltip.initialize(e)},afterDraw(s){const t=s.tooltip;if(t&&t._willRender()){const e={tooltip:t};if(s.notifyPlugins("beforeTooltipDraw",{...e,cancelable:!0})===!1)return;t.draw(s.ctx),s.notifyPlugins("afterTooltipDraw",e)}},afterEvent(s,t){if(s.tooltip){const e=t.replay;s.tooltip.handleEvent(t.event,e,t.inChartArea)&&(t.changed=!0)}},defaults:{enabled:!0,external:null,position:"average",backgroundColor:"rgba(0,0,0,0.8)",titleColor:"#fff",titleFont:{weight:"bold"},titleSpacing:2,titleMarginBottom:6,titleAlign:"left",bodyColor:"#fff",bodySpacing:2,bodyFont:{},bodyAlign:"left",footerColor:"#fff",footerSpacing:2,footerMarginTop:6,footerFont:{weight:"bold"},footerAlign:"left",padding:6,caretPadding:2,caretSize:5,cornerRadius:6,boxHeight:(s,t)=>t.bodyFont.size,boxWidth:(s,t)=>t.bodyFont.size,multiKeyBackground:"#fff",displayColors:!0,boxPadding:0,borderColor:"rgba(0,0,0,0)",borderWidth:0,animation:{duration:400,easing:"easeOutQuart"},animations:{numbers:{type:"number",properties:["x","y","width","height","caretX","caretY"]},opacity:{easing:"linear",duration:200}},callbacks:Xr},defaultRoutes:{bodyFont:"font",footerFont:"font",titleFont:"font"},descriptors:{_scriptable:s=>s!=="filter"&&s!=="itemSort"&&s!=="external",_indexable:!1,callbacks:{_scriptable:!1,_indexable:!1},animation:{_fallback:!1},animations:{_fallback:"animation"}},additionalOptionScopes:["interaction"]},Fu=Object.freeze({__proto__:null,Colors:Kh,Decimation:tu,Filler:vu,Legend:Cu,SubTitle:Pu,Title:Au,Tooltip:Ru});const zu=(s,t,e,n)=>(typeof t=="string"?(e=s.push(t)-1,n.unshift({index:e,label:t})):isNaN(t)&&(e=null),e);function ju(s,t,e,n){const i=s.indexOf(t);if(i===-1)return zu(s,t,e,n);const o=s.lastIndexOf(t);return i!==o?e:i}const Nu=(s,t)=>s===null?null:mt(Math.round(s),0,t);function Va(s){const t=this.getLabels();return s>=0&&s<t.length?t[s]:s}class Kn extends je{constructor(t){super(t),this._startValue=void 0,this._valueRange=0,this._addedLabels=[]}init(t){const e=this._addedLabels;if(e.length){const n=this.getLabels();for(const{index:i,label:o}of e)n[i]===o&&n.splice(i,1);this._addedLabels=[]}super.init(t)}parse(t,e){if(j(t))return null;const n=this.getLabels();return e=isFinite(e)&&n[e]===t?e:ju(n,t,B(e,t),this._addedLabels),Nu(e,n.length-1)}determineDataLimits(){const{minDefined:t,maxDefined:e}=this.getUserBounds();let{min:n,max:i}=this.getMinMax(!0);this.options.bounds==="ticks"&&(t||(n=0),e||(i=this.getLabels().length-1)),this.min=n,this.max=i}buildTicks(){const t=this.min,e=this.max,n=this.options.offset,i=[];let o=this.getLabels();o=t===0&&e===o.length-1?o:o.slice(t,e+1),this._valueRange=Math.max(o.length-(n?0:1),1),this._startValue=this.min-(n?.5:0);for(let a=t;a<=e;a++)i.push({value:a});return i}getLabelForValue(t){return Va.call(this,t)}configure(){super.configure(),this.isHorizontal()||(this._reversePixels=!this._reversePixels)}getPixelForValue(t){return typeof t!="number"&&(t=this.parse(t)),t===null?NaN:this.getPixelForDecimal((t-this._startValue)/this._valueRange)}getPixelForTick(t){const e=this.ticks;return t<0||t>e.length-1?null:this.getPixelForValue(e[t].value)}getValueForPixel(t){return Math.round(this._startValue+this.getDecimalForPixel(t)*this._valueRange)}getBasePixel(){return this.bottom}}C(Kn,"id","category"),C(Kn,"defaults",{ticks:{callback:Va}});function Vu(s,t){const e=[],{bounds:i,step:o,min:a,max:r,precision:l,count:c,maxTicks:d,maxDigits:h,includeBounds:u}=s,f=o||1,p=d-1,{min:g,max:m}=t,b=!j(a),v=!j(r),M=!j(c),k=(m-g)/(h+1);let w=Ro((m-g)/p/f)*f,E,A,D,I;if(w<1e-14&&!b&&!v)return[{value:g},{value:m}];I=Math.ceil(m/w)-Math.floor(g/w),I>p&&(w=Ro(I*w/p/f)*f),j(l)||(E=Math.pow(10,l),w=Math.ceil(w*E)/E),i==="ticks"?(A=Math.floor(g/w)*w,D=Math.ceil(m/w)*w):(A=g,D=m),b&&v&&o&&$l((r-a)/o,w/1e3)?(I=Math.round(Math.min((r-a)/w,d)),w=(r-a)/I,A=a,D=r):M?(A=b?a:A,D=v?r:D,I=c-1,w=(D-A)/I):(I=(D-A)/w,gs(I,Math.round(I),w/1e3)?I=Math.round(I):I=Math.ceil(I));const R=Math.max(Fo(w),Fo(A));E=Math.pow(10,j(l)?R:l),A=Math.round(A*E)/E,D=Math.round(D*E)/E;let F=0;for(b&&(u&&A!==a?(e.push({value:a}),A<a&&F++,gs(Math.round((A+F*w)*E)/E,a,Wa(a,k,s))&&F++):A<a&&F++);F<I;++F){const z=Math.round((A+F*w)*E)/E;if(v&&z>r)break;e.push({value:z})}return v&&u&&D!==r?e.length&&gs(e[e.length-1].value,r,Wa(r,k,s))?e[e.length-1].value=r:e.push({value:r}):(!v||D===r)&&e.push({value:D}),e}function Wa(s,t,{horizontal:e,minRotation:n}){const i=zt(n),o=(e?Math.sin(i):Math.cos(i))||.001,a=.75*t*(""+s).length;return Math.min(t/o,a)}class hn extends je{constructor(t){super(t),this.start=void 0,this.end=void 0,this._startValue=void 0,this._endValue=void 0,this._valueRange=0}parse(t,e){return j(t)||(typeof t=="number"||t instanceof Number)&&!isFinite(+t)?null:+t}handleTickRangeOptions(){const{beginAtZero:t}=this.options,{minDefined:e,maxDefined:n}=this.getUserBounds();let{min:i,max:o}=this;const a=l=>i=e?i:l,r=l=>o=n?o:l;if(t){const l=qt(i),c=qt(o);l<0&&c<0?r(0):l>0&&c>0&&a(0)}if(i===o){let l=o===0?1:Math.abs(o*.05);r(o+l),t||a(i-l)}this.min=i,this.max=o}getTickLimit(){const t=this.options.ticks;let{maxTicksLimit:e,stepSize:n}=t,i;return n?(i=Math.ceil(this.max/n)-Math.floor(this.min/n)+1,i>1e3&&(console.warn(`scales.${this.id}.ticks.stepSize: ${n} would result generating up to ${i} ticks. Limiting to 1000.`),i=1e3)):(i=this.computeTickLimit(),e=e||11),e&&(i=Math.min(e,i)),i}computeTickLimit(){return Number.POSITIVE_INFINITY}buildTicks(){const t=this.options,e=t.ticks;let n=this.getTickLimit();n=Math.max(2,n);const i={maxTicks:n,bounds:t.bounds,min:t.min,max:t.max,precision:e.precision,step:e.stepSize,count:e.count,maxDigits:this._maxDigits(),horizontal:this.isHorizontal(),minRotation:e.minRotation||0,includeBounds:e.includeBounds!==!1},o=this._range||this,a=Vu(i,o);return t.bounds==="ticks"&&nr(a,this,"value"),t.reverse?(a.reverse(),this.start=this.max,this.end=this.min):(this.start=this.min,this.end=this.max),a}configure(){const t=this.ticks;let e=this.min,n=this.max;if(super.configure(),this.options.offset&&t.length){const i=(n-e)/Math.max(t.length-1,1)/2;e-=i,n+=i}this._startValue=e,this._endValue=n,this._valueRange=n-e}getLabelForValue(t){return Ps(t,this.chart.options.locale,this.options.ticks.format)}}class Jn extends hn{determineDataLimits(){const{min:t,max:e}=this.getMinMax(!0);this.min=st(t)?t:0,this.max=st(e)?e:1,this.handleTickRangeOptions()}computeTickLimit(){const t=this.isHorizontal(),e=t?this.width:this.height,n=zt(this.options.ticks.minRotation),i=(t?Math.sin(n):Math.cos(n))||.001,o=this._resolveTickFontOptions(0);return Math.ceil(e/Math.min(40,o.lineHeight/i))}getPixelForValue(t){return t===null?NaN:this.getPixelForDecimal((t-this._startValue)/this._valueRange)}getValueForPixel(t){return this._startValue+this.getDecimalForPixel(t)*this._valueRange}}C(Jn,"id","linear"),C(Jn,"defaults",{ticks:{callback:pn.formatters.numeric}});const Cs=s=>Math.floor(fe(s)),Pe=(s,t)=>Math.pow(10,Cs(s)+t);function Ha(s){return s/Math.pow(10,Cs(s))===1}function Ya(s,t,e){const n=Math.pow(10,e),i=Math.floor(s/n);return Math.ceil(t/n)-i}function Wu(s,t){const e=t-s;let n=Cs(e);for(;Ya(s,t,n)>10;)n++;for(;Ya(s,t,n)<10;)n--;return Math.min(n,Cs(s))}function Hu(s,{min:t,max:e}){t=It(s.min,t);const n=[],i=Cs(t);let o=Wu(t,e),a=o<0?Math.pow(10,Math.abs(o)):1;const r=Math.pow(10,o),l=i>o?Math.pow(10,i):0,c=Math.round((t-l)*a)/a,d=Math.floor((t-l)/r/10)*r*10;let h=Math.floor((c-d)/Math.pow(10,o)),u=It(s.min,Math.round((l+d+h*Math.pow(10,o))*a)/a);for(;u<e;)n.push({value:u,major:Ha(u),significand:h}),h>=10?h=h<15?15:20:h++,h>=20&&(o++,h=2,a=o>=0?1:a),u=Math.round((l+d+h*Math.pow(10,o))*a)/a;const f=It(s.max,u);return n.push({value:f,major:Ha(f),significand:h}),n}class Zn extends je{constructor(t){super(t),this.start=void 0,this.end=void 0,this._startValue=void 0,this._valueRange=0}parse(t,e){const n=hn.prototype.parse.apply(this,[t,e]);if(n===0){this._zero=!0;return}return st(n)&&n>0?n:null}determineDataLimits(){const{min:t,max:e}=this.getMinMax(!0);this.min=st(t)?Math.max(0,t):null,this.max=st(e)?Math.max(0,e):null,this.options.beginAtZero&&(this._zero=!0),this._zero&&this.min!==this._suggestedMin&&!st(this._userMin)&&(this.min=t===Pe(this.min,0)?Pe(this.min,-1):Pe(this.min,0)),this.handleTickRangeOptions()}handleTickRangeOptions(){const{minDefined:t,maxDefined:e}=this.getUserBounds();let n=this.min,i=this.max;const o=r=>n=t?n:r,a=r=>i=e?i:r;n===i&&(n<=0?(o(1),a(10)):(o(Pe(n,-1)),a(Pe(i,1)))),n<=0&&o(Pe(i,-1)),i<=0&&a(Pe(n,1)),this.min=n,this.max=i}buildTicks(){const t=this.options,e={min:this._userMin,max:this._userMax},n=Hu(e,this);return t.bounds==="ticks"&&nr(n,this,"value"),t.reverse?(n.reverse(),this.start=this.max,this.end=this.min):(this.start=this.min,this.end=this.max),n}getLabelForValue(t){return t===void 0?"0":Ps(t,this.chart.options.locale,this.options.ticks.format)}configure(){const t=this.min;super.configure(),this._startValue=fe(t),this._valueRange=fe(this.max)-fe(t)}getPixelForValue(t){return(t===void 0||t===0)&&(t=this.min),t===null||isNaN(t)?NaN:this.getPixelForDecimal(t===this.min?0:(fe(t)-this._startValue)/this._valueRange)}getValueForPixel(t){const e=this.getDecimalForPixel(t);return Math.pow(10,this._startValue+e*this._valueRange)}}C(Zn,"id","logarithmic"),C(Zn,"defaults",{ticks:{callback:pn.formatters.logarithmic,major:{enabled:!0}}});function Qn(s){const t=s.ticks;if(t.display&&s.display){const e=Mt(t.backdropPadding);return B(t.font&&t.font.size,tt.font.size)+e.height}return 0}function Yu(s,t,e){return e=Q(e)?e:[e],{w:Jl(s,t.string,e),h:e.length*t.lineHeight}}function Ua(s,t,e,n,i){return s===n||s===i?{start:t-e/2,end:t+e/2}:s<n||s>i?{start:t-e,end:t}:{start:t,end:t+e}}function Uu(s){const t={l:s.left+s._padding.left,r:s.right-s._padding.right,t:s.top+s._padding.top,b:s.bottom-s._padding.bottom},e=Object.assign({},t),n=[],i=[],o=s._pointLabels.length,a=s.options.pointLabels,r=a.centerPointLabels?V/o:0;for(let l=0;l<o;l++){const c=a.setContext(s.getPointLabelContext(l));i[l]=c.padding;const d=s.getPointPosition(l,s.drawingArea+i[l],r),h=pt(c.font),u=Yu(s.ctx,h,s._pointLabels[l]);n[l]=u;const f=_t(s.getIndexAngle(l)+r),p=Math.round(di(f)),g=Ua(p,d.x,u.w,0,180),m=Ua(p,d.y,u.h,90,270);Xu(e,t,f,g,m)}s.setCenterPoint(t.l-e.l,e.r-t.r,t.t-e.t,e.b-t.b),s._pointLabelItems=Ku(s,n,i)}function Xu(s,t,e,n,i){const o=Math.abs(Math.sin(e)),a=Math.abs(Math.cos(e));let r=0,l=0;n.start<t.l?(r=(t.l-n.start)/o,s.l=Math.min(s.l,t.l-r)):n.end>t.r&&(r=(n.end-t.r)/o,s.r=Math.max(s.r,t.r+r)),i.start<t.t?(l=(t.t-i.start)/a,s.t=Math.min(s.t,t.t-l)):i.end>t.b&&(l=(i.end-t.b)/a,s.b=Math.max(s.b,t.b+l))}function qu(s,t,e){const n=s.drawingArea,{extra:i,additionalAngle:o,padding:a,size:r}=e,l=s.getPointPosition(t,n+i+a,o),c=Math.round(di(_t(l.angle+rt))),d=Qu(l.y,r.h,c),h=Ju(c),u=Zu(l.x,r.w,h);return{visible:!0,x:l.x,y:d,textAlign:h,left:u,top:d,right:u+r.w,bottom:d+r.h}}function Gu(s,t){if(!t)return!0;const{left:e,top:n,right:i,bottom:o}=s;return!(ie({x:e,y:n},t)||ie({x:e,y:o},t)||ie({x:i,y:n},t)||ie({x:i,y:o},t))}function Ku(s,t,e){const n=[],i=s._pointLabels.length,o=s.options,{centerPointLabels:a,display:r}=o.pointLabels,l={extra:Qn(o)/2,additionalAngle:a?V/i:0};let c;for(let d=0;d<i;d++){l.padding=e[d],l.size=t[d];const h=qu(s,d,l);n.push(h),r==="auto"&&(h.visible=Gu(h,c),h.visible&&(c=h))}return n}function Ju(s){return s===0||s===180?"center":s<180?"left":"right"}function Zu(s,t,e){return e==="right"?s-=t:e==="center"&&(s-=t/2),s}function Qu(s,t,e){return e===90||e===270?s-=t/2:(e>270||e<90)&&(s-=t),s}function tf(s,t,e){const{left:n,top:i,right:o,bottom:a}=e,{backdropColor:r}=t;if(!j(r)){const l=Be(t.borderRadius),c=Mt(t.backdropPadding);s.fillStyle=r;const d=n-c.left,h=i-c.top,u=o-n+c.width,f=a-i+c.height;Object.values(l).some(p=>p!==0)?(s.beginPath(),Ms(s,{x:d,y:h,w:u,h:f,radius:l}),s.fill()):s.fillRect(d,h,u,f)}}function ef(s,t){const{ctx:e,options:{pointLabels:n}}=s;for(let i=t-1;i>=0;i--){const o=s._pointLabelItems[i];if(!o.visible)continue;const a=n.setContext(s.getPointLabelContext(i));tf(e,a,o);const r=pt(a.font),{x:l,y:c,textAlign:d}=o;ze(e,s._pointLabels[i],l,c+r.lineHeight/2,r,{color:a.color,textAlign:d,textBaseline:"middle"})}}function qr(s,t,e,n){const{ctx:i}=s;if(e)i.arc(s.xCenter,s.yCenter,t,0,K);else{let o=s.getPointPosition(0,t);i.moveTo(o.x,o.y);for(let a=1;a<n;a++)o=s.getPointPosition(a,t),i.lineTo(o.x,o.y)}}function sf(s,t,e,n,i){const o=s.ctx,a=t.circular,{color:r,lineWidth:l}=t;!a&&!n||!r||!l||e<0||(o.save(),o.strokeStyle=r,o.lineWidth=l,o.setLineDash(i.dash||[]),o.lineDashOffset=i.dashOffset,o.beginPath(),qr(s,e,a,n),o.closePath(),o.stroke(),o.restore())}function nf(s,t,e){return Me(s,{label:e,index:t,type:"pointLabel"})}class hs extends hn{constructor(t){super(t),this.xCenter=void 0,this.yCenter=void 0,this.drawingArea=void 0,this._pointLabels=[],this._pointLabelItems=[]}setDimensions(){const t=this._padding=Mt(Qn(this.options)/2),e=this.width=this.maxWidth-t.width,n=this.height=this.maxHeight-t.height;this.xCenter=Math.floor(this.left+e/2+t.left),this.yCenter=Math.floor(this.top+n/2+t.top),this.drawingArea=Math.floor(Math.min(e,n)/2)}determineDataLimits(){const{min:t,max:e}=this.getMinMax(!1);this.min=st(t)&&!isNaN(t)?t:0,this.max=st(e)&&!isNaN(e)?e:0,this.handleTickRangeOptions()}computeTickLimit(){return Math.ceil(this.drawingArea/Qn(this.options))}generateTickLabels(t){hn.prototype.generateTickLabels.call(this,t),this._pointLabels=this.getLabels().map((e,n)=>{const i=G(this.options.pointLabels.callback,[e,n],this);return i||i===0?i:""}).filter((e,n)=>this.chart.getDataVisibility(n))}fit(){const t=this.options;t.display&&t.pointLabels.display?Uu(this):this.setCenterPoint(0,0,0,0)}setCenterPoint(t,e,n,i){this.xCenter+=Math.floor((t-e)/2),this.yCenter+=Math.floor((n-i)/2),this.drawingArea-=Math.min(this.drawingArea/2,Math.max(t,e,n,i))}getIndexAngle(t){const e=K/(this._pointLabels.length||1),n=this.options.startAngle||0;return _t(t*e+zt(n))}getDistanceFromCenterForValue(t){if(j(t))return NaN;const e=this.drawingArea/(this.max-this.min);return this.options.reverse?(this.max-t)*e:(t-this.min)*e}getValueForDistanceFromCenter(t){if(j(t))return NaN;const e=t/(this.drawingArea/(this.max-this.min));return this.options.reverse?this.max-e:this.min+e}getPointLabelContext(t){const e=this._pointLabels||[];if(t>=0&&t<e.length){const n=e[t];return nf(this.getContext(),t,n)}}getPointPosition(t,e,n=0){const i=this.getIndexAngle(t)-rt+n;return{x:Math.cos(i)*e+this.xCenter,y:Math.sin(i)*e+this.yCenter,angle:i}}getPointPositionForValue(t,e){return this.getPointPosition(t,this.getDistanceFromCenterForValue(e))}getBasePosition(t){return this.getPointPositionForValue(t||0,this.getBaseValue())}getPointLabelPosition(t){const{left:e,top:n,right:i,bottom:o}=this._pointLabelItems[t];return{left:e,top:n,right:i,bottom:o}}drawBackground(){const{backgroundColor:t,grid:{circular:e}}=this.options;if(t){const n=this.ctx;n.save(),n.beginPath(),qr(this,this.getDistanceFromCenterForValue(this._endValue),e,this._pointLabels.length),n.closePath(),n.fillStyle=t,n.fill(),n.restore()}}drawGrid(){const t=this.ctx,e=this.options,{angleLines:n,grid:i,border:o}=e,a=this._pointLabels.length;let r,l,c;if(e.pointLabels.display&&ef(this,a),i.display&&this.ticks.forEach((d,h)=>{if(h!==0||h===0&&this.min<0){l=this.getDistanceFromCenterForValue(d.value);const u=this.getContext(h),f=i.setContext(u),p=o.setContext(u);sf(this,f,l,a,p)}}),n.display){for(t.save(),r=a-1;r>=0;r--){const d=n.setContext(this.getPointLabelContext(r)),{color:h,lineWidth:u}=d;!u||!h||(t.lineWidth=u,t.strokeStyle=h,t.setLineDash(d.borderDash),t.lineDashOffset=d.borderDashOffset,l=this.getDistanceFromCenterForValue(e.reverse?this.min:this.max),c=this.getPointPosition(r,l),t.beginPath(),t.moveTo(this.xCenter,this.yCenter),t.lineTo(c.x,c.y),t.stroke())}t.restore()}}drawBorder(){}drawLabels(){const t=this.ctx,e=this.options,n=e.ticks;if(!n.display)return;const i=this.getIndexAngle(0);let o,a;t.save(),t.translate(this.xCenter,this.yCenter),t.rotate(i),t.textAlign="center",t.textBaseline="middle",this.ticks.forEach((r,l)=>{if(l===0&&this.min>=0&&!e.reverse)return;const c=n.setContext(this.getContext(l)),d=pt(c.font);if(o=this.getDistanceFromCenterForValue(this.ticks[l].value),c.showLabelBackdrop){t.font=d.string,a=t.measureText(r.label).width,t.fillStyle=c.backdropColor;const h=Mt(c.backdropPadding);t.fillRect(-a/2-h.left,-o-d.size/2-h.top,a+h.width,d.size+h.height)}ze(t,r.label,0,-o,d,{color:c.color,strokeColor:c.textStrokeColor,strokeWidth:c.textStrokeWidth})}),t.restore()}drawTitle(){}}C(hs,"id","radialLinear"),C(hs,"defaults",{display:!0,animate:!0,position:"chartArea",angleLines:{display:!0,lineWidth:1,borderDash:[],borderDashOffset:0},grid:{circular:!1},startAngle:0,ticks:{showLabelBackdrop:!0,callback:pn.formatters.numeric},pointLabels:{backdropColor:void 0,backdropPadding:2,display:!0,font:{size:10},callback(t){return t},padding:5,centerPointLabels:!1}}),C(hs,"defaultRoutes",{"angleLines.color":"borderColor","pointLabels.color":"color","ticks.color":"color"}),C(hs,"descriptors",{angleLines:{_fallback:"grid"}});const vn={millisecond:{common:!0,size:1,steps:1e3},second:{common:!0,size:1e3,steps:60},minute:{common:!0,size:6e4,steps:60},hour:{common:!0,size:36e5,steps:24},day:{common:!0,size:864e5,steps:30},week:{common:!1,size:6048e5,steps:4},month:{common:!0,size:2628e6,steps:12},quarter:{common:!1,size:7884e6,steps:4},year:{common:!0,size:3154e7}},Tt=Object.keys(vn);function Xa(s,t){return s-t}function qa(s,t){if(j(t))return null;const e=s._adapter,{parser:n,round:i,isoWeekday:o}=s._parseOpts;let a=t;return typeof n=="function"&&(a=n(a)),st(a)||(a=typeof n=="string"?e.parse(a,n):e.parse(a)),a===null?null:(i&&(a=i==="week"&&(Ke(o)||o===!0)?e.startOf(a,"isoWeek",o):e.startOf(a,i)),+a)}function Ga(s,t,e,n){const i=Tt.length;for(let o=Tt.indexOf(s);o<i-1;++o){const a=vn[Tt[o]],r=a.steps?a.steps:Number.MAX_SAFE_INTEGER;if(a.common&&Math.ceil((e-t)/(r*a.size))<=n)return Tt[o]}return Tt[i-1]}function of(s,t,e,n,i){for(let o=Tt.length-1;o>=Tt.indexOf(e);o--){const a=Tt[o];if(vn[a].common&&s._adapter.diff(i,n,a)>=t-1)return a}return Tt[e?Tt.indexOf(e):0]}function af(s){for(let t=Tt.indexOf(s)+1,e=Tt.length;t<e;++t)if(vn[Tt[t]].common)return Tt[t]}function Ka(s,t,e){if(!e)s[t]=!0;else if(e.length){const{lo:n,hi:i}=hi(e,t),o=e[n]>=t?e[n]:e[i];s[o]=!0}}function rf(s,t,e,n){const i=s._adapter,o=+i.startOf(t[0].value,n),a=t[t.length-1].value;let r,l;for(r=o;r<=a;r=+i.add(r,1,n))l=e[r],l>=0&&(t[l].major=!0);return t}function Ja(s,t,e){const n=[],i={},o=t.length;let a,r;for(a=0;a<o;++a)r=t[a],i[r]=a,n.push({value:r,major:!1});return o===0||!e?n:rf(s,n,i,e)}class Es extends je{constructor(t){super(t),this._cache={data:[],labels:[],all:[]},this._unit="day",this._majorUnit=void 0,this._offsets={},this._normalized=!1,this._parseOpts=void 0}init(t,e={}){const n=t.time||(t.time={}),i=this._adapter=new pd._date(t.adapters.date);i.init(e),ps(n.displayFormats,i.formats()),this._parseOpts={parser:n.parser,round:n.round,isoWeekday:n.isoWeekday},super.init(t),this._normalized=e.normalized}parse(t,e){return t===void 0?null:qa(this,t)}beforeLayout(){super.beforeLayout(),this._cache={data:[],labels:[],all:[]}}determineDataLimits(){const t=this.options,e=this._adapter,n=t.time.unit||"day";let{min:i,max:o,minDefined:a,maxDefined:r}=this.getUserBounds();function l(c){!a&&!isNaN(c.min)&&(i=Math.min(i,c.min)),!r&&!isNaN(c.max)&&(o=Math.max(o,c.max))}(!a||!r)&&(l(this._getLabelBounds()),(t.bounds!=="ticks"||t.ticks.source!=="labels")&&l(this.getMinMax(!1))),i=st(i)&&!isNaN(i)?i:+e.startOf(Date.now(),n),o=st(o)&&!isNaN(o)?o:+e.endOf(Date.now(),n)+1,this.min=Math.min(i,o-1),this.max=Math.max(i+1,o)}_getLabelBounds(){const t=this.getLabelTimestamps();let e=Number.POSITIVE_INFINITY,n=Number.NEGATIVE_INFINITY;return t.length&&(e=t[0],n=t[t.length-1]),{min:e,max:n}}buildTicks(){const t=this.options,e=t.time,n=t.ticks,i=n.source==="labels"?this.getLabelTimestamps():this._generate();t.bounds==="ticks"&&i.length&&(this.min=this._userMin||i[0],this.max=this._userMax||i[i.length-1]);const o=this.min,a=this.max,r=Fl(i,o,a);return this._unit=e.unit||(n.autoSkip?Ga(e.minUnit,this.min,this.max,this._getLabelCapacity(o)):of(this,r.length,e.minUnit,this.min,this.max)),this._majorUnit=!n.major.enabled||this._unit==="year"?void 0:af(this._unit),this.initOffsets(i),t.reverse&&r.reverse(),Ja(this,r,this._majorUnit)}afterAutoSkip(){this.options.offsetAfterAutoskip&&this.initOffsets(this.ticks.map(t=>+t.value))}initOffsets(t=[]){let e=0,n=0,i,o;this.options.offset&&t.length&&(i=this.getDecimalForValue(t[0]),t.length===1?e=1-i:e=(this.getDecimalForValue(t[1])-i)/2,o=this.getDecimalForValue(t[t.length-1]),t.length===1?n=o:n=(o-this.getDecimalForValue(t[t.length-2]))/2);const a=t.length<3?.5:.25;e=mt(e,0,a),n=mt(n,0,a),this._offsets={start:e,end:n,factor:1/(e+1+n)}}_generate(){const t=this._adapter,e=this.min,n=this.max,i=this.options,o=i.time,a=o.unit||Ga(o.minUnit,e,n,this._getLabelCapacity(e)),r=B(i.ticks.stepSize,1),l=a==="week"?o.isoWeekday:!1,c=Ke(l)||l===!0,d={};let h=e,u,f;if(c&&(h=+t.startOf(h,"isoWeek",l)),h=+t.startOf(h,c?"day":a),t.diff(n,e,a)>1e5*r)throw new Error(e+" and "+n+" are too far apart with stepSize of "+r+" "+a);const p=i.ticks.source==="data"&&this.getDataTimestamps();for(u=h,f=0;u<n;u=+t.add(u,r,a),f++)Ka(d,u,p);return(u===n||i.bounds==="ticks"||f===1)&&Ka(d,u,p),Object.keys(d).sort(Xa).map(g=>+g)}getLabelForValue(t){const e=this._adapter,n=this.options.time;return n.tooltipFormat?e.format(t,n.tooltipFormat):e.format(t,n.displayFormats.datetime)}format(t,e){const i=this.options.time.displayFormats,o=this._unit,a=e||i[o];return this._adapter.format(t,a)}_tickFormatFunction(t,e,n,i){const o=this.options,a=o.ticks.callback;if(a)return G(a,[t,e,n],this);const r=o.time.displayFormats,l=this._unit,c=this._majorUnit,d=l&&r[l],h=c&&r[c],u=n[e],f=c&&h&&u&&u.major;return this._adapter.format(t,i||(f?h:d))}generateTickLabels(t){let e,n,i;for(e=0,n=t.length;e<n;++e)i=t[e],i.label=this._tickFormatFunction(i.value,e,t)}getDecimalForValue(t){return t===null?NaN:(t-this.min)/(this.max-this.min)}getPixelForValue(t){const e=this._offsets,n=this.getDecimalForValue(t);return this.getPixelForDecimal((e.start+n)*e.factor)}getValueForPixel(t){const e=this._offsets,n=this.getDecimalForPixel(t)/e.factor-e.end;return this.min+n*(this.max-this.min)}_getLabelSize(t){const e=this.options.ticks,n=this.ctx.measureText(t).width,i=zt(this.isHorizontal()?e.maxRotation:e.minRotation),o=Math.cos(i),a=Math.sin(i),r=this._resolveTickFontOptions(0).size;return{w:n*o+r*a,h:n*a+r*o}}_getLabelCapacity(t){const e=this.options.time,n=e.displayFormats,i=n[e.unit]||n.millisecond,o=this._tickFormatFunction(t,0,Ja(this,[t],this._majorUnit),i),a=this._getLabelSize(o),r=Math.floor(this.isHorizontal()?this.width/a.w:this.height/a.h)-1;return r>0?r:1}getDataTimestamps(){let t=this._cache.data||[],e,n;if(t.length)return t;const i=this.getMatchingVisibleMetas();if(this._normalized&&i.length)return this._cache.data=i[0].controller.getAllParsedValues(this);for(e=0,n=i.length;e<n;++e)t=t.concat(i[e].controller.getAllParsedValues(this));return this._cache.data=this.normalize(t)}getLabelTimestamps(){const t=this._cache.labels||[];let e,n;if(t.length)return t;const i=this.getLabels();for(e=0,n=i.length;e<n;++e)t.push(qa(this,i[e]));return this._cache.labels=this._normalized?t:this.normalize(t)}normalize(t){return ar(t.sort(Xa))}}C(Es,"id","time"),C(Es,"defaults",{bounds:"data",adapters:{},time:{parser:!1,unit:!1,round:!1,isoWeekday:!1,minUnit:"millisecond",displayFormats:{}},ticks:{source:"auto",callback:!1,major:{enabled:!1}}});function Ws(s,t,e){let n=0,i=s.length-1,o,a,r,l;e?(t>=s[n].pos&&t<=s[i].pos&&({lo:n,hi:i}=ne(s,"pos",t)),{pos:o,time:r}=s[n],{pos:a,time:l}=s[i]):(t>=s[n].time&&t<=s[i].time&&({lo:n,hi:i}=ne(s,"time",t)),{time:o,pos:r}=s[n],{time:a,pos:l}=s[i]);const c=a-o;return c?r+(l-r)*(t-o)/c:r}class ti extends Es{constructor(t){super(t),this._table=[],this._minPos=void 0,this._tableRange=void 0}initOffsets(){const t=this._getTimestampsForTable(),e=this._table=this.buildLookupTable(t);this._minPos=Ws(e,this.min),this._tableRange=Ws(e,this.max)-this._minPos,super.initOffsets(t)}buildLookupTable(t){const{min:e,max:n}=this,i=[],o=[];let a,r,l,c,d;for(a=0,r=t.length;a<r;++a)c=t[a],c>=e&&c<=n&&i.push(c);if(i.length<2)return[{time:e,pos:0},{time:n,pos:1}];for(a=0,r=i.length;a<r;++a)d=i[a+1],l=i[a-1],c=i[a],Math.round((d+l)/2)!==c&&o.push({time:c,pos:a/(r-1)});return o}_generate(){const t=this.min,e=this.max;let n=super.getDataTimestamps();return(!n.includes(t)||!n.length)&&n.splice(0,0,t),(!n.includes(e)||n.length===1)&&n.push(e),n.sort((i,o)=>i-o)}_getTimestampsForTable(){let t=this._cache.all||[];if(t.length)return t;const e=this.getDataTimestamps(),n=this.getLabelTimestamps();return e.length&&n.length?t=this.normalize(e.concat(n)):t=e.length?e:n,t=this._cache.all=t,t}getDecimalForValue(t){return(Ws(this._table,t)-this._minPos)/this._tableRange}getValueForPixel(t){const e=this._offsets,n=this.getDecimalForPixel(t)/e.factor-e.end;return Ws(this._table,n*this._tableRange+this._minPos,!0)}}C(ti,"id","timeseries"),C(ti,"defaults",Es.defaults);var lf=Object.freeze({__proto__:null,CategoryScale:Kn,LinearScale:Jn,LogarithmicScale:Zn,RadialLinearScale:hs,TimeScale:Es,TimeSeriesScale:ti});const cf=[fd,Wh,Fu,lf];Ot.register(...cf);let On=null,Bn=null,Rn=null,Fn=null;function df(s,t){const e=document.getElementById(s);if(!e)return;On&&On.destroy();const n=t.map(a=>a.category_name),i=t.map(a=>a.total_amount),o=t.map(a=>a.color_hex||"#3B82F6");On=new Ot(e,{type:"doughnut",data:{labels:n.length>0?n:["No Expenses Yet"],datasets:[{data:i.length>0?i:[1],backgroundColor:o.length>0?o:["#334155"],borderWidth:0}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"bottom",labels:{color:"#94a3b8",font:{size:11}}}},cutout:"70%"}})}function hf(s,t){const e=document.getElementById(s);if(!e)return;Bn&&Bn.destroy();const n=t.map(a=>a.month),i=t.map(a=>a.income),o=t.map(a=>a.expenses);Bn=new Ot(e,{type:"bar",data:{labels:n.length>0?n:["Current Month"],datasets:[{label:"Income (₪)",data:i.length>0?i:[0],backgroundColor:"#10B981",borderRadius:6},{label:"Expenses (₪)",data:o.length>0?o:[0],backgroundColor:"#F43F5E",borderRadius:6}]},options:{responsive:!0,maintainAspectRatio:!1,scales:{x:{ticks:{color:"#94a3b8"},grid:{color:"#1e293b"}},y:{ticks:{color:"#94a3b8"},grid:{color:"#1e293b"}}},plugins:{legend:{labels:{color:"#94a3b8"}}}}})}function uf(s,t){const e=document.getElementById(s);if(!e)return;Rn&&Rn.destroy();const n=t.map(o=>o.date),i=t.map(o=>o.net_worth);Rn=new Ot(e,{type:"line",data:{labels:n.length>0?n:["Today"],datasets:[{label:"Net Worth (₪)",data:i.length>0?i:[0],borderColor:"#3B82F6",backgroundColor:"rgba(59, 130, 246, 0.15)",borderWidth:2,fill:!0,tension:.3}]},options:{responsive:!0,maintainAspectRatio:!1,scales:{x:{ticks:{color:"#94a3b8"},grid:{color:"#1e293b"}},y:{ticks:{color:"#94a3b8"},grid:{color:"#1e293b"}}},plugins:{legend:{labels:{color:"#94a3b8"}}}}})}function ff(s,t){const e=document.getElementById(s);if(!e)return;Fn&&Fn.destroy();const n=t.map(o=>o.month),i=t.map(o=>o.installment_cost);Fn=new Ot(e,{type:"bar",data:{labels:n.length>0?n:["No Installments"],datasets:[{label:"Future Installments (₪)",data:i.length>0?i:[0],backgroundColor:"#8B5CF6",borderRadius:6}]},options:{responsive:!0,maintainAspectRatio:!1,scales:{x:{ticks:{color:"#94a3b8"},grid:{color:"#1e293b"}},y:{ticks:{color:"#94a3b8"},grid:{color:"#1e293b"}}},plugins:{legend:{labels:{color:"#94a3b8"}}}}})}let Ct="dashboard",Vt=[],Bt=[],wt=[],ei=[],si=[],Gr=[],Ue=[],Xe=[],wi=[],ni=[],ii=[],Ye=[],Qs=[],Xt={},dt=null,Ge=0,it=0,Ft=25,ve="",ft="",ot=[],_e="",we="",ke="",Le=!1,un=!1,bt={running:!1,canceled:!1,processed:0,total:0,current_batch:0,total_batches:0,batches:[]},ys="",Kr="",$e=null,os=null;function pf(){const s=new Date,t=s.getFullYear(),e=String(s.getMonth()+1).padStart(2,"0"),n=`${t}-${e}`,i=new Date(s.getFullYear(),s.getMonth()-5,1),o=i.getFullYear(),a=String(i.getMonth()+1).padStart(2,"0");return{fromStr:`${o}-${a}`,toStr:n}}const re=pf();let L={cashflowAcc:"",cashflowFromMonth:re.fromStr,cashflowToMonth:re.toStr,donutAcc:"",donutFromMonth:re.fromStr,donutToMonth:re.toStr,networthFromMonth:re.fromStr,networthToMonth:re.toStr,payoffAcc:"",budgetAcc:"",subscriptionsAcc:"",momAcc:"",momFromMonth:re.fromStr,momToMonth:re.toStr};function We(s,t){return`
    <select id="${s}" class="bg-slate-900 border border-slate-700/80 rounded-md px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-brand-500">
      <option value="">All Accounts</option>
      ${Vt.map(e=>`<option value="${e.id}" ${t===e.id?"selected":""}>${e.name}</option>`).join("")}
    </select>
  `}let tn=!1,us=!1,te=null,en=[],fn="",Oe="",he=null,de=[],Rt="",fs=!1;function at(s){return`₪ ${(s??0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`}function oi(s){return s.current_balance??s.opening_balance??0}function gf(){const s=document.createElement("div");return s.id="toast-container",document.body.appendChild(s),s}function T(s,t="info"){const e=document.getElementById("toast-container")??gf(),n=document.createElement("div");n.className=`toast-item toast-${t}`,n.textContent=s,e.appendChild(n),setTimeout(()=>{n.classList.add("toast-exit"),setTimeout(()=>n.remove(),350)},4e3)}async function mf(){document.getElementById("app")&&(await q(),P())}async function q(){try{const s=new URLSearchParams({limit:String(Ft),offset:String(it*Ft)});ve&&s.set("account_id",ve),ft&&s.set("category_type",ft),_e&&s.set("start_date",_e),we&&s.set("end_date",we),ke&&s.set("search",ke);const[t,e,n,i,o,a,r,l,c,d,h,u,f,p,g,m,b]=await Promise.all([fetch("/api/v1/accounts"),fetch(`/api/v1/transactions?${s.toString()}`),fetch("/api/v1/categories"),fetch(`/api/v1/reports/budget-vs-actual?account_id=${L.budgetAcc}`),fetch(`/api/v1/reports/subscriptions?account_id=${L.subscriptionsAcc}`),fetch(`/api/v1/reports/category-donut?account_id=${L.donutAcc}&start_date=${L.donutFromMonth}&end_date=${L.donutToMonth}`),fetch(`/api/v1/reports/cash-flow?account_id=${L.cashflowAcc}&start_date=${L.cashflowFromMonth}&end_date=${L.cashflowToMonth}`),fetch("/api/v1/auth/info"),fetch(`/api/v1/reports/net-worth?start_date=${L.networthFromMonth}&end_date=${L.networthToMonth}`),fetch(`/api/v1/reports/cc-payoff?account_id=${L.payoffAcc}`),fetch("/api/v1/reports/foreign-currency"),fetch("/api/v1/reports/anomalies"),fetch(`/api/v1/reports/mom-heatmap?account_id=${L.momAcc}&start_date=${L.momFromMonth}&end_date=${L.momToMonth}`),fetch("/api/v1/reports/sankey"),fetch("/api/v1/settings"),fetch("/api/v1/categorize/prompt"),fetch("/api/v1/categorize/status")]);if(t.status===401||e.status===401){un=!0,l.ok&&(dt=await l.json());return}if(un=!1,t.ok&&(Vt=await t.json()||[]),e.ok){const v=await e.json();Bt=v.transactions||[],Ge=v.total??Bt.length}if(n.ok&&(wt=await n.json()||[]),i.ok&&(ei=await i.json()||[]),o.ok&&(si=await o.json()||[]),a.ok&&(Gr=await a.json()||[]),r.ok&&(Ue=await r.json()||[]),l.ok&&(dt=await l.json()),c.ok&&(Xe=await c.json()||[]),d.ok&&(wi=await d.json()||[]),h.ok&&(ni=await h.json()||[]),u.ok&&(ii=await u.json()||[]),f.ok&&(Ye=await f.json()||[]),p.ok&&(Qs=await p.json()||[]),g.ok&&(Xt=await g.json()||{}),m&&m.ok){const v=await m.json();ys=v.prompt||"",Kr=v.default_prompt||""}b&&b.ok&&(bt=await b.json()),await ce()}catch(s){console.error("Failed to fetch data from API server",s)}}async function ce(){try{const s=new URLSearchParams;fn&&s.set("account_id",fn),Oe&&s.set("status",Oe);const t=await fetch(`/api/v1/billing-cycles?${s.toString()}`);t.ok&&(en=await t.json()||[])}catch(s){console.error("Failed to fetch billing cycles",s)}}async function Pt(){try{const s=new URLSearchParams({limit:String(Ft),offset:String(it*Ft)});ve&&s.set("account_id",ve),ft&&s.set("category_type",ft),ot.length>0&&s.set("category_ids",ot.join(",")),_e&&s.set("start_date",_e),we&&s.set("end_date",we),ke&&s.set("search",ke);const t=await fetch(`/api/v1/transactions?${s.toString()}`);if(t.status===401){un=!0,P();return}if(t.ok){const e=await t.json();Bt=e.transactions||[],Ge=e.total??Bt.length}}catch(s){console.error("Failed to load transactions",s)}}function bf(){return`
    <div class="min-h-[65vh] flex items-center justify-center py-12 px-4">
      <div class="glass-panel p-8 sm:p-12 max-w-md w-full text-center space-y-6 shadow-2xl relative overflow-hidden border-slate-700/80">
        <!-- Background Glow Accent -->
        <div class="absolute -top-16 -left-16 w-40 h-40 bg-brand-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-16 -right-16 w-40 h-40 bg-purple-500/15 rounded-full blur-3xl pointer-events-none"></div>

        <!-- Logo Icon -->
        <div class="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-500 flex items-center justify-center text-3xl font-extrabold text-white shadow-xl shadow-brand-500/25">
          $
        </div>

        <div>
          <h2 class="text-2xl font-extrabold text-white tracking-tight">FinRep Ledger</h2>
          <p class="text-xs text-slate-400 mt-1">Financial Reporting &amp; Intelligent Ledger</p>
        </div>

        <div class="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-left space-y-2">
          <div class="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Single Sign-On (SSO) Required
          </div>
          <p class="text-[11px] text-slate-400 leading-relaxed">
            This application is protected with OpenID Connect (OIDC). Authenticate with your SSO identity provider to access financial reports and ledger data.
          </p>
        </div>

        <div class="pt-2">
          <a id="btn-login-oidc" href="/auth/login" class="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold text-sm shadow-xl shadow-brand-500/25 hover:shadow-brand-500/40 transition duration-200 group cursor-pointer">
            <span>🔑 Log in with Single Sign-On (OIDC)</span>
            <span class="text-xs group-hover:translate-x-0.5 transition-transform">→</span>
          </a>
        </div>

        <div class="pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-center gap-2">
          <span>Shielded by</span>
          <span class="font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">Authentik OIDC (PKCE 2.0)</span>
        </div>
      </div>
    </div>
  `}function P(){const s=document.getElementById("app");if(!s)return;const t=Vt.map(o=>oi(o)).filter(o=>o>=0).reduce((o,a)=>o+a,0),e=Vt.map(o=>oi(o)).filter(o=>o<0).reduce((o,a)=>o+Math.abs(a),0),n=t-e;Bt.filter(o=>o.suggested_category_en).length;const i=un||(dt==null?void 0:dt.oidc_enabled)&&!(dt!=null&&dt.user);s.innerHTML=`
    <!-- Top Navigation Header -->
    <header class="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-500 flex items-center justify-center font-bold text-white shadow-lg shadow-brand-500/20">
            $
          </div>
          <div>
            <h1 class="font-bold tracking-tight text-lg text-white">FinRep Ledger</h1>
            <p class="text-xs text-slate-400">Financial Reporting &amp; LocalAI Ledger</p>
          </div>
        </div>

        ${i?"":`
          <nav class="flex items-center gap-1 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800/60 flex-wrap">
            ${le("dashboard","📊 Dashboard")}
            ${le("accounts","🏦 Accounts")}
            ${le("transactions","💳 Transactions")}
            ${le("categories","🏷️ Categories")}
            ${le("autocat","✨ Auto-Categorization")}
            ${le("import","📤 Import")}
            ${le("reconciliation","🔗 Reconciliation")}
            ${le("settings","⚙️ Settings")}
          </nav>
        `}

        <div class="flex items-center gap-3">
          ${dt!=null&&dt.user?`
            <div class="flex items-center gap-2.5">
              <span class="text-xs px-3 py-1.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700 flex items-center gap-1.5 font-medium shadow-sm">
                <span class="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                👤 ${dt.user.name||dt.user.email}
              </span>
              ${dt.oidc_enabled?`
                <a href="/auth/logout" class="text-xs text-rose-300 hover:text-rose-200 font-semibold transition px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 flex items-center gap-1 shadow-sm">
                  <span>🚪 Logout</span>
                </a>
              `:""}
            </div>
          `:`
            <span class="text-xs text-slate-400 font-medium px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
              Single Sign-On
            </span>
          `}
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
      ${i?bf():`
        ${Ct==="dashboard"?xf(n,t,e):""}
        ${Ct==="accounts"?yf():""}
        ${Ct==="transactions"?_f():""}
        ${Ct==="categories"?wf():""}
        ${Ct==="autocat"?kf():""}
        ${Ct==="import"?Cf():""}
        ${Ct==="reconciliation"?Ef():""}
        ${Ct==="settings"?Df():""}
      `}
    </main>

    ${tn?vf():""}
    ${us||te?Sf():""}
    ${$e?Mf():""}

    <!-- Footer -->
    <footer class="border-t border-slate-800/60 py-6 text-center text-xs text-slate-500">
      Financial Reporting Application &copy; 2026 &bull; Powered by Go + Echo + Vite + LocalAI
    </footer>
  `,Tf(),Ct==="dashboard"&&setTimeout(()=>{df("donut-chart-canvas",Gr),hf("cashflow-chart-canvas",Ue),uf("networth-chart-canvas",Xe),ff("ccpayoff-chart-canvas",wi)},50)}function le(s,t){return`
    <button class="nav-tab px-3 py-1.5 rounded-lg text-xs font-medium transition ${Ct===s?"bg-brand-600 text-white shadow-md":"text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"}" data-tab="${s}">
      ${t}
    </button>
  `}function xf(s,t,e){const n=Ye.length>0?Ye[0].months.map(o=>o.month):[],i=Ye.flatMap(o=>o.months.map(a=>a.amount)).reduce((o,a)=>Math.max(o,a),1);return`
    <div class="space-y-8">
      <!-- Metric Overview Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="glass-panel p-6 relative overflow-hidden">
          <div class="absolute -right-4 -bottom-4 w-24 h-24 bg-brand-500/10 rounded-full blur-xl"></div>
          <p class="text-xs font-medium text-slate-400 uppercase tracking-wider">Net Worth (ILS)</p>
          <h2 class="text-3xl font-extrabold text-white mt-2">${at(s)}</h2>
          <span class="text-xs text-emerald-400 mt-2 inline-block">↑ Aggregated across accounts</span>
        </div>

        <div class="glass-panel p-6 relative overflow-hidden">
          <p class="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Assets</p>
          <h2 class="text-3xl font-extrabold text-emerald-400 mt-2">${at(t)}</h2>
          <span class="text-xs text-slate-500 mt-2 inline-block">Bank &amp; Liquid Cash</span>
        </div>

        <div class="glass-panel p-6 relative overflow-hidden">
          <p class="text-xs font-medium text-slate-400 uppercase tracking-wider">Liabilities &amp; Card Balances</p>
          <h2 class="text-3xl font-extrabold text-rose-400 mt-2">${at(e)}</h2>
          <span class="text-xs text-slate-500 mt-2 inline-block">Credit Card Billed Liabilities</span>
        </div>
      </div>

      <!-- Charts Row 1: Cash Flow + Category Donut -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="glass-panel p-6 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div>
              <h3 class="font-bold text-sm text-white flex items-center gap-2">
                <span>Monthly Cash Flow</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-mono">
                  ${Ue.length} Months (${L.cashflowFromMonth} to ${L.cashflowToMonth})
                </span>
              </h3>
              <p class="text-xs text-slate-400 mt-0.5">Income vs Expenses breakdown</p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <!-- Quick Presets -->
              <div class="inline-flex rounded-md border border-slate-800 bg-slate-950 p-0.5 text-[11px]">
                <button id="btn-cashflow-preset-3m" class="px-2.5 py-1 rounded text-slate-400 hover:text-white transition ${Ue.length===3?"bg-brand-600 text-white font-bold":""}">3M</button>
                <button id="btn-cashflow-preset-6m" class="px-2.5 py-1 rounded text-slate-400 hover:text-white transition ${Ue.length===6?"bg-brand-600 text-white font-bold":""}">6M</button>
                <button id="btn-cashflow-preset-12m" class="px-2.5 py-1 rounded text-slate-400 hover:text-white transition ${Ue.length===12?"bg-brand-600 text-white font-bold":""}">12M</button>
              </div>

              <!-- Month Pickers -->
              <div class="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-md px-2.5 py-1 text-[11px]">
                <span class="text-slate-400">From:</span>
                <input type="month" id="widget-cashflow-from" value="${L.cashflowFromMonth}" class="bg-transparent text-slate-200 focus:outline-none font-mono">
                <span class="text-slate-400">To:</span>
                <input type="month" id="widget-cashflow-to" value="${L.cashflowToMonth}" class="bg-transparent text-slate-200 focus:outline-none font-mono">
              </div>

              <!-- Account Selector -->
              ${We("widget-acc-cashflow",L.cashflowAcc)}
            </div>
          </div>
          <div class="h-64 relative">
            <canvas id="cashflow-chart-canvas"></canvas>
          </div>
        </div>
        <div class="glass-panel p-6 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div>
              <h3 class="font-bold text-sm text-white flex items-center gap-2">
                <span>Category Expense Breakdown</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-mono">
                  ${L.donutFromMonth} to ${L.donutToMonth}
                </span>
              </h3>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <!-- Quick Presets -->
              <div class="inline-flex rounded-md border border-slate-800 bg-slate-950 p-0.5 text-[11px]">
                <button id="btn-donut-preset-3m" class="px-2.5 py-1 rounded text-slate-400 hover:text-white transition">3M</button>
                <button id="btn-donut-preset-6m" class="px-2.5 py-1 rounded text-slate-400 hover:text-white transition">6M</button>
                <button id="btn-donut-preset-12m" class="px-2.5 py-1 rounded text-slate-400 hover:text-white transition">12M</button>
              </div>

              <!-- Month Pickers -->
              <div class="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-md px-2.5 py-1 text-[11px]">
                <span class="text-slate-400">From:</span>
                <input type="month" id="widget-donut-from" value="${L.donutFromMonth}" class="bg-transparent text-slate-200 focus:outline-none font-mono">
                <span class="text-slate-400">To:</span>
                <input type="month" id="widget-donut-to" value="${L.donutToMonth}" class="bg-transparent text-slate-200 focus:outline-none font-mono">
              </div>

              <!-- Account Selector -->
              ${We("widget-acc-donut",L.donutAcc)}
            </div>
          </div>
          <div class="h-64 relative">
            <canvas id="donut-chart-canvas"></canvas>
          </div>
        </div>
      </div>

      <!-- Charts Row 2: Net Worth Trend + CC Payoff -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="glass-panel p-6 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div>
              <h3 class="font-bold text-sm text-white flex items-center gap-2">
                <span>Net Worth Over Time</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-mono">
                  ${Xe.length} Points (${L.networthFromMonth} to ${L.networthToMonth})
                </span>
              </h3>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <!-- Quick Presets -->
              <div class="inline-flex rounded-md border border-slate-800 bg-slate-950 p-0.5 text-[11px]">
                <button id="btn-networth-preset-3m" class="px-2.5 py-1 rounded text-slate-400 hover:text-white transition ${Xe.length===3?"bg-brand-600 text-white font-bold":""}">3M</button>
                <button id="btn-networth-preset-6m" class="px-2.5 py-1 rounded text-slate-400 hover:text-white transition ${Xe.length===6?"bg-brand-600 text-white font-bold":""}">6M</button>
                <button id="btn-networth-preset-12m" class="px-2.5 py-1 rounded text-slate-400 hover:text-white transition ${Xe.length===12?"bg-brand-600 text-white font-bold":""}">12M</button>
              </div>

              <!-- Month Pickers -->
              <div class="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-md px-2.5 py-1 text-[11px]">
                <span class="text-slate-400">From:</span>
                <input type="month" id="widget-networth-from" value="${L.networthFromMonth}" class="bg-transparent text-slate-200 focus:outline-none font-mono">
                <span class="text-slate-400">To:</span>
                <input type="month" id="widget-networth-to" value="${L.networthToMonth}" class="bg-transparent text-slate-200 focus:outline-none font-mono">
              </div>
            </div>
          </div>
          <div class="h-64 relative">
            <canvas id="networth-chart-canvas"></canvas>
          </div>
        </div>
        <div class="glass-panel p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-sm text-white">Installment Payoff Forecast</h3>
            ${We("widget-acc-payoff",L.payoffAcc)}
          </div>
          <div class="h-64 relative">
            ${wi.length===0?'<div class="flex items-center justify-center h-full text-slate-500 text-xs">No installment transactions found.</div>':'<canvas id="ccpayoff-chart-canvas"></canvas>'}
          </div>
        </div>
      </div>

      <!-- Budget vs Actual & Subscriptions -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="glass-panel p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-sm text-white">Budget vs Actual (This Month)</h3>
            ${We("widget-acc-budget",L.budgetAcc)}
          </div>
          <div class="space-y-3">
            ${ei.length===0?'<p class="text-xs text-slate-500">No category budgets defined yet. Set budgets in the Categories tab.</p>':ei.map(o=>{const a=o.monthly_budget>0?Math.min(100,o.actual_spent/o.monthly_budget*100):0,r=o.actual_spent>o.monthly_budget&&o.monthly_budget>0;return`
                    <div class="space-y-1">
                      <div class="flex justify-between text-xs">
                        <span class="text-slate-300 font-medium">${o.category_name}</span>
                        <span class="${r?"text-rose-400 font-bold":"text-slate-400"}">${at(o.actual_spent)} / ${at(o.monthly_budget)}</span>
                      </div>
                      <div class="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div class="h-2 rounded-full transition-all ${r?"bg-rose-500":a>80?"bg-amber-500":"bg-brand-500"}" style="width: ${a}%"></div>
                      </div>
                    </div>
                  `}).join("")}
          </div>
        </div>

        <div class="glass-panel p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-sm text-white">Recurring Fixed Subscriptions</h3>
            ${We("widget-acc-subscriptions",L.subscriptionsAcc)}
          </div>
          <div class="space-y-2">
            ${si.length===0?'<p class="text-xs text-slate-500">No recurring subscriptions detected.</p>':si.slice(0,8).map(o=>`
                  <div class="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                    <div>
                      <h4 class="text-xs font-bold text-white">${o.payee}</h4>
                      <span class="text-xs text-slate-400">${o.category_name} &bull; ${o.occurrence_count} occurrences</span>
                    </div>
                    <span class="text-xs font-bold text-rose-400 font-mono">${at(o.monthly_cost)}/mo</span>
                  </div>
                `).join("")}
          </div>
        </div>
      </div>

      <!-- MoM Heatmap -->
      <div class="glass-panel p-6 space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
          <div>
            <h3 class="font-bold text-sm text-white flex items-center gap-2">
              <span>Month-over-Month Spending Heatmap</span>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 font-mono">
                ${n.length} Months (${L.momFromMonth} to ${L.momToMonth})
              </span>
            </h3>
            <p class="text-xs text-slate-400 mt-0.5">Track category expense trends month by month</p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <!-- Quick Presets -->
            <div class="inline-flex rounded-md border border-slate-800 bg-slate-950 p-0.5 text-[11px]">
              <button id="btn-mom-preset-3m" class="px-2.5 py-1 rounded text-slate-400 hover:text-white transition ${n.length===3?"bg-brand-600 text-white font-bold":""}">3M</button>
              <button id="btn-mom-preset-6m" class="px-2.5 py-1 rounded text-slate-400 hover:text-white transition ${n.length===6?"bg-brand-600 text-white font-bold":""}">6M</button>
              <button id="btn-mom-preset-12m" class="px-2.5 py-1 rounded text-slate-400 hover:text-white transition ${n.length===12?"bg-brand-600 text-white font-bold":""}">12M</button>
            </div>

            <!-- Month Pickers -->
            <div class="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-md px-2.5 py-1 text-[11px]">
              <span class="text-slate-400">From:</span>
              <input type="month" id="widget-mom-from" value="${L.momFromMonth}" class="bg-transparent text-slate-200 focus:outline-none font-mono">
              <span class="text-slate-400">To:</span>
              <input type="month" id="widget-mom-to" value="${L.momToMonth}" class="bg-transparent text-slate-200 focus:outline-none font-mono">
            </div>

            <!-- Account Selector -->
            ${We("widget-acc-mom",L.momAcc)}
          </div>
        </div>

        ${Ye.length===0?'<p class="text-xs text-slate-500 py-6 text-center">No categorized expense data found for selected month range.</p>':`<div id="mom-heatmap-container" class="overflow-x-auto">
              <table class="w-full text-xs border-collapse">
                <thead>
                  <tr class="border-b border-slate-800">
                    <th class="text-left py-2.5 pr-4 text-slate-400 font-medium sticky left-0 bg-slate-950/95 z-10 min-w-[140px]">Category</th>
                    ${n.map(o=>`<th class="text-center py-2.5 px-2 text-slate-400 font-medium font-mono min-w-[75px]">${o}</th>`).join("")}
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/40" id="mom-heatmap-tbody">
                  ${Ye.map(o=>`
                    <tr class="hover:bg-slate-900/40 transition">
                      <td class="py-2.5 pr-4 text-slate-300 font-medium flex items-center gap-2 sticky left-0 bg-slate-950/95 z-10 min-w-[140px]">
                        <span class="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style="background:${o.color_hex}"></span>
                        <span class="truncate">${o.category_name}</span>
                      </td>
                      ${o.months.map(a=>{const l=(.1+(i>0?a.amount/i:0)*.75).toFixed(2);return`<td class="py-2.5 px-2 text-center rounded font-mono min-w-[75px]" style="background:${a.amount>0?`rgba(244,63,94,${l})`:"transparent"}">
                          ${a.amount>0?at(a.amount):"-"}
                        </td>`}).join("")}
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>`}
      </div>

      <!-- Sankey Flow (simplified HTML table) -->
      <div class="glass-panel p-6 space-y-4">
        <h3 class="font-bold text-sm text-white">Income → Expense Flow (Current Month)</h3>
        ${Qs.length===0?'<p class="text-xs text-slate-500">No flow data for current month.</p>':`<div class="space-y-2">
              ${Qs.slice(0,15).map(o=>{var a;return`
                <div class="flex items-center gap-3 text-xs">
                  <span class="text-slate-300 w-40 truncate font-medium">${o.source}</span>
                  <div class="flex-1 bg-slate-800 rounded-full h-3 overflow-hidden">
                    <div class="h-3 rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all"
                         style="width: ${Math.min(100,o.value/(((a=Qs[0])==null?void 0:a.value)||1)*100)}%"></div>
                  </div>
                  <span class="text-slate-300 w-40 truncate">${o.target}</span>
                  <span class="text-slate-400 font-mono w-28 text-right">${at(o.value)}</span>
                </div>
              `}).join("")}
            </div>`}
      </div>

      <!-- Foreign Currency & Anomalies -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="glass-panel p-6 space-y-4">
          <h3 class="font-bold text-sm text-white">Foreign Currency Analysis</h3>
          ${ni.length===0?'<p class="text-xs text-slate-500">No foreign currency transactions found.</p>':`<table class="w-full text-xs">
                <thead><tr class="text-slate-400 border-b border-slate-800">
                  <th class="text-left py-2">Currency</th>
                  <th class="text-right py-2">Original Total</th>
                  <th class="text-right py-2">ILS Billed</th>
                  <th class="text-right py-2">Avg Rate</th>
                </tr></thead>
                <tbody class="divide-y divide-slate-800/40">
                  ${ni.map(o=>`
                    <tr>
                      <td class="py-2 font-bold text-white">${o.original_currency}</td>
                      <td class="py-2 text-right text-slate-300">${o.original_total.toFixed(2)}</td>
                      <td class="py-2 text-right text-slate-300">${at(o.ils_billed_total)}</td>
                      <td class="py-2 text-right text-brand-400 font-mono">${o.implied_avg_rate.toFixed(4)}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>`}
        </div>

        <div class="glass-panel p-6 space-y-4">
          <h3 class="font-bold text-sm text-white">Transaction Anomalies</h3>
          ${ii.length===0?'<p class="text-xs text-slate-500">No anomalies detected.</p>':`<div class="space-y-2">
                ${ii.map(o=>`
                  <div class="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-bold text-white truncate max-w-[180px]">${o.payee}</span>
                      <span class="text-xs font-bold text-rose-400 font-mono">${at(o.amount)}</span>
                    </div>
                    <div class="flex items-center justify-between mt-1">
                      <span class="text-xs text-slate-400">${o.date}</span>
                      <span class="text-xs text-amber-400">${o.reason}</span>
                    </div>
                  </div>
                `).join("")}
              </div>`}
        </div>
      </div>

      <!-- Recent Transactions -->
      <div class="glass-panel p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-lg text-white">Recent Transactions</h3>
          <span class="text-xs text-slate-400">${Bt.length} loaded</span>
        </div>
        ${Jr(Bt.slice(0,10))}
      </div>
    </div>
  `}function yf(){return`
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-white">Financial Accounts</h2>
          <p class="text-xs text-slate-400 mt-1">Manage Bank Accounts and Credit Cards</p>
        </div>
        <button id="btn-add-account" class="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-lg shadow-brand-500/20 transition">
          + Add Account
        </button>
      </div>

      ${Vt.length===0?`
        <div class="glass-panel p-12 text-center space-y-3">
          <div class="text-4xl">🏦</div>
          <p class="text-sm text-slate-400">No financial accounts registered yet.</p>
          <button id="btn-add-account-empty" class="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow">
            + Create First Account
          </button>
        </div>
      `:`
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${Vt.map(s=>{const t=oi(s);return`
              <div class="glass-card flex flex-col justify-between">
                <div>
                  <div class="flex items-center justify-between">
                    <span class="px-2.5 py-1 rounded-full text-xs font-bold ${s.account_type==="BANK"?"bg-emerald-500/10 text-emerald-400 border border-emerald-500/20":"bg-purple-500/10 text-purple-400 border border-purple-500/20"}">
                      ${s.account_type}
                    </span>
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-slate-500 font-mono">${s.institution}</span>
                      <button class="btn-delete-account text-slate-500 hover:text-rose-400 text-xs px-1.5 py-0.5 rounded transition" data-id="${s.id}">✕</button>
                    </div>
                  </div>
                  <h3 class="text-lg font-bold text-white mt-3">${s.name}</h3>
                  <p class="text-xs text-slate-400">Currency: ${s.currency}</p>
                </div>
                <div class="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <span class="text-xs text-slate-400">Current Balance</span>
                  <span class="text-xl font-extrabold ${t>=0?"text-emerald-400":"text-rose-400"}">
                    ${at(t)}
                  </span>
                </div>
              </div>
            `}).join("")}
        </div>
      `}
    </div>
  `}function vf(){return`
    <div class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="glass-panel max-w-md w-full p-6 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 class="text-lg font-bold text-white">Add Financial Account</h3>
          <button id="btn-close-modal" class="text-slate-400 hover:text-white text-sm">✕</button>
        </div>

        <form id="form-account" class="space-y-4">
          <div id="modal-error-msg" class="hidden p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium"></div>

          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Account Name</label>
            <input type="text" id="acc-name" required placeholder="e.g. Bank Hapoalim Checking" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Account Type</label>
              <select id="acc-type" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                <option value="BANK">BANK</option>
                <option value="CREDIT_CARD">CREDIT_CARD</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Institution</label>
              <input type="text" id="acc-institution" required placeholder="e.g. Hapoalim" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Currency</label>
              <select id="acc-currency" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                <option value="ILS">ILS (₪)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Opening Balance</label>
              <input type="number" step="0.01" id="acc-balance" value="0.00" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
            </div>
          </div>

          <div id="acc-cc-billing-block" class="grid grid-cols-2 gap-3 p-3 rounded-lg bg-brand-500/10 border border-brand-500/20">
            <div>
              <label class="block text-xs font-semibold text-brand-300 mb-1">Primary Billing Day (1-31)</label>
              <input type="number" min="1" max="31" id="acc-billing-primary" value="10" placeholder="e.g. 10" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Secondary Day (Optional)</label>
              <input type="number" min="1" max="31" id="acc-billing-secondary" placeholder="e.g. 2" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button type="button" id="btn-cancel-modal" class="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-900">Cancel</button>
            <button type="submit" id="btn-save-account" class="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow">Save Account</button>
          </div>
        </form>
      </div>
    </div>
  `}function _f(){const s=Bt.filter(c=>c.suggested_category_en).length,t=Bt.filter(c=>!c.category_id&&!c.suggested_category_en).length,e=Math.max(1,Math.ceil(Ge/Ft)),n=it+1,i=!!(ve||ft||ot.length>0||_e||we||ke),o={id:"UNCATEGORIZED",name_en:"Uncategorized",name_he:"ללא קטגוריה",color_hex:"#F59E0B",category_type:""},a=ft?wt.filter(c=>c.category_type===ft):wt,r=[o,...a];let l='<span class="text-emerald-400 font-semibold">✓ All transactions categorized</span>';return s>0?l=`<span class="text-amber-400 font-semibold">⚠️ ${s} AI suggestions pending review</span>`:t>0&&(l=`<span class="text-amber-400 font-semibold">⚠️ ${t} uncategorized transactions (select category below or run LocalAI)</span>`),`
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-white">Transaction Ledger</h2>
          <p class="text-xs text-slate-400 mt-1">${l}</p>
        </div>
        <span class="text-xs text-slate-400">${Ge} total transactions ${i?"(filtered)":""}</span>
      </div>

      <!-- Smart Filter Toolbar -->
      <div class="glass-panel p-4 space-y-3 relative z-30">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <!-- Account Filter -->
          <div>
            <label class="block text-[11px] font-medium text-slate-400 mb-1">Account</label>
            <select id="tx-filter-account" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500">
              <option value="">All Accounts</option>
              ${Vt.map(c=>`<option value="${c.id}" ${ve===c.id?"selected":""}>${c.name}</option>`).join("")}
            </select>
          </div>

          <!-- Category Type Filter -->
          <div>
            <label class="block text-[11px] font-medium text-slate-400 mb-1">Category Type</label>
            <select id="tx-filter-type" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500">
              <option value="" ${ft===""?"selected":""}>All Types</option>
              <option value="EXPENSE" ${ft==="EXPENSE"?"selected":""}>Expense</option>
              <option value="INCOME" ${ft==="INCOME"?"selected":""}>Income</option>
              <option value="TRANSFER" ${ft==="TRANSFER"?"selected":""}>Transfer</option>
            </select>
          </div>

          <!-- Category Subfilter (Multi-Select) -->
          <div class="relative">
            <label class="block text-[11px] font-medium text-slate-400 mb-1">
              Category Subfilter (${r.length})
            </label>
            <button id="btn-toggle-cat-dropdown" type="button" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500 flex items-center justify-between">
              <span class="truncate">
                ${ot.length===0?"All Categories":`${ot.length} Selected`}
              </span>
              <span class="text-[10px] text-slate-400 ml-1">${Le?"▲":"▼"}</span>
            </button>

            <!-- Dropdown Panel -->
            <div id="tx-cat-dropdown-panel" class="${Le?"":"hidden"} absolute top-full left-0 mt-1 z-50 w-72 max-w-[90vw] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-2.5 space-y-1.5 max-h-72 overflow-y-auto" style="z-index: 9999;">
              <div class="flex items-center justify-between px-1 border-b border-slate-800 pb-1.5">
                <span class="text-[10px] font-bold text-slate-400 uppercase">
                  ${ft?`${ft}`:"All"} Categories
                </span>
                <div class="flex items-center gap-2 text-[10px]">
                  <button id="btn-select-all-cats" type="button" class="text-brand-400 hover:underline">Select All</button>
                  <button id="btn-clear-all-cats" type="button" class="text-slate-400 hover:underline">Clear</button>
                </div>
              </div>

              ${r.length===0?`
                <p class="text-xs text-slate-500 p-2 text-center">No categories found.</p>
              `:r.map(c=>{const d=ot.includes(c.id);return`
                  <label class="flex items-center gap-2 p-1.5 rounded hover:bg-slate-800/60 cursor-pointer text-xs select-none ${c.id==="UNCATEGORIZED"?"bg-amber-500/10 border-b border-slate-800 mb-1":""}">
                    <input type="checkbox" class="chk-category-filter rounded border-slate-700 text-brand-500 focus:ring-0" data-cat-id="${c.id}" ${d?"checked":""} />
                    <span class="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style="background:${c.color_hex}"></span>
                    <span class="text-slate-200 font-medium truncate">${c.id==="UNCATEGORIZED"?"⚠️ Uncategorized":c.name_en}</span>
                    ${c.name_he?`<span class="text-slate-400 text-[11px] truncate">(${c.name_he})</span>`:""}
                  </label>
                `}).join("")}
            </div>
          </div>

          <!-- Date Range: From -->
          <div>
            <label class="block text-[11px] font-medium text-slate-400 mb-1">From Date</label>
            <input type="date" id="tx-filter-start" value="${_e}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500" />
          </div>

          <!-- Date Range: To -->
          <div>
            <label class="block text-[11px] font-medium text-slate-400 mb-1">To Date</label>
            <input type="date" id="tx-filter-end" value="${we}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500" />
          </div>

          <!-- Search Input & Clear Button -->
          <div class="flex items-center gap-2">
            <div class="flex-1">
              <label class="block text-[11px] font-medium text-slate-400 mb-1">Search</label>
              <input type="text" id="tx-filter-search" value="${ke}" placeholder="Payee or notes..." class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500" />
            </div>
            ${i?`
              <button id="btn-tx-clear-filters" title="Clear Filters" class="mt-5 px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs font-semibold transition">Clear</button>
            `:""}
          </div>
        </div>

        ${ot.length>0?`
          <div class="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-800/80">
            <span class="text-[11px] text-slate-400 font-medium mr-1">Active Category Filters (${ot.length}):</span>
            ${ot.map(c=>{if(c==="UNCATEGORIZED")return`
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 text-xs border border-amber-500/30 shadow-sm">
                    <span class="w-2 h-2 rounded-full inline-block bg-amber-400"></span>
                    <span>⚠️ Uncategorized (ללא קטגוריה)</span>
                    <button type="button" class="btn-remove-cat-filter text-amber-400 hover:text-rose-400 font-bold ml-1 transition" data-cat-id="UNCATEGORIZED">✕</button>
                  </span>
                `;const d=wt.find(f=>f.id===c),h=d?`${d.name_en} ${d.name_he?`(${d.name_he})`:""}`:c;return`
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 text-slate-200 text-xs border border-slate-700 shadow-sm">
                  <span class="w-2 h-2 rounded-full inline-block" style="background:${d?d.color_hex:"#3B82F6"}"></span>
                  <span>${h}</span>
                  <button type="button" class="btn-remove-cat-filter text-slate-400 hover:text-rose-400 font-bold ml-1 transition" data-cat-id="${c}">✕</button>
                </span>
              `}).join("")}
            <button id="btn-clear-cat-pills" type="button" class="text-[11px] text-rose-400 hover:underline ml-2">Clear Categories</button>
          </div>
        `:""}
      </div>

      <div class="glass-panel p-6">
        ${Jr(Bt)}

        <!-- Pagination & Page Size Toolbar -->
        <div class="flex flex-wrap items-center justify-between mt-6 pt-4 border-t border-slate-800 gap-4">
          <div class="flex items-center gap-3">
            <span class="text-xs text-slate-400">Page ${n} of ${e} &bull; ${Ge} total</span>
            <div class="flex items-center gap-1.5 pl-3 border-l border-slate-800 text-xs text-slate-400">
              <span>Per page:</span>
              <select id="tx-page-size" class="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white">
                <option value="10" ${Ft===10?"selected":""}>10</option>
                <option value="25" ${Ft===25?"selected":""}>25</option>
                <option value="50" ${Ft===50?"selected":""}>50</option>
                <option value="100" ${Ft===100?"selected":""}>100</option>
              </select>
            </div>
          </div>

          <div class="flex gap-2">
            <button id="btn-tx-prev" ${it===0?"disabled":""} class="px-3 py-1.5 rounded-lg text-xs font-medium ${it===0?"text-slate-600 bg-slate-900/40 cursor-not-allowed":"text-slate-300 bg-slate-800 hover:bg-slate-700 transition"}">← Prev</button>
            <button id="btn-tx-next" ${n>=e?"disabled":""} class="px-3 py-1.5 rounded-lg text-xs font-medium ${n>=e?"text-slate-600 bg-slate-900/40 cursor-not-allowed":"text-slate-300 bg-slate-800 hover:bg-slate-700 transition"}">Next →</button>
          </div>
        </div>
      </div>
    </div>
  `}function Jr(s){return s.length===0?`<div class="py-12 text-center">
      <div class="text-3xl mb-3">📭</div>
      <p class="text-xs text-slate-500">No transactions recorded in database.</p>
    </div>`:`
    <div class="overflow-x-auto">
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-900/80 text-slate-400 uppercase border-b border-slate-800">
          <tr>
            <th class="py-3 px-4">Date</th>
            <th class="py-3 px-4">Account</th>
            <th class="py-3 px-4">Payee / Merchant</th>
            <th class="py-3 px-4">Installment</th>
            <th class="py-3 px-4">Category / AI Suggestion</th>
            <th class="py-3 px-4 text-right">Amount</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800/60">
          ${s.map(t=>`
            <tr class="hover:bg-slate-900/40 transition">
              <td class="py-3 px-4 text-slate-300 whitespace-nowrap font-mono">${t.date}</td>
              <td class="py-3 px-4 text-slate-400">${t.account_name||"Account"}</td>
              <td class="py-3 px-4 font-medium text-white">${t.payee_raw}</td>
              <td class="py-3 px-4 text-slate-400">
                ${t.current_installment&&t.total_installments?`<span class="bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-mono">תשלום ${t.current_installment}/${t.total_installments}</span>`:"-"}
              </td>
              <td class="py-3 px-4">
                ${t.suggested_category_en?`
                  <div class="glass-card p-3 border-amber-500/40 bg-amber-500/10 space-y-2">
                    <div class="flex items-center justify-between text-xs font-semibold text-amber-300">
                      <span>💡 AI Suggested:</span>
                      <span class="font-bold">${t.suggested_category_he} / ${t.suggested_category_en}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <button class="btn-accept-suggestion bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded text-xs font-semibold shadow" data-txid="${t.id}">
                        ✓ Accept
                      </button>
                      <button class="btn-reject-suggestion bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded text-xs" data-txid="${t.id}">
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                `:`
                  <select class="tx-cat-select bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-brand-500 cursor-pointer" data-txid="${t.id}">
                    <option value="" ${t.category_id?"":"selected"}>⚠️ Uncategorized</option>
                    ${wt.map(e=>`
                      <option value="${e.id}" ${t.category_id===e.id?"selected":""}>
                        ${e.name_en} (${e.name_he})
                      </option>
                    `).join("")}
                  </select>
                `}
              </td>
              <td class="py-3 px-4 text-right font-bold font-mono ${(t.amount??0)<0?"text-rose-400":"text-emerald-400"}">
                ${at(t.amount)}
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `}function wf(){const s=wt.filter(i=>i.category_type==="EXPENSE"),t=wt.filter(i=>i.category_type==="INCOME"),e=wt.filter(i=>i.category_type!=="EXPENSE"&&i.category_type!=="INCOME"),n=(i,o)=>o.length===0?"":`
      <div class="space-y-3">
        <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">${i}</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${o.map(a=>`
            <div class="glass-card">
              <div class="flex items-center gap-3">
                <div class="w-3 h-3 rounded-full flex-shrink-0" style="background: ${a.color_hex||"#3B82F6"}"></div>
                <div class="flex-1 min-w-0">
                  <h4 class="text-sm font-bold text-white truncate">${a.name_en}</h4>
                  <span class="text-xs text-slate-400">${a.name_he}</span>
                </div>
              </div>
              ${a.monthly_budget?`
                <div class="mt-2 text-xs text-slate-400">Budget: <span class="text-brand-400 font-mono">${at(a.monthly_budget)}/mo</span></div>
              `:""}
              <div class="mt-3 flex gap-2">
                <button class="btn-edit-cat flex-1 text-xs py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition" data-id="${a.id}">✏️ Edit</button>
                <button class="btn-delete-cat text-xs py-1 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition" data-id="${a.id}">✕</button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;return`
    <div class="space-y-8">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-white">Category Management</h2>
          <p class="text-xs text-slate-400 mt-1">${wt.length} categories total</p>
        </div>
        <button id="btn-add-category" class="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-lg shadow-brand-500/20 transition">
          + Add Category
        </button>
      </div>

      ${wt.length===0?`
        <div class="glass-panel p-12 text-center space-y-3">
          <div class="text-4xl">🏷️</div>
          <p class="text-sm text-slate-400">No categories yet. Add your first category to start organizing transactions.</p>
          <button id="btn-add-category-empty" class="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow">
            + Add First Category
          </button>
        </div>
      `:`
        ${n("Expense Categories",s)}
        ${n("Income Categories",t)}
        ${n("Other Categories",e)}
      `}
    </div>
  `}function kf(){const s=bt.running,t=bt.canceled,e=bt.total,n=bt.processed,i=bt.current_batch,o=bt.total_batches,a=bt.batches||[],r=a.filter(d=>d.status==="pending").length,l=Bt.filter(d=>!d.category_id&&!d.suggested_category_en).length,c=e>0?Math.min(100,Math.round(n/e*100)):0;return`
    <div class="space-y-8">
      <!-- Header Banner -->
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass-panel p-6">
        <div>
          <h2 class="text-2xl font-extrabold text-white flex items-center gap-2">
            <span>✨ Auto-Categorization</span>
            ${s?'<span class="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">● Running</span>':""}
          </h2>
          <p class="text-xs text-slate-400 mt-1">
            Automated transaction categorization using AI LLM micro-batches.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-right text-xs">
            <span class="text-slate-400 block">Waiting in DB</span>
            <span class="text-white font-bold font-mono text-sm">${l} transactions</span>
          </div>
        </div>
      </div>

      <!-- Main Layout Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <!-- Left Column: Status & Run Controls (2 cols on LG) -->
        <div class="lg:col-span-2 space-y-6">

          <!-- RUN STATUS CARD -->
          <div class="glass-panel p-6 space-y-6 ${s?"border-brand-500/30":"bg-slate-900/40 border-slate-800/60"}">
            
            ${s?`
              <!-- RUNNING STATE -->
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-base font-bold text-white flex items-center gap-2">
                      <span class="w-3 h-3 rounded-full bg-emerald-500 animate-ping inline-block"></span>
                      Categorization Run Active
                    </h3>
                    <p class="text-xs text-slate-400 mt-0.5">
                      Batch ${i} of ${o} in progress (${r} pending)
                    </p>
                  </div>
                  <button id="btn-cancel-autocat" class="bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow transition flex items-center gap-1.5">
                    <span>⛔ Cancel Categorization Run</span>
                  </button>
                </div>

                <!-- Progress Bar -->
                <div class="space-y-1.5">
                  <div class="flex justify-between text-xs font-medium">
                    <span class="text-slate-300">Overall Progress: ${n} / ${e} transactions</span>
                    <span class="text-brand-400 font-bold font-mono">${c}%</span>
                  </div>
                  <div class="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
                    <div class="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500" style="width: ${c}%"></div>
                  </div>
                </div>
              </div>
            `:`
              <!-- IDLE / NOT RUNNING STATE (GREYED OUT STATUS) -->
              <div class="space-y-6">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div>
                    <h3 class="text-sm font-bold text-white flex items-center gap-2">
                      <span>🚀 Ready to Run Auto-Categorization</span>
                    </h3>
                    <p class="text-xs text-slate-400 mt-1">
                      ${l>0?`${l} transactions ready for AI categorization.`:"All transactions have been categorized and reviewed."}
                    </p>
                  </div>
                  <button id="btn-start-autocat" class="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-lg shadow-purple-500/25 transition flex items-center justify-center gap-2 flex-shrink-0">
                    <span>✨ Run Categorization</span>
                  </button>
                </div>

                ${t?`
                  <div class="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                    <span>⚠️ Previous categorization run was canceled by user (${n}/${e} processed).</span>
                  </div>
                `:""}

                ${bt.last_error?`
                  <div class="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                    ❌ ${bt.last_error}
                  </div>
                `:""}
              </div>
            `}

            <!-- BATCHES STATUS LIST & RESULTS BUTTONS -->
            <div class="space-y-3 pt-4 border-t border-slate-800/80 ${s?"":"opacity-75"}">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Batches Status (${a.length} Micro-Batches)
                </h4>
                <span class="text-[11px] text-slate-500">${r} pending &bull; ${a.filter(d=>d.status==="completed").length} completed</span>
              </div>

              ${a.length===0?`
                <p class="text-xs text-slate-500 py-4 text-center">No active or previous batch run history.</p>
              `:`
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                  ${a.map(d=>{let h="bg-slate-800 text-slate-400 border-slate-700",u="Pending";return d.status==="running"?(h="bg-blue-500/20 text-blue-300 border-blue-500/30 animate-pulse",u="⚡ Running"):d.status==="completed"?(h="bg-emerald-500/20 text-emerald-300 border-emerald-500/30",u="✓ Completed"):d.status==="failed"||d.status==="skipped"?(h="bg-rose-500/20 text-rose-300 border-rose-500/30",u=`✕ ${d.status}`):d.status==="canceled"&&(h="bg-amber-500/20 text-amber-300 border-amber-500/30",u="⛔ Canceled"),`
                      <div class="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                        <div>
                          <div class="flex items-center gap-2">
                            <span class="text-xs font-bold text-white">Batch #${d.index}</span>
                            <span class="text-[10px] px-2 py-0.5 rounded-full border ${h}">
                              ${u}
                            </span>
                          </div>
                          <span class="text-[11px] text-slate-400 mt-0.5 block">${d.tx_count} transactions</span>
                        </div>
                        ${d.status==="completed"&&d.results&&d.results.length>0?`
                          <button class="btn-view-batch-results text-[11px] px-2.5 py-1 rounded bg-brand-600/80 hover:bg-brand-500 text-white font-medium transition" data-batch-idx="${d.index-1}">
                            🔍 View Results
                          </button>
                        `:""}
                      </div>
                    `}).join("")}
                </div>
              `}
            </div>

          </div>
        </div>

        <!-- Right Column: System Prompt & Parameters -->
        <div class="space-y-6">
          
          <!-- SYSTEM PROMPT EDITOR CARD -->
          <div class="glass-panel p-6 space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-bold text-white">System Prompt Parameters</h3>
              <button id="btn-reset-prompt" class="text-[11px] text-slate-400 hover:text-amber-300 transition underline">
                🔄 Reset to Default
              </button>
            </div>
            <p class="text-xs text-slate-400">
              Customize the instructions delivered to the AI for transaction matching and category generation.
            </p>

            <textarea id="autocat-prompt-input" rows="12" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-brand-500 leading-relaxed">${ys}</textarea>

            <button id="btn-save-prompt" class="w-full bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold py-2.5 rounded-lg shadow transition">
              💾 Save Prompt Parameters
            </button>
          </div>

          <!-- CONNECTION PREVIEW CARD -->
          <div class="glass-panel p-6 space-y-3">
            <h3 class="text-sm font-bold text-white">LLM Provider Config</h3>
            <div class="space-y-2 text-xs">
              <div class="flex justify-between py-1 border-b border-slate-800">
                <span class="text-slate-400">Endpoint URL</span>
                <span class="text-slate-200 font-mono truncate max-w-[180px]">${Xt.localai_url||"http://localhost:8080"}</span>
              </div>
              <div class="flex justify-between py-1 border-b border-slate-800">
                <span class="text-slate-400">Model Name</span>
                <span class="text-slate-200 font-mono">${Xt.localai_model||"llama-3-8b"}</span>
              </div>
              <div class="flex justify-between py-1 border-b border-slate-800">
                <span class="text-slate-400">Batch Size</span>
                <span class="text-slate-200 font-mono">${Xt.localai_batch_size||"5"} tx / batch</span>
              </div>
            </div>
            <button id="btn-nav-settings" class="w-full text-center text-xs text-brand-400 hover:text-brand-300 font-medium py-1 transition">
              ⚙️ Change LLM Settings in Settings Tab →
            </button>
          </div>

        </div>

      </div>
    </div>
  `}function Mf(){return $e?`
    <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div class="glass-panel max-w-3xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto border border-slate-700 shadow-2xl">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 class="text-base font-bold text-white flex items-center gap-2">
            <span>🔍 Batch #${$e.index} Results</span>
            <span class="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-normal">
              ${$e.tx_count} Transactions
            </span>
          </h3>
          <button id="btn-close-batch-modal" class="text-slate-400 hover:text-white text-lg font-bold px-2 py-0.5 rounded hover:bg-slate-800 transition">✕</button>
        </div>

        <div class="space-y-3">
          ${($e.results||[]).map(s=>{const t=Bt.find(a=>a.id===s.transaction_id),e=s.payee_raw||(t?t.payee_raw:"Transaction Item"),n=s.amount!==void 0?s.amount:t?t.amount:0,i=s.date||(t?t.date:"");let o="";if(s.category_name_en||s.category_name_he){const a=wt.find(l=>l.id===s.category_id);o=`
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand-500/20 text-brand-300 font-semibold border border-brand-500/30">
                  <span class="w-2 h-2 rounded-full inline-block" style="background:${a?a.color_hex:"#3B82F6"}"></span>
                  ${s.category_name_en||s.category_name_he} ${s.category_name_he&&s.category_name_en?`(${s.category_name_he})`:""}
                </span>
              `}else if(s.category_id){const a=wt.find(r=>r.id===s.category_id);a?o=`
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand-500/20 text-brand-300 font-semibold border border-brand-500/30">
                    <span class="w-2 h-2 rounded-full inline-block" style="background:${a.color_hex}"></span>
                    ${a.name_en} ${a.name_he?`(${a.name_he})`:""}
                  </span>
                `:o=`<span class="px-2.5 py-1 rounded-md bg-brand-500/20 text-brand-300 font-semibold border border-brand-500/30">${s.category_id}</span>`}else s.suggested_category?o=`
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                  Suggested: ${s.suggested_category.name_en||s.suggested_category.name_he} ${s.suggested_category.name_he&&s.suggested_category.name_en?`(${s.suggested_category.name_he})`:""} [${s.suggested_category.category_type}]
                </span>
              `:o='<span class="text-slate-500">Uncategorized</span>';return`
              <div class="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
                <div class="flex justify-between items-center font-medium">
                  <span class="text-white font-bold text-sm">${e}</span>
                  <span class="text-slate-300 font-mono text-xs">${at(n)} &bull; ${i}</span>
                </div>
                <div class="flex justify-between items-center text-xs pt-2 border-t border-slate-800/60">
                  <div class="flex items-center gap-2">
                    <span class="text-slate-400 font-medium">Chosen Category:</span>
                    ${o}
                  </div>
                  ${s.confidence?`<span class="text-slate-400 text-[11px]">Confidence: ${(s.confidence*100).toFixed(0)}%</span>`:""}
                </div>
              </div>
            `}).join("")}
        </div>
      </div>
    </div>
  `:""}function Sf(){const s=te,t=s!==null;return`
    <div class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="glass-panel max-w-md w-full p-6 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 class="text-lg font-bold text-white">${t?"Edit Category":"Add Category"}</h3>
          <button id="btn-close-cat-modal" class="text-slate-400 hover:text-white text-sm">✕</button>
        </div>

        <form id="form-category" class="space-y-4">
          <div id="cat-modal-error" class="hidden p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium"></div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Name (English)</label>
              <input type="text" id="cat-name-en" required value="${(s==null?void 0:s.name_en)||""}" placeholder="e.g. Groceries" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Name (Hebrew)</label>
              <input type="text" id="cat-name-he" value="${(s==null?void 0:s.name_he)||""}" placeholder="e.g. מכולת" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" dir="rtl" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Category Type</label>
              <select id="cat-type" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                <option value="EXPENSE" ${(s==null?void 0:s.category_type)==="EXPENSE"?"selected":""}>EXPENSE</option>
                <option value="INCOME" ${(s==null?void 0:s.category_type)==="INCOME"?"selected":""}>INCOME</option>
                <option value="TRANSFER" ${(s==null?void 0:s.category_type)==="TRANSFER"?"selected":""}>TRANSFER</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Monthly Budget (₪)</label>
              <input type="number" step="0.01" id="cat-budget" value="${(s==null?void 0:s.monthly_budget)??""}" placeholder="0.00 (optional)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Color</label>
              <input type="color" id="cat-color" value="${(s==null?void 0:s.color_hex)||"#3B82F6"}" class="w-full h-9 bg-slate-900 border border-slate-700 rounded-lg px-1 cursor-pointer" />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Icon (emoji or text)</label>
              <input type="text" id="cat-icon" value="${(s==null?void 0:s.icon)||"tag"}" placeholder="tag" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button type="button" id="btn-cancel-cat-modal" class="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-900">Cancel</button>
            <button type="submit" id="btn-save-category" class="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow">
              ${t?"Update Category":"Create Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  `}let vt=0,sn="",He=null,Z=null,$={date_col:"",payee_col:"",payee_col_2:"",amount_mode:"amount",amount_col:"",debit_col:"",credit_col:"",billing_date_col:"",original_amount_col:"",original_currency_col:""},ct=null,Dt=null;function Cf(){return`
    <div class="max-w-4xl mx-auto glass-panel p-8 space-y-6">
      <div class="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 class="text-2xl font-bold text-white">Statement CSV Import Wizard</h2>
          <p class="text-xs text-slate-400 mt-1">Multi-step interactive parser with auto-encoding (UTF-8 / Windows-1255) &amp; validation</p>
        </div>
        <button id="btn-reset-wizard" class="text-xs text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg transition">
          🔄 Reset Wizard
        </button>
      </div>

      <!-- Stepper Progress Indicator -->
      <div class="grid grid-cols-5 gap-2 border-b border-slate-800 pb-4">
        ${[{num:0,label:"0. Account & File"},{num:1,label:"1-2. Columns & Mapping"},{num:3,label:"3. Preview"},{num:4,label:"4. Staging Validation"},{num:5,label:"5. Finish"}].map(t=>{const e=vt===t.num,n=vt>t.num;return`
            <div class="flex flex-col items-center gap-1">
              <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${e?"bg-brand-600 text-white shadow-lg shadow-brand-500/30 ring-2 ring-brand-400":n?"bg-emerald-600 text-white":"bg-slate-900 text-slate-500 border border-slate-800"}">
                ${n?"✓":t.num}
              </div>
              <span class="text-[10px] font-medium text-center ${e?"text-brand-400 font-bold":n?"text-emerald-400":"text-slate-500"}">
                ${t.label}
              </span>
            </div>
          `}).join("")}
      </div>

      <!-- STEP 0: Select Account & File -->
      ${vt===0?`
        <div class="space-y-6">
          ${Vt.length===0?`
            <div class="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
              ⚠️ No accounts registered yet. Please add at least one account in the Accounts tab before importing statements.
            </div>
          `:""}

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Target Account</label>
              <select id="w0-account-id" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500">
                ${Vt.map(t=>`<option value="${t.id}" ${sn===t.id?"selected":""}>${t.name} (${t.institution} - ${t.account_type})</option>`).join("")}
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Select Bank or Credit Card CSV File</label>
              <input type="file" id="w0-file" accept=".csv" class="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-600 file:text-white hover:file:bg-brand-500 cursor-pointer" />
            </div>
          </div>

          <div class="flex justify-end pt-4 border-t border-slate-800">
            <button id="btn-w0-next" class="bg-brand-600 hover:bg-brand-500 text-white font-bold px-6 py-2.5 rounded-lg text-xs shadow-lg shadow-brand-500/20 transition flex items-center gap-2">
              <span>Step 1: Inspect Columns &amp; Load Preview →</span>
            </button>
          </div>
        </div>
      `:""}

      <!-- STEP 1 & 2: Show First 10 Lines & Column Mapping -->
      ${vt===1&&Z?`
        <div class="space-y-6">
          <div class="p-4 rounded-lg bg-brand-500/10 border border-brand-500/20 space-y-2">
            <h3 class="text-xs font-bold text-brand-300">Found ${Z.columns.length} columns &amp; ${Z.total_rows} total rows in CSV</h3>
            <div class="flex flex-wrap gap-1.5">
              ${Z.columns.map(t=>`<span class="px-2 py-0.5 rounded-md bg-slate-900 text-slate-200 border border-slate-700 text-[11px] font-mono">${t}</span>`).join("")}
            </div>
          </div>

          <!-- Sample 10 Rows Table -->
          <div class="space-y-2">
            <h4 class="text-xs font-bold text-slate-300">First 10 Raw CSV Lines Preview</h4>
            <div class="overflow-x-auto border border-slate-800 rounded-lg max-h-56">
              <table class="w-full text-left text-[11px] font-mono">
                <thead class="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0">
                  <tr>
                    <th class="py-2 px-3 text-slate-500">#</th>
                    ${Z.columns.map(t=>`<th class="py-2 px-3 whitespace-nowrap">${t}</th>`).join("")}
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/40">
                  ${Z.sample_rows.map((t,e)=>`
                    <tr class="hover:bg-slate-900/50">
                      <td class="py-1.5 px-3 text-slate-500 font-bold">${e+1}</td>
                      ${t.map(n=>`<td class="py-1.5 px-3 whitespace-nowrap text-slate-300">${n||"-"}</td>`).join("")}
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Column Mapping Form -->
          <div class="space-y-4 pt-4 border-t border-slate-800">
            <h4 class="text-xs font-bold text-white uppercase tracking-wider">Map Required CSV Columns</h4>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Date Column *</label>
                <select id="w1-date-col" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                  ${Z.columns.map(t=>`
                    <option value="${t}" ${$.date_col===t?"selected":""}>${t}</option>
                  `).join("")}
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Primary Description / Payee Column *</label>
                <select id="w1-payee-col" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                  ${Z.columns.map(t=>`
                    <option value="${t}" ${$.payee_col===t?"selected":""}>${t}</option>
                  `).join("")}
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Secondary Column (Optional - Concatenated)</label>
                <select id="w1-payee-col-2" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                  <option value="">(None - Single Column)</option>
                  ${Z.columns.map(t=>`
                    <option value="${t}" ${$.payee_col_2===t?"selected":""}>${t}</option>
                  `).join("")}
                </select>
              </div>
            </div>

            <div class="space-y-2">
              <label class="block text-xs font-semibold text-slate-300">Amount Structure</label>
              <div class="flex gap-4">
                <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input type="radio" name="w1-mode" value="amount" ${$.amount_mode==="amount"?"checked":""} id="radio-mode-single" />
                  <span>Single Signed Amount Column (e.g. סכום)</span>
                </label>
                <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input type="radio" name="w1-mode" value="debit_credit" ${$.amount_mode==="debit_credit"?"checked":""} id="radio-mode-split" />
                  <span>Separate Debit &amp; Credit Columns (e.g. חיוב / זיכוי)</span>
                </label>
              </div>
            </div>

            <div id="w1-single-amount-block" class="${$.amount_mode==="amount"?"":"hidden"}">
              <label class="block text-xs font-semibold text-slate-300 mb-1">Amount Column</label>
              <select id="w1-amount-col" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                ${Z.columns.map(t=>`
                  <option value="${t}" ${$.amount_col===t?"selected":""}>${t}</option>
                `).join("")}
              </select>
            </div>

            <div id="w1-split-amount-block" class="grid grid-cols-2 gap-4 ${$.amount_mode==="debit_credit"?"":"hidden"}">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Debit Column (Expense)</label>
                <select id="w1-debit-col" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                  ${Z.columns.map(t=>`
                    <option value="${t}" ${$.debit_col===t?"selected":""}>${t}</option>
                  `).join("")}
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Credit Column (Income)</label>
                <select id="w1-credit-col" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                  ${Z.columns.map(t=>`
                    <option value="${t}" ${$.credit_col===t?"selected":""}>${t}</option>
                  `).join("")}
                </select>
              </div>
            </div>

            <!-- Optional Credit Card Specific Mappings -->
            <div class="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-3">
              <h5 class="text-[11px] font-bold text-brand-300 uppercase tracking-wider">Credit Card Statement Fields (Optional)</h5>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label class="block text-[11px] font-medium text-slate-400 mb-1">Billing Date Column</label>
                  <select id="w1-billing-date-col" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white">
                    <option value="">(None - Default to cycle day)</option>
                    ${Z.columns.map(t=>`
                      <option value="${t}" ${$.billing_date_col===t?"selected":""}>${t}</option>
                    `).join("")}
                  </select>
                </div>
                <div>
                  <label class="block text-[11px] font-medium text-slate-400 mb-1">Original Amount Column</label>
                  <select id="w1-orig-amount-col" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white">
                    <option value="">(None)</option>
                    ${Z.columns.map(t=>`
                      <option value="${t}" ${$.original_amount_col===t?"selected":""}>${t}</option>
                    `).join("")}
                  </select>
                </div>
                <div>
                  <label class="block text-[11px] font-medium text-slate-400 mb-1">Original Currency Column</label>
                  <select id="w1-orig-currency-col" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white">
                    <option value="">(None)</option>
                    ${Z.columns.map(t=>`
                      <option value="${t}" ${$.original_currency_col===t?"selected":""}>${t}</option>
                    `).join("")}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between pt-4 border-t border-slate-800">
            <button id="btn-w1-back" class="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-900">
              ← Back to Step 0
            </button>
            <button id="btn-w1-next" class="bg-brand-600 hover:bg-brand-500 text-white font-bold px-6 py-2.5 rounded-lg text-xs shadow-lg shadow-brand-500/20 transition">
              Step 3: Preview Transactions Mapping →
            </button>
          </div>
        </div>
      `:""}

      <!-- STEP 3: Preview Mapped Transactions -->
      ${vt===3&&ct?`
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-white">Mapping Preview (${ct.passed_count} transactions parsed)</h3>
            <span class="text-xs text-emerald-400 font-semibold">✓ Parsed successfully</span>
          </div>

          <div class="overflow-x-auto border border-slate-800 rounded-lg max-h-80">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0">
                <tr>
                  <th class="py-2.5 px-3">Date</th>
                  <th class="py-2.5 px-3">Payee / Merchant</th>
                  <th class="py-2.5 px-3">Installment</th>
                  <th class="py-2.5 px-3 text-right">Parsed Amount</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/40">
                ${ct.passed_transactions.slice(0,15).map(t=>`
                  <tr class="hover:bg-slate-900/50">
                    <td class="py-2 px-3 text-slate-300 font-mono">${t.date}</td>
                    <td class="py-2 px-3 font-medium text-white">${t.payee_raw}</td>
                    <td class="py-2 px-3 text-slate-400">
                      ${t.current_installment&&t.total_installments?`<span class="bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded text-[11px]">תשלום ${t.current_installment}/${t.total_installments}</span>`:"-"}
                    </td>
                    <td class="py-2 px-3 text-right font-bold font-mono ${t.amount<0?"text-rose-400":"text-emerald-400"}">
                      ${at(t.amount)}
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
          ${ct.passed_count>15?`<p class="text-xs text-slate-500 text-center">+ ${ct.passed_count-15} more parsed transactions</p>`:""}

          <div class="flex items-center justify-between pt-4 border-t border-slate-800">
            <button id="btn-w3-back" class="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-900">
              ← Edit Column Mapping
            </button>
            <button id="btn-w3-next" class="bg-brand-600 hover:bg-brand-500 text-white font-bold px-6 py-2.5 rounded-lg text-xs shadow-lg shadow-brand-500/20 transition">
              Step 4: Run Staging Validation →
            </button>
          </div>
        </div>
      `:""}

      <!-- STEP 4: Staging Area Breakdown -->
      ${vt===4&&ct?`
        <div class="space-y-6">
          <div class="grid grid-cols-2 gap-4">
            <div class="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span class="text-xs text-slate-400 uppercase font-semibold">Passed Transactions</span>
              <h3 class="text-2xl font-extrabold text-emerald-400 mt-1">${ct.passed_count}</h3>
              <p class="text-[11px] text-emerald-300/80 mt-1">Ready to be saved to database</p>
            </div>
            <div class="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <span class="text-xs text-slate-400 uppercase font-semibold">Failed / Skipped Rows</span>
              <h3 class="text-2xl font-extrabold text-rose-400 mt-1">${ct.failed_count}</h3>
              <p class="text-[11px] text-rose-300/80 mt-1">Invalid dates, 0 amounts, or formatting errors</p>
            </div>
          </div>

          <!-- Failed Rows Section -->
          ${ct.failed_count>0?`
            <div class="space-y-2">
              <h4 class="text-xs font-bold text-rose-400 flex items-center gap-2">
                <span>⚠️ Failed Rows Breakdown (${ct.failed_count})</span>
              </h4>
              <div class="overflow-x-auto border border-rose-500/20 rounded-lg max-h-48">
                <table class="w-full text-left text-[11px]">
                  <thead class="bg-rose-950/40 text-rose-300 border-b border-rose-500/20">
                    <tr>
                      <th class="py-2 px-3">Row #</th>
                      <th class="py-2 px-3">Reason</th>
                      <th class="py-2 px-3">Raw Content</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-rose-500/10">
                    ${ct.failed_rows.map(t=>`
                      <tr class="hover:bg-rose-500/5">
                        <td class="py-1.5 px-3 font-bold text-slate-400 font-mono">${t.row_index}</td>
                        <td class="py-1.5 px-3 font-semibold text-rose-400 whitespace-nowrap">${t.reason}</td>
                        <td class="py-1.5 px-3 text-slate-400 font-mono truncate max-w-xs">${t.raw_row.join(" | ")}</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            </div>
          `:""}

          <!-- Passed Transactions Section -->
          <div class="space-y-2">
            <h4 class="text-xs font-bold text-emerald-400">Approved Transactions to Import (${ct.passed_count})</h4>
            <div class="overflow-x-auto border border-slate-800 rounded-lg max-h-60">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0">
                  <tr>
                    <th class="py-2 px-3">Date</th>
                    <th class="py-2 px-3">Payee</th>
                    <th class="py-2 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/40">
                  ${ct.passed_transactions.map(t=>`
                    <tr class="hover:bg-slate-900/40">
                      <td class="py-1.5 px-3 text-slate-300 font-mono">${t.date}</td>
                      <td class="py-1.5 px-3 font-medium text-white">${t.payee_raw}</td>
                      <td class="py-1.5 px-3 text-right font-bold font-mono ${t.amount<0?"text-rose-400":"text-emerald-400"}">${at(t.amount)}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </div>

          <div class="flex items-center justify-between pt-4 border-t border-slate-800">
            <button id="btn-w4-back" class="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-900">
              ← Edit Mapping
            </button>
            <button id="btn-w4-commit" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-lg text-xs shadow-lg shadow-emerald-500/20 transition flex items-center gap-2">
              <span>Approve &amp; Import ${ct.passed_count} Transactions 🚀</span>
            </button>
          </div>
        </div>
      `:""}

      <!-- STEP 5: Finished -->
      ${vt===5&&Dt?`
        <div class="text-center py-8 space-y-6">
          <div class="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-3xl mx-auto text-emerald-400">
            ✓
          </div>
          <div>
            <h3 class="text-2xl font-extrabold text-white">Import Complete!</h3>
            <p class="text-xs text-slate-400 mt-2">
              Successfully added <span class="text-emerald-400 font-bold">${Dt.imported}</span> transactions to the database.
              ${Dt.duplicates>0?`<span class="text-amber-400 font-bold">(${Dt.duplicates} duplicate records skipped)</span>`:""}
            </p>
          </div>

          ${Dt.duplicate_records&&Dt.duplicate_records.length>0?`
            <div class="mt-4 text-left bg-slate-900/80 rounded-xl p-4 border border-amber-500/30 max-w-3xl mx-auto space-y-3 shadow-lg">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <span>⚠️ Skipped Duplicate Records (${Dt.duplicate_records.length})</span>
                </span>
                <span class="text-[10px] text-slate-400">Unique Identity: Account + Date + Amount + Payee</span>
              </div>
              <div class="max-h-64 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950">
                <table class="w-full text-[11px] text-left text-slate-300">
                  <thead class="bg-slate-900 text-slate-400 font-semibold sticky top-0 border-b border-slate-800">
                    <tr>
                      <th class="py-2 px-3">Date</th>
                      <th class="py-2 px-3">Payee / Description</th>
                      <th class="py-2 px-3 text-right">Amount</th>
                      <th class="py-2 px-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-800/50">
                    ${Dt.duplicate_records.map(t=>`
                      <tr class="hover:bg-slate-900/50 transition-colors">
                        <td class="py-2 px-3 whitespace-nowrap text-slate-400 font-mono">${t.date}</td>
                        <td class="py-2 px-3 font-medium text-slate-200">${t.payee_raw}</td>
                        <td class="py-2 px-3 text-right font-mono text-amber-300 whitespace-nowrap">
                          ${t.amount.toFixed(2)} ${t.currency}
                          ${t.original_amount!==void 0&&t.original_amount!==null&&t.original_amount!==t.amount?`<div class="text-[10px] text-slate-500">Orig: ${t.original_amount.toFixed(2)}</div>`:""}
                        </td>
                        <td class="py-2 px-3 text-slate-400 whitespace-nowrap">${t.reason}</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            </div>
          `:""}

          <div class="flex justify-center gap-4 pt-4 border-t border-slate-800">
            <button id="btn-w5-view-txs" class="bg-brand-600 hover:bg-brand-500 text-white font-bold px-6 py-2.5 rounded-lg text-xs shadow">
              View Transactions Ledger 💳
            </button>
            <button id="btn-w5-again" class="bg-slate-800 hover:bg-slate-700 text-slate-300 px-6 py-2.5 rounded-lg text-xs font-medium">
              Import Another CSV File 📤
            </button>
          </div>
        </div>
      `:""}
    </div>
  `}function Ef(){return`
    <div class="space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-white">🔗 Credit Card Billing Cycles</h2>
          <p class="text-xs text-slate-400 mt-1">Group credit card transactions into billing cycles, monitor expected billing amounts, and match bank payments.</p>
        </div>
        <button id="btn-open-generate-modal" class="bg-brand-600 hover:bg-brand-500 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-lg shadow-brand-500/20 transition flex items-center gap-1.5 self-start sm:self-auto">
          <span>⚡ Generate Billing Cycles</span>
        </button>
      </div>

      <!-- Filters & Stats Bar -->
      <div class="glass-panel p-4 flex flex-wrap items-center justify-between gap-4">
        <div class="flex flex-wrap items-center gap-3">
          <div>
            <label class="block text-[10px] font-semibold text-slate-400 mb-0.5">Credit Card Account</label>
            <select id="cycle-account-filter" class="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white">
              <option value="">All CC Accounts</option>
              ${Vt.filter(t=>t.account_type==="CREDIT_CARD").map(t=>`<option value="${t.id}" ${fn===t.id?"selected":""}>${t.name}</option>`).join("")}
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-semibold text-slate-400 mb-0.5">Status Filter</label>
            <select id="cycle-status-filter" class="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white">
              <option value="">All Statuses</option>
              <option value="OPEN" ${Oe==="OPEN"?"selected":""}>OPEN</option>
              <option value="BILLED" ${Oe==="BILLED"?"selected":""}>BILLED</option>
              <option value="PAID" ${Oe==="PAID"?"selected":""}>PAID</option>
              <option value="PARTIAL" ${Oe==="PARTIAL"?"selected":""}>PARTIAL</option>
            </select>
          </div>
        </div>

        <div class="text-xs text-slate-400">
          Showing <span class="font-bold text-white">${en.length}</span> billing cycles
        </div>
      </div>

      <!-- Cycles Table -->
      <div class="glass-panel overflow-hidden">
        ${en.length===0?`
          <div class="p-8 text-center space-y-3">
            <div class="text-3xl">🗓️</div>
            <p class="text-xs text-slate-400">No billing cycles found. Click <strong>"Generate Billing Cycles"</strong> above to auto-create monthly billing cycles for your credit card accounts.</p>
          </div>
        `:`
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th class="py-3 px-4">Account</th>
                  <th class="py-3 px-4">Billing Day</th>
                  <th class="py-3 px-4">Cycle Period</th>
                  <th class="py-3 px-4">Expected Bill Date</th>
                  <th class="py-3 px-4 text-right">Expected Amount</th>
                  <th class="py-3 px-4">Status</th>
                  <th class="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/40">
                ${en.map(t=>{let e="";return t.status==="PAID"?e='<span class="px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">✓ PAID</span>':t.status==="PARTIAL"?e='<span class="px-2 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold">⚠ PARTIAL</span>':t.status==="BILLED"?e='<span class="px-2 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[10px] font-bold">BILLED</span>':e='<span class="px-2 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-medium">OPEN</span>',`
                    <tr class="hover:bg-slate-900/50 transition">
                      <td class="py-3 px-4 font-bold text-white">${t.account_name||t.account_id}</td>
                      <td class="py-3 px-4 text-slate-400 font-mono">Day ${t.billing_day}</td>
                      <td class="py-3 px-4 text-slate-300 font-mono">${t.cycle_start_date} → ${t.cycle_end_date}</td>
                      <td class="py-3 px-4 text-slate-300 font-mono">${t.expected_bill_date}</td>
                      <td class="py-3 px-4 text-right font-bold font-mono text-rose-400">${at(t.expected_amount)}</td>
                      <td class="py-3 px-4">${e}</td>
                      <td class="py-3 px-4 text-right">
                        <div class="flex items-center justify-end gap-1.5">
                          <button class="btn-view-cycle bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-md text-[11px] font-medium transition" data-id="${t.id}">
                            🔍 Detail
                          </button>
                          ${t.status==="PAID"||t.status==="PARTIAL"?`
                            <button class="btn-unlink-cycle bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-md text-[11px] font-medium transition" data-id="${t.id}">
                              ❌ Unlink
                            </button>
                          `:`
                            <button class="btn-reconcile-cycle bg-brand-600 hover:bg-brand-500 text-white px-2.5 py-1 rounded-md text-[11px] font-bold shadow transition" data-id="${t.id}">
                              🔗 Match Payment
                            </button>
                          `}
                          <button class="btn-delete-cycle text-slate-500 hover:text-rose-400 px-1.5 py-1 rounded transition" data-id="${t.id}">
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  `}).join("")}
              </tbody>
            </table>
          </div>
        `}
      </div>
    </div>

    ${fs?Af():""}
    ${he?Pf():""}
  `}function Af(){const s=Vt.filter(n=>n.account_type==="CREDIT_CARD"),t=new Date,e=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}`;return`
    <div class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="glass-panel max-w-md w-full p-6 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 class="text-lg font-bold text-white">⚡ Generate Billing Cycles</h3>
          <button id="btn-close-generate-modal" class="text-slate-400 hover:text-white text-sm">✕</button>
        </div>

        <form id="form-generate-cycles" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Target Credit Card Account</label>
            <select id="gen-account-id" required class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
              ${s.map(n=>`<option value="${n.id}">${n.name} (${n.institution})</option>`).join("")}
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">From Month</label>
              <input type="month" id="gen-from-month" value="${e}" required class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">To Month</label>
              <input type="month" id="gen-to-month" value="${e}" required class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white" />
            </div>
          </div>

          <div class="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <p class="font-bold text-slate-300">💡 Israeli Weekday Rule</p>
            <p>If expected bill date lands on Friday or Saturday, it auto-adjusts forward to Sunday.</p>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button type="button" id="btn-cancel-generate-modal" class="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-900">Cancel</button>
            <button type="submit" id="btn-submit-generate" class="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow">Generate Cycles</button>
          </div>
        </form>
      </div>
    </div>
  `}function Pf(){if(!he)return"";const{billing_cycle:s,transactions:t}=he;return`
    <div class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="glass-panel max-w-4xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 class="text-lg font-bold text-white">Billing Cycle Detail: ${s.account_name||s.account_id}</h3>
            <p class="text-xs text-slate-400 mt-0.5">
              Period: <span class="font-mono text-slate-200">${s.cycle_start_date} → ${s.cycle_end_date}</span> &bull; Expected Bill Date: <span class="font-mono text-brand-400 font-bold">${s.expected_bill_date}</span>
            </p>
          </div>
          <button id="btn-close-cycle-detail" class="text-slate-400 hover:text-white text-sm">✕</button>
        </div>

        <!-- Summary & Auto-Populate -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span class="text-xs text-slate-400">Assigned Transactions</span>
            <div class="text-2xl font-bold text-white">${t.length}</div>
          </div>

          <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span class="text-xs text-slate-400">Total Billed Amount</span>
            <div class="text-2xl font-extrabold text-rose-400 font-mono">${at(s.expected_amount)}</div>
          </div>

          <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div>
              <span class="text-xs text-slate-400">Auto-Assign Transactions</span>
              <p class="text-[10px] text-slate-500 mt-0.5">Assign CC transactions matching this billing window</p>
            </div>
            <button id="btn-auto-populate-cycle" data-id="${s.id}" class="bg-brand-600 hover:bg-brand-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow transition">
              ⚡ Auto-Populate
            </button>
          </div>
        </div>

        <!-- Transactions Table -->
        <div class="space-y-2">
          <h4 class="text-xs font-bold text-slate-300">Cycle Transactions</h4>
          <div class="overflow-x-auto border border-slate-800 rounded-lg max-h-60">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-900 text-slate-400 border-b border-slate-800 sticky top-0">
                <tr>
                  <th class="py-2.5 px-3">Tx Date</th>
                  <th class="py-2.5 px-3">Billing Date</th>
                  <th class="py-2.5 px-3">Payee / Merchant</th>
                  <th class="py-2.5 px-3 text-right">Billed Amount (ILS)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/40">
                ${t.length===0?`
                  <tr><td colspan="4" class="py-4 text-center text-xs text-slate-500">No transactions assigned to this billing cycle yet. Click "Auto-Populate" above.</td></tr>
                `:t.map(e=>`
                  <tr class="hover:bg-slate-900/40">
                    <td class="py-2 px-3 text-slate-300 font-mono">${e.date}</td>
                    <td class="py-2 px-3 text-slate-400 font-mono">${e.billing_date||"-"}</td>
                    <td class="py-2 px-3 font-medium text-white">${e.payee_raw}</td>
                    <td class="py-2 px-3 text-right font-bold font-mono text-rose-400">${at(e.amount)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Bank Payment Candidate Section -->
        <div class="space-y-3 border-t border-slate-800 pt-4">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-xs font-bold text-white">Bank Payment Reconciliation</h4>
              <p class="text-[11px] text-slate-400">Find candidate lump-sum payment debits from bank accounts within ±10 days of expected bill date.</p>
            </div>
            <button id="btn-find-bank-candidates" data-id="${s.id}" class="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 transition">
              🔍 Find Bank Payment Candidates
            </button>
          </div>

          ${de.length>0?`
            <div class="space-y-2">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                ${de.map(e=>`
                  <div class="p-3 rounded-lg border cursor-pointer transition ${Rt===e.id?"border-brand-500 bg-brand-500/10":"border-slate-800 bg-slate-900/40 hover:border-slate-700"} candidate-card" data-txid="${e.id}">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-bold text-white truncate max-w-[160px]">${e.payee_raw}</span>
                      <span class="text-xs font-bold text-rose-400 font-mono">${at(e.amount)}</span>
                    </div>
                    <div class="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                      <span>${e.date} &bull; ${e.account_name||"Bank"}</span>
                      <span class="text-amber-400 font-mono font-semibold">Diff: ${at(Math.abs(Math.abs(e.amount)-Math.abs(s.expected_amount)))}</span>
                    </div>
                  </div>
                `).join("")}
              </div>

              <div class="flex justify-end pt-2">
                <button id="btn-reconcile-cycle-submit" data-id="${s.id}" ${Rt?"":"disabled"} class="px-4 py-2 rounded-lg text-xs font-bold transition ${Rt?"bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/20":"bg-slate-800 text-slate-500 cursor-not-allowed"}">
                  🔗 Link Selected Bank Payment
                </button>
              </div>
            </div>
          `:""}
        </div>
      </div>
    </div>
  `}function Df(){var e;const s=Xt.localai_model||"llama-3-8b",t=Xt.localai_batch_size||"5";return`
    <div class="max-w-2xl mx-auto glass-panel p-8 space-y-6">
      <h2 class="text-2xl font-bold text-white">Application &amp; LocalAI Settings</h2>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-slate-300 mb-1">LocalAI Endpoint URL</label>
          <input type="text" id="setting-localai-url" value="${Xt.localai_url||"http://localhost:8080"}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="block text-xs font-medium text-slate-300">LocalAI Model</label>
            <button id="btn-fetch-models" type="button" class="text-[11px] text-purple-400 hover:text-purple-300 transition flex items-center gap-1 font-semibold">
              🔍 Fetch Available Models
            </button>
          </div>
          <div class="space-y-2">
            <select id="setting-localai-model-select" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500">
              <option value="${s}">${s} (Current / Default)</option>
            </select>
            <input type="text" id="setting-localai-model" value="${s}" placeholder="Or enter custom model name" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
          </div>
          <p class="text-[10px] text-slate-400 mt-1">Query your LocalAI endpoint for available models or type a custom model ID.</p>
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-300 mb-1">LocalAI API Key (optional)</label>
          <input type="password" id="setting-localai-key" value="${Xt.localai_api_key||""}" placeholder="Leave blank if not required" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-300 mb-1">Auto-Categorization Batch Size (Transactions per request)</label>
          <input type="number" id="setting-localai-batch-size" min="1" max="50" value="${t}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
          <p class="text-[10px] text-slate-400 mt-1">Controls how many transactions are sent per micro-batch (1 to 50, default: 5).</p>
        </div>
      </div>

      <div class="pt-4 border-t border-slate-800 flex gap-3">
        <button id="btn-save-settings" class="flex-1 bg-brand-600 hover:bg-brand-500 text-white font-bold py-2.5 rounded-lg shadow-lg shadow-brand-500/20 text-xs transition">
          💾 Save Settings
        </button>
        <button id="btn-test-localai" class="flex-1 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 font-semibold py-2.5 rounded-lg text-xs transition flex items-center justify-center gap-2">
          <span>🔌 Test LocalAI Connection</span>
        </button>
      </div>

      <div class="p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-1">
        <p class="font-bold text-slate-300">Connection Info</p>
        <p>OIDC Enabled: <span class="text-white">${dt!=null&&dt.oidc_enabled?"Yes":"No (Dev Mode)"}</span></p>
        <p>Logged in as: <span class="text-white">${((e=dt==null?void 0:dt.user)==null?void 0:e.name)||"Local Admin"}</span></p>
      </div>
    </div>
  `}function Tf(){var g,m,b,v,M,k,w,E,A,D,I,R,F,z,lt,xt,W,X,J,Et,ht,Gt,Se,Kt,oe,Wt,ae,Ht,ki,Mi,Si,Ci,Ei,Ai,Pi,Di,Ti,Li,Ii,$i,Oi,Bi,Ri,Fi,zi,ji,Ni,Vi,Wi,Hi,Yi,Ui,Xi,qi,Gi,Ki,Ji,Zi,Qi,to,eo,so,no,io,oo,ao,ro,lo,co,ho,uo,fo,po,go,mo,bo,xo,yo,vo,_o,wo,ko,Mo,So,Co,Eo,Ao,Po;document.querySelectorAll(".nav-tab").forEach(x=>{x.addEventListener("click",y=>{const _=y.currentTarget.getAttribute("data-tab");_&&(Ct=_,P())})});const s=()=>{tn=!0,P()},t=()=>{tn=!1,P()};(g=document.getElementById("btn-add-account"))==null||g.addEventListener("click",s),(m=document.getElementById("btn-add-account-empty"))==null||m.addEventListener("click",s),(b=document.getElementById("btn-close-modal"))==null||b.addEventListener("click",t),(v=document.getElementById("btn-cancel-modal"))==null||v.addEventListener("click",t);const e=document.getElementById("form-account");e&&e.addEventListener("submit",async x=>{var S,O;x.preventDefault();const y=document.getElementById("modal-error-msg"),_=document.getElementById("btn-save-account");y&&(y.classList.add("hidden"),y.textContent=""),_&&(_.disabled=!0,_.textContent="Saving...");try{const Y=document.getElementById("acc-name").value,H=document.getElementById("acc-type").value,nt=document.getElementById("acc-institution").value,ut=document.getElementById("acc-currency").value,gt=parseFloat(document.getElementById("acc-balance").value)||0,et=H==="CREDIT_CARD"?parseInt((S=document.getElementById("acc-billing-primary"))==null?void 0:S.value)||10:null,St=H==="CREDIT_CARD"&&((O=document.getElementById("acc-billing-secondary"))!=null&&O.value)&&parseInt(document.getElementById("acc-billing-secondary").value)||null,Lt=await fetch("/api/v1/accounts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:Y,account_type:H,institution:nt,currency:ut,opening_balance:gt,billing_day_primary:et,billing_day_secondary:St})});if(Lt.ok)tn=!1,await q(),P(),T("Account created successfully","success");else{const Ds=(await Lt.json().catch(()=>({}))).error||Lt.statusText||"Failed to create account";y&&(y.textContent=Ds,y.classList.remove("hidden"))}}catch(Y){if(document.getElementById("modal-error-msg")){const H=document.getElementById("modal-error-msg");H.textContent=`Network error: ${Y.message||Y}`,H.classList.remove("hidden")}}finally{_&&(_.disabled=!1,_.textContent="Save Account")}}),document.querySelectorAll(".btn-delete-account").forEach(x=>{x.addEventListener("click",async y=>{const _=y.currentTarget.getAttribute("data-id");if(!_||!confirm("Delete this account? This will NOT delete its transactions."))return;(await fetch(`/api/v1/accounts/${_}`,{method:"DELETE"})).ok?(await q(),P(),T("Account deleted","success")):T("Failed to delete account","error")})});const n=()=>{us=!0,te=null,P()},i=()=>{us=!1,te=null,P()};(M=document.getElementById("btn-add-category"))==null||M.addEventListener("click",n),(k=document.getElementById("btn-add-category-empty"))==null||k.addEventListener("click",n),(w=document.getElementById("btn-close-cat-modal"))==null||w.addEventListener("click",i),(E=document.getElementById("btn-cancel-cat-modal"))==null||E.addEventListener("click",i),document.querySelectorAll(".btn-edit-cat").forEach(x=>{x.addEventListener("click",y=>{const _=y.currentTarget.getAttribute("data-id"),S=wt.find(O=>O.id===_);S&&(te=S,us=!1,P())})}),document.querySelectorAll(".btn-delete-cat").forEach(x=>{x.addEventListener("click",async y=>{const _=y.currentTarget.getAttribute("data-id");if(!_||!confirm("Delete this category? Transactions linked to it will become Uncategorized."))return;(await fetch(`/api/v1/categories/${_}`,{method:"DELETE"})).ok?(await q(),P(),T("Category deleted","success")):T("Failed to delete category","error")})});const o=document.getElementById("form-category");o&&o.addEventListener("submit",async x=>{x.preventDefault();const y=document.getElementById("cat-modal-error"),_=document.getElementById("btn-save-category");y&&(y.classList.add("hidden"),y.textContent=""),_&&(_.disabled=!0,_.textContent="Saving...");try{const S=document.getElementById("cat-name-en").value.trim(),O=document.getElementById("cat-name-he").value.trim(),Y=document.getElementById("cat-type").value,H=document.getElementById("cat-color").value,nt=document.getElementById("cat-icon").value.trim()||"tag",ut=document.getElementById("cat-budget").value,gt=ut?parseFloat(ut):null;if(!S){y&&(y.textContent="English name is required",y.classList.remove("hidden"));return}const et={name_en:S,name_he:O||S,category_type:Y,color_hex:H,icon:nt,monthly_budget:gt},St=te!==null,Lt=St?`/api/v1/categories/${te.id}`:"/api/v1/categories",Ds=await fetch(Lt,{method:St?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(et)});if(Ds.ok)us=!1,te=null,await q(),P(),T(St?"Category updated":"Category created","success");else{const Zr=await Ds.json().catch(()=>({}));y&&(y.textContent=Zr.error||"Save failed",y.classList.remove("hidden"))}}finally{_&&(_.disabled=!1,_.textContent=te?"Update Category":"Create Category")}}),(A=document.getElementById("btn-reset-wizard"))==null||A.addEventListener("click",()=>{vt=0,He=null,Z=null,ct=null,Dt=null,P()}),(D=document.getElementById("btn-w0-next"))==null||D.addEventListener("click",async()=>{var O;const x=document.getElementById("w0-account-id"),y=document.getElementById("w0-file");if(!(x!=null&&x.value)){T("Please select a target account","error");return}const _=((O=y==null?void 0:y.files)==null?void 0:O[0])||He;if(!_){T("Please select a CSV file to inspect","error");return}sn=x.value,He=_;const S=document.getElementById("btn-w0-next");S&&(S.disabled=!0,S.innerText="⏳ Inspecting CSV...");try{const Y=new FormData;Y.append("file",_);const H=await fetch("/api/v1/import/inspect",{method:"POST",body:Y});if(H.ok){Z=await H.json();const nt=(Z==null?void 0:Z.columns)||[],ut=St=>nt.find(Lt=>St.some(Qe=>Lt.toLowerCase().includes(Qe)))||nt[0]||"",gt=St=>nt.find(Lt=>St.some(Qe=>Lt.toLowerCase().includes(Qe)))||"";$.date_col=ut(["תאריך","date"]);const et=nt.filter(St=>["תיאור","payee","merchant","name","פרטים","description","extended","הרחבה","פירוט"].some(Lt=>St.toLowerCase().includes(Lt)));$.payee_col=et[0]||ut(["תיאור","payee","merchant","name","פרטים"]),$.payee_col_2=et.length>1?et[1]:"",$.amount_col=ut(["סכום","amount","total"]),$.debit_col=ut(["חיוב","debit"]),$.credit_col=ut(["זיכוי","credit"]),$.billing_date_col=gt(["תאריך חיוב","billing_date","billing date","chiyuv"]),$.original_amount_col=gt(["סכום מקורי","original_amount","original amount","mekori"]),$.original_currency_col=gt(["מטבע מקורי","original_currency","original currency","matbea"]),vt=1,P(),T(`Identified ${nt.length} columns & ${Z==null?void 0:Z.total_rows} rows`,"success")}else{const nt=await H.json().catch(()=>({}));T(nt.error||"Failed to inspect CSV file","error")}}catch{T("Network error inspecting CSV file","error")}finally{S&&(S.disabled=!1,S.innerText="Step 1: Inspect Columns & Load Preview →")}}),(I=document.getElementById("radio-mode-single"))==null||I.addEventListener("change",()=>{var x,y;$.amount_mode="amount",(x=document.getElementById("w1-single-amount-block"))==null||x.classList.remove("hidden"),(y=document.getElementById("w1-split-amount-block"))==null||y.classList.add("hidden")}),(R=document.getElementById("radio-mode-split"))==null||R.addEventListener("change",()=>{var x,y;$.amount_mode="debit_credit",(x=document.getElementById("w1-single-amount-block"))==null||x.classList.add("hidden"),(y=document.getElementById("w1-split-amount-block"))==null||y.classList.remove("hidden")}),(F=document.getElementById("btn-w1-back"))==null||F.addEventListener("click",()=>{vt=0,P()}),(z=document.getElementById("btn-w1-next"))==null||z.addEventListener("click",async()=>{var y,_,S,O,Y,H,nt,ut,gt;if(!He||!sn)return;$.date_col=((y=document.getElementById("w1-date-col"))==null?void 0:y.value)||$.date_col,$.payee_col=((_=document.getElementById("w1-payee-col"))==null?void 0:_.value)||$.payee_col,$.payee_col_2=((S=document.getElementById("w1-payee-col-2"))==null?void 0:S.value)||"",$.amount_mode==="amount"?$.amount_col=((O=document.getElementById("w1-amount-col"))==null?void 0:O.value)||$.amount_col:($.debit_col=((Y=document.getElementById("w1-debit-col"))==null?void 0:Y.value)||$.debit_col,$.credit_col=((H=document.getElementById("w1-credit-col"))==null?void 0:H.value)||$.credit_col),$.billing_date_col=((nt=document.getElementById("w1-billing-date-col"))==null?void 0:nt.value)||"",$.original_amount_col=((ut=document.getElementById("w1-orig-amount-col"))==null?void 0:ut.value)||"",$.original_currency_col=((gt=document.getElementById("w1-orig-currency-col"))==null?void 0:gt.value)||"";const x=document.getElementById("btn-w1-next");x&&(x.disabled=!0,x.innerText="⏳ Parsing Preview...");try{const et=new FormData;et.append("file",He),et.append("account_id",sn),et.append("date_column",$.date_col),et.append("payee_column",$.payee_col),$.payee_col_2&&et.append("payee_column_2",$.payee_col_2),$.amount_mode==="amount"?et.append("amount_column",$.amount_col):(et.append("debit_column",$.debit_col),et.append("credit_column",$.credit_col)),$.billing_date_col&&et.append("billing_date_column",$.billing_date_col),$.original_amount_col&&et.append("original_amount_column",$.original_amount_col),$.original_currency_col&&et.append("original_currency_column",$.original_currency_col);const St=await fetch("/api/v1/import/stage",{method:"POST",body:et});if(St.ok)ct=await St.json(),vt=3,P();else{const Lt=await St.json().catch(()=>({}));T(Lt.error||"Failed to parse CSV preview","error")}}catch{T("Network error generating preview","error")}finally{x&&(x.disabled=!1,x.innerText="Step 3: Preview Transactions Mapping →")}}),(lt=document.getElementById("btn-w3-back"))==null||lt.addEventListener("click",()=>{vt=1,P()}),(xt=document.getElementById("btn-w3-next"))==null||xt.addEventListener("click",()=>{vt=4,P()}),(W=document.getElementById("btn-w4-back"))==null||W.addEventListener("click",()=>{vt=1,P()}),(X=document.getElementById("btn-w4-commit"))==null||X.addEventListener("click",async()=>{if(!ct||ct.passed_transactions.length===0){T("No valid transactions to commit","error");return}const x=document.getElementById("btn-w4-commit");x&&(x.disabled=!0,x.innerText="⏳ Saving to Database...");try{const y=await fetch("/api/v1/import/commit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({transactions:ct.passed_transactions})});if(y.ok)Dt=await y.json(),vt=5,await q(),P(),T(`Successfully imported ${Dt==null?void 0:Dt.imported} transactions`,"success");else{const _=await y.json().catch(()=>({}));T(_.error||"Failed to commit import to database","error")}}catch{T("Network error committing import","error")}finally{x&&(x.disabled=!1)}}),(J=document.getElementById("btn-w5-view-txs"))==null||J.addEventListener("click",()=>{Ct="transactions",P()}),(Et=document.getElementById("btn-w5-again"))==null||Et.addEventListener("click",()=>{vt=0,He=null,Z=null,ct=null,Dt=null,P()}),(ht=document.getElementById("cycle-account-filter"))==null||ht.addEventListener("change",async x=>{fn=x.currentTarget.value,await ce(),P()}),(Gt=document.getElementById("cycle-status-filter"))==null||Gt.addEventListener("change",async x=>{Oe=x.currentTarget.value,await ce(),P()}),(Se=document.getElementById("btn-open-generate-modal"))==null||Se.addEventListener("click",()=>{fs=!0,P()}),(Kt=document.getElementById("btn-close-generate-modal"))==null||Kt.addEventListener("click",()=>{fs=!1,P()}),(oe=document.getElementById("btn-cancel-generate-modal"))==null||oe.addEventListener("click",()=>{fs=!1,P()}),(Wt=document.getElementById("form-generate-cycles"))==null||Wt.addEventListener("submit",async x=>{x.preventDefault();const y=document.getElementById("gen-account-id").value,_=document.getElementById("gen-from-month").value,S=document.getElementById("gen-to-month").value,O=document.getElementById("btn-submit-generate");O&&(O.disabled=!0,O.innerText="Generating...");try{const Y=await fetch("/api/v1/billing-cycles/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({account_id:y,from_month:_,to_month:S})});if(Y.ok)fs=!1,await ce(),P(),T("Billing cycles generated successfully","success");else{const H=await Y.json().catch(()=>({}));T(H.error||"Failed to generate cycles","error")}}catch{T("Network error generating cycles","error")}finally{O&&(O.disabled=!1)}}),document.querySelectorAll(".btn-view-cycle").forEach(x=>{x.addEventListener("click",async y=>{const _=y.currentTarget.getAttribute("data-id");if(_)try{const S=await fetch(`/api/v1/billing-cycles/${_}`);S.ok?(he=await S.json(),de=[],Rt="",P()):T("Failed to load cycle detail","error")}catch{T("Network error loading cycle detail","error")}})}),(ae=document.getElementById("btn-close-cycle-detail"))==null||ae.addEventListener("click",()=>{he=null,de=[],Rt="",P()}),(Ht=document.getElementById("btn-auto-populate-cycle"))==null||Ht.addEventListener("click",async x=>{const y=x.currentTarget.getAttribute("data-id");if(y)try{const _=await fetch(`/api/v1/billing-cycles/${y}/auto-populate`,{method:"POST"});if(_.ok){const S=await _.json();T(`Auto-assigned ${S.assigned_count} transactions`,"success");const O=await fetch(`/api/v1/billing-cycles/${y}`);O.ok&&(he=await O.json()),await ce(),P()}else{const S=await _.json().catch(()=>({}));T(S.error||"Auto-populate failed","error")}}catch{T("Network error auto-populating cycle","error")}}),(ki=document.getElementById("btn-find-bank-candidates"))==null||ki.addEventListener("click",async x=>{const y=x.currentTarget.getAttribute("data-id");if(y)try{const _=await fetch(`/api/v1/billing-cycles/${y}/bank-candidates`);_.ok?(de=await _.json()||[],Rt="",de.length===0&&T("No bank payment candidates found within ±10 days","info"),P()):T("Failed to find bank payment candidates","error")}catch{T("Network error searching bank candidates","error")}}),document.querySelectorAll(".candidate-card").forEach(x=>{x.addEventListener("click",y=>{const _=y.currentTarget.getAttribute("data-txid");_&&(Rt=_,P())})}),(Mi=document.getElementById("btn-reconcile-cycle-submit"))==null||Mi.addEventListener("click",async x=>{const y=x.currentTarget.getAttribute("data-id");if(!(!y||!Rt))try{const _=await fetch(`/api/v1/billing-cycles/${y}/reconcile`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bank_transaction_id:Rt})});if(_.ok)T("Cycle reconciled with bank payment!","success"),he=null,de=[],Rt="",await ce(),await q(),P();else{const S=await _.json().catch(()=>({}));T(S.error||"Reconciliation failed","error")}}catch{T("Network error reconciling cycle","error")}}),document.querySelectorAll(".btn-reconcile-cycle").forEach(x=>{x.addEventListener("click",async y=>{const _=y.currentTarget.getAttribute("data-id");if(_)try{const S=await fetch(`/api/v1/billing-cycles/${_}`);if(S.ok){he=await S.json();const O=await fetch(`/api/v1/billing-cycles/${_}/bank-candidates`);O.ok&&(de=await O.json()||[]),Rt="",P()}}catch{T("Network error loading cycle","error")}})}),document.querySelectorAll(".btn-unlink-cycle").forEach(x=>{x.addEventListener("click",async y=>{const _=y.currentTarget.getAttribute("data-id");if(_&&confirm("Unlink this bank payment from the billing cycle?"))try{(await fetch(`/api/v1/billing-cycles/${_}/unlink`,{method:"POST"})).ok?(T("Billing cycle unlinked","success"),await ce(),await q(),P()):T("Failed to unlink cycle","error")}catch{T("Network error unlinking cycle","error")}})}),document.querySelectorAll(".btn-delete-cycle").forEach(x=>{x.addEventListener("click",async y=>{const _=y.currentTarget.getAttribute("data-id");if(_&&confirm("Delete this billing cycle?"))try{(await fetch(`/api/v1/billing-cycles/${_}`,{method:"DELETE"})).ok?(T("Billing cycle deleted","success"),await ce(),P()):T("Failed to delete cycle","error")}catch{T("Network error deleting cycle","error")}})}),(Si=document.getElementById("btn-fetch-models"))==null||Si.addEventListener("click",async()=>{var H,nt;const x=document.getElementById("btn-fetch-models"),y=(H=document.getElementById("setting-localai-url"))==null?void 0:H.value,_=(nt=document.getElementById("setting-localai-key"))==null?void 0:nt.value,S=document.getElementById("setting-localai-model-select"),O=document.getElementById("setting-localai-model"),Y=x.innerHTML;x.innerHTML="⏳ Fetching models...",x.disabled=!0;try{const ut=await fetch("/api/v1/categorize/localai/models",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({localai_url:y,localai_api_key:_})}),gt=await ut.json();ut.ok&&gt.models&&Array.isArray(gt.models)&&gt.models.length>0?(S&&(S.innerHTML=gt.models.map(et=>`<option value="${et}">${et}</option>`).join(""),O&&(O.value=gt.models[0])),T(`Fetched ${gt.models.length} available model(s)`,"success")):T(`Could not fetch models: ${gt.error||"No models returned"}`,"error")}catch{T("Network error fetching models from server","error")}finally{x.innerHTML=Y,x.disabled=!1}}),(Ci=document.getElementById("setting-localai-model-select"))==null||Ci.addEventListener("change",x=>{const y=x.target.value,_=document.getElementById("setting-localai-model");_&&(_.value=y)}),(Ei=document.getElementById("btn-save-settings"))==null||Ei.addEventListener("click",async()=>{const x=document.getElementById("setting-localai-url").value,y=document.getElementById("setting-localai-model").value,_=document.getElementById("setting-localai-key").value,S=document.getElementById("setting-localai-batch-size").value||"5";(await fetch("/api/v1/settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({localai_url:x,localai_model:y,localai_api_key:_,localai_batch_size:S})})).ok?(Xt={...Xt,localai_url:x,localai_model:y,localai_api_key:_,localai_batch_size:S},T("Settings saved successfully","success"),P()):T("Failed to save settings","error")}),(Ai=document.getElementById("btn-test-localai"))==null||Ai.addEventListener("click",async()=>{var O,Y,H;const x=document.getElementById("btn-test-localai"),y=(O=document.getElementById("setting-localai-url"))==null?void 0:O.value,_=(Y=document.getElementById("setting-localai-model"))==null?void 0:Y.value,S=(H=document.getElementById("setting-localai-key"))==null?void 0:H.value;x.innerHTML="⏳ Testing connection...",x.disabled=!0;try{const nt=await fetch("/api/v1/categorize/localai/test",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({localai_url:y,localai_model:_,localai_api_key:S})}),ut=await nt.json();nt.ok?T(ut.message||"Connection successful!","success"):T(`LocalAI Test Error: ${ut.error||nt.statusText}`,"error")}catch{T("Network error testing LocalAI connection","error")}finally{x.innerHTML="🔌 Test LocalAI Connection",x.disabled=!1}});const a=async()=>{try{const x=await fetch("/api/v1/categorize/status");if(!x.ok)return;const y=await x.json(),_=bt.running;bt=y,y.running?Ct==="autocat"&&P():(os&&(clearInterval(os),os=null),_&&(y.canceled?T("Categorization run canceled by user","info"):y.last_error?T(`Categorization run stopped: ${y.last_error}`,"error"):y.total>0&&T(`Finished categorizing ${y.processed} transactions!`,"success"),await q(),P()))}catch{}};(Pi=document.getElementById("btn-trigger-ai"))==null||Pi.addEventListener("click",()=>{Ct="autocat",P()}),(Di=document.getElementById("btn-start-autocat"))==null||Di.addEventListener("click",async()=>{try{const x=await fetch("/api/v1/categorize/start",{method:"POST"}),y=await x.json().catch(()=>({}));x.ok||x.status===202?(bt=y,y.total===0?T("No uncategorized transactions to process","info"):(T(`Auto-categorization started (${y.total} transactions across ${y.total_batches} batches)`,"info"),os||(os=setInterval(a,2e3))),P()):T(`Failed to start categorization: ${y.error||x.statusText}`,"error")}catch(x){T(`Error starting categorization: ${x.message||x}`,"error")}}),(Ti=document.getElementById("btn-cancel-autocat"))==null||Ti.addEventListener("click",async()=>{try{const x=await fetch("/api/v1/categorize/cancel",{method:"POST"});x.ok&&(bt=await x.json(),T("Categorization run cancel signal sent","info"),P())}catch(x){T(`Error canceling categorization: ${x.message||x}`,"error")}}),(Li=document.getElementById("btn-save-prompt"))==null||Li.addEventListener("click",async()=>{const x=document.getElementById("autocat-prompt-input");if(!x)return;const y=x.value;try{(await fetch("/api/v1/categorize/prompt",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:y})})).ok?(ys=y,T("System prompt parameters saved","success")):T("Failed to save prompt parameters","error")}catch{T("Error saving prompt parameters","error")}}),(Ii=document.getElementById("btn-reset-prompt"))==null||Ii.addEventListener("click",async()=>{try{const x=await fetch("/api/v1/categorize/prompt/reset",{method:"POST"});if(x.ok){ys=(await x.json()).prompt||Kr;const _=document.getElementById("autocat-prompt-input");_&&(_.value=ys),T("System prompt reset to default","info")}}catch{T("Error resetting prompt","error")}}),document.querySelectorAll(".btn-view-batch-results").forEach(x=>{x.addEventListener("click",y=>{const _=y.currentTarget.getAttribute("data-batch-idx");if(_!==null&&bt.batches){const S=parseInt(_,10);S>=0&&S<bt.batches.length&&($e=bt.batches[S],P())}})}),($i=document.getElementById("btn-close-batch-modal"))==null||$i.addEventListener("click",()=>{$e=null,P()}),(Oi=document.getElementById("btn-nav-settings"))==null||Oi.addEventListener("click",()=>{Ct="settings",P()}),document.querySelectorAll(".btn-accept-suggestion").forEach(x=>{x.addEventListener("click",async y=>{const _=y.currentTarget.getAttribute("data-txid");if(!_)return;(await fetch("/api/v1/categories/accept-suggestion",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({transaction_id:_})})).ok?(await q(),P(),T("Category suggestion accepted","success")):T("Failed to accept suggestion","error")})}),document.querySelectorAll(".btn-reject-suggestion").forEach(x=>{x.addEventListener("click",async y=>{const _=y.currentTarget.getAttribute("data-txid");if(!_)return;(await fetch("/api/v1/categories/reject-suggestion",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({transaction_id:_})})).ok?(await q(),P(),T("Category suggestion rejected","info")):T("Failed to reject suggestion","error")})}),document.querySelectorAll(".tx-cat-select").forEach(x=>{x.addEventListener("change",async y=>{const _=y.currentTarget,S=_.getAttribute("data-txid"),O=_.value||null;if(!S)return;(await fetch(`/api/v1/transactions/${S}/category`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({category_id:O,categorized_by:O?"MANUAL":"UNSET",is_reviewed:!!O})})).ok?(await q(),P(),T(O?"Category updated":"Category cleared","success")):T("Failed to update category","error")})}),(Bi=document.getElementById("widget-acc-cashflow"))==null||Bi.addEventListener("change",async x=>{L.cashflowAcc=x.target.value,await q(),P()});const r=async()=>{const x=document.getElementById("widget-cashflow-from"),y=document.getElementById("widget-cashflow-to");if(!x||!y)return;const _=x.value,S=y.value;_&&S&&(_!==L.cashflowFromMonth||S!==L.cashflowToMonth)&&(L.cashflowFromMonth=_,L.cashflowToMonth=S,await q(),P())};(Ri=document.getElementById("widget-cashflow-from"))==null||Ri.addEventListener("change",r),(Fi=document.getElementById("widget-cashflow-from"))==null||Fi.addEventListener("input",r),(zi=document.getElementById("widget-cashflow-to"))==null||zi.addEventListener("change",r),(ji=document.getElementById("widget-cashflow-to"))==null||ji.addEventListener("input",r);const l=async x=>{const y=new Date,_=y.getFullYear(),S=String(y.getMonth()+1).padStart(2,"0");L.cashflowToMonth=`${_}-${S}`;const O=new Date(y.getFullYear(),y.getMonth()-(x-1),1),Y=O.getFullYear(),H=String(O.getMonth()+1).padStart(2,"0");L.cashflowFromMonth=`${Y}-${H}`,await q(),P()};(Ni=document.getElementById("btn-cashflow-preset-3m"))==null||Ni.addEventListener("click",()=>l(3)),(Vi=document.getElementById("btn-cashflow-preset-6m"))==null||Vi.addEventListener("click",()=>l(6)),(Wi=document.getElementById("btn-cashflow-preset-12m"))==null||Wi.addEventListener("click",()=>l(12)),(Hi=document.getElementById("widget-acc-donut"))==null||Hi.addEventListener("change",async x=>{L.donutAcc=x.target.value,await q(),P()});const c=async()=>{const x=document.getElementById("widget-donut-from"),y=document.getElementById("widget-donut-to");if(!x||!y)return;const _=x.value,S=y.value;_&&S&&(_!==L.donutFromMonth||S!==L.donutToMonth)&&(L.donutFromMonth=_,L.donutToMonth=S,await q(),P())};(Yi=document.getElementById("widget-donut-from"))==null||Yi.addEventListener("change",c),(Ui=document.getElementById("widget-donut-from"))==null||Ui.addEventListener("input",c),(Xi=document.getElementById("widget-donut-to"))==null||Xi.addEventListener("change",c),(qi=document.getElementById("widget-donut-to"))==null||qi.addEventListener("input",c);const d=async x=>{const y=new Date,_=y.getFullYear(),S=String(y.getMonth()+1).padStart(2,"0");L.donutToMonth=`${_}-${S}`;const O=new Date(y.getFullYear(),y.getMonth()-(x-1),1),Y=O.getFullYear(),H=String(O.getMonth()+1).padStart(2,"0");L.donutFromMonth=`${Y}-${H}`,await q(),P()};(Gi=document.getElementById("btn-donut-preset-3m"))==null||Gi.addEventListener("click",()=>d(3)),(Ki=document.getElementById("btn-donut-preset-6m"))==null||Ki.addEventListener("click",()=>d(6)),(Ji=document.getElementById("btn-donut-preset-12m"))==null||Ji.addEventListener("click",()=>d(12));const h=async()=>{const x=document.getElementById("widget-networth-from"),y=document.getElementById("widget-networth-to");if(!x||!y)return;const _=x.value,S=y.value;_&&S&&(_!==L.networthFromMonth||S!==L.networthToMonth)&&(L.networthFromMonth=_,L.networthToMonth=S,await q(),P())};(Zi=document.getElementById("widget-networth-from"))==null||Zi.addEventListener("change",h),(Qi=document.getElementById("widget-networth-from"))==null||Qi.addEventListener("input",h),(to=document.getElementById("widget-networth-to"))==null||to.addEventListener("change",h),(eo=document.getElementById("widget-networth-to"))==null||eo.addEventListener("input",h);const u=async x=>{const y=new Date,_=y.getFullYear(),S=String(y.getMonth()+1).padStart(2,"0");L.networthToMonth=`${_}-${S}`;const O=new Date(y.getFullYear(),y.getMonth()-(x-1),1),Y=O.getFullYear(),H=String(O.getMonth()+1).padStart(2,"0");L.networthFromMonth=`${Y}-${H}`,await q(),P()};(so=document.getElementById("btn-networth-preset-3m"))==null||so.addEventListener("click",()=>u(3)),(no=document.getElementById("btn-networth-preset-6m"))==null||no.addEventListener("click",()=>u(6)),(io=document.getElementById("btn-networth-preset-12m"))==null||io.addEventListener("click",()=>u(12)),(oo=document.getElementById("widget-acc-payoff"))==null||oo.addEventListener("change",async x=>{L.payoffAcc=x.target.value,await q(),P()}),(ao=document.getElementById("widget-acc-budget"))==null||ao.addEventListener("change",async x=>{L.budgetAcc=x.target.value,await q(),P()}),(ro=document.getElementById("widget-acc-subscriptions"))==null||ro.addEventListener("change",async x=>{L.subscriptionsAcc=x.target.value,await q(),P()}),(lo=document.getElementById("widget-acc-mom"))==null||lo.addEventListener("change",async x=>{L.momAcc=x.target.value,await q(),P()});const f=async()=>{const x=document.getElementById("widget-mom-from"),y=document.getElementById("widget-mom-to");if(!x||!y)return;const _=x.value,S=y.value;_&&S&&(_!==L.momFromMonth||S!==L.momToMonth)&&(L.momFromMonth=_,L.momToMonth=S,await q(),P())};(co=document.getElementById("widget-mom-from"))==null||co.addEventListener("change",f),(ho=document.getElementById("widget-mom-from"))==null||ho.addEventListener("input",f),(uo=document.getElementById("widget-mom-to"))==null||uo.addEventListener("change",f),(fo=document.getElementById("widget-mom-to"))==null||fo.addEventListener("input",f);const p=async x=>{const y=new Date,_=y.getFullYear(),S=String(y.getMonth()+1).padStart(2,"0");L.momToMonth=`${_}-${S}`;const O=new Date(y.getFullYear(),y.getMonth()-(x-1),1),Y=O.getFullYear(),H=String(O.getMonth()+1).padStart(2,"0");L.momFromMonth=`${Y}-${H}`,await q(),P()};(po=document.getElementById("btn-mom-preset-3m"))==null||po.addEventListener("click",()=>p(3)),(go=document.getElementById("btn-mom-preset-6m"))==null||go.addEventListener("click",()=>p(6)),(mo=document.getElementById("btn-mom-preset-12m"))==null||mo.addEventListener("click",()=>p(12)),(bo=document.getElementById("tx-filter-account"))==null||bo.addEventListener("change",async x=>{ve=x.target.value,it=0,await Pt(),P()}),(xo=document.getElementById("tx-filter-type"))==null||xo.addEventListener("change",async x=>{if(ft=x.target.value,ft){const y=new Set(wt.filter(_=>_.category_type===ft).map(_=>_.id));ot=ot.filter(_=>y.has(_))}it=0,await Pt(),P()}),(yo=document.getElementById("btn-toggle-cat-dropdown"))==null||yo.addEventListener("click",x=>{x.stopPropagation(),Le=!Le,P()}),(vo=document.getElementById("btn-select-all-cats"))==null||vo.addEventListener("click",async x=>{x.stopPropagation(),ot=(ft?wt.filter(_=>_.category_type===ft):wt).map(_=>_.id),it=0,await Pt(),P()}),(_o=document.getElementById("btn-clear-all-cats"))==null||_o.addEventListener("click",async x=>{x.stopPropagation(),ot=[],it=0,await Pt(),P()}),document.querySelectorAll(".chk-category-filter").forEach(x=>{x.addEventListener("change",async y=>{y.stopPropagation();const _=y.currentTarget,S=_.getAttribute("data-cat-id");S&&(_.checked?ot.includes(S)||ot.push(S):ot=ot.filter(O=>O!==S),it=0,await Pt(),P())})}),document.querySelectorAll(".btn-remove-cat-filter").forEach(x=>{x.addEventListener("click",async y=>{const _=y.currentTarget.getAttribute("data-cat-id");_&&(ot=ot.filter(S=>S!==_),it=0,await Pt(),P())})}),(wo=document.getElementById("btn-clear-cat-pills"))==null||wo.addEventListener("click",async()=>{ot=[],it=0,await Pt(),P()}),(ko=document.getElementById("tx-filter-start"))==null||ko.addEventListener("change",async x=>{_e=x.target.value,it=0,await Pt(),P()}),(Mo=document.getElementById("tx-filter-end"))==null||Mo.addEventListener("change",async x=>{we=x.target.value,it=0,await Pt(),P()}),(So=document.getElementById("tx-filter-search"))==null||So.addEventListener("change",async x=>{ke=x.target.value,it=0,await Pt(),P()}),(Co=document.getElementById("btn-tx-clear-filters"))==null||Co.addEventListener("click",async()=>{ve="",ft="",ot=[],_e="",we="",ke="",Le=!1,it=0,await Pt(),P()}),(Eo=document.getElementById("tx-page-size"))==null||Eo.addEventListener("change",async x=>{Ft=parseInt(x.target.value)||25,it=0,await Pt(),P()}),(Ao=document.getElementById("btn-tx-prev"))==null||Ao.addEventListener("click",async()=>{it>0&&(it--,await Pt(),P())}),(Po=document.getElementById("btn-tx-next"))==null||Po.addEventListener("click",async()=>{(it+1)*Ft<Ge&&(it++,await Pt(),P())}),document.addEventListener("click",x=>{const y=document.getElementById("tx-cat-dropdown-panel"),_=document.getElementById("btn-toggle-cat-dropdown");if(Le&&y&&_){const S=x.target;!y.contains(S)&&!_.contains(S)&&(Le=!1,P())}})}document.addEventListener("DOMContentLoaded",mf);
