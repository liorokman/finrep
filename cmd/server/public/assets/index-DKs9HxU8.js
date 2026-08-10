var sl=Object.defineProperty;var nl=(s,t,e)=>t in s?sl(s,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):s[t]=e;var C=(s,t,e)=>nl(s,typeof t!="symbol"?t+"":t,e);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))n(i);new MutationObserver(i=>{for(const o of i)if(o.type==="childList")for(const a of o.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function e(i){const o={};return i.integrity&&(o.integrity=i.integrity),i.referrerPolicy&&(o.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?o.credentials="include":i.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function n(i){if(i.ep)return;i.ep=!0;const o=e(i);fetch(i.href,o)}})();/*!
 * @kurkle/color v0.3.4
 * https://github.com/kurkle/color#readme
 * (c) 2024 Jukka Kurkela
 * Released under the MIT License
 */function Ts(s){return s+.5|0}const pe=(s,t,e)=>Math.max(Math.min(s,e),t);function ls(s){return pe(Ts(s*2.55),0,255)}function ye(s){return pe(Ts(s*255),0,255)}function se(s){return pe(Ts(s/2.55)/100,0,1)}function Io(s){return pe(Ts(s*100),0,100)}const Ot={0:0,1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,A:10,B:11,C:12,D:13,E:14,F:15,a:10,b:11,c:12,d:13,e:14,f:15},Nn=[..."0123456789ABCDEF"],il=s=>Nn[s&15],ol=s=>Nn[(s&240)>>4]+Nn[s&15],Is=s=>(s&240)>>4===(s&15),al=s=>Is(s.r)&&Is(s.g)&&Is(s.b)&&Is(s.a);function rl(s){var t=s.length,e;return s[0]==="#"&&(t===4||t===5?e={r:255&Ot[s[1]]*17,g:255&Ot[s[2]]*17,b:255&Ot[s[3]]*17,a:t===5?Ot[s[4]]*17:255}:(t===7||t===9)&&(e={r:Ot[s[1]]<<4|Ot[s[2]],g:Ot[s[3]]<<4|Ot[s[4]],b:Ot[s[5]]<<4|Ot[s[6]],a:t===9?Ot[s[7]]<<4|Ot[s[8]]:255})),e}const ll=(s,t)=>s<255?t(s):"";function cl(s){var t=al(s)?il:ol;return s?"#"+t(s.r)+t(s.g)+t(s.b)+ll(s.a,t):void 0}const dl=/^(hsla?|hwb|hsv)\(\s*([-+.e\d]+)(?:deg)?[\s,]+([-+.e\d]+)%[\s,]+([-+.e\d]+)%(?:[\s,]+([-+.e\d]+)(%)?)?\s*\)$/;function er(s,t,e){const n=t*Math.min(e,1-e),i=(o,a=(o+s/30)%12)=>e-n*Math.max(Math.min(a-3,9-a,1),-1);return[i(0),i(8),i(4)]}function hl(s,t,e){const n=(i,o=(i+s/60)%6)=>e-e*t*Math.max(Math.min(o,4-o,1),0);return[n(5),n(3),n(1)]}function ul(s,t,e){const n=er(s,1,.5);let i;for(t+e>1&&(i=1/(t+e),t*=i,e*=i),i=0;i<3;i++)n[i]*=1-t-e,n[i]+=t;return n}function fl(s,t,e,n,i){return s===i?(t-e)/n+(t<e?6:0):t===i?(e-s)/n+2:(s-t)/n+4}function li(s){const e=s.r/255,n=s.g/255,i=s.b/255,o=Math.max(e,n,i),a=Math.min(e,n,i),r=(o+a)/2;let l,c,d;return o!==a&&(d=o-a,c=r>.5?d/(2-o-a):d/(o+a),l=fl(e,n,i,d,o),l=l*60+.5),[l|0,c||0,r]}function ci(s,t,e,n){return(Array.isArray(t)?s(t[0],t[1],t[2]):s(t,e,n)).map(ye)}function di(s,t,e){return ci(er,s,t,e)}function pl(s,t,e){return ci(ul,s,t,e)}function gl(s,t,e){return ci(hl,s,t,e)}function sr(s){return(s%360+360)%360}function ml(s){const t=dl.exec(s);let e=255,n;if(!t)return;t[5]!==n&&(e=t[6]?ls(+t[5]):ye(+t[5]));const i=sr(+t[2]),o=+t[3]/100,a=+t[4]/100;return t[1]==="hwb"?n=pl(i,o,a):t[1]==="hsv"?n=gl(i,o,a):n=di(i,o,a),{r:n[0],g:n[1],b:n[2],a:e}}function bl(s,t){var e=li(s);e[0]=sr(e[0]+t),e=di(e),s.r=e[0],s.g=e[1],s.b=e[2]}function xl(s){if(!s)return;const t=li(s),e=t[0],n=Io(t[1]),i=Io(t[2]);return s.a<255?`hsla(${e}, ${n}%, ${i}%, ${se(s.a)})`:`hsl(${e}, ${n}%, ${i}%)`}const $o={x:"dark",Z:"light",Y:"re",X:"blu",W:"gr",V:"medium",U:"slate",A:"ee",T:"ol",S:"or",B:"ra",C:"lateg",D:"ights",R:"in",Q:"turquois",E:"hi",P:"ro",O:"al",N:"le",M:"de",L:"yello",F:"en",K:"ch",G:"arks",H:"ea",I:"ightg",J:"wh"},Oo={OiceXe:"f0f8ff",antiquewEte:"faebd7",aqua:"ffff",aquamarRe:"7fffd4",azuY:"f0ffff",beige:"f5f5dc",bisque:"ffe4c4",black:"0",blanKedOmond:"ffebcd",Xe:"ff",XeviTet:"8a2be2",bPwn:"a52a2a",burlywood:"deb887",caMtXe:"5f9ea0",KartYuse:"7fff00",KocTate:"d2691e",cSO:"ff7f50",cSnflowerXe:"6495ed",cSnsilk:"fff8dc",crimson:"dc143c",cyan:"ffff",xXe:"8b",xcyan:"8b8b",xgTMnPd:"b8860b",xWay:"a9a9a9",xgYF:"6400",xgYy:"a9a9a9",xkhaki:"bdb76b",xmagFta:"8b008b",xTivegYF:"556b2f",xSange:"ff8c00",xScEd:"9932cc",xYd:"8b0000",xsOmon:"e9967a",xsHgYF:"8fbc8f",xUXe:"483d8b",xUWay:"2f4f4f",xUgYy:"2f4f4f",xQe:"ced1",xviTet:"9400d3",dAppRk:"ff1493",dApskyXe:"bfff",dimWay:"696969",dimgYy:"696969",dodgerXe:"1e90ff",fiYbrick:"b22222",flSOwEte:"fffaf0",foYstWAn:"228b22",fuKsia:"ff00ff",gaRsbSo:"dcdcdc",ghostwEte:"f8f8ff",gTd:"ffd700",gTMnPd:"daa520",Way:"808080",gYF:"8000",gYFLw:"adff2f",gYy:"808080",honeyMw:"f0fff0",hotpRk:"ff69b4",RdianYd:"cd5c5c",Rdigo:"4b0082",ivSy:"fffff0",khaki:"f0e68c",lavFMr:"e6e6fa",lavFMrXsh:"fff0f5",lawngYF:"7cfc00",NmoncEffon:"fffacd",ZXe:"add8e6",ZcSO:"f08080",Zcyan:"e0ffff",ZgTMnPdLw:"fafad2",ZWay:"d3d3d3",ZgYF:"90ee90",ZgYy:"d3d3d3",ZpRk:"ffb6c1",ZsOmon:"ffa07a",ZsHgYF:"20b2aa",ZskyXe:"87cefa",ZUWay:"778899",ZUgYy:"778899",ZstAlXe:"b0c4de",ZLw:"ffffe0",lime:"ff00",limegYF:"32cd32",lRF:"faf0e6",magFta:"ff00ff",maPon:"800000",VaquamarRe:"66cdaa",VXe:"cd",VScEd:"ba55d3",VpurpN:"9370db",VsHgYF:"3cb371",VUXe:"7b68ee",VsprRggYF:"fa9a",VQe:"48d1cc",VviTetYd:"c71585",midnightXe:"191970",mRtcYam:"f5fffa",mistyPse:"ffe4e1",moccasR:"ffe4b5",navajowEte:"ffdead",navy:"80",Tdlace:"fdf5e6",Tive:"808000",TivedBb:"6b8e23",Sange:"ffa500",SangeYd:"ff4500",ScEd:"da70d6",pOegTMnPd:"eee8aa",pOegYF:"98fb98",pOeQe:"afeeee",pOeviTetYd:"db7093",papayawEp:"ffefd5",pHKpuff:"ffdab9",peru:"cd853f",pRk:"ffc0cb",plum:"dda0dd",powMrXe:"b0e0e6",purpN:"800080",YbeccapurpN:"663399",Yd:"ff0000",Psybrown:"bc8f8f",PyOXe:"4169e1",saddNbPwn:"8b4513",sOmon:"fa8072",sandybPwn:"f4a460",sHgYF:"2e8b57",sHshell:"fff5ee",siFna:"a0522d",silver:"c0c0c0",skyXe:"87ceeb",UXe:"6a5acd",UWay:"708090",UgYy:"708090",snow:"fffafa",sprRggYF:"ff7f",stAlXe:"4682b4",tan:"d2b48c",teO:"8080",tEstN:"d8bfd8",tomato:"ff6347",Qe:"40e0d0",viTet:"ee82ee",JHt:"f5deb3",wEte:"ffffff",wEtesmoke:"f5f5f5",Lw:"ffff00",LwgYF:"9acd32"};function yl(){const s={},t=Object.keys(Oo),e=Object.keys($o);let n,i,o,a,r;for(n=0;n<t.length;n++){for(a=r=t[n],i=0;i<e.length;i++)o=e[i],r=r.replace(o,$o[o]);o=parseInt(Oo[a],16),s[r]=[o>>16&255,o>>8&255,o&255]}return s}let $s;function vl(s){$s||($s=yl(),$s.transparent=[0,0,0,0]);const t=$s[s.toLowerCase()];return t&&{r:t[0],g:t[1],b:t[2],a:t.length===4?t[3]:255}}const _l=/^rgba?\(\s*([-+.\d]+)(%)?[\s,]+([-+.e\d]+)(%)?[\s,]+([-+.e\d]+)(%)?(?:[\s,/]+([-+.e\d]+)(%)?)?\s*\)$/;function wl(s){const t=_l.exec(s);let e=255,n,i,o;if(t){if(t[7]!==n){const a=+t[7];e=t[8]?ls(a):pe(a*255,0,255)}return n=+t[1],i=+t[3],o=+t[5],n=255&(t[2]?ls(n):pe(n,0,255)),i=255&(t[4]?ls(i):pe(i,0,255)),o=255&(t[6]?ls(o):pe(o,0,255)),{r:n,g:i,b:o,a:e}}}function kl(s){return s&&(s.a<255?`rgba(${s.r}, ${s.g}, ${s.b}, ${se(s.a)})`:`rgb(${s.r}, ${s.g}, ${s.b})`)}const kn=s=>s<=.0031308?s*12.92:Math.pow(s,1/2.4)*1.055-.055,We=s=>s<=.04045?s/12.92:Math.pow((s+.055)/1.055,2.4);function Ml(s,t,e){const n=We(se(s.r)),i=We(se(s.g)),o=We(se(s.b));return{r:ye(kn(n+e*(We(se(t.r))-n))),g:ye(kn(i+e*(We(se(t.g))-i))),b:ye(kn(o+e*(We(se(t.b))-o))),a:s.a+e*(t.a-s.a)}}function Os(s,t,e){if(s){let n=li(s);n[t]=Math.max(0,Math.min(n[t]+n[t]*e,t===0?360:1)),n=di(n),s.r=n[0],s.g=n[1],s.b=n[2]}}function nr(s,t){return s&&Object.assign(t||{},s)}function Bo(s){var t={r:0,g:0,b:0,a:255};return Array.isArray(s)?s.length>=3&&(t={r:s[0],g:s[1],b:s[2],a:255},s.length>3&&(t.a=ye(s[3]))):(t=nr(s,{r:0,g:0,b:0,a:1}),t.a=ye(t.a)),t}function Sl(s){return s.charAt(0)==="r"?wl(s):ml(s)}class ks{constructor(t){if(t instanceof ks)return t;const e=typeof t;let n;e==="object"?n=Bo(t):e==="string"&&(n=rl(t)||vl(t)||Sl(t)),this._rgb=n,this._valid=!!n}get valid(){return this._valid}get rgb(){var t=nr(this._rgb);return t&&(t.a=se(t.a)),t}set rgb(t){this._rgb=Bo(t)}rgbString(){return this._valid?kl(this._rgb):void 0}hexString(){return this._valid?cl(this._rgb):void 0}hslString(){return this._valid?xl(this._rgb):void 0}mix(t,e){if(t){const n=this.rgb,i=t.rgb;let o;const a=e===o?.5:e,r=2*a-1,l=n.a-i.a,c=((r*l===-1?r:(r+l)/(1+r*l))+1)/2;o=1-c,n.r=255&c*n.r+o*i.r+.5,n.g=255&c*n.g+o*i.g+.5,n.b=255&c*n.b+o*i.b+.5,n.a=a*n.a+(1-a)*i.a,this.rgb=n}return this}interpolate(t,e){return t&&(this._rgb=Ml(this._rgb,t._rgb,e)),this}clone(){return new ks(this.rgb)}alpha(t){return this._rgb.a=ye(t),this}clearer(t){const e=this._rgb;return e.a*=1-t,this}greyscale(){const t=this._rgb,e=Ts(t.r*.3+t.g*.59+t.b*.11);return t.r=t.g=t.b=e,this}opaquer(t){const e=this._rgb;return e.a*=1+t,this}negate(){const t=this._rgb;return t.r=255-t.r,t.g=255-t.g,t.b=255-t.b,this}lighten(t){return Os(this._rgb,2,t),this}darken(t){return Os(this._rgb,2,-t),this}saturate(t){return Os(this._rgb,1,t),this}desaturate(t){return Os(this._rgb,1,-t),this}rotate(t){return bl(this._rgb,t),this}}/*!
 * Chart.js v4.5.1
 * https://www.chartjs.org
 * (c) 2025 Chart.js Contributors
 * Released under the MIT License
 */function Zt(){}const Cl=(()=>{let s=0;return()=>s++})();function j(s){return s==null}function et(s){if(Array.isArray&&Array.isArray(s))return!0;const t=Object.prototype.toString.call(s);return t.slice(0,7)==="[object"&&t.slice(-6)==="Array]"}function N(s){return s!==null&&Object.prototype.toString.call(s)==="[object Object]"}function nt(s){return(typeof s=="number"||s instanceof Number)&&isFinite(+s)}function $t(s,t){return nt(s)?s:t}function B(s,t){return typeof s>"u"?t:s}const El=(s,t)=>typeof s=="string"&&s.endsWith("%")?parseFloat(s)/100:+s/t,ir=(s,t)=>typeof s=="string"&&s.endsWith("%")?parseFloat(s)/100*t:+s;function G(s,t,e){if(s&&typeof s.call=="function")return s.apply(e,t)}function U(s,t,e,n){let i,o,a;if(et(s))for(o=s.length,i=0;i<o;i++)t.call(e,s[i],i);else if(N(s))for(a=Object.keys(s),o=a.length,i=0;i<o;i++)t.call(e,s[a[i]],a[i])}function on(s,t){let e,n,i,o;if(!s||!t||s.length!==t.length)return!1;for(e=0,n=s.length;e<n;++e)if(i=s[e],o=t[e],i.datasetIndex!==o.datasetIndex||i.index!==o.index)return!1;return!0}function an(s){if(et(s))return s.map(an);if(N(s)){const t=Object.create(null),e=Object.keys(s),n=e.length;let i=0;for(;i<n;++i)t[e[i]]=an(s[e[i]]);return t}return s}function or(s){return["__proto__","prototype","constructor"].indexOf(s)===-1}function Al(s,t,e,n){if(!or(s))return;const i=t[s],o=e[s];N(i)&&N(o)?Ms(i,o,n):t[s]=an(o)}function Ms(s,t,e){const n=et(t)?t:[t],i=n.length;if(!N(s))return s;e=e||{};const o=e.merger||Al;let a;for(let r=0;r<i;++r){if(a=n[r],!N(a))continue;const l=Object.keys(a);for(let c=0,d=l.length;c<d;++c)o(l[c],s,a,e)}return s}function bs(s,t){return Ms(s,t,{merger:Pl})}function Pl(s,t,e){if(!or(s))return;const n=t[s],i=e[s];N(n)&&N(i)?bs(n,i):Object.prototype.hasOwnProperty.call(t,s)||(t[s]=an(i))}const Ro={"":s=>s,x:s=>s.x,y:s=>s.y};function Dl(s){const t=s.split("."),e=[];let n="";for(const i of t)n+=i,n.endsWith("\\")?n=n.slice(0,-1)+".":(e.push(n),n="");return e}function Tl(s){const t=Dl(s);return e=>{for(const n of t){if(n==="")break;e=e&&e[n]}return e}}function ve(s,t){return(Ro[t]||(Ro[t]=Tl(t)))(s)}function hi(s){return s.charAt(0).toUpperCase()+s.slice(1)}const Ss=s=>typeof s<"u",_e=s=>typeof s=="function",Fo=(s,t)=>{if(s.size!==t.size)return!1;for(const e of s)if(!t.has(e))return!1;return!0};function Ll(s){return s.type==="mouseup"||s.type==="click"||s.type==="contextmenu"}const V=Math.PI,J=2*V,Il=J+V,rn=Number.POSITIVE_INFINITY,$l=V/180,lt=V/2,Ae=V/4,zo=V*2/3,ge=Math.log10,Gt=Math.sign;function xs(s,t,e){return Math.abs(s-t)<e}function jo(s){const t=Math.round(s);s=xs(s,t,s/1e3)?t:s;const e=Math.pow(10,Math.floor(ge(s))),n=s/e;return(n<=1?1:n<=2?2:n<=5?5:10)*e}function Ol(s){const t=[],e=Math.sqrt(s);let n;for(n=1;n<e;n++)s%n===0&&(t.push(n),t.push(s/n));return e===(e|0)&&t.push(e),t.sort((i,o)=>i-o).pop(),t}function Bl(s){return typeof s=="symbol"||typeof s=="object"&&s!==null&&!(Symbol.toPrimitive in s||"toString"in s||"valueOf"in s)}function Ze(s){return!Bl(s)&&!isNaN(parseFloat(s))&&isFinite(s)}function Rl(s,t){const e=Math.round(s);return e-t<=s&&e+t>=s}function ar(s,t,e){let n,i,o;for(n=0,i=s.length;n<i;n++)o=s[n][e],isNaN(o)||(t.min=Math.min(t.min,o),t.max=Math.max(t.max,o))}function Nt(s){return s*(V/180)}function ui(s){return s*(180/V)}function No(s){if(!nt(s))return;let t=1,e=0;for(;Math.round(s*t)/t!==s;)t*=10,e++;return e}function rr(s,t){const e=t.x-s.x,n=t.y-s.y,i=Math.sqrt(e*e+n*n);let o=Math.atan2(n,e);return o<-.5*V&&(o+=J),{angle:o,distance:i}}function Vn(s,t){return Math.sqrt(Math.pow(t.x-s.x,2)+Math.pow(t.y-s.y,2))}function Fl(s,t){return(s-t+Il)%J-V}function wt(s){return(s%J+J)%J}function Cs(s,t,e,n){const i=wt(s),o=wt(t),a=wt(e),r=wt(o-i),l=wt(a-i),c=wt(i-o),d=wt(i-a);return i===o||i===a||n&&o===a||r>l&&c<d}function bt(s,t,e){return Math.max(t,Math.min(e,s))}function zl(s){return bt(s,-32768,32767)}function ne(s,t,e,n=1e-6){return s>=Math.min(t,e)-n&&s<=Math.max(t,e)+n}function fi(s,t,e){e=e||(a=>s[a]<t);let n=s.length-1,i=0,o;for(;n-i>1;)o=i+n>>1,e(o)?i=o:n=o;return{lo:i,hi:n}}const ie=(s,t,e,n)=>fi(s,e,n?i=>{const o=s[i][t];return o<e||o===e&&s[i+1][t]===e}:i=>s[i][t]<e),jl=(s,t,e)=>fi(s,e,n=>s[n][t]>=e);function Nl(s,t,e){let n=0,i=s.length;for(;n<i&&s[n]<t;)n++;for(;i>n&&s[i-1]>e;)i--;return n>0||i<s.length?s.slice(n,i):s}const lr=["push","pop","shift","splice","unshift"];function Vl(s,t){if(s._chartjs){s._chartjs.listeners.push(t);return}Object.defineProperty(s,"_chartjs",{configurable:!0,enumerable:!1,value:{listeners:[t]}}),lr.forEach(e=>{const n="_onData"+hi(e),i=s[e];Object.defineProperty(s,e,{configurable:!0,enumerable:!1,value(...o){const a=i.apply(this,o);return s._chartjs.listeners.forEach(r=>{typeof r[n]=="function"&&r[n](...o)}),a}})})}function Vo(s,t){const e=s._chartjs;if(!e)return;const n=e.listeners,i=n.indexOf(t);i!==-1&&n.splice(i,1),!(n.length>0)&&(lr.forEach(o=>{delete s[o]}),delete s._chartjs)}function cr(s){const t=new Set(s);return t.size===s.length?s:Array.from(t)}const dr=(function(){return typeof window>"u"?function(s){return s()}:window.requestAnimationFrame})();function hr(s,t){let e=[],n=!1;return function(...i){e=i,n||(n=!0,dr.call(window,()=>{n=!1,s.apply(t,e)}))}}function Wl(s,t){let e;return function(...n){return t?(clearTimeout(e),e=setTimeout(s,t,n)):s.apply(this,n),t}}const pi=s=>s==="start"?"left":s==="end"?"right":"center",vt=(s,t,e)=>s==="start"?t:s==="end"?e:(t+e)/2,Hl=(s,t,e,n)=>s===(n?"left":"right")?e:s==="center"?(t+e)/2:t;function ur(s,t,e){const n=t.length;let i=0,o=n;if(s._sorted){const{iScale:a,vScale:r,_parsed:l}=s,c=s.dataset&&s.dataset.options?s.dataset.options.spanGaps:null,d=a.axis,{min:h,max:u,minDefined:f,maxDefined:p}=a.getUserBounds();if(f){if(i=Math.min(ie(l,d,h).lo,e?n:ie(t,d,a.getPixelForValue(h)).lo),c){const g=l.slice(0,i+1).reverse().findIndex(m=>!j(m[r.axis]));i-=Math.max(0,g)}i=bt(i,0,n-1)}if(p){let g=Math.max(ie(l,a.axis,u,!0).hi+1,e?0:ie(t,d,a.getPixelForValue(u),!0).hi+1);if(c){const m=l.slice(g-1).findIndex(b=>!j(b[r.axis]));g+=Math.max(0,m)}o=bt(g,i,n)-i}else o=n-i}return{start:i,count:o}}function fr(s){const{xScale:t,yScale:e,_scaleRanges:n}=s,i={xmin:t.min,xmax:t.max,ymin:e.min,ymax:e.max};if(!n)return s._scaleRanges=i,!0;const o=n.xmin!==t.min||n.xmax!==t.max||n.ymin!==e.min||n.ymax!==e.max;return Object.assign(n,i),o}const Bs=s=>s===0||s===1,Wo=(s,t,e)=>-(Math.pow(2,10*(s-=1))*Math.sin((s-t)*J/e)),Ho=(s,t,e)=>Math.pow(2,-10*s)*Math.sin((s-t)*J/e)+1,ys={linear:s=>s,easeInQuad:s=>s*s,easeOutQuad:s=>-s*(s-2),easeInOutQuad:s=>(s/=.5)<1?.5*s*s:-.5*(--s*(s-2)-1),easeInCubic:s=>s*s*s,easeOutCubic:s=>(s-=1)*s*s+1,easeInOutCubic:s=>(s/=.5)<1?.5*s*s*s:.5*((s-=2)*s*s+2),easeInQuart:s=>s*s*s*s,easeOutQuart:s=>-((s-=1)*s*s*s-1),easeInOutQuart:s=>(s/=.5)<1?.5*s*s*s*s:-.5*((s-=2)*s*s*s-2),easeInQuint:s=>s*s*s*s*s,easeOutQuint:s=>(s-=1)*s*s*s*s+1,easeInOutQuint:s=>(s/=.5)<1?.5*s*s*s*s*s:.5*((s-=2)*s*s*s*s+2),easeInSine:s=>-Math.cos(s*lt)+1,easeOutSine:s=>Math.sin(s*lt),easeInOutSine:s=>-.5*(Math.cos(V*s)-1),easeInExpo:s=>s===0?0:Math.pow(2,10*(s-1)),easeOutExpo:s=>s===1?1:-Math.pow(2,-10*s)+1,easeInOutExpo:s=>Bs(s)?s:s<.5?.5*Math.pow(2,10*(s*2-1)):.5*(-Math.pow(2,-10*(s*2-1))+2),easeInCirc:s=>s>=1?s:-(Math.sqrt(1-s*s)-1),easeOutCirc:s=>Math.sqrt(1-(s-=1)*s),easeInOutCirc:s=>(s/=.5)<1?-.5*(Math.sqrt(1-s*s)-1):.5*(Math.sqrt(1-(s-=2)*s)+1),easeInElastic:s=>Bs(s)?s:Wo(s,.075,.3),easeOutElastic:s=>Bs(s)?s:Ho(s,.075,.3),easeInOutElastic(s){return Bs(s)?s:s<.5?.5*Wo(s*2,.1125,.45):.5+.5*Ho(s*2-1,.1125,.45)},easeInBack(s){return s*s*((1.70158+1)*s-1.70158)},easeOutBack(s){return(s-=1)*s*((1.70158+1)*s+1.70158)+1},easeInOutBack(s){let t=1.70158;return(s/=.5)<1?.5*(s*s*(((t*=1.525)+1)*s-t)):.5*((s-=2)*s*(((t*=1.525)+1)*s+t)+2)},easeInBounce:s=>1-ys.easeOutBounce(1-s),easeOutBounce(s){return s<1/2.75?7.5625*s*s:s<2/2.75?7.5625*(s-=1.5/2.75)*s+.75:s<2.5/2.75?7.5625*(s-=2.25/2.75)*s+.9375:7.5625*(s-=2.625/2.75)*s+.984375},easeInOutBounce:s=>s<.5?ys.easeInBounce(s*2)*.5:ys.easeOutBounce(s*2-1)*.5+.5};function gi(s){if(s&&typeof s=="object"){const t=s.toString();return t==="[object CanvasPattern]"||t==="[object CanvasGradient]"}return!1}function Yo(s){return gi(s)?s:new ks(s)}function Mn(s){return gi(s)?s:new ks(s).saturate(.5).darken(.1).hexString()}const Yl=["x","y","borderWidth","radius","tension"],Ul=["color","borderColor","backgroundColor"];function Xl(s){s.set("animation",{delay:void 0,duration:1e3,easing:"easeOutQuart",fn:void 0,from:void 0,loop:void 0,to:void 0,type:void 0}),s.describe("animation",{_fallback:!1,_indexable:!1,_scriptable:t=>t!=="onProgress"&&t!=="onComplete"&&t!=="fn"}),s.set("animations",{colors:{type:"color",properties:Ul},numbers:{type:"number",properties:Yl}}),s.describe("animations",{_fallback:"animation"}),s.set("transitions",{active:{animation:{duration:400}},resize:{animation:{duration:0}},show:{animations:{colors:{from:"transparent"},visible:{type:"boolean",duration:0}}},hide:{animations:{colors:{to:"transparent"},visible:{type:"boolean",easing:"linear",fn:t=>t|0}}}})}function ql(s){s.set("layout",{autoPadding:!0,padding:{top:0,right:0,bottom:0,left:0}})}const Uo=new Map;function Gl(s,t){t=t||{};const e=s+JSON.stringify(t);let n=Uo.get(e);return n||(n=new Intl.NumberFormat(s,t),Uo.set(e,n)),n}function Ls(s,t,e){return Gl(t,e).format(s)}const pr={values(s){return et(s)?s:""+s},numeric(s,t,e){if(s===0)return"0";const n=this.chart.options.locale;let i,o=s;if(e.length>1){const c=Math.max(Math.abs(e[0].value),Math.abs(e[e.length-1].value));(c<1e-4||c>1e15)&&(i="scientific"),o=Kl(s,e)}const a=ge(Math.abs(o)),r=isNaN(a)?1:Math.max(Math.min(-1*Math.floor(a),20),0),l={notation:i,minimumFractionDigits:r,maximumFractionDigits:r};return Object.assign(l,this.options.ticks.format),Ls(s,n,l)},logarithmic(s,t,e){if(s===0)return"0";const n=e[t].significand||s/Math.pow(10,Math.floor(ge(s)));return[1,2,3,5,10,15].includes(n)||t>.8*e.length?pr.numeric.call(this,s,t,e):""}};function Kl(s,t){let e=t.length>3?t[2].value-t[1].value:t[1].value-t[0].value;return Math.abs(e)>=1&&s!==Math.floor(s)&&(e=s-Math.floor(s)),e}var gn={formatters:pr};function Jl(s){s.set("scale",{display:!0,offset:!1,reverse:!1,beginAtZero:!1,bounds:"ticks",clip:!0,grace:0,grid:{display:!0,lineWidth:1,drawOnChartArea:!0,drawTicks:!0,tickLength:8,tickWidth:(t,e)=>e.lineWidth,tickColor:(t,e)=>e.color,offset:!1},border:{display:!0,dash:[],dashOffset:0,width:1},title:{display:!1,text:"",padding:{top:4,bottom:4}},ticks:{minRotation:0,maxRotation:50,mirror:!1,textStrokeWidth:0,textStrokeColor:"",padding:3,display:!0,autoSkip:!0,autoSkipPadding:3,labelOffset:0,callback:gn.formatters.values,minor:{},major:{},align:"center",crossAlign:"near",showLabelBackdrop:!1,backdropColor:"rgba(255, 255, 255, 0.75)",backdropPadding:2}}),s.route("scale.ticks","color","","color"),s.route("scale.grid","color","","borderColor"),s.route("scale.border","color","","borderColor"),s.route("scale.title","color","","color"),s.describe("scale",{_fallback:!1,_scriptable:t=>!t.startsWith("before")&&!t.startsWith("after")&&t!=="callback"&&t!=="parser",_indexable:t=>t!=="borderDash"&&t!=="tickBorderDash"&&t!=="dash"}),s.describe("scales",{_fallback:"scale"}),s.describe("scale.ticks",{_scriptable:t=>t!=="backdropPadding"&&t!=="callback",_indexable:t=>t!=="backdropPadding"})}const je=Object.create(null),Wn=Object.create(null);function vs(s,t){if(!t)return s;const e=t.split(".");for(let n=0,i=e.length;n<i;++n){const o=e[n];s=s[o]||(s[o]=Object.create(null))}return s}function Sn(s,t,e){return typeof t=="string"?Ms(vs(s,t),e):Ms(vs(s,""),t)}class Zl{constructor(t,e){this.animation=void 0,this.backgroundColor="rgba(0,0,0,0.1)",this.borderColor="rgba(0,0,0,0.1)",this.color="#666",this.datasets={},this.devicePixelRatio=n=>n.chart.platform.getDevicePixelRatio(),this.elements={},this.events=["mousemove","mouseout","click","touchstart","touchmove"],this.font={family:"'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",size:12,style:"normal",lineHeight:1.2,weight:null},this.hover={},this.hoverBackgroundColor=(n,i)=>Mn(i.backgroundColor),this.hoverBorderColor=(n,i)=>Mn(i.borderColor),this.hoverColor=(n,i)=>Mn(i.color),this.indexAxis="x",this.interaction={mode:"nearest",intersect:!0,includeInvisible:!1},this.maintainAspectRatio=!0,this.onHover=null,this.onClick=null,this.parsing=!0,this.plugins={},this.responsive=!0,this.scale=void 0,this.scales={},this.showLine=!0,this.drawActiveElementsOnTop=!0,this.describe(t),this.apply(e)}set(t,e){return Sn(this,t,e)}get(t){return vs(this,t)}describe(t,e){return Sn(Wn,t,e)}override(t,e){return Sn(je,t,e)}route(t,e,n,i){const o=vs(this,t),a=vs(this,n),r="_"+e;Object.defineProperties(o,{[r]:{value:o[e],writable:!0},[e]:{enumerable:!0,get(){const l=this[r],c=a[i];return N(l)?Object.assign({},c,l):B(l,c)},set(l){this[r]=l}}})}apply(t){t.forEach(e=>e(this))}}var st=new Zl({_scriptable:s=>!s.startsWith("on"),_indexable:s=>s!=="events",hover:{_fallback:"interaction"},interaction:{_scriptable:!1,_indexable:!1}},[Xl,ql,Jl]);function Ql(s){return!s||j(s.size)||j(s.family)?null:(s.style?s.style+" ":"")+(s.weight?s.weight+" ":"")+s.size+"px "+s.family}function ln(s,t,e,n,i){let o=t[i];return o||(o=t[i]=s.measureText(i).width,e.push(i)),o>n&&(n=o),n}function tc(s,t,e,n){n=n||{};let i=n.data=n.data||{},o=n.garbageCollect=n.garbageCollect||[];n.font!==t&&(i=n.data={},o=n.garbageCollect=[],n.font=t),s.save(),s.font=t;let a=0;const r=e.length;let l,c,d,h,u;for(l=0;l<r;l++)if(h=e[l],h!=null&&!et(h))a=ln(s,i,o,a,h);else if(et(h))for(c=0,d=h.length;c<d;c++)u=h[c],u!=null&&!et(u)&&(a=ln(s,i,o,a,u));s.restore();const f=o.length/2;if(f>e.length){for(l=0;l<f;l++)delete i[o[l]];o.splice(0,f)}return a}function Pe(s,t,e){const n=s.currentDevicePixelRatio,i=e!==0?Math.max(e/2,.5):0;return Math.round((t-i)*n)/n+i}function Xo(s,t){!t&&!s||(t=t||s.getContext("2d"),t.save(),t.resetTransform(),t.clearRect(0,0,s.width,s.height),t.restore())}function Hn(s,t,e,n){gr(s,t,e,n,null)}function gr(s,t,e,n,i){let o,a,r,l,c,d,h,u;const f=t.pointStyle,p=t.rotation,g=t.radius;let m=(p||0)*$l;if(f&&typeof f=="object"&&(o=f.toString(),o==="[object HTMLImageElement]"||o==="[object HTMLCanvasElement]")){s.save(),s.translate(e,n),s.rotate(m),s.drawImage(f,-f.width/2,-f.height/2,f.width,f.height),s.restore();return}if(!(isNaN(g)||g<=0)){switch(s.beginPath(),f){default:i?s.ellipse(e,n,i/2,g,0,0,J):s.arc(e,n,g,0,J),s.closePath();break;case"triangle":d=i?i/2:g,s.moveTo(e+Math.sin(m)*d,n-Math.cos(m)*g),m+=zo,s.lineTo(e+Math.sin(m)*d,n-Math.cos(m)*g),m+=zo,s.lineTo(e+Math.sin(m)*d,n-Math.cos(m)*g),s.closePath();break;case"rectRounded":c=g*.516,l=g-c,a=Math.cos(m+Ae)*l,h=Math.cos(m+Ae)*(i?i/2-c:l),r=Math.sin(m+Ae)*l,u=Math.sin(m+Ae)*(i?i/2-c:l),s.arc(e-h,n-r,c,m-V,m-lt),s.arc(e+u,n-a,c,m-lt,m),s.arc(e+h,n+r,c,m,m+lt),s.arc(e-u,n+a,c,m+lt,m+V),s.closePath();break;case"rect":if(!p){l=Math.SQRT1_2*g,d=i?i/2:l,s.rect(e-d,n-l,2*d,2*l);break}m+=Ae;case"rectRot":h=Math.cos(m)*(i?i/2:g),a=Math.cos(m)*g,r=Math.sin(m)*g,u=Math.sin(m)*(i?i/2:g),s.moveTo(e-h,n-r),s.lineTo(e+u,n-a),s.lineTo(e+h,n+r),s.lineTo(e-u,n+a),s.closePath();break;case"crossRot":m+=Ae;case"cross":h=Math.cos(m)*(i?i/2:g),a=Math.cos(m)*g,r=Math.sin(m)*g,u=Math.sin(m)*(i?i/2:g),s.moveTo(e-h,n-r),s.lineTo(e+h,n+r),s.moveTo(e+u,n-a),s.lineTo(e-u,n+a);break;case"star":h=Math.cos(m)*(i?i/2:g),a=Math.cos(m)*g,r=Math.sin(m)*g,u=Math.sin(m)*(i?i/2:g),s.moveTo(e-h,n-r),s.lineTo(e+h,n+r),s.moveTo(e+u,n-a),s.lineTo(e-u,n+a),m+=Ae,h=Math.cos(m)*(i?i/2:g),a=Math.cos(m)*g,r=Math.sin(m)*g,u=Math.sin(m)*(i?i/2:g),s.moveTo(e-h,n-r),s.lineTo(e+h,n+r),s.moveTo(e+u,n-a),s.lineTo(e-u,n+a);break;case"line":a=i?i/2:Math.cos(m)*g,r=Math.sin(m)*g,s.moveTo(e-a,n-r),s.lineTo(e+a,n+r);break;case"dash":s.moveTo(e,n),s.lineTo(e+Math.cos(m)*(i?i/2:g),n+Math.sin(m)*g);break;case!1:s.closePath();break}s.fill(),t.borderWidth>0&&s.stroke()}}function oe(s,t,e){return e=e||.5,!t||s&&s.x>t.left-e&&s.x<t.right+e&&s.y>t.top-e&&s.y<t.bottom+e}function mn(s,t){s.save(),s.beginPath(),s.rect(t.left,t.top,t.right-t.left,t.bottom-t.top),s.clip()}function bn(s){s.restore()}function ec(s,t,e,n,i){if(!t)return s.lineTo(e.x,e.y);if(i==="middle"){const o=(t.x+e.x)/2;s.lineTo(o,t.y),s.lineTo(o,e.y)}else i==="after"!=!!n?s.lineTo(t.x,e.y):s.lineTo(e.x,t.y);s.lineTo(e.x,e.y)}function sc(s,t,e,n){if(!t)return s.lineTo(e.x,e.y);s.bezierCurveTo(n?t.cp1x:t.cp2x,n?t.cp1y:t.cp2y,n?e.cp2x:e.cp1x,n?e.cp2y:e.cp1y,e.x,e.y)}function nc(s,t){t.translation&&s.translate(t.translation[0],t.translation[1]),j(t.rotation)||s.rotate(t.rotation),t.color&&(s.fillStyle=t.color),t.textAlign&&(s.textAlign=t.textAlign),t.textBaseline&&(s.textBaseline=t.textBaseline)}function ic(s,t,e,n,i){if(i.strikethrough||i.underline){const o=s.measureText(n),a=t-o.actualBoundingBoxLeft,r=t+o.actualBoundingBoxRight,l=e-o.actualBoundingBoxAscent,c=e+o.actualBoundingBoxDescent,d=i.strikethrough?(l+c)/2:c;s.strokeStyle=s.fillStyle,s.beginPath(),s.lineWidth=i.decorationWidth||2,s.moveTo(a,d),s.lineTo(r,d),s.stroke()}}function oc(s,t){const e=s.fillStyle;s.fillStyle=t.color,s.fillRect(t.left,t.top,t.width,t.height),s.fillStyle=e}function Ne(s,t,e,n,i,o={}){const a=et(t)?t:[t],r=o.strokeWidth>0&&o.strokeColor!=="";let l,c;for(s.save(),s.font=i.string,nc(s,o),l=0;l<a.length;++l)c=a[l],o.backdrop&&oc(s,o.backdrop),r&&(o.strokeColor&&(s.strokeStyle=o.strokeColor),j(o.strokeWidth)||(s.lineWidth=o.strokeWidth),s.strokeText(c,e,n,o.maxWidth)),s.fillText(c,e,n,o.maxWidth),ic(s,e,n,c,o),n+=Number(i.lineHeight);s.restore()}function Es(s,t){const{x:e,y:n,w:i,h:o,radius:a}=t;s.arc(e+a.topLeft,n+a.topLeft,a.topLeft,1.5*V,V,!0),s.lineTo(e,n+o-a.bottomLeft),s.arc(e+a.bottomLeft,n+o-a.bottomLeft,a.bottomLeft,V,lt,!0),s.lineTo(e+i-a.bottomRight,n+o),s.arc(e+i-a.bottomRight,n+o-a.bottomRight,a.bottomRight,lt,0,!0),s.lineTo(e+i,n+a.topRight),s.arc(e+i-a.topRight,n+a.topRight,a.topRight,0,-lt,!0),s.lineTo(e+a.topLeft,n)}const ac=/^(normal|(\d+(?:\.\d+)?)(px|em|%)?)$/,rc=/^(normal|italic|initial|inherit|unset|(oblique( -?[0-9]?[0-9]deg)?))$/;function lc(s,t){const e=(""+s).match(ac);if(!e||e[1]==="normal")return t*1.2;switch(s=+e[2],e[3]){case"px":return s;case"%":s/=100;break}return t*s}const cc=s=>+s||0;function mi(s,t){const e={},n=N(t),i=n?Object.keys(t):t,o=N(s)?n?a=>B(s[a],s[t[a]]):a=>s[a]:()=>s;for(const a of i)e[a]=cc(o(a));return e}function mr(s){return mi(s,{top:"y",right:"x",bottom:"y",left:"x"})}function Fe(s){return mi(s,["topLeft","topRight","bottomLeft","bottomRight"])}function St(s){const t=mr(s);return t.width=t.left+t.right,t.height=t.top+t.bottom,t}function gt(s,t){s=s||{},t=t||st.font;let e=B(s.size,t.size);typeof e=="string"&&(e=parseInt(e,10));let n=B(s.style,t.style);n&&!(""+n).match(rc)&&(console.warn('Invalid font style specified: "'+n+'"'),n=void 0);const i={family:B(s.family,t.family),lineHeight:lc(B(s.lineHeight,t.lineHeight),e),size:e,style:n,weight:B(s.weight,t.weight),string:""};return i.string=Ql(i),i}function cs(s,t,e,n){let i,o,a;for(i=0,o=s.length;i<o;++i)if(a=s[i],a!==void 0&&a!==void 0)return a}function dc(s,t,e){const{min:n,max:i}=s,o=ir(t,(i-n)/2),a=(r,l)=>e&&r===0?0:r+l;return{min:a(n,-Math.abs(o)),max:a(i,o)}}function Ce(s,t){return Object.assign(Object.create(s),t)}function bi(s,t=[""],e,n,i=()=>s[0]){const o=e||s;typeof n>"u"&&(n=vr("_fallback",s));const a={[Symbol.toStringTag]:"Object",_cacheable:!0,_scopes:s,_rootScopes:o,_fallback:n,_getTarget:i,override:r=>bi([r,...s],t,o,n)};return new Proxy(a,{deleteProperty(r,l){return delete r[l],delete r._keys,delete s[0][l],!0},get(r,l){return xr(r,l,()=>xc(l,t,s,r))},getOwnPropertyDescriptor(r,l){return Reflect.getOwnPropertyDescriptor(r._scopes[0],l)},getPrototypeOf(){return Reflect.getPrototypeOf(s[0])},has(r,l){return Go(r).includes(l)},ownKeys(r){return Go(r)},set(r,l,c){const d=r._storage||(r._storage=i());return r[l]=d[l]=c,delete r._keys,!0}})}function Qe(s,t,e,n){const i={_cacheable:!1,_proxy:s,_context:t,_subProxy:e,_stack:new Set,_descriptors:br(s,n),setContext:o=>Qe(s,o,e,n),override:o=>Qe(s.override(o),t,e,n)};return new Proxy(i,{deleteProperty(o,a){return delete o[a],delete s[a],!0},get(o,a,r){return xr(o,a,()=>uc(o,a,r))},getOwnPropertyDescriptor(o,a){return o._descriptors.allKeys?Reflect.has(s,a)?{enumerable:!0,configurable:!0}:void 0:Reflect.getOwnPropertyDescriptor(s,a)},getPrototypeOf(){return Reflect.getPrototypeOf(s)},has(o,a){return Reflect.has(s,a)},ownKeys(){return Reflect.ownKeys(s)},set(o,a,r){return s[a]=r,delete o[a],!0}})}function br(s,t={scriptable:!0,indexable:!0}){const{_scriptable:e=t.scriptable,_indexable:n=t.indexable,_allKeys:i=t.allKeys}=s;return{allKeys:i,scriptable:e,indexable:n,isScriptable:_e(e)?e:()=>e,isIndexable:_e(n)?n:()=>n}}const hc=(s,t)=>s?s+hi(t):t,xi=(s,t)=>N(t)&&s!=="adapters"&&(Object.getPrototypeOf(t)===null||t.constructor===Object);function xr(s,t,e){if(Object.prototype.hasOwnProperty.call(s,t)||t==="constructor")return s[t];const n=e();return s[t]=n,n}function uc(s,t,e){const{_proxy:n,_context:i,_subProxy:o,_descriptors:a}=s;let r=n[t];return _e(r)&&a.isScriptable(t)&&(r=fc(t,r,s,e)),et(r)&&r.length&&(r=pc(t,r,s,a.isIndexable)),xi(t,r)&&(r=Qe(r,i,o&&o[t],a)),r}function fc(s,t,e,n){const{_proxy:i,_context:o,_subProxy:a,_stack:r}=e;if(r.has(s))throw new Error("Recursion detected: "+Array.from(r).join("->")+"->"+s);r.add(s);let l=t(o,a||n);return r.delete(s),xi(s,l)&&(l=yi(i._scopes,i,s,l)),l}function pc(s,t,e,n){const{_proxy:i,_context:o,_subProxy:a,_descriptors:r}=e;if(typeof o.index<"u"&&n(s))return t[o.index%t.length];if(N(t[0])){const l=t,c=i._scopes.filter(d=>d!==l);t=[];for(const d of l){const h=yi(c,i,s,d);t.push(Qe(h,o,a&&a[s],r))}}return t}function yr(s,t,e){return _e(s)?s(t,e):s}const gc=(s,t)=>s===!0?t:typeof s=="string"?ve(t,s):void 0;function mc(s,t,e,n,i){for(const o of t){const a=gc(e,o);if(a){s.add(a);const r=yr(a._fallback,e,i);if(typeof r<"u"&&r!==e&&r!==n)return r}else if(a===!1&&typeof n<"u"&&e!==n)return null}return!1}function yi(s,t,e,n){const i=t._rootScopes,o=yr(t._fallback,e,n),a=[...s,...i],r=new Set;r.add(n);let l=qo(r,a,e,o||e,n);return l===null||typeof o<"u"&&o!==e&&(l=qo(r,a,o,l,n),l===null)?!1:bi(Array.from(r),[""],i,o,()=>bc(t,e,n))}function qo(s,t,e,n,i){for(;e;)e=mc(s,t,e,n,i);return e}function bc(s,t,e){const n=s._getTarget();t in n||(n[t]={});const i=n[t];return et(i)&&N(e)?e:i||{}}function xc(s,t,e,n){let i;for(const o of t)if(i=vr(hc(o,s),e),typeof i<"u")return xi(s,i)?yi(e,n,s,i):i}function vr(s,t){for(const e of t){if(!e)continue;const n=e[s];if(typeof n<"u")return n}}function Go(s){let t=s._keys;return t||(t=s._keys=yc(s._scopes)),t}function yc(s){const t=new Set;for(const e of s)for(const n of Object.keys(e).filter(i=>!i.startsWith("_")))t.add(n);return Array.from(t)}function _r(s,t,e,n){const{iScale:i}=s,{key:o="r"}=this._parsing,a=new Array(n);let r,l,c,d;for(r=0,l=n;r<l;++r)c=r+e,d=t[c],a[r]={r:i.parse(ve(d,o),c)};return a}const vc=Number.EPSILON||1e-14,ts=(s,t)=>t<s.length&&!s[t].skip&&s[t],wr=s=>s==="x"?"y":"x";function _c(s,t,e,n){const i=s.skip?t:s,o=t,a=e.skip?t:e,r=Vn(o,i),l=Vn(a,o);let c=r/(r+l),d=l/(r+l);c=isNaN(c)?0:c,d=isNaN(d)?0:d;const h=n*c,u=n*d;return{previous:{x:o.x-h*(a.x-i.x),y:o.y-h*(a.y-i.y)},next:{x:o.x+u*(a.x-i.x),y:o.y+u*(a.y-i.y)}}}function wc(s,t,e){const n=s.length;let i,o,a,r,l,c=ts(s,0);for(let d=0;d<n-1;++d)if(l=c,c=ts(s,d+1),!(!l||!c)){if(xs(t[d],0,vc)){e[d]=e[d+1]=0;continue}i=e[d]/t[d],o=e[d+1]/t[d],r=Math.pow(i,2)+Math.pow(o,2),!(r<=9)&&(a=3/Math.sqrt(r),e[d]=i*a*t[d],e[d+1]=o*a*t[d])}}function kc(s,t,e="x"){const n=wr(e),i=s.length;let o,a,r,l=ts(s,0);for(let c=0;c<i;++c){if(a=r,r=l,l=ts(s,c+1),!r)continue;const d=r[e],h=r[n];a&&(o=(d-a[e])/3,r[`cp1${e}`]=d-o,r[`cp1${n}`]=h-o*t[c]),l&&(o=(l[e]-d)/3,r[`cp2${e}`]=d+o,r[`cp2${n}`]=h+o*t[c])}}function Mc(s,t="x"){const e=wr(t),n=s.length,i=Array(n).fill(0),o=Array(n);let a,r,l,c=ts(s,0);for(a=0;a<n;++a)if(r=l,l=c,c=ts(s,a+1),!!l){if(c){const d=c[t]-l[t];i[a]=d!==0?(c[e]-l[e])/d:0}o[a]=r?c?Gt(i[a-1])!==Gt(i[a])?0:(i[a-1]+i[a])/2:i[a-1]:i[a]}wc(s,i,o),kc(s,o,t)}function Rs(s,t,e){return Math.max(Math.min(s,e),t)}function Sc(s,t){let e,n,i,o,a,r=oe(s[0],t);for(e=0,n=s.length;e<n;++e)a=o,o=r,r=e<n-1&&oe(s[e+1],t),o&&(i=s[e],a&&(i.cp1x=Rs(i.cp1x,t.left,t.right),i.cp1y=Rs(i.cp1y,t.top,t.bottom)),r&&(i.cp2x=Rs(i.cp2x,t.left,t.right),i.cp2y=Rs(i.cp2y,t.top,t.bottom)))}function Cc(s,t,e,n,i){let o,a,r,l;if(t.spanGaps&&(s=s.filter(c=>!c.skip)),t.cubicInterpolationMode==="monotone")Mc(s,i);else{let c=n?s[s.length-1]:s[0];for(o=0,a=s.length;o<a;++o)r=s[o],l=_c(c,r,s[Math.min(o+1,a-(n?0:1))%a],t.tension),r.cp1x=l.previous.x,r.cp1y=l.previous.y,r.cp2x=l.next.x,r.cp2y=l.next.y,c=r}t.capBezierPoints&&Sc(s,e)}function vi(){return typeof window<"u"&&typeof document<"u"}function _i(s){let t=s.parentNode;return t&&t.toString()==="[object ShadowRoot]"&&(t=t.host),t}function cn(s,t,e){let n;return typeof s=="string"?(n=parseInt(s,10),s.indexOf("%")!==-1&&(n=n/100*t.parentNode[e])):n=s,n}const xn=s=>s.ownerDocument.defaultView.getComputedStyle(s,null);function Ec(s,t){return xn(s).getPropertyValue(t)}const Ac=["top","right","bottom","left"];function ze(s,t,e){const n={};e=e?"-"+e:"";for(let i=0;i<4;i++){const o=Ac[i];n[o]=parseFloat(s[t+"-"+o+e])||0}return n.width=n.left+n.right,n.height=n.top+n.bottom,n}const Pc=(s,t,e)=>(s>0||t>0)&&(!e||!e.shadowRoot);function Dc(s,t){const e=s.touches,n=e&&e.length?e[0]:s,{offsetX:i,offsetY:o}=n;let a=!1,r,l;if(Pc(i,o,s.target))r=i,l=o;else{const c=t.getBoundingClientRect();r=n.clientX-c.left,l=n.clientY-c.top,a=!0}return{x:r,y:l,box:a}}function Le(s,t){if("native"in s)return s;const{canvas:e,currentDevicePixelRatio:n}=t,i=xn(e),o=i.boxSizing==="border-box",a=ze(i,"padding"),r=ze(i,"border","width"),{x:l,y:c,box:d}=Dc(s,e),h=a.left+(d&&r.left),u=a.top+(d&&r.top);let{width:f,height:p}=t;return o&&(f-=a.width+r.width,p-=a.height+r.height),{x:Math.round((l-h)/f*e.width/n),y:Math.round((c-u)/p*e.height/n)}}function Tc(s,t,e){let n,i;if(t===void 0||e===void 0){const o=s&&_i(s);if(!o)t=s.clientWidth,e=s.clientHeight;else{const a=o.getBoundingClientRect(),r=xn(o),l=ze(r,"border","width"),c=ze(r,"padding");t=a.width-c.width-l.width,e=a.height-c.height-l.height,n=cn(r.maxWidth,o,"clientWidth"),i=cn(r.maxHeight,o,"clientHeight")}}return{width:t,height:e,maxWidth:n||rn,maxHeight:i||rn}}const me=s=>Math.round(s*10)/10;function Lc(s,t,e,n){const i=xn(s),o=ze(i,"margin"),a=cn(i.maxWidth,s,"clientWidth")||rn,r=cn(i.maxHeight,s,"clientHeight")||rn,l=Tc(s,t,e);let{width:c,height:d}=l;if(i.boxSizing==="content-box"){const u=ze(i,"border","width"),f=ze(i,"padding");c-=f.width+u.width,d-=f.height+u.height}return c=Math.max(0,c-o.width),d=Math.max(0,n?c/n:d-o.height),c=me(Math.min(c,a,l.maxWidth)),d=me(Math.min(d,r,l.maxHeight)),c&&!d&&(d=me(c/2)),(t!==void 0||e!==void 0)&&n&&l.height&&d>l.height&&(d=l.height,c=me(Math.floor(d*n))),{width:c,height:d}}function Ko(s,t,e){const n=t||1,i=me(s.height*n),o=me(s.width*n);s.height=me(s.height),s.width=me(s.width);const a=s.canvas;return a.style&&(e||!a.style.height&&!a.style.width)&&(a.style.height=`${s.height}px`,a.style.width=`${s.width}px`),s.currentDevicePixelRatio!==n||a.height!==i||a.width!==o?(s.currentDevicePixelRatio=n,a.height=i,a.width=o,s.ctx.setTransform(n,0,0,n,0,0),!0):!1}const Ic=(function(){let s=!1;try{const t={get passive(){return s=!0,!1}};vi()&&(window.addEventListener("test",null,t),window.removeEventListener("test",null,t))}catch{}return s})();function Jo(s,t){const e=Ec(s,t),n=e&&e.match(/^(\d+)(\.\d+)?px$/);return n?+n[1]:void 0}function Ie(s,t,e,n){return{x:s.x+e*(t.x-s.x),y:s.y+e*(t.y-s.y)}}function $c(s,t,e,n){return{x:s.x+e*(t.x-s.x),y:n==="middle"?e<.5?s.y:t.y:n==="after"?e<1?s.y:t.y:e>0?t.y:s.y}}function Oc(s,t,e,n){const i={x:s.cp2x,y:s.cp2y},o={x:t.cp1x,y:t.cp1y},a=Ie(s,i,e),r=Ie(i,o,e),l=Ie(o,t,e),c=Ie(a,r,e),d=Ie(r,l,e);return Ie(c,d,e)}const Bc=function(s,t){return{x(e){return s+s+t-e},setWidth(e){t=e},textAlign(e){return e==="center"?e:e==="right"?"left":"right"},xPlus(e,n){return e-n},leftForLtr(e,n){return e-n}}},Rc=function(){return{x(s){return s},setWidth(s){},textAlign(s){return s},xPlus(s,t){return s+t},leftForLtr(s,t){return s}}};function Ke(s,t,e){return s?Bc(t,e):Rc()}function kr(s,t){let e,n;(t==="ltr"||t==="rtl")&&(e=s.canvas.style,n=[e.getPropertyValue("direction"),e.getPropertyPriority("direction")],e.setProperty("direction",t,"important"),s.prevTextDirection=n)}function Mr(s,t){t!==void 0&&(delete s.prevTextDirection,s.canvas.style.setProperty("direction",t[0],t[1]))}function Sr(s){return s==="angle"?{between:Cs,compare:Fl,normalize:wt}:{between:ne,compare:(t,e)=>t-e,normalize:t=>t}}function Zo({start:s,end:t,count:e,loop:n,style:i}){return{start:s%e,end:t%e,loop:n&&(t-s+1)%e===0,style:i}}function Fc(s,t,e){const{property:n,start:i,end:o}=e,{between:a,normalize:r}=Sr(n),l=t.length;let{start:c,end:d,loop:h}=s,u,f;if(h){for(c+=l,d+=l,u=0,f=l;u<f&&a(r(t[c%l][n]),i,o);++u)c--,d--;c%=l,d%=l}return d<c&&(d+=l),{start:c,end:d,loop:h,style:s.style}}function Cr(s,t,e){if(!e)return[s];const{property:n,start:i,end:o}=e,a=t.length,{compare:r,between:l,normalize:c}=Sr(n),{start:d,end:h,loop:u,style:f}=Fc(s,t,e),p=[];let g=!1,m=null,b,v,M;const k=()=>l(i,M,b)&&r(i,M)!==0,w=()=>r(o,b)===0||l(o,M,b),E=()=>g||k(),P=()=>!g||w();for(let D=d,$=d;D<=h;++D)v=t[D%a],!v.skip&&(b=c(v[n]),b!==M&&(g=l(b,i,o),m===null&&E()&&(m=r(b,i)===0?D:$),m!==null&&P()&&(p.push(Zo({start:m,end:D,loop:u,count:a,style:f})),m=null),$=D,M=b));return m!==null&&p.push(Zo({start:m,end:h,loop:u,count:a,style:f})),p}function Er(s,t){const e=[],n=s.segments;for(let i=0;i<n.length;i++){const o=Cr(n[i],s.points,t);o.length&&e.push(...o)}return e}function zc(s,t,e,n){let i=0,o=t-1;if(e&&!n)for(;i<t&&!s[i].skip;)i++;for(;i<t&&s[i].skip;)i++;for(i%=t,e&&(o+=i);o>i&&s[o%t].skip;)o--;return o%=t,{start:i,end:o}}function jc(s,t,e,n){const i=s.length,o=[];let a=t,r=s[t],l;for(l=t+1;l<=e;++l){const c=s[l%i];c.skip||c.stop?r.skip||(n=!1,o.push({start:t%i,end:(l-1)%i,loop:n}),t=a=c.stop?l:null):(a=l,r.skip&&(t=l)),r=c}return a!==null&&o.push({start:t%i,end:a%i,loop:n}),o}function Nc(s,t){const e=s.points,n=s.options.spanGaps,i=e.length;if(!i)return[];const o=!!s._loop,{start:a,end:r}=zc(e,i,o,n);if(n===!0)return Qo(s,[{start:a,end:r,loop:o}],e,t);const l=r<a?r+i:r,c=!!s._fullLoop&&a===0&&r===i-1;return Qo(s,jc(e,a,l,c),e,t)}function Qo(s,t,e,n){return!n||!n.setContext||!e?t:Vc(s,t,e,n)}function Vc(s,t,e,n){const i=s._chart.getContext(),o=ta(s.options),{_datasetIndex:a,options:{spanGaps:r}}=s,l=e.length,c=[];let d=o,h=t[0].start,u=h;function f(p,g,m,b){const v=r?-1:1;if(p!==g){for(p+=l;e[p%l].skip;)p-=v;for(;e[g%l].skip;)g+=v;p%l!==g%l&&(c.push({start:p%l,end:g%l,loop:m,style:b}),d=b,h=g%l)}}for(const p of t){h=r?h:p.start;let g=e[h%l],m;for(u=h+1;u<=p.end;u++){const b=e[u%l];m=ta(n.setContext(Ce(i,{type:"segment",p0:g,p1:b,p0DataIndex:(u-1)%l,p1DataIndex:u%l,datasetIndex:a}))),Wc(m,d)&&f(h,u-1,p.loop,d),g=b,d=m}h<u-1&&f(h,u-1,p.loop,d)}return c}function ta(s){return{backgroundColor:s.backgroundColor,borderCapStyle:s.borderCapStyle,borderDash:s.borderDash,borderDashOffset:s.borderDashOffset,borderJoinStyle:s.borderJoinStyle,borderWidth:s.borderWidth,borderColor:s.borderColor}}function Wc(s,t){if(!t)return!1;const e=[],n=function(i,o){return gi(o)?(e.includes(o)||e.push(o),e.indexOf(o)):o};return JSON.stringify(s,n)!==JSON.stringify(t,n)}function Fs(s,t,e){return s.options.clip?s[e]:t[e]}function Hc(s,t){const{xScale:e,yScale:n}=s;return e&&n?{left:Fs(e,t,"left"),right:Fs(e,t,"right"),top:Fs(n,t,"top"),bottom:Fs(n,t,"bottom")}:t}function Ar(s,t){const e=t._clip;if(e.disabled)return!1;const n=Hc(t,s.chartArea);return{left:e.left===!1?0:n.left-(e.left===!0?0:e.left),right:e.right===!1?s.width:n.right+(e.right===!0?0:e.right),top:e.top===!1?0:n.top-(e.top===!0?0:e.top),bottom:e.bottom===!1?s.height:n.bottom+(e.bottom===!0?0:e.bottom)}}/*!
 * Chart.js v4.5.1
 * https://www.chartjs.org
 * (c) 2025 Chart.js Contributors
 * Released under the MIT License
 */class Yc{constructor(){this._request=null,this._charts=new Map,this._running=!1,this._lastDate=void 0}_notify(t,e,n,i){const o=e.listeners[i],a=e.duration;o.forEach(r=>r({chart:t,initial:e.initial,numSteps:a,currentStep:Math.min(n-e.start,a)}))}_refresh(){this._request||(this._running=!0,this._request=dr.call(window,()=>{this._update(),this._request=null,this._running&&this._refresh()}))}_update(t=Date.now()){let e=0;this._charts.forEach((n,i)=>{if(!n.running||!n.items.length)return;const o=n.items;let a=o.length-1,r=!1,l;for(;a>=0;--a)l=o[a],l._active?(l._total>n.duration&&(n.duration=l._total),l.tick(t),r=!0):(o[a]=o[o.length-1],o.pop());r&&(i.draw(),this._notify(i,n,t,"progress")),o.length||(n.running=!1,this._notify(i,n,t,"complete"),n.initial=!1),e+=o.length}),this._lastDate=t,e===0&&(this._running=!1)}_getAnims(t){const e=this._charts;let n=e.get(t);return n||(n={running:!1,initial:!0,items:[],listeners:{complete:[],progress:[]}},e.set(t,n)),n}listen(t,e,n){this._getAnims(t).listeners[e].push(n)}add(t,e){!e||!e.length||this._getAnims(t).items.push(...e)}has(t){return this._getAnims(t).items.length>0}start(t){const e=this._charts.get(t);e&&(e.running=!0,e.start=Date.now(),e.duration=e.items.reduce((n,i)=>Math.max(n,i._duration),0),this._refresh())}running(t){if(!this._running)return!1;const e=this._charts.get(t);return!(!e||!e.running||!e.items.length)}stop(t){const e=this._charts.get(t);if(!e||!e.items.length)return;const n=e.items;let i=n.length-1;for(;i>=0;--i)n[i].cancel();e.items=[],this._notify(t,e,Date.now(),"complete")}remove(t){return this._charts.delete(t)}}var Qt=new Yc;const ea="transparent",Uc={boolean(s,t,e){return e>.5?t:s},color(s,t,e){const n=Yo(s||ea),i=n.valid&&Yo(t||ea);return i&&i.valid?i.mix(n,e).hexString():t},number(s,t,e){return s+(t-s)*e}};class Xc{constructor(t,e,n,i){const o=e[n];i=cs([t.to,i,o,t.from]);const a=cs([t.from,o,i]);this._active=!0,this._fn=t.fn||Uc[t.type||typeof a],this._easing=ys[t.easing]||ys.linear,this._start=Math.floor(Date.now()+(t.delay||0)),this._duration=this._total=Math.floor(t.duration),this._loop=!!t.loop,this._target=e,this._prop=n,this._from=a,this._to=i,this._promises=void 0}active(){return this._active}update(t,e,n){if(this._active){this._notify(!1);const i=this._target[this._prop],o=n-this._start,a=this._duration-o;this._start=n,this._duration=Math.floor(Math.max(a,t.duration)),this._total+=o,this._loop=!!t.loop,this._to=cs([t.to,e,i,t.from]),this._from=cs([t.from,i,e])}}cancel(){this._active&&(this.tick(Date.now()),this._active=!1,this._notify(!1))}tick(t){const e=t-this._start,n=this._duration,i=this._prop,o=this._from,a=this._loop,r=this._to;let l;if(this._active=o!==r&&(a||e<n),!this._active){this._target[i]=r,this._notify(!0);return}if(e<0){this._target[i]=o;return}l=e/n%2,l=a&&l>1?2-l:l,l=this._easing(Math.min(1,Math.max(0,l))),this._target[i]=this._fn(o,r,l)}wait(){const t=this._promises||(this._promises=[]);return new Promise((e,n)=>{t.push({res:e,rej:n})})}_notify(t){const e=t?"res":"rej",n=this._promises||[];for(let i=0;i<n.length;i++)n[i][e]()}}class Pr{constructor(t,e){this._chart=t,this._properties=new Map,this.configure(e)}configure(t){if(!N(t))return;const e=Object.keys(st.animation),n=this._properties;Object.getOwnPropertyNames(t).forEach(i=>{const o=t[i];if(!N(o))return;const a={};for(const r of e)a[r]=o[r];(et(o.properties)&&o.properties||[i]).forEach(r=>{(r===i||!n.has(r))&&n.set(r,a)})})}_animateOptions(t,e){const n=e.options,i=Gc(t,n);if(!i)return[];const o=this._createAnimations(i,n);return n.$shared&&qc(t.options.$animations,n).then(()=>{t.options=n},()=>{}),o}_createAnimations(t,e){const n=this._properties,i=[],o=t.$animations||(t.$animations={}),a=Object.keys(e),r=Date.now();let l;for(l=a.length-1;l>=0;--l){const c=a[l];if(c.charAt(0)==="$")continue;if(c==="options"){i.push(...this._animateOptions(t,e));continue}const d=e[c];let h=o[c];const u=n.get(c);if(h)if(u&&h.active()){h.update(u,d,r);continue}else h.cancel();if(!u||!u.duration){t[c]=d;continue}o[c]=h=new Xc(u,t,c,d),i.push(h)}return i}update(t,e){if(this._properties.size===0){Object.assign(t,e);return}const n=this._createAnimations(t,e);if(n.length)return Qt.add(this._chart,n),!0}}function qc(s,t){const e=[],n=Object.keys(t);for(let i=0;i<n.length;i++){const o=s[n[i]];o&&o.active()&&e.push(o.wait())}return Promise.all(e)}function Gc(s,t){if(!t)return;let e=s.options;if(!e){s.options=t;return}return e.$shared&&(s.options=e=Object.assign({},e,{$shared:!1,$animations:{}})),e}function sa(s,t){const e=s&&s.options||{},n=e.reverse,i=e.min===void 0?t:0,o=e.max===void 0?t:0;return{start:n?o:i,end:n?i:o}}function Kc(s,t,e){if(e===!1)return!1;const n=sa(s,e),i=sa(t,e);return{top:i.end,right:n.end,bottom:i.start,left:n.start}}function Jc(s){let t,e,n,i;return N(s)?(t=s.top,e=s.right,n=s.bottom,i=s.left):t=e=n=i=s,{top:t,right:e,bottom:n,left:i,disabled:s===!1}}function Dr(s,t){const e=[],n=s._getSortedDatasetMetas(t);let i,o;for(i=0,o=n.length;i<o;++i)e.push(n[i].index);return e}function na(s,t,e,n={}){const i=s.keys,o=n.mode==="single";let a,r,l,c;if(t===null)return;let d=!1;for(a=0,r=i.length;a<r;++a){if(l=+i[a],l===e){if(d=!0,n.all)continue;break}c=s.values[l],nt(c)&&(o||t===0||Gt(t)===Gt(c))&&(t+=c)}return!d&&!n.all?0:t}function Zc(s,t){const{iScale:e,vScale:n}=t,i=e.axis==="x"?"x":"y",o=n.axis==="x"?"x":"y",a=Object.keys(s),r=new Array(a.length);let l,c,d;for(l=0,c=a.length;l<c;++l)d=a[l],r[l]={[i]:d,[o]:s[d]};return r}function Cn(s,t){const e=s&&s.options.stacked;return e||e===void 0&&t.stack!==void 0}function Qc(s,t,e){return`${s.id}.${t.id}.${e.stack||e.type}`}function td(s){const{min:t,max:e,minDefined:n,maxDefined:i}=s.getUserBounds();return{min:n?t:Number.NEGATIVE_INFINITY,max:i?e:Number.POSITIVE_INFINITY}}function ed(s,t,e){const n=s[t]||(s[t]={});return n[e]||(n[e]={})}function ia(s,t,e,n){for(const i of t.getMatchingVisibleMetas(n).reverse()){const o=s[i.index];if(e&&o>0||!e&&o<0)return i.index}return null}function oa(s,t){const{chart:e,_cachedMeta:n}=s,i=e._stacks||(e._stacks={}),{iScale:o,vScale:a,index:r}=n,l=o.axis,c=a.axis,d=Qc(o,a,n),h=t.length;let u;for(let f=0;f<h;++f){const p=t[f],{[l]:g,[c]:m}=p,b=p._stacks||(p._stacks={});u=b[c]=ed(i,d,g),u[r]=m,u._top=ia(u,a,!0,n.type),u._bottom=ia(u,a,!1,n.type);const v=u._visualValues||(u._visualValues={});v[r]=m}}function En(s,t){const e=s.scales;return Object.keys(e).filter(n=>e[n].axis===t).shift()}function sd(s,t){return Ce(s,{active:!1,dataset:void 0,datasetIndex:t,index:t,mode:"default",type:"dataset"})}function nd(s,t,e){return Ce(s,{active:!1,dataIndex:t,parsed:void 0,raw:void 0,element:e,index:t,mode:"default",type:"data"})}function ss(s,t){const e=s.controller.index,n=s.vScale&&s.vScale.axis;if(n){t=t||s._parsed;for(const i of t){const o=i._stacks;if(!o||o[n]===void 0||o[n][e]===void 0)return;delete o[n][e],o[n]._visualValues!==void 0&&o[n]._visualValues[e]!==void 0&&delete o[n]._visualValues[e]}}}const An=s=>s==="reset"||s==="none",aa=(s,t)=>t?s:Object.assign({},s),id=(s,t,e)=>s&&!t.hidden&&t._stacked&&{keys:Dr(e,!0),values:null};class Vt{constructor(t,e){this.chart=t,this._ctx=t.ctx,this.index=e,this._cachedDataOpts={},this._cachedMeta=this.getMeta(),this._type=this._cachedMeta.type,this.options=void 0,this._parsing=!1,this._data=void 0,this._objectData=void 0,this._sharedOptions=void 0,this._drawStart=void 0,this._drawCount=void 0,this.enableOptionSharing=!1,this.supportsDecimation=!1,this.$context=void 0,this._syncList=[],this.datasetElementType=new.target.datasetElementType,this.dataElementType=new.target.dataElementType,this.initialize()}initialize(){const t=this._cachedMeta;this.configure(),this.linkScales(),t._stacked=Cn(t.vScale,t),this.addElements(),this.options.fill&&!this.chart.isPluginEnabled("filler")&&console.warn("Tried to use the 'fill' option without the 'Filler' plugin enabled. Please import and register the 'Filler' plugin and make sure it is not disabled in the options")}updateIndex(t){this.index!==t&&ss(this._cachedMeta),this.index=t}linkScales(){const t=this.chart,e=this._cachedMeta,n=this.getDataset(),i=(h,u,f,p)=>h==="x"?u:h==="r"?p:f,o=e.xAxisID=B(n.xAxisID,En(t,"x")),a=e.yAxisID=B(n.yAxisID,En(t,"y")),r=e.rAxisID=B(n.rAxisID,En(t,"r")),l=e.indexAxis,c=e.iAxisID=i(l,o,a,r),d=e.vAxisID=i(l,a,o,r);e.xScale=this.getScaleForId(o),e.yScale=this.getScaleForId(a),e.rScale=this.getScaleForId(r),e.iScale=this.getScaleForId(c),e.vScale=this.getScaleForId(d)}getDataset(){return this.chart.data.datasets[this.index]}getMeta(){return this.chart.getDatasetMeta(this.index)}getScaleForId(t){return this.chart.scales[t]}_getOtherScale(t){const e=this._cachedMeta;return t===e.iScale?e.vScale:e.iScale}reset(){this._update("reset")}_destroy(){const t=this._cachedMeta;this._data&&Vo(this._data,this),t._stacked&&ss(t)}_dataCheck(){const t=this.getDataset(),e=t.data||(t.data=[]),n=this._data;if(N(e)){const i=this._cachedMeta;this._data=Zc(e,i)}else if(n!==e){if(n){Vo(n,this);const i=this._cachedMeta;ss(i),i._parsed=[]}e&&Object.isExtensible(e)&&Vl(e,this),this._syncList=[],this._data=e}}addElements(){const t=this._cachedMeta;this._dataCheck(),this.datasetElementType&&(t.dataset=new this.datasetElementType)}buildOrUpdateElements(t){const e=this._cachedMeta,n=this.getDataset();let i=!1;this._dataCheck();const o=e._stacked;e._stacked=Cn(e.vScale,e),e.stack!==n.stack&&(i=!0,ss(e),e.stack=n.stack),this._resyncElements(t),(i||o!==e._stacked)&&(oa(this,e._parsed),e._stacked=Cn(e.vScale,e))}configure(){const t=this.chart.config,e=t.datasetScopeKeys(this._type),n=t.getOptionScopes(this.getDataset(),e,!0);this.options=t.createResolver(n,this.getContext()),this._parsing=this.options.parsing,this._cachedDataOpts={}}parse(t,e){const{_cachedMeta:n,_data:i}=this,{iScale:o,_stacked:a}=n,r=o.axis;let l=t===0&&e===i.length?!0:n._sorted,c=t>0&&n._parsed[t-1],d,h,u;if(this._parsing===!1)n._parsed=i,n._sorted=!0,u=i;else{et(i[t])?u=this.parseArrayData(n,i,t,e):N(i[t])?u=this.parseObjectData(n,i,t,e):u=this.parsePrimitiveData(n,i,t,e);const f=()=>h[r]===null||c&&h[r]<c[r];for(d=0;d<e;++d)n._parsed[d+t]=h=u[d],l&&(f()&&(l=!1),c=h);n._sorted=l}a&&oa(this,u)}parsePrimitiveData(t,e,n,i){const{iScale:o,vScale:a}=t,r=o.axis,l=a.axis,c=o.getLabels(),d=o===a,h=new Array(i);let u,f,p;for(u=0,f=i;u<f;++u)p=u+n,h[u]={[r]:d||o.parse(c[p],p),[l]:a.parse(e[p],p)};return h}parseArrayData(t,e,n,i){const{xScale:o,yScale:a}=t,r=new Array(i);let l,c,d,h;for(l=0,c=i;l<c;++l)d=l+n,h=e[d],r[l]={x:o.parse(h[0],d),y:a.parse(h[1],d)};return r}parseObjectData(t,e,n,i){const{xScale:o,yScale:a}=t,{xAxisKey:r="x",yAxisKey:l="y"}=this._parsing,c=new Array(i);let d,h,u,f;for(d=0,h=i;d<h;++d)u=d+n,f=e[u],c[d]={x:o.parse(ve(f,r),u),y:a.parse(ve(f,l),u)};return c}getParsed(t){return this._cachedMeta._parsed[t]}getDataElement(t){return this._cachedMeta.data[t]}applyStack(t,e,n){const i=this.chart,o=this._cachedMeta,a=e[t.axis],r={keys:Dr(i,!0),values:e._stacks[t.axis]._visualValues};return na(r,a,o.index,{mode:n})}updateRangeFromParsed(t,e,n,i){const o=n[e.axis];let a=o===null?NaN:o;const r=i&&n._stacks[e.axis];i&&r&&(i.values=r,a=na(i,o,this._cachedMeta.index)),t.min=Math.min(t.min,a),t.max=Math.max(t.max,a)}getMinMax(t,e){const n=this._cachedMeta,i=n._parsed,o=n._sorted&&t===n.iScale,a=i.length,r=this._getOtherScale(t),l=id(e,n,this.chart),c={min:Number.POSITIVE_INFINITY,max:Number.NEGATIVE_INFINITY},{min:d,max:h}=td(r);let u,f;function p(){f=i[u];const g=f[r.axis];return!nt(f[t.axis])||d>g||h<g}for(u=0;u<a&&!(!p()&&(this.updateRangeFromParsed(c,t,f,l),o));++u);if(o){for(u=a-1;u>=0;--u)if(!p()){this.updateRangeFromParsed(c,t,f,l);break}}return c}getAllParsedValues(t){const e=this._cachedMeta._parsed,n=[];let i,o,a;for(i=0,o=e.length;i<o;++i)a=e[i][t.axis],nt(a)&&n.push(a);return n}getMaxOverflow(){return!1}getLabelAndValue(t){const e=this._cachedMeta,n=e.iScale,i=e.vScale,o=this.getParsed(t);return{label:n?""+n.getLabelForValue(o[n.axis]):"",value:i?""+i.getLabelForValue(o[i.axis]):""}}_update(t){const e=this._cachedMeta;this.update(t||"default"),e._clip=Jc(B(this.options.clip,Kc(e.xScale,e.yScale,this.getMaxOverflow())))}update(t){}draw(){const t=this._ctx,e=this.chart,n=this._cachedMeta,i=n.data||[],o=e.chartArea,a=[],r=this._drawStart||0,l=this._drawCount||i.length-r,c=this.options.drawActiveElementsOnTop;let d;for(n.dataset&&n.dataset.draw(t,o,r,l),d=r;d<r+l;++d){const h=i[d];h.hidden||(h.active&&c?a.push(h):h.draw(t,o))}for(d=0;d<a.length;++d)a[d].draw(t,o)}getStyle(t,e){const n=e?"active":"default";return t===void 0&&this._cachedMeta.dataset?this.resolveDatasetElementOptions(n):this.resolveDataElementOptions(t||0,n)}getContext(t,e,n){const i=this.getDataset();let o;if(t>=0&&t<this._cachedMeta.data.length){const a=this._cachedMeta.data[t];o=a.$context||(a.$context=nd(this.getContext(),t,a)),o.parsed=this.getParsed(t),o.raw=i.data[t],o.index=o.dataIndex=t}else o=this.$context||(this.$context=sd(this.chart.getContext(),this.index)),o.dataset=i,o.index=o.datasetIndex=this.index;return o.active=!!e,o.mode=n,o}resolveDatasetElementOptions(t){return this._resolveElementOptions(this.datasetElementType.id,t)}resolveDataElementOptions(t,e){return this._resolveElementOptions(this.dataElementType.id,e,t)}_resolveElementOptions(t,e="default",n){const i=e==="active",o=this._cachedDataOpts,a=t+"-"+e,r=o[a],l=this.enableOptionSharing&&Ss(n);if(r)return aa(r,l);const c=this.chart.config,d=c.datasetElementScopeKeys(this._type,t),h=i?[`${t}Hover`,"hover",t,""]:[t,""],u=c.getOptionScopes(this.getDataset(),d),f=Object.keys(st.elements[t]),p=()=>this.getContext(n,i,e),g=c.resolveNamedOptions(u,f,p,h);return g.$shared&&(g.$shared=l,o[a]=Object.freeze(aa(g,l))),g}_resolveAnimations(t,e,n){const i=this.chart,o=this._cachedDataOpts,a=`animation-${e}`,r=o[a];if(r)return r;let l;if(i.options.animation!==!1){const d=this.chart.config,h=d.datasetAnimationScopeKeys(this._type,e),u=d.getOptionScopes(this.getDataset(),h);l=d.createResolver(u,this.getContext(t,n,e))}const c=new Pr(i,l&&l.animations);return l&&l._cacheable&&(o[a]=Object.freeze(c)),c}getSharedOptions(t){if(t.$shared)return this._sharedOptions||(this._sharedOptions=Object.assign({},t))}includeOptions(t,e){return!e||An(t)||this.chart._animationsDisabled}_getSharedOptions(t,e){const n=this.resolveDataElementOptions(t,e),i=this._sharedOptions,o=this.getSharedOptions(n),a=this.includeOptions(e,o)||o!==i;return this.updateSharedOptions(o,e,n),{sharedOptions:o,includeOptions:a}}updateElement(t,e,n,i){An(i)?Object.assign(t,n):this._resolveAnimations(e,i).update(t,n)}updateSharedOptions(t,e,n){t&&!An(e)&&this._resolveAnimations(void 0,e).update(t,n)}_setStyle(t,e,n,i){t.active=i;const o=this.getStyle(e,i);this._resolveAnimations(e,n,i).update(t,{options:!i&&this.getSharedOptions(o)||o})}removeHoverStyle(t,e,n){this._setStyle(t,n,"active",!1)}setHoverStyle(t,e,n){this._setStyle(t,n,"active",!0)}_removeDatasetHoverStyle(){const t=this._cachedMeta.dataset;t&&this._setStyle(t,void 0,"active",!1)}_setDatasetHoverStyle(){const t=this._cachedMeta.dataset;t&&this._setStyle(t,void 0,"active",!0)}_resyncElements(t){const e=this._data,n=this._cachedMeta.data;for(const[r,l,c]of this._syncList)this[r](l,c);this._syncList=[];const i=n.length,o=e.length,a=Math.min(o,i);a&&this.parse(0,a),o>i?this._insertElements(i,o-i,t):o<i&&this._removeElements(o,i-o)}_insertElements(t,e,n=!0){const i=this._cachedMeta,o=i.data,a=t+e;let r;const l=c=>{for(c.length+=e,r=c.length-1;r>=a;r--)c[r]=c[r-e]};for(l(o),r=t;r<a;++r)o[r]=new this.dataElementType;this._parsing&&l(i._parsed),this.parse(t,e),n&&this.updateElements(o,t,e,"reset")}updateElements(t,e,n,i){}_removeElements(t,e){const n=this._cachedMeta;if(this._parsing){const i=n._parsed.splice(t,e);n._stacked&&ss(n,i)}n.data.splice(t,e)}_sync(t){if(this._parsing)this._syncList.push(t);else{const[e,n,i]=t;this[e](n,i)}this.chart._dataChanges.push([this.index,...t])}_onDataPush(){const t=arguments.length;this._sync(["_insertElements",this.getDataset().data.length-t,t])}_onDataPop(){this._sync(["_removeElements",this._cachedMeta.data.length-1,1])}_onDataShift(){this._sync(["_removeElements",0,1])}_onDataSplice(t,e){e&&this._sync(["_removeElements",t,e]);const n=arguments.length-2;n&&this._sync(["_insertElements",t,n])}_onDataUnshift(){this._sync(["_insertElements",0,arguments.length])}}C(Vt,"defaults",{}),C(Vt,"datasetElementType",null),C(Vt,"dataElementType",null);function od(s,t){if(!s._cache.$bar){const e=s.getMatchingVisibleMetas(t);let n=[];for(let i=0,o=e.length;i<o;i++)n=n.concat(e[i].controller.getAllParsedValues(s));s._cache.$bar=cr(n.sort((i,o)=>i-o))}return s._cache.$bar}function ad(s){const t=s.iScale,e=od(t,s.type);let n=t._length,i,o,a,r;const l=()=>{a===32767||a===-32768||(Ss(r)&&(n=Math.min(n,Math.abs(a-r)||n)),r=a)};for(i=0,o=e.length;i<o;++i)a=t.getPixelForValue(e[i]),l();for(r=void 0,i=0,o=t.ticks.length;i<o;++i)a=t.getPixelForTick(i),l();return n}function rd(s,t,e,n){const i=e.barThickness;let o,a;return j(i)?(o=t.min*e.categoryPercentage,a=e.barPercentage):(o=i*n,a=1),{chunk:o/n,ratio:a,start:t.pixels[s]-o/2}}function ld(s,t,e,n){const i=t.pixels,o=i[s];let a=s>0?i[s-1]:null,r=s<i.length-1?i[s+1]:null;const l=e.categoryPercentage;a===null&&(a=o-(r===null?t.end-t.start:r-o)),r===null&&(r=o+o-a);const c=o-(o-Math.min(a,r))/2*l;return{chunk:Math.abs(r-a)/2*l/n,ratio:e.barPercentage,start:c}}function cd(s,t,e,n){const i=e.parse(s[0],n),o=e.parse(s[1],n),a=Math.min(i,o),r=Math.max(i,o);let l=a,c=r;Math.abs(a)>Math.abs(r)&&(l=r,c=a),t[e.axis]=c,t._custom={barStart:l,barEnd:c,start:i,end:o,min:a,max:r}}function Tr(s,t,e,n){return et(s)?cd(s,t,e,n):t[e.axis]=e.parse(s,n),t}function ra(s,t,e,n){const i=s.iScale,o=s.vScale,a=i.getLabels(),r=i===o,l=[];let c,d,h,u;for(c=e,d=e+n;c<d;++c)u=t[c],h={},h[i.axis]=r||i.parse(a[c],c),l.push(Tr(u,h,o,c));return l}function Pn(s){return s&&s.barStart!==void 0&&s.barEnd!==void 0}function dd(s,t,e){return s!==0?Gt(s):(t.isHorizontal()?1:-1)*(t.min>=e?1:-1)}function hd(s){let t,e,n,i,o;return s.horizontal?(t=s.base>s.x,e="left",n="right"):(t=s.base<s.y,e="bottom",n="top"),t?(i="end",o="start"):(i="start",o="end"),{start:e,end:n,reverse:t,top:i,bottom:o}}function ud(s,t,e,n){let i=t.borderSkipped;const o={};if(!i){s.borderSkipped=o;return}if(i===!0){s.borderSkipped={top:!0,right:!0,bottom:!0,left:!0};return}const{start:a,end:r,reverse:l,top:c,bottom:d}=hd(s);i==="middle"&&e&&(s.enableBorderRadius=!0,(e._top||0)===n?i=c:(e._bottom||0)===n?i=d:(o[la(d,a,r,l)]=!0,i=c)),o[la(i,a,r,l)]=!0,s.borderSkipped=o}function la(s,t,e,n){return n?(s=fd(s,t,e),s=ca(s,e,t)):s=ca(s,t,e),s}function fd(s,t,e){return s===t?e:s===e?t:s}function ca(s,t,e){return s==="start"?t:s==="end"?e:s}function pd(s,{inflateAmount:t},e){s.inflateAmount=t==="auto"?e===1?.33:0:t}class Us extends Vt{parsePrimitiveData(t,e,n,i){return ra(t,e,n,i)}parseArrayData(t,e,n,i){return ra(t,e,n,i)}parseObjectData(t,e,n,i){const{iScale:o,vScale:a}=t,{xAxisKey:r="x",yAxisKey:l="y"}=this._parsing,c=o.axis==="x"?r:l,d=a.axis==="x"?r:l,h=[];let u,f,p,g;for(u=n,f=n+i;u<f;++u)g=e[u],p={},p[o.axis]=o.parse(ve(g,c),u),h.push(Tr(ve(g,d),p,a,u));return h}updateRangeFromParsed(t,e,n,i){super.updateRangeFromParsed(t,e,n,i);const o=n._custom;o&&e===this._cachedMeta.vScale&&(t.min=Math.min(t.min,o.min),t.max=Math.max(t.max,o.max))}getMaxOverflow(){return 0}getLabelAndValue(t){const e=this._cachedMeta,{iScale:n,vScale:i}=e,o=this.getParsed(t),a=o._custom,r=Pn(a)?"["+a.start+", "+a.end+"]":""+i.getLabelForValue(o[i.axis]);return{label:""+n.getLabelForValue(o[n.axis]),value:r}}initialize(){this.enableOptionSharing=!0,super.initialize();const t=this._cachedMeta;t.stack=this.getDataset().stack}update(t){const e=this._cachedMeta;this.updateElements(e.data,0,e.data.length,t)}updateElements(t,e,n,i){const o=i==="reset",{index:a,_cachedMeta:{vScale:r}}=this,l=r.getBasePixel(),c=r.isHorizontal(),d=this._getRuler(),{sharedOptions:h,includeOptions:u}=this._getSharedOptions(e,i);for(let f=e;f<e+n;f++){const p=this.getParsed(f),g=o||j(p[r.axis])?{base:l,head:l}:this._calculateBarValuePixels(f),m=this._calculateBarIndexPixels(f,d),b=(p._stacks||{})[r.axis],v={horizontal:c,base:g.base,enableBorderRadius:!b||Pn(p._custom)||a===b._top||a===b._bottom,x:c?g.head:m.center,y:c?m.center:g.head,height:c?m.size:Math.abs(g.size),width:c?Math.abs(g.size):m.size};u&&(v.options=h||this.resolveDataElementOptions(f,t[f].active?"active":i));const M=v.options||t[f].options;ud(v,M,b,a),pd(v,M,d.ratio),this.updateElement(t[f],f,v,i)}}_getStacks(t,e){const{iScale:n}=this._cachedMeta,i=n.getMatchingVisibleMetas(this._type).filter(d=>d.controller.options.grouped),o=n.options.stacked,a=[],r=this._cachedMeta.controller.getParsed(e),l=r&&r[n.axis],c=d=>{const h=d._parsed.find(f=>f[n.axis]===l),u=h&&h[d.vScale.axis];if(j(u)||isNaN(u))return!0};for(const d of i)if(!(e!==void 0&&c(d))&&((o===!1||a.indexOf(d.stack)===-1||o===void 0&&d.stack===void 0)&&a.push(d.stack),d.index===t))break;return a.length||a.push(void 0),a}_getStackCount(t){return this._getStacks(void 0,t).length}_getAxisCount(){return this._getAxis().length}getFirstScaleIdForIndexAxis(){const t=this.chart.scales,e=this.chart.options.indexAxis;return Object.keys(t).filter(n=>t[n].axis===e).shift()}_getAxis(){const t={},e=this.getFirstScaleIdForIndexAxis();for(const n of this.chart.data.datasets)t[B(this.chart.options.indexAxis==="x"?n.xAxisID:n.yAxisID,e)]=!0;return Object.keys(t)}_getStackIndex(t,e,n){const i=this._getStacks(t,n),o=e!==void 0?i.indexOf(e):-1;return o===-1?i.length-1:o}_getRuler(){const t=this.options,e=this._cachedMeta,n=e.iScale,i=[];let o,a;for(o=0,a=e.data.length;o<a;++o)i.push(n.getPixelForValue(this.getParsed(o)[n.axis],o));const r=t.barThickness;return{min:r||ad(e),pixels:i,start:n._startPixel,end:n._endPixel,stackCount:this._getStackCount(),scale:n,grouped:t.grouped,ratio:r?1:t.categoryPercentage*t.barPercentage}}_calculateBarValuePixels(t){const{_cachedMeta:{vScale:e,_stacked:n,index:i},options:{base:o,minBarLength:a}}=this,r=o||0,l=this.getParsed(t),c=l._custom,d=Pn(c);let h=l[e.axis],u=0,f=n?this.applyStack(e,l,n):h,p,g;f!==h&&(u=f-h,f=h),d&&(h=c.barStart,f=c.barEnd-c.barStart,h!==0&&Gt(h)!==Gt(c.barEnd)&&(u=0),u+=h);const m=!j(o)&&!d?o:u;let b=e.getPixelForValue(m);if(this.chart.getDataVisibility(t)?p=e.getPixelForValue(u+f):p=b,g=p-b,Math.abs(g)<a){g=dd(g,e,r)*a,h===r&&(b-=g/2);const v=e.getPixelForDecimal(0),M=e.getPixelForDecimal(1),k=Math.min(v,M),w=Math.max(v,M);b=Math.max(Math.min(b,w),k),p=b+g,n&&!d&&(l._stacks[e.axis]._visualValues[i]=e.getValueForPixel(p)-e.getValueForPixel(b))}if(b===e.getPixelForValue(r)){const v=Gt(g)*e.getLineWidthForValue(r)/2;b+=v,g-=v}return{size:g,base:b,head:p,center:p+g/2}}_calculateBarIndexPixels(t,e){const n=e.scale,i=this.options,o=i.skipNull,a=B(i.maxBarThickness,1/0);let r,l;const c=this._getAxisCount();if(e.grouped){const d=o?this._getStackCount(t):e.stackCount,h=i.barThickness==="flex"?ld(t,e,i,d*c):rd(t,e,i,d*c),u=this.chart.options.indexAxis==="x"?this.getDataset().xAxisID:this.getDataset().yAxisID,f=this._getAxis().indexOf(B(u,this.getFirstScaleIdForIndexAxis())),p=this._getStackIndex(this.index,this._cachedMeta.stack,o?t:void 0)+f;r=h.start+h.chunk*p+h.chunk/2,l=Math.min(a,h.chunk*h.ratio)}else r=n.getPixelForValue(this.getParsed(t)[n.axis],t),l=Math.min(a,e.min*e.ratio);return{base:r-l/2,head:r+l/2,center:r,size:l}}draw(){const t=this._cachedMeta,e=t.vScale,n=t.data,i=n.length;let o=0;for(;o<i;++o)this.getParsed(o)[e.axis]!==null&&!n[o].hidden&&n[o].draw(this._ctx)}}C(Us,"id","bar"),C(Us,"defaults",{datasetElementType:!1,dataElementType:"bar",categoryPercentage:.8,barPercentage:.9,grouped:!0,animations:{numbers:{type:"number",properties:["x","y","base","width","height"]}}}),C(Us,"overrides",{scales:{_index_:{type:"category",offset:!0,grid:{offset:!0}},_value_:{type:"linear",beginAtZero:!0}}});class Xs extends Vt{initialize(){this.enableOptionSharing=!0,super.initialize()}parsePrimitiveData(t,e,n,i){const o=super.parsePrimitiveData(t,e,n,i);for(let a=0;a<o.length;a++)o[a]._custom=this.resolveDataElementOptions(a+n).radius;return o}parseArrayData(t,e,n,i){const o=super.parseArrayData(t,e,n,i);for(let a=0;a<o.length;a++){const r=e[n+a];o[a]._custom=B(r[2],this.resolveDataElementOptions(a+n).radius)}return o}parseObjectData(t,e,n,i){const o=super.parseObjectData(t,e,n,i);for(let a=0;a<o.length;a++){const r=e[n+a];o[a]._custom=B(r&&r.r&&+r.r,this.resolveDataElementOptions(a+n).radius)}return o}getMaxOverflow(){const t=this._cachedMeta.data;let e=0;for(let n=t.length-1;n>=0;--n)e=Math.max(e,t[n].size(this.resolveDataElementOptions(n))/2);return e>0&&e}getLabelAndValue(t){const e=this._cachedMeta,n=this.chart.data.labels||[],{xScale:i,yScale:o}=e,a=this.getParsed(t),r=i.getLabelForValue(a.x),l=o.getLabelForValue(a.y),c=a._custom;return{label:n[t]||"",value:"("+r+", "+l+(c?", "+c:"")+")"}}update(t){const e=this._cachedMeta.data;this.updateElements(e,0,e.length,t)}updateElements(t,e,n,i){const o=i==="reset",{iScale:a,vScale:r}=this._cachedMeta,{sharedOptions:l,includeOptions:c}=this._getSharedOptions(e,i),d=a.axis,h=r.axis;for(let u=e;u<e+n;u++){const f=t[u],p=!o&&this.getParsed(u),g={},m=g[d]=o?a.getPixelForDecimal(.5):a.getPixelForValue(p[d]),b=g[h]=o?r.getBasePixel():r.getPixelForValue(p[h]);g.skip=isNaN(m)||isNaN(b),c&&(g.options=l||this.resolveDataElementOptions(u,f.active?"active":i),o&&(g.options.radius=0)),this.updateElement(f,u,g,i)}}resolveDataElementOptions(t,e){const n=this.getParsed(t);let i=super.resolveDataElementOptions(t,e);i.$shared&&(i=Object.assign({},i,{$shared:!1}));const o=i.radius;return e!=="active"&&(i.radius=0),i.radius+=B(n&&n._custom,o),i}}C(Xs,"id","bubble"),C(Xs,"defaults",{datasetElementType:!1,dataElementType:"point",animations:{numbers:{type:"number",properties:["x","y","borderWidth","radius"]}}}),C(Xs,"overrides",{scales:{x:{type:"linear"},y:{type:"linear"}}});function gd(s,t,e){let n=1,i=1,o=0,a=0;if(t<J){const r=s,l=r+t,c=Math.cos(r),d=Math.sin(r),h=Math.cos(l),u=Math.sin(l),f=(M,k,w)=>Cs(M,r,l,!0)?1:Math.max(k,k*e,w,w*e),p=(M,k,w)=>Cs(M,r,l,!0)?-1:Math.min(k,k*e,w,w*e),g=f(0,c,h),m=f(lt,d,u),b=p(V,c,h),v=p(V+lt,d,u);n=(g-b)/2,i=(m-v)/2,o=-(g+b)/2,a=-(m+v)/2}return{ratioX:n,ratioY:i,offsetX:o,offsetY:a}}class Oe extends Vt{constructor(t,e){super(t,e),this.enableOptionSharing=!0,this.innerRadius=void 0,this.outerRadius=void 0,this.offsetX=void 0,this.offsetY=void 0}linkScales(){}parse(t,e){const n=this.getDataset().data,i=this._cachedMeta;if(this._parsing===!1)i._parsed=n;else{let o=l=>+n[l];if(N(n[t])){const{key:l="value"}=this._parsing;o=c=>+ve(n[c],l)}let a,r;for(a=t,r=t+e;a<r;++a)i._parsed[a]=o(a)}}_getRotation(){return Nt(this.options.rotation-90)}_getCircumference(){return Nt(this.options.circumference)}_getRotationExtents(){let t=J,e=-J;for(let n=0;n<this.chart.data.datasets.length;++n)if(this.chart.isDatasetVisible(n)&&this.chart.getDatasetMeta(n).type===this._type){const i=this.chart.getDatasetMeta(n).controller,o=i._getRotation(),a=i._getCircumference();t=Math.min(t,o),e=Math.max(e,o+a)}return{rotation:t,circumference:e-t}}update(t){const e=this.chart,{chartArea:n}=e,i=this._cachedMeta,o=i.data,a=this.getMaxBorderWidth()+this.getMaxOffset(o)+this.options.spacing,r=Math.max((Math.min(n.width,n.height)-a)/2,0),l=Math.min(El(this.options.cutout,r),1),c=this._getRingWeight(this.index),{circumference:d,rotation:h}=this._getRotationExtents(),{ratioX:u,ratioY:f,offsetX:p,offsetY:g}=gd(h,d,l),m=(n.width-a)/u,b=(n.height-a)/f,v=Math.max(Math.min(m,b)/2,0),M=ir(this.options.radius,v),k=Math.max(M*l,0),w=(M-k)/this._getVisibleDatasetWeightTotal();this.offsetX=p*M,this.offsetY=g*M,i.total=this.calculateTotal(),this.outerRadius=M-w*this._getRingWeightOffset(this.index),this.innerRadius=Math.max(this.outerRadius-w*c,0),this.updateElements(o,0,o.length,t)}_circumference(t,e){const n=this.options,i=this._cachedMeta,o=this._getCircumference();return e&&n.animation.animateRotate||!this.chart.getDataVisibility(t)||i._parsed[t]===null||i.data[t].hidden?0:this.calculateCircumference(i._parsed[t]*o/J)}updateElements(t,e,n,i){const o=i==="reset",a=this.chart,r=a.chartArea,c=a.options.animation,d=(r.left+r.right)/2,h=(r.top+r.bottom)/2,u=o&&c.animateScale,f=u?0:this.innerRadius,p=u?0:this.outerRadius,{sharedOptions:g,includeOptions:m}=this._getSharedOptions(e,i);let b=this._getRotation(),v;for(v=0;v<e;++v)b+=this._circumference(v,o);for(v=e;v<e+n;++v){const M=this._circumference(v,o),k=t[v],w={x:d+this.offsetX,y:h+this.offsetY,startAngle:b,endAngle:b+M,circumference:M,outerRadius:p,innerRadius:f};m&&(w.options=g||this.resolveDataElementOptions(v,k.active?"active":i)),b+=M,this.updateElement(k,v,w,i)}}calculateTotal(){const t=this._cachedMeta,e=t.data;let n=0,i;for(i=0;i<e.length;i++){const o=t._parsed[i];o!==null&&!isNaN(o)&&this.chart.getDataVisibility(i)&&!e[i].hidden&&(n+=Math.abs(o))}return n}calculateCircumference(t){const e=this._cachedMeta.total;return e>0&&!isNaN(t)?J*(Math.abs(t)/e):0}getLabelAndValue(t){const e=this._cachedMeta,n=this.chart,i=n.data.labels||[],o=Ls(e._parsed[t],n.options.locale);return{label:i[t]||"",value:o}}getMaxBorderWidth(t){let e=0;const n=this.chart;let i,o,a,r,l;if(!t){for(i=0,o=n.data.datasets.length;i<o;++i)if(n.isDatasetVisible(i)){a=n.getDatasetMeta(i),t=a.data,r=a.controller;break}}if(!t)return 0;for(i=0,o=t.length;i<o;++i)l=r.resolveDataElementOptions(i),l.borderAlign!=="inner"&&(e=Math.max(e,l.borderWidth||0,l.hoverBorderWidth||0));return e}getMaxOffset(t){let e=0;for(let n=0,i=t.length;n<i;++n){const o=this.resolveDataElementOptions(n);e=Math.max(e,o.offset||0,o.hoverOffset||0)}return e}_getRingWeightOffset(t){let e=0;for(let n=0;n<t;++n)this.chart.isDatasetVisible(n)&&(e+=this._getRingWeight(n));return e}_getRingWeight(t){return Math.max(B(this.chart.data.datasets[t].weight,1),0)}_getVisibleDatasetWeightTotal(){return this._getRingWeightOffset(this.chart.data.datasets.length)||1}}C(Oe,"id","doughnut"),C(Oe,"defaults",{datasetElementType:!1,dataElementType:"arc",animation:{animateRotate:!0,animateScale:!1},animations:{numbers:{type:"number",properties:["circumference","endAngle","innerRadius","outerRadius","startAngle","x","y","offset","borderWidth","spacing"]}},cutout:"50%",rotation:0,circumference:360,radius:"100%",spacing:0,indexAxis:"r"}),C(Oe,"descriptors",{_scriptable:t=>t!=="spacing",_indexable:t=>t!=="spacing"&&!t.startsWith("borderDash")&&!t.startsWith("hoverBorderDash")}),C(Oe,"overrides",{aspectRatio:1,plugins:{legend:{labels:{generateLabels(t){const e=t.data,{labels:{pointStyle:n,textAlign:i,color:o,useBorderRadius:a,borderRadius:r}}=t.legend.options;return e.labels.length&&e.datasets.length?e.labels.map((l,c)=>{const h=t.getDatasetMeta(0).controller.getStyle(c);return{text:l,fillStyle:h.backgroundColor,fontColor:o,hidden:!t.getDataVisibility(c),lineDash:h.borderDash,lineDashOffset:h.borderDashOffset,lineJoin:h.borderJoinStyle,lineWidth:h.borderWidth,strokeStyle:h.borderColor,textAlign:i,pointStyle:n,borderRadius:a&&(r||h.borderRadius),index:c}}):[]}},onClick(t,e,n){n.chart.toggleDataVisibility(e.index),n.chart.update()}}}});class qs extends Vt{initialize(){this.enableOptionSharing=!0,this.supportsDecimation=!0,super.initialize()}update(t){const e=this._cachedMeta,{dataset:n,data:i=[],_dataset:o}=e,a=this.chart._animationsDisabled;let{start:r,count:l}=ur(e,i,a);this._drawStart=r,this._drawCount=l,fr(e)&&(r=0,l=i.length),n._chart=this.chart,n._datasetIndex=this.index,n._decimated=!!o._decimated,n.points=i;const c=this.resolveDatasetElementOptions(t);this.options.showLine||(c.borderWidth=0),c.segment=this.options.segment,this.updateElement(n,void 0,{animated:!a,options:c},t),this.updateElements(i,r,l,t)}updateElements(t,e,n,i){const o=i==="reset",{iScale:a,vScale:r,_stacked:l,_dataset:c}=this._cachedMeta,{sharedOptions:d,includeOptions:h}=this._getSharedOptions(e,i),u=a.axis,f=r.axis,{spanGaps:p,segment:g}=this.options,m=Ze(p)?p:Number.POSITIVE_INFINITY,b=this.chart._animationsDisabled||o||i==="none",v=e+n,M=t.length;let k=e>0&&this.getParsed(e-1);for(let w=0;w<M;++w){const E=t[w],P=b?E:{};if(w<e||w>=v){P.skip=!0;continue}const D=this.getParsed(w),$=j(D[f]),R=P[u]=a.getPixelForValue(D[u],w),F=P[f]=o||$?r.getBasePixel():r.getPixelForValue(l?this.applyStack(r,D,l):D[f],w);P.skip=isNaN(R)||isNaN(F)||$,P.stop=w>0&&Math.abs(D[u]-k[u])>m,g&&(P.parsed=D,P.raw=c.data[w]),h&&(P.options=d||this.resolveDataElementOptions(w,E.active?"active":i)),b||this.updateElement(E,w,P,i),k=D}}getMaxOverflow(){const t=this._cachedMeta,e=t.dataset,n=e.options&&e.options.borderWidth||0,i=t.data||[];if(!i.length)return n;const o=i[0].size(this.resolveDataElementOptions(0)),a=i[i.length-1].size(this.resolveDataElementOptions(i.length-1));return Math.max(n,o,a)/2}draw(){const t=this._cachedMeta;t.dataset.updateControlPoints(this.chart.chartArea,t.iScale.axis),super.draw()}}C(qs,"id","line"),C(qs,"defaults",{datasetElementType:"line",dataElementType:"point",showLine:!0,spanGaps:!1}),C(qs,"overrides",{scales:{_index_:{type:"category"},_value_:{type:"linear"}}});class _s extends Vt{constructor(t,e){super(t,e),this.innerRadius=void 0,this.outerRadius=void 0}getLabelAndValue(t){const e=this._cachedMeta,n=this.chart,i=n.data.labels||[],o=Ls(e._parsed[t].r,n.options.locale);return{label:i[t]||"",value:o}}parseObjectData(t,e,n,i){return _r.bind(this)(t,e,n,i)}update(t){const e=this._cachedMeta.data;this._updateRadius(),this.updateElements(e,0,e.length,t)}getMinMax(){const t=this._cachedMeta,e={min:Number.POSITIVE_INFINITY,max:Number.NEGATIVE_INFINITY};return t.data.forEach((n,i)=>{const o=this.getParsed(i).r;!isNaN(o)&&this.chart.getDataVisibility(i)&&(o<e.min&&(e.min=o),o>e.max&&(e.max=o))}),e}_updateRadius(){const t=this.chart,e=t.chartArea,n=t.options,i=Math.min(e.right-e.left,e.bottom-e.top),o=Math.max(i/2,0),a=Math.max(n.cutoutPercentage?o/100*n.cutoutPercentage:1,0),r=(o-a)/t.getVisibleDatasetCount();this.outerRadius=o-r*this.index,this.innerRadius=this.outerRadius-r}updateElements(t,e,n,i){const o=i==="reset",a=this.chart,l=a.options.animation,c=this._cachedMeta.rScale,d=c.xCenter,h=c.yCenter,u=c.getIndexAngle(0)-.5*V;let f=u,p;const g=360/this.countVisibleElements();for(p=0;p<e;++p)f+=this._computeAngle(p,i,g);for(p=e;p<e+n;p++){const m=t[p];let b=f,v=f+this._computeAngle(p,i,g),M=a.getDataVisibility(p)?c.getDistanceFromCenterForValue(this.getParsed(p).r):0;f=v,o&&(l.animateScale&&(M=0),l.animateRotate&&(b=v=u));const k={x:d,y:h,innerRadius:0,outerRadius:M,startAngle:b,endAngle:v,options:this.resolveDataElementOptions(p,m.active?"active":i)};this.updateElement(m,p,k,i)}}countVisibleElements(){const t=this._cachedMeta;let e=0;return t.data.forEach((n,i)=>{!isNaN(this.getParsed(i).r)&&this.chart.getDataVisibility(i)&&e++}),e}_computeAngle(t,e,n){return this.chart.getDataVisibility(t)?Nt(this.resolveDataElementOptions(t,e).angle||n):0}}C(_s,"id","polarArea"),C(_s,"defaults",{dataElementType:"arc",animation:{animateRotate:!0,animateScale:!0},animations:{numbers:{type:"number",properties:["x","y","startAngle","endAngle","innerRadius","outerRadius"]}},indexAxis:"r",startAngle:0}),C(_s,"overrides",{aspectRatio:1,plugins:{legend:{labels:{generateLabels(t){const e=t.data;if(e.labels.length&&e.datasets.length){const{labels:{pointStyle:n,color:i}}=t.legend.options;return e.labels.map((o,a)=>{const l=t.getDatasetMeta(0).controller.getStyle(a);return{text:o,fillStyle:l.backgroundColor,strokeStyle:l.borderColor,fontColor:i,lineWidth:l.borderWidth,pointStyle:n,hidden:!t.getDataVisibility(a),index:a}})}return[]}},onClick(t,e,n){n.chart.toggleDataVisibility(e.index),n.chart.update()}}},scales:{r:{type:"radialLinear",angleLines:{display:!1},beginAtZero:!0,grid:{circular:!0},pointLabels:{display:!1},startAngle:0}}});class Yn extends Oe{}C(Yn,"id","pie"),C(Yn,"defaults",{cutout:0,rotation:0,circumference:360,radius:"100%"});class Gs extends Vt{getLabelAndValue(t){const e=this._cachedMeta.vScale,n=this.getParsed(t);return{label:e.getLabels()[t],value:""+e.getLabelForValue(n[e.axis])}}parseObjectData(t,e,n,i){return _r.bind(this)(t,e,n,i)}update(t){const e=this._cachedMeta,n=e.dataset,i=e.data||[],o=e.iScale.getLabels();if(n.points=i,t!=="resize"){const a=this.resolveDatasetElementOptions(t);this.options.showLine||(a.borderWidth=0);const r={_loop:!0,_fullLoop:o.length===i.length,options:a};this.updateElement(n,void 0,r,t)}this.updateElements(i,0,i.length,t)}updateElements(t,e,n,i){const o=this._cachedMeta.rScale,a=i==="reset";for(let r=e;r<e+n;r++){const l=t[r],c=this.resolveDataElementOptions(r,l.active?"active":i),d=o.getPointPositionForValue(r,this.getParsed(r).r),h=a?o.xCenter:d.x,u=a?o.yCenter:d.y,f={x:h,y:u,angle:d.angle,skip:isNaN(h)||isNaN(u),options:c};this.updateElement(l,r,f,i)}}}C(Gs,"id","radar"),C(Gs,"defaults",{datasetElementType:"line",dataElementType:"point",indexAxis:"r",showLine:!0,elements:{line:{fill:"start"}}}),C(Gs,"overrides",{aspectRatio:1,scales:{r:{type:"radialLinear"}}});class Ks extends Vt{getLabelAndValue(t){const e=this._cachedMeta,n=this.chart.data.labels||[],{xScale:i,yScale:o}=e,a=this.getParsed(t),r=i.getLabelForValue(a.x),l=o.getLabelForValue(a.y);return{label:n[t]||"",value:"("+r+", "+l+")"}}update(t){const e=this._cachedMeta,{data:n=[]}=e,i=this.chart._animationsDisabled;let{start:o,count:a}=ur(e,n,i);if(this._drawStart=o,this._drawCount=a,fr(e)&&(o=0,a=n.length),this.options.showLine){this.datasetElementType||this.addElements();const{dataset:r,_dataset:l}=e;r._chart=this.chart,r._datasetIndex=this.index,r._decimated=!!l._decimated,r.points=n;const c=this.resolveDatasetElementOptions(t);c.segment=this.options.segment,this.updateElement(r,void 0,{animated:!i,options:c},t)}else this.datasetElementType&&(delete e.dataset,this.datasetElementType=!1);this.updateElements(n,o,a,t)}addElements(){const{showLine:t}=this.options;!this.datasetElementType&&t&&(this.datasetElementType=this.chart.registry.getElement("line")),super.addElements()}updateElements(t,e,n,i){const o=i==="reset",{iScale:a,vScale:r,_stacked:l,_dataset:c}=this._cachedMeta,d=this.resolveDataElementOptions(e,i),h=this.getSharedOptions(d),u=this.includeOptions(i,h),f=a.axis,p=r.axis,{spanGaps:g,segment:m}=this.options,b=Ze(g)?g:Number.POSITIVE_INFINITY,v=this.chart._animationsDisabled||o||i==="none";let M=e>0&&this.getParsed(e-1);for(let k=e;k<e+n;++k){const w=t[k],E=this.getParsed(k),P=v?w:{},D=j(E[p]),$=P[f]=a.getPixelForValue(E[f],k),R=P[p]=o||D?r.getBasePixel():r.getPixelForValue(l?this.applyStack(r,E,l):E[p],k);P.skip=isNaN($)||isNaN(R)||D,P.stop=k>0&&Math.abs(E[f]-M[f])>b,m&&(P.parsed=E,P.raw=c.data[k]),u&&(P.options=h||this.resolveDataElementOptions(k,w.active?"active":i)),v||this.updateElement(w,k,P,i),M=E}this.updateSharedOptions(h,i,d)}getMaxOverflow(){const t=this._cachedMeta,e=t.data||[];if(!this.options.showLine){let r=0;for(let l=e.length-1;l>=0;--l)r=Math.max(r,e[l].size(this.resolveDataElementOptions(l))/2);return r>0&&r}const n=t.dataset,i=n.options&&n.options.borderWidth||0;if(!e.length)return i;const o=e[0].size(this.resolveDataElementOptions(0)),a=e[e.length-1].size(this.resolveDataElementOptions(e.length-1));return Math.max(i,o,a)/2}}C(Ks,"id","scatter"),C(Ks,"defaults",{datasetElementType:!1,dataElementType:"point",showLine:!1,fill:!1}),C(Ks,"overrides",{interaction:{mode:"point"},scales:{x:{type:"linear"},y:{type:"linear"}}});var md=Object.freeze({__proto__:null,BarController:Us,BubbleController:Xs,DoughnutController:Oe,LineController:qs,PieController:Yn,PolarAreaController:_s,RadarController:Gs,ScatterController:Ks});function De(){throw new Error("This method is not implemented: Check that a complete date adapter is provided.")}class wi{constructor(t){C(this,"options");this.options=t||{}}static override(t){Object.assign(wi.prototype,t)}init(){}formats(){return De()}parse(){return De()}format(){return De()}add(){return De()}diff(){return De()}startOf(){return De()}endOf(){return De()}}var bd={_date:wi};function xd(s,t,e,n){const{controller:i,data:o,_sorted:a}=s,r=i._cachedMeta.iScale,l=s.dataset&&s.dataset.options?s.dataset.options.spanGaps:null;if(r&&t===r.axis&&t!=="r"&&a&&o.length){const c=r._reversePixels?jl:ie;if(n){if(i._sharedOptions){const d=o[0],h=typeof d.getRange=="function"&&d.getRange(t);if(h){const u=c(o,t,e-h),f=c(o,t,e+h);return{lo:u.lo,hi:f.hi}}}}else{const d=c(o,t,e);if(l){const{vScale:h}=i._cachedMeta,{_parsed:u}=s,f=u.slice(0,d.lo+1).reverse().findIndex(g=>!j(g[h.axis]));d.lo-=Math.max(0,f);const p=u.slice(d.hi).findIndex(g=>!j(g[h.axis]));d.hi+=Math.max(0,p)}return d}}return{lo:0,hi:o.length-1}}function yn(s,t,e,n,i){const o=s.getSortedVisibleDatasetMetas(),a=e[t];for(let r=0,l=o.length;r<l;++r){const{index:c,data:d}=o[r],{lo:h,hi:u}=xd(o[r],t,a,i);for(let f=h;f<=u;++f){const p=d[f];p.skip||n(p,c,f)}}}function yd(s){const t=s.indexOf("x")!==-1,e=s.indexOf("y")!==-1;return function(n,i){const o=t?Math.abs(n.x-i.x):0,a=e?Math.abs(n.y-i.y):0;return Math.sqrt(Math.pow(o,2)+Math.pow(a,2))}}function Dn(s,t,e,n,i){const o=[];return!i&&!s.isPointInArea(t)||yn(s,e,t,function(r,l,c){!i&&!oe(r,s.chartArea,0)||r.inRange(t.x,t.y,n)&&o.push({element:r,datasetIndex:l,index:c})},!0),o}function vd(s,t,e,n){let i=[];function o(a,r,l){const{startAngle:c,endAngle:d}=a.getProps(["startAngle","endAngle"],n),{angle:h}=rr(a,{x:t.x,y:t.y});Cs(h,c,d)&&i.push({element:a,datasetIndex:r,index:l})}return yn(s,e,t,o),i}function _d(s,t,e,n,i,o){let a=[];const r=yd(e);let l=Number.POSITIVE_INFINITY;function c(d,h,u){const f=d.inRange(t.x,t.y,i);if(n&&!f)return;const p=d.getCenterPoint(i);if(!(!!o||s.isPointInArea(p))&&!f)return;const m=r(t,p);m<l?(a=[{element:d,datasetIndex:h,index:u}],l=m):m===l&&a.push({element:d,datasetIndex:h,index:u})}return yn(s,e,t,c),a}function Tn(s,t,e,n,i,o){return!o&&!s.isPointInArea(t)?[]:e==="r"&&!n?vd(s,t,e,i):_d(s,t,e,n,i,o)}function da(s,t,e,n,i){const o=[],a=e==="x"?"inXRange":"inYRange";let r=!1;return yn(s,e,t,(l,c,d)=>{l[a]&&l[a](t[e],i)&&(o.push({element:l,datasetIndex:c,index:d}),r=r||l.inRange(t.x,t.y,i))}),n&&!r?[]:o}var wd={modes:{index(s,t,e,n){const i=Le(t,s),o=e.axis||"x",a=e.includeInvisible||!1,r=e.intersect?Dn(s,i,o,n,a):Tn(s,i,o,!1,n,a),l=[];return r.length?(s.getSortedVisibleDatasetMetas().forEach(c=>{const d=r[0].index,h=c.data[d];h&&!h.skip&&l.push({element:h,datasetIndex:c.index,index:d})}),l):[]},dataset(s,t,e,n){const i=Le(t,s),o=e.axis||"xy",a=e.includeInvisible||!1;let r=e.intersect?Dn(s,i,o,n,a):Tn(s,i,o,!1,n,a);if(r.length>0){const l=r[0].datasetIndex,c=s.getDatasetMeta(l).data;r=[];for(let d=0;d<c.length;++d)r.push({element:c[d],datasetIndex:l,index:d})}return r},point(s,t,e,n){const i=Le(t,s),o=e.axis||"xy",a=e.includeInvisible||!1;return Dn(s,i,o,n,a)},nearest(s,t,e,n){const i=Le(t,s),o=e.axis||"xy",a=e.includeInvisible||!1;return Tn(s,i,o,e.intersect,n,a)},x(s,t,e,n){const i=Le(t,s);return da(s,i,"x",e.intersect,n)},y(s,t,e,n){const i=Le(t,s);return da(s,i,"y",e.intersect,n)}}};const Lr=["left","top","right","bottom"];function ns(s,t){return s.filter(e=>e.pos===t)}function ha(s,t){return s.filter(e=>Lr.indexOf(e.pos)===-1&&e.box.axis===t)}function is(s,t){return s.sort((e,n)=>{const i=t?n:e,o=t?e:n;return i.weight===o.weight?i.index-o.index:i.weight-o.weight})}function kd(s){const t=[];let e,n,i,o,a,r;for(e=0,n=(s||[]).length;e<n;++e)i=s[e],{position:o,options:{stack:a,stackWeight:r=1}}=i,t.push({index:e,box:i,pos:o,horizontal:i.isHorizontal(),weight:i.weight,stack:a&&o+a,stackWeight:r});return t}function Md(s){const t={};for(const e of s){const{stack:n,pos:i,stackWeight:o}=e;if(!n||!Lr.includes(i))continue;const a=t[n]||(t[n]={count:0,placed:0,weight:0,size:0});a.count++,a.weight+=o}return t}function Sd(s,t){const e=Md(s),{vBoxMaxWidth:n,hBoxMaxHeight:i}=t;let o,a,r;for(o=0,a=s.length;o<a;++o){r=s[o];const{fullSize:l}=r.box,c=e[r.stack],d=c&&r.stackWeight/c.weight;r.horizontal?(r.width=d?d*n:l&&t.availableWidth,r.height=i):(r.width=n,r.height=d?d*i:l&&t.availableHeight)}return e}function Cd(s){const t=kd(s),e=is(t.filter(c=>c.box.fullSize),!0),n=is(ns(t,"left"),!0),i=is(ns(t,"right")),o=is(ns(t,"top"),!0),a=is(ns(t,"bottom")),r=ha(t,"x"),l=ha(t,"y");return{fullSize:e,leftAndTop:n.concat(o),rightAndBottom:i.concat(l).concat(a).concat(r),chartArea:ns(t,"chartArea"),vertical:n.concat(i).concat(l),horizontal:o.concat(a).concat(r)}}function ua(s,t,e,n){return Math.max(s[e],t[e])+Math.max(s[n],t[n])}function Ir(s,t){s.top=Math.max(s.top,t.top),s.left=Math.max(s.left,t.left),s.bottom=Math.max(s.bottom,t.bottom),s.right=Math.max(s.right,t.right)}function Ed(s,t,e,n){const{pos:i,box:o}=e,a=s.maxPadding;if(!N(i)){e.size&&(s[i]-=e.size);const h=n[e.stack]||{size:0,count:1};h.size=Math.max(h.size,e.horizontal?o.height:o.width),e.size=h.size/h.count,s[i]+=e.size}o.getPadding&&Ir(a,o.getPadding());const r=Math.max(0,t.outerWidth-ua(a,s,"left","right")),l=Math.max(0,t.outerHeight-ua(a,s,"top","bottom")),c=r!==s.w,d=l!==s.h;return s.w=r,s.h=l,e.horizontal?{same:c,other:d}:{same:d,other:c}}function Ad(s){const t=s.maxPadding;function e(n){const i=Math.max(t[n]-s[n],0);return s[n]+=i,i}s.y+=e("top"),s.x+=e("left"),e("right"),e("bottom")}function Pd(s,t){const e=t.maxPadding;function n(i){const o={left:0,top:0,right:0,bottom:0};return i.forEach(a=>{o[a]=Math.max(t[a],e[a])}),o}return n(s?["left","right"]:["top","bottom"])}function ds(s,t,e,n){const i=[];let o,a,r,l,c,d;for(o=0,a=s.length,c=0;o<a;++o){r=s[o],l=r.box,l.update(r.width||t.w,r.height||t.h,Pd(r.horizontal,t));const{same:h,other:u}=Ed(t,e,r,n);c|=h&&i.length,d=d||u,l.fullSize||i.push(r)}return c&&ds(i,t,e,n)||d}function zs(s,t,e,n,i){s.top=e,s.left=t,s.right=t+n,s.bottom=e+i,s.width=n,s.height=i}function fa(s,t,e,n){const i=e.padding;let{x:o,y:a}=t;for(const r of s){const l=r.box,c=n[r.stack]||{placed:0,weight:1},d=r.stackWeight/c.weight||1;if(r.horizontal){const h=t.w*d,u=c.size||l.height;Ss(c.start)&&(a=c.start),l.fullSize?zs(l,i.left,a,e.outerWidth-i.right-i.left,u):zs(l,t.left+c.placed,a,h,u),c.start=a,c.placed+=h,a=l.bottom}else{const h=t.h*d,u=c.size||l.width;Ss(c.start)&&(o=c.start),l.fullSize?zs(l,o,i.top,u,e.outerHeight-i.bottom-i.top):zs(l,o,t.top+c.placed,u,h),c.start=o,c.placed+=h,o=l.right}}t.x=o,t.y=a}var Mt={addBox(s,t){s.boxes||(s.boxes=[]),t.fullSize=t.fullSize||!1,t.position=t.position||"top",t.weight=t.weight||0,t._layers=t._layers||function(){return[{z:0,draw(e){t.draw(e)}}]},s.boxes.push(t)},removeBox(s,t){const e=s.boxes?s.boxes.indexOf(t):-1;e!==-1&&s.boxes.splice(e,1)},configure(s,t,e){t.fullSize=e.fullSize,t.position=e.position,t.weight=e.weight},update(s,t,e,n){if(!s)return;const i=St(s.options.layout.padding),o=Math.max(t-i.width,0),a=Math.max(e-i.height,0),r=Cd(s.boxes),l=r.vertical,c=r.horizontal;U(s.boxes,g=>{typeof g.beforeLayout=="function"&&g.beforeLayout()});const d=l.reduce((g,m)=>m.box.options&&m.box.options.display===!1?g:g+1,0)||1,h=Object.freeze({outerWidth:t,outerHeight:e,padding:i,availableWidth:o,availableHeight:a,vBoxMaxWidth:o/2/d,hBoxMaxHeight:a/2}),u=Object.assign({},i);Ir(u,St(n));const f=Object.assign({maxPadding:u,w:o,h:a,x:i.left,y:i.top},i),p=Sd(l.concat(c),h);ds(r.fullSize,f,h,p),ds(l,f,h,p),ds(c,f,h,p)&&ds(l,f,h,p),Ad(f),fa(r.leftAndTop,f,h,p),f.x+=f.w,f.y+=f.h,fa(r.rightAndBottom,f,h,p),s.chartArea={left:f.left,top:f.top,right:f.left+f.w,bottom:f.top+f.h,height:f.h,width:f.w},U(r.chartArea,g=>{const m=g.box;Object.assign(m,s.chartArea),m.update(f.w,f.h,{left:0,top:0,right:0,bottom:0})})}};class $r{acquireContext(t,e){}releaseContext(t){return!1}addEventListener(t,e,n){}removeEventListener(t,e,n){}getDevicePixelRatio(){return 1}getMaximumSize(t,e,n,i){return e=Math.max(0,e||t.width),n=n||t.height,{width:e,height:Math.max(0,i?Math.floor(e/i):n)}}isAttached(t){return!0}updateConfig(t){}}class Dd extends $r{acquireContext(t){return t&&t.getContext&&t.getContext("2d")||null}updateConfig(t){t.options.animation=!1}}const Js="$chartjs",Td={touchstart:"mousedown",touchmove:"mousemove",touchend:"mouseup",pointerenter:"mouseenter",pointerdown:"mousedown",pointermove:"mousemove",pointerup:"mouseup",pointerleave:"mouseout",pointerout:"mouseout"},pa=s=>s===null||s==="";function Ld(s,t){const e=s.style,n=s.getAttribute("height"),i=s.getAttribute("width");if(s[Js]={initial:{height:n,width:i,style:{display:e.display,height:e.height,width:e.width}}},e.display=e.display||"block",e.boxSizing=e.boxSizing||"border-box",pa(i)){const o=Jo(s,"width");o!==void 0&&(s.width=o)}if(pa(n))if(s.style.height==="")s.height=s.width/(t||2);else{const o=Jo(s,"height");o!==void 0&&(s.height=o)}return s}const Or=Ic?{passive:!0}:!1;function Id(s,t,e){s&&s.addEventListener(t,e,Or)}function $d(s,t,e){s&&s.canvas&&s.canvas.removeEventListener(t,e,Or)}function Od(s,t){const e=Td[s.type]||s.type,{x:n,y:i}=Le(s,t);return{type:e,chart:t,native:s,x:n!==void 0?n:null,y:i!==void 0?i:null}}function dn(s,t){for(const e of s)if(e===t||e.contains(t))return!0}function Bd(s,t,e){const n=s.canvas,i=new MutationObserver(o=>{let a=!1;for(const r of o)a=a||dn(r.addedNodes,n),a=a&&!dn(r.removedNodes,n);a&&e()});return i.observe(document,{childList:!0,subtree:!0}),i}function Rd(s,t,e){const n=s.canvas,i=new MutationObserver(o=>{let a=!1;for(const r of o)a=a||dn(r.removedNodes,n),a=a&&!dn(r.addedNodes,n);a&&e()});return i.observe(document,{childList:!0,subtree:!0}),i}const As=new Map;let ga=0;function Br(){const s=window.devicePixelRatio;s!==ga&&(ga=s,As.forEach((t,e)=>{e.currentDevicePixelRatio!==s&&t()}))}function Fd(s,t){As.size||window.addEventListener("resize",Br),As.set(s,t)}function zd(s){As.delete(s),As.size||window.removeEventListener("resize",Br)}function jd(s,t,e){const n=s.canvas,i=n&&_i(n);if(!i)return;const o=hr((r,l)=>{const c=i.clientWidth;e(r,l),c<i.clientWidth&&e()},window),a=new ResizeObserver(r=>{const l=r[0],c=l.contentRect.width,d=l.contentRect.height;c===0&&d===0||o(c,d)});return a.observe(i),Fd(s,o),a}function Ln(s,t,e){e&&e.disconnect(),t==="resize"&&zd(s)}function Nd(s,t,e){const n=s.canvas,i=hr(o=>{s.ctx!==null&&e(Od(o,s))},s);return Id(n,t,i),i}class Vd extends $r{acquireContext(t,e){const n=t&&t.getContext&&t.getContext("2d");return n&&n.canvas===t?(Ld(t,e),n):null}releaseContext(t){const e=t.canvas;if(!e[Js])return!1;const n=e[Js].initial;["height","width"].forEach(o=>{const a=n[o];j(a)?e.removeAttribute(o):e.setAttribute(o,a)});const i=n.style||{};return Object.keys(i).forEach(o=>{e.style[o]=i[o]}),e.width=e.width,delete e[Js],!0}addEventListener(t,e,n){this.removeEventListener(t,e);const i=t.$proxies||(t.$proxies={}),a={attach:Bd,detach:Rd,resize:jd}[e]||Nd;i[e]=a(t,e,n)}removeEventListener(t,e){const n=t.$proxies||(t.$proxies={}),i=n[e];if(!i)return;({attach:Ln,detach:Ln,resize:Ln}[e]||$d)(t,e,i),n[e]=void 0}getDevicePixelRatio(){return window.devicePixelRatio}getMaximumSize(t,e,n,i){return Lc(t,e,n,i)}isAttached(t){const e=t&&_i(t);return!!(e&&e.isConnected)}}function Wd(s){return!vi()||typeof OffscreenCanvas<"u"&&s instanceof OffscreenCanvas?Dd:Vd}class Wt{constructor(){C(this,"x");C(this,"y");C(this,"active",!1);C(this,"options");C(this,"$animations")}tooltipPosition(t){const{x:e,y:n}=this.getProps(["x","y"],t);return{x:e,y:n}}hasValue(){return Ze(this.x)&&Ze(this.y)}getProps(t,e){const n=this.$animations;if(!e||!n)return this;const i={};return t.forEach(o=>{i[o]=n[o]&&n[o].active()?n[o]._to:this[o]}),i}}C(Wt,"defaults",{}),C(Wt,"defaultRoutes");function Hd(s,t){const e=s.options.ticks,n=Yd(s),i=Math.min(e.maxTicksLimit||n,n),o=e.major.enabled?Xd(t):[],a=o.length,r=o[0],l=o[a-1],c=[];if(a>i)return qd(t,c,o,a/i),c;const d=Ud(o,t,i);if(a>0){let h,u;const f=a>1?Math.round((l-r)/(a-1)):null;for(js(t,c,d,j(f)?0:r-f,r),h=0,u=a-1;h<u;h++)js(t,c,d,o[h],o[h+1]);return js(t,c,d,l,j(f)?t.length:l+f),c}return js(t,c,d),c}function Yd(s){const t=s.options.offset,e=s._tickSize(),n=s._length/e+(t?0:1),i=s._maxLength/e;return Math.floor(Math.min(n,i))}function Ud(s,t,e){const n=Gd(s),i=t.length/e;if(!n)return Math.max(i,1);const o=Ol(n);for(let a=0,r=o.length-1;a<r;a++){const l=o[a];if(l>i)return l}return Math.max(i,1)}function Xd(s){const t=[];let e,n;for(e=0,n=s.length;e<n;e++)s[e].major&&t.push(e);return t}function qd(s,t,e,n){let i=0,o=e[0],a;for(n=Math.ceil(n),a=0;a<s.length;a++)a===o&&(t.push(s[a]),i++,o=e[i*n])}function js(s,t,e,n,i){const o=B(n,0),a=Math.min(B(i,s.length),s.length);let r=0,l,c,d;for(e=Math.ceil(e),i&&(l=i-n,e=l/Math.floor(l/e)),d=o;d<0;)r++,d=Math.round(o+r*e);for(c=Math.max(o,0);c<a;c++)c===d&&(t.push(s[c]),r++,d=Math.round(o+r*e))}function Gd(s){const t=s.length;let e,n;if(t<2)return!1;for(n=s[0],e=1;e<t;++e)if(s[e]-s[e-1]!==n)return!1;return n}const Kd=s=>s==="left"?"right":s==="right"?"left":s,ma=(s,t,e)=>t==="top"||t==="left"?s[t]+e:s[t]-e,ba=(s,t)=>Math.min(t||s,s);function xa(s,t){const e=[],n=s.length/t,i=s.length;let o=0;for(;o<i;o+=n)e.push(s[Math.floor(o)]);return e}function Jd(s,t,e){const n=s.ticks.length,i=Math.min(t,n-1),o=s._startPixel,a=s._endPixel,r=1e-6;let l=s.getPixelForTick(i),c;if(!(e&&(n===1?c=Math.max(l-o,a-l):t===0?c=(s.getPixelForTick(1)-l)/2:c=(l-s.getPixelForTick(i-1))/2,l+=i<t?c:-c,l<o-r||l>a+r)))return l}function Zd(s,t){U(s,e=>{const n=e.gc,i=n.length/2;let o;if(i>t){for(o=0;o<i;++o)delete e.data[n[o]];n.splice(0,i)}})}function os(s){return s.drawTicks?s.tickLength:0}function ya(s,t){if(!s.display)return 0;const e=gt(s.font,t),n=St(s.padding);return(et(s.text)?s.text.length:1)*e.lineHeight+n.height}function Qd(s,t){return Ce(s,{scale:t,type:"scale"})}function th(s,t,e){return Ce(s,{tick:e,index:t,type:"tick"})}function eh(s,t,e){let n=pi(s);return(e&&t!=="right"||!e&&t==="right")&&(n=Kd(n)),n}function sh(s,t,e,n){const{top:i,left:o,bottom:a,right:r,chart:l}=s,{chartArea:c,scales:d}=l;let h=0,u,f,p;const g=a-i,m=r-o;if(s.isHorizontal()){if(f=vt(n,o,r),N(e)){const b=Object.keys(e)[0],v=e[b];p=d[b].getPixelForValue(v)+g-t}else e==="center"?p=(c.bottom+c.top)/2+g-t:p=ma(s,e,t);u=r-o}else{if(N(e)){const b=Object.keys(e)[0],v=e[b];f=d[b].getPixelForValue(v)-m+t}else e==="center"?f=(c.left+c.right)/2-m+t:f=ma(s,e,t);p=vt(n,a,i),h=e==="left"?-lt:lt}return{titleX:f,titleY:p,maxWidth:u,rotation:h}}class Ve extends Wt{constructor(t){super(),this.id=t.id,this.type=t.type,this.options=void 0,this.ctx=t.ctx,this.chart=t.chart,this.top=void 0,this.bottom=void 0,this.left=void 0,this.right=void 0,this.width=void 0,this.height=void 0,this._margins={left:0,right:0,top:0,bottom:0},this.maxWidth=void 0,this.maxHeight=void 0,this.paddingTop=void 0,this.paddingBottom=void 0,this.paddingLeft=void 0,this.paddingRight=void 0,this.axis=void 0,this.labelRotation=void 0,this.min=void 0,this.max=void 0,this._range=void 0,this.ticks=[],this._gridLineItems=null,this._labelItems=null,this._labelSizes=null,this._length=0,this._maxLength=0,this._longestTextCache={},this._startPixel=void 0,this._endPixel=void 0,this._reversePixels=!1,this._userMax=void 0,this._userMin=void 0,this._suggestedMax=void 0,this._suggestedMin=void 0,this._ticksLength=0,this._borderValue=0,this._cache={},this._dataLimitsCached=!1,this.$context=void 0}init(t){this.options=t.setContext(this.getContext()),this.axis=t.axis,this._userMin=this.parse(t.min),this._userMax=this.parse(t.max),this._suggestedMin=this.parse(t.suggestedMin),this._suggestedMax=this.parse(t.suggestedMax)}parse(t,e){return t}getUserBounds(){let{_userMin:t,_userMax:e,_suggestedMin:n,_suggestedMax:i}=this;return t=$t(t,Number.POSITIVE_INFINITY),e=$t(e,Number.NEGATIVE_INFINITY),n=$t(n,Number.POSITIVE_INFINITY),i=$t(i,Number.NEGATIVE_INFINITY),{min:$t(t,n),max:$t(e,i),minDefined:nt(t),maxDefined:nt(e)}}getMinMax(t){let{min:e,max:n,minDefined:i,maxDefined:o}=this.getUserBounds(),a;if(i&&o)return{min:e,max:n};const r=this.getMatchingVisibleMetas();for(let l=0,c=r.length;l<c;++l)a=r[l].controller.getMinMax(this,t),i||(e=Math.min(e,a.min)),o||(n=Math.max(n,a.max));return e=o&&e>n?n:e,n=i&&e>n?e:n,{min:$t(e,$t(n,e)),max:$t(n,$t(e,n))}}getPadding(){return{left:this.paddingLeft||0,top:this.paddingTop||0,right:this.paddingRight||0,bottom:this.paddingBottom||0}}getTicks(){return this.ticks}getLabels(){const t=this.chart.data;return this.options.labels||(this.isHorizontal()?t.xLabels:t.yLabels)||t.labels||[]}getLabelItems(t=this.chart.chartArea){return this._labelItems||(this._labelItems=this._computeLabelItems(t))}beforeLayout(){this._cache={},this._dataLimitsCached=!1}beforeUpdate(){G(this.options.beforeUpdate,[this])}update(t,e,n){const{beginAtZero:i,grace:o,ticks:a}=this.options,r=a.sampleSize;this.beforeUpdate(),this.maxWidth=t,this.maxHeight=e,this._margins=n=Object.assign({left:0,right:0,top:0,bottom:0},n),this.ticks=null,this._labelSizes=null,this._gridLineItems=null,this._labelItems=null,this.beforeSetDimensions(),this.setDimensions(),this.afterSetDimensions(),this._maxLength=this.isHorizontal()?this.width+n.left+n.right:this.height+n.top+n.bottom,this._dataLimitsCached||(this.beforeDataLimits(),this.determineDataLimits(),this.afterDataLimits(),this._range=dc(this,o,i),this._dataLimitsCached=!0),this.beforeBuildTicks(),this.ticks=this.buildTicks()||[],this.afterBuildTicks();const l=r<this.ticks.length;this._convertTicksToLabels(l?xa(this.ticks,r):this.ticks),this.configure(),this.beforeCalculateLabelRotation(),this.calculateLabelRotation(),this.afterCalculateLabelRotation(),a.display&&(a.autoSkip||a.source==="auto")&&(this.ticks=Hd(this,this.ticks),this._labelSizes=null,this.afterAutoSkip()),l&&this._convertTicksToLabels(this.ticks),this.beforeFit(),this.fit(),this.afterFit(),this.afterUpdate()}configure(){let t=this.options.reverse,e,n;this.isHorizontal()?(e=this.left,n=this.right):(e=this.top,n=this.bottom,t=!t),this._startPixel=e,this._endPixel=n,this._reversePixels=t,this._length=n-e,this._alignToPixels=this.options.alignToPixels}afterUpdate(){G(this.options.afterUpdate,[this])}beforeSetDimensions(){G(this.options.beforeSetDimensions,[this])}setDimensions(){this.isHorizontal()?(this.width=this.maxWidth,this.left=0,this.right=this.width):(this.height=this.maxHeight,this.top=0,this.bottom=this.height),this.paddingLeft=0,this.paddingTop=0,this.paddingRight=0,this.paddingBottom=0}afterSetDimensions(){G(this.options.afterSetDimensions,[this])}_callHooks(t){this.chart.notifyPlugins(t,this.getContext()),G(this.options[t],[this])}beforeDataLimits(){this._callHooks("beforeDataLimits")}determineDataLimits(){}afterDataLimits(){this._callHooks("afterDataLimits")}beforeBuildTicks(){this._callHooks("beforeBuildTicks")}buildTicks(){return[]}afterBuildTicks(){this._callHooks("afterBuildTicks")}beforeTickToLabelConversion(){G(this.options.beforeTickToLabelConversion,[this])}generateTickLabels(t){const e=this.options.ticks;let n,i,o;for(n=0,i=t.length;n<i;n++)o=t[n],o.label=G(e.callback,[o.value,n,t],this)}afterTickToLabelConversion(){G(this.options.afterTickToLabelConversion,[this])}beforeCalculateLabelRotation(){G(this.options.beforeCalculateLabelRotation,[this])}calculateLabelRotation(){const t=this.options,e=t.ticks,n=ba(this.ticks.length,t.ticks.maxTicksLimit),i=e.minRotation||0,o=e.maxRotation;let a=i,r,l,c;if(!this._isVisible()||!e.display||i>=o||n<=1||!this.isHorizontal()){this.labelRotation=i;return}const d=this._getLabelSizes(),h=d.widest.width,u=d.highest.height,f=bt(this.chart.width-h,0,this.maxWidth);r=t.offset?this.maxWidth/n:f/(n-1),h+6>r&&(r=f/(n-(t.offset?.5:1)),l=this.maxHeight-os(t.grid)-e.padding-ya(t.title,this.chart.options.font),c=Math.sqrt(h*h+u*u),a=ui(Math.min(Math.asin(bt((d.highest.height+6)/r,-1,1)),Math.asin(bt(l/c,-1,1))-Math.asin(bt(u/c,-1,1)))),a=Math.max(i,Math.min(o,a))),this.labelRotation=a}afterCalculateLabelRotation(){G(this.options.afterCalculateLabelRotation,[this])}afterAutoSkip(){}beforeFit(){G(this.options.beforeFit,[this])}fit(){const t={width:0,height:0},{chart:e,options:{ticks:n,title:i,grid:o}}=this,a=this._isVisible(),r=this.isHorizontal();if(a){const l=ya(i,e.options.font);if(r?(t.width=this.maxWidth,t.height=os(o)+l):(t.height=this.maxHeight,t.width=os(o)+l),n.display&&this.ticks.length){const{first:c,last:d,widest:h,highest:u}=this._getLabelSizes(),f=n.padding*2,p=Nt(this.labelRotation),g=Math.cos(p),m=Math.sin(p);if(r){const b=n.mirror?0:m*h.width+g*u.height;t.height=Math.min(this.maxHeight,t.height+b+f)}else{const b=n.mirror?0:g*h.width+m*u.height;t.width=Math.min(this.maxWidth,t.width+b+f)}this._calculatePadding(c,d,m,g)}}this._handleMargins(),r?(this.width=this._length=e.width-this._margins.left-this._margins.right,this.height=t.height):(this.width=t.width,this.height=this._length=e.height-this._margins.top-this._margins.bottom)}_calculatePadding(t,e,n,i){const{ticks:{align:o,padding:a},position:r}=this.options,l=this.labelRotation!==0,c=r!=="top"&&this.axis==="x";if(this.isHorizontal()){const d=this.getPixelForTick(0)-this.left,h=this.right-this.getPixelForTick(this.ticks.length-1);let u=0,f=0;l?c?(u=i*t.width,f=n*e.height):(u=n*t.height,f=i*e.width):o==="start"?f=e.width:o==="end"?u=t.width:o!=="inner"&&(u=t.width/2,f=e.width/2),this.paddingLeft=Math.max((u-d+a)*this.width/(this.width-d),0),this.paddingRight=Math.max((f-h+a)*this.width/(this.width-h),0)}else{let d=e.height/2,h=t.height/2;o==="start"?(d=0,h=t.height):o==="end"&&(d=e.height,h=0),this.paddingTop=d+a,this.paddingBottom=h+a}}_handleMargins(){this._margins&&(this._margins.left=Math.max(this.paddingLeft,this._margins.left),this._margins.top=Math.max(this.paddingTop,this._margins.top),this._margins.right=Math.max(this.paddingRight,this._margins.right),this._margins.bottom=Math.max(this.paddingBottom,this._margins.bottom))}afterFit(){G(this.options.afterFit,[this])}isHorizontal(){const{axis:t,position:e}=this.options;return e==="top"||e==="bottom"||t==="x"}isFullSize(){return this.options.fullSize}_convertTicksToLabels(t){this.beforeTickToLabelConversion(),this.generateTickLabels(t);let e,n;for(e=0,n=t.length;e<n;e++)j(t[e].label)&&(t.splice(e,1),n--,e--);this.afterTickToLabelConversion()}_getLabelSizes(){let t=this._labelSizes;if(!t){const e=this.options.ticks.sampleSize;let n=this.ticks;e<n.length&&(n=xa(n,e)),this._labelSizes=t=this._computeLabelSizes(n,n.length,this.options.ticks.maxTicksLimit)}return t}_computeLabelSizes(t,e,n){const{ctx:i,_longestTextCache:o}=this,a=[],r=[],l=Math.floor(e/ba(e,n));let c=0,d=0,h,u,f,p,g,m,b,v,M,k,w;for(h=0;h<e;h+=l){if(p=t[h].label,g=this._resolveTickFontOptions(h),i.font=m=g.string,b=o[m]=o[m]||{data:{},gc:[]},v=g.lineHeight,M=k=0,!j(p)&&!et(p))M=ln(i,b.data,b.gc,M,p),k=v;else if(et(p))for(u=0,f=p.length;u<f;++u)w=p[u],!j(w)&&!et(w)&&(M=ln(i,b.data,b.gc,M,w),k+=v);a.push(M),r.push(k),c=Math.max(M,c),d=Math.max(k,d)}Zd(o,e);const E=a.indexOf(c),P=r.indexOf(d),D=$=>({width:a[$]||0,height:r[$]||0});return{first:D(0),last:D(e-1),widest:D(E),highest:D(P),widths:a,heights:r}}getLabelForValue(t){return t}getPixelForValue(t,e){return NaN}getValueForPixel(t){}getPixelForTick(t){const e=this.ticks;return t<0||t>e.length-1?null:this.getPixelForValue(e[t].value)}getPixelForDecimal(t){this._reversePixels&&(t=1-t);const e=this._startPixel+t*this._length;return zl(this._alignToPixels?Pe(this.chart,e,0):e)}getDecimalForPixel(t){const e=(t-this._startPixel)/this._length;return this._reversePixels?1-e:e}getBasePixel(){return this.getPixelForValue(this.getBaseValue())}getBaseValue(){const{min:t,max:e}=this;return t<0&&e<0?e:t>0&&e>0?t:0}getContext(t){const e=this.ticks||[];if(t>=0&&t<e.length){const n=e[t];return n.$context||(n.$context=th(this.getContext(),t,n))}return this.$context||(this.$context=Qd(this.chart.getContext(),this))}_tickSize(){const t=this.options.ticks,e=Nt(this.labelRotation),n=Math.abs(Math.cos(e)),i=Math.abs(Math.sin(e)),o=this._getLabelSizes(),a=t.autoSkipPadding||0,r=o?o.widest.width+a:0,l=o?o.highest.height+a:0;return this.isHorizontal()?l*n>r*i?r/n:l/i:l*i<r*n?l/n:r/i}_isVisible(){const t=this.options.display;return t!=="auto"?!!t:this.getMatchingVisibleMetas().length>0}_computeGridLineItems(t){const e=this.axis,n=this.chart,i=this.options,{grid:o,position:a,border:r}=i,l=o.offset,c=this.isHorizontal(),h=this.ticks.length+(l?1:0),u=os(o),f=[],p=r.setContext(this.getContext()),g=p.display?p.width:0,m=g/2,b=function(X){return Pe(n,X,g)};let v,M,k,w,E,P,D,$,R,F,z,ct;if(a==="top")v=b(this.bottom),P=this.bottom-u,$=v-m,F=b(t.top)+m,ct=t.bottom;else if(a==="bottom")v=b(this.top),F=t.top,ct=b(t.bottom)-m,P=v+m,$=this.top+u;else if(a==="left")v=b(this.right),E=this.right-u,D=v-m,R=b(t.left)+m,z=t.right;else if(a==="right")v=b(this.left),R=t.left,z=b(t.right)-m,E=v+m,D=this.left+u;else if(e==="x"){if(a==="center")v=b((t.top+t.bottom)/2+.5);else if(N(a)){const X=Object.keys(a)[0],Z=a[X];v=b(this.chart.scales[X].getPixelForValue(Z))}F=t.top,ct=t.bottom,P=v+m,$=P+u}else if(e==="y"){if(a==="center")v=b((t.left+t.right)/2);else if(N(a)){const X=Object.keys(a)[0],Z=a[X];v=b(this.chart.scales[X].getPixelForValue(Z))}E=v-m,D=E-u,R=t.left,z=t.right}const yt=B(i.ticks.maxTicksLimit,h),W=Math.max(1,Math.ceil(h/yt));for(M=0;M<h;M+=W){const X=this.getContext(M),Z=o.setContext(X),At=r.setContext(X),ut=Z.lineWidth,Kt=Z.color,Ee=At.dash||[],Jt=At.dashOffset,ae=Z.tickWidth,Ht=Z.tickColor,re=Z.tickBorderDash||[],Yt=Z.tickBorderDashOffset;k=Jd(this,M,l),k!==void 0&&(w=Pe(n,k,ut),c?E=D=R=z=w:P=$=F=ct=w,f.push({tx1:E,ty1:P,tx2:D,ty2:$,x1:R,y1:F,x2:z,y2:ct,width:ut,color:Kt,borderDash:Ee,borderDashOffset:Jt,tickWidth:ae,tickColor:Ht,tickBorderDash:re,tickBorderDashOffset:Yt}))}return this._ticksLength=h,this._borderValue=v,f}_computeLabelItems(t){const e=this.axis,n=this.options,{position:i,ticks:o}=n,a=this.isHorizontal(),r=this.ticks,{align:l,crossAlign:c,padding:d,mirror:h}=o,u=os(n.grid),f=u+d,p=h?-d:f,g=-Nt(this.labelRotation),m=[];let b,v,M,k,w,E,P,D,$,R,F,z,ct="middle";if(i==="top")E=this.bottom-p,P=this._getXAxisLabelAlignment();else if(i==="bottom")E=this.top+p,P=this._getXAxisLabelAlignment();else if(i==="left"){const W=this._getYAxisLabelAlignment(u);P=W.textAlign,w=W.x}else if(i==="right"){const W=this._getYAxisLabelAlignment(u);P=W.textAlign,w=W.x}else if(e==="x"){if(i==="center")E=(t.top+t.bottom)/2+f;else if(N(i)){const W=Object.keys(i)[0],X=i[W];E=this.chart.scales[W].getPixelForValue(X)+f}P=this._getXAxisLabelAlignment()}else if(e==="y"){if(i==="center")w=(t.left+t.right)/2-f;else if(N(i)){const W=Object.keys(i)[0],X=i[W];w=this.chart.scales[W].getPixelForValue(X)}P=this._getYAxisLabelAlignment(u).textAlign}e==="y"&&(l==="start"?ct="top":l==="end"&&(ct="bottom"));const yt=this._getLabelSizes();for(b=0,v=r.length;b<v;++b){M=r[b],k=M.label;const W=o.setContext(this.getContext(b));D=this.getPixelForTick(b)+o.labelOffset,$=this._resolveTickFontOptions(b),R=$.lineHeight,F=et(k)?k.length:1;const X=F/2,Z=W.color,At=W.textStrokeColor,ut=W.textStrokeWidth;let Kt=P;a?(w=D,P==="inner"&&(b===v-1?Kt=this.options.reverse?"left":"right":b===0?Kt=this.options.reverse?"right":"left":Kt="center"),i==="top"?c==="near"||g!==0?z=-F*R+R/2:c==="center"?z=-yt.highest.height/2-X*R+R:z=-yt.highest.height+R/2:c==="near"||g!==0?z=R/2:c==="center"?z=yt.highest.height/2-X*R:z=yt.highest.height-F*R,h&&(z*=-1),g!==0&&!W.showLabelBackdrop&&(w+=R/2*Math.sin(g))):(E=D,z=(1-F)*R/2);let Ee;if(W.showLabelBackdrop){const Jt=St(W.backdropPadding),ae=yt.heights[b],Ht=yt.widths[b];let re=z-Jt.top,Yt=0-Jt.left;switch(ct){case"middle":re-=ae/2;break;case"bottom":re-=ae;break}switch(P){case"center":Yt-=Ht/2;break;case"right":Yt-=Ht;break;case"inner":b===v-1?Yt-=Ht:b>0&&(Yt-=Ht/2);break}Ee={left:Yt,top:re,width:Ht+Jt.width,height:ae+Jt.height,color:W.backdropColor}}m.push({label:k,font:$,textOffset:z,options:{rotation:g,color:Z,strokeColor:At,strokeWidth:ut,textAlign:Kt,textBaseline:ct,translation:[w,E],backdrop:Ee}})}return m}_getXAxisLabelAlignment(){const{position:t,ticks:e}=this.options;if(-Nt(this.labelRotation))return t==="top"?"left":"right";let i="center";return e.align==="start"?i="left":e.align==="end"?i="right":e.align==="inner"&&(i="inner"),i}_getYAxisLabelAlignment(t){const{position:e,ticks:{crossAlign:n,mirror:i,padding:o}}=this.options,a=this._getLabelSizes(),r=t+o,l=a.widest.width;let c,d;return e==="left"?i?(d=this.right+o,n==="near"?c="left":n==="center"?(c="center",d+=l/2):(c="right",d+=l)):(d=this.right-r,n==="near"?c="right":n==="center"?(c="center",d-=l/2):(c="left",d=this.left)):e==="right"?i?(d=this.left+o,n==="near"?c="right":n==="center"?(c="center",d-=l/2):(c="left",d-=l)):(d=this.left+r,n==="near"?c="left":n==="center"?(c="center",d+=l/2):(c="right",d=this.right)):c="right",{textAlign:c,x:d}}_computeLabelArea(){if(this.options.ticks.mirror)return;const t=this.chart,e=this.options.position;if(e==="left"||e==="right")return{top:0,left:this.left,bottom:t.height,right:this.right};if(e==="top"||e==="bottom")return{top:this.top,left:0,bottom:this.bottom,right:t.width}}drawBackground(){const{ctx:t,options:{backgroundColor:e},left:n,top:i,width:o,height:a}=this;e&&(t.save(),t.fillStyle=e,t.fillRect(n,i,o,a),t.restore())}getLineWidthForValue(t){const e=this.options.grid;if(!this._isVisible()||!e.display)return 0;const i=this.ticks.findIndex(o=>o.value===t);return i>=0?e.setContext(this.getContext(i)).lineWidth:0}drawGrid(t){const e=this.options.grid,n=this.ctx,i=this._gridLineItems||(this._gridLineItems=this._computeGridLineItems(t));let o,a;const r=(l,c,d)=>{!d.width||!d.color||(n.save(),n.lineWidth=d.width,n.strokeStyle=d.color,n.setLineDash(d.borderDash||[]),n.lineDashOffset=d.borderDashOffset,n.beginPath(),n.moveTo(l.x,l.y),n.lineTo(c.x,c.y),n.stroke(),n.restore())};if(e.display)for(o=0,a=i.length;o<a;++o){const l=i[o];e.drawOnChartArea&&r({x:l.x1,y:l.y1},{x:l.x2,y:l.y2},l),e.drawTicks&&r({x:l.tx1,y:l.ty1},{x:l.tx2,y:l.ty2},{color:l.tickColor,width:l.tickWidth,borderDash:l.tickBorderDash,borderDashOffset:l.tickBorderDashOffset})}}drawBorder(){const{chart:t,ctx:e,options:{border:n,grid:i}}=this,o=n.setContext(this.getContext()),a=n.display?o.width:0;if(!a)return;const r=i.setContext(this.getContext(0)).lineWidth,l=this._borderValue;let c,d,h,u;this.isHorizontal()?(c=Pe(t,this.left,a)-a/2,d=Pe(t,this.right,r)+r/2,h=u=l):(h=Pe(t,this.top,a)-a/2,u=Pe(t,this.bottom,r)+r/2,c=d=l),e.save(),e.lineWidth=o.width,e.strokeStyle=o.color,e.beginPath(),e.moveTo(c,h),e.lineTo(d,u),e.stroke(),e.restore()}drawLabels(t){if(!this.options.ticks.display)return;const n=this.ctx,i=this._computeLabelArea();i&&mn(n,i);const o=this.getLabelItems(t);for(const a of o){const r=a.options,l=a.font,c=a.label,d=a.textOffset;Ne(n,c,0,d,l,r)}i&&bn(n)}drawTitle(){const{ctx:t,options:{position:e,title:n,reverse:i}}=this;if(!n.display)return;const o=gt(n.font),a=St(n.padding),r=n.align;let l=o.lineHeight/2;e==="bottom"||e==="center"||N(e)?(l+=a.bottom,et(n.text)&&(l+=o.lineHeight*(n.text.length-1))):l+=a.top;const{titleX:c,titleY:d,maxWidth:h,rotation:u}=sh(this,l,e,r);Ne(t,n.text,0,0,o,{color:n.color,maxWidth:h,rotation:u,textAlign:eh(r,e,i),textBaseline:"middle",translation:[c,d]})}draw(t){this._isVisible()&&(this.drawBackground(),this.drawGrid(t),this.drawBorder(),this.drawTitle(),this.drawLabels(t))}_layers(){const t=this.options,e=t.ticks&&t.ticks.z||0,n=B(t.grid&&t.grid.z,-1),i=B(t.border&&t.border.z,0);return!this._isVisible()||this.draw!==Ve.prototype.draw?[{z:e,draw:o=>{this.draw(o)}}]:[{z:n,draw:o=>{this.drawBackground(),this.drawGrid(o),this.drawTitle()}},{z:i,draw:()=>{this.drawBorder()}},{z:e,draw:o=>{this.drawLabels(o)}}]}getMatchingVisibleMetas(t){const e=this.chart.getSortedVisibleDatasetMetas(),n=this.axis+"AxisID",i=[];let o,a;for(o=0,a=e.length;o<a;++o){const r=e[o];r[n]===this.id&&(!t||r.type===t)&&i.push(r)}return i}_resolveTickFontOptions(t){const e=this.options.ticks.setContext(this.getContext(t));return gt(e.font)}_maxDigits(){const t=this._resolveTickFontOptions(0).lineHeight;return(this.isHorizontal()?this.width:this.height)/t}}class Ns{constructor(t,e,n){this.type=t,this.scope=e,this.override=n,this.items=Object.create(null)}isForType(t){return Object.prototype.isPrototypeOf.call(this.type.prototype,t.prototype)}register(t){const e=Object.getPrototypeOf(t);let n;oh(e)&&(n=this.register(e));const i=this.items,o=t.id,a=this.scope+"."+o;if(!o)throw new Error("class does not have id: "+t);return o in i||(i[o]=t,nh(t,a,n),this.override&&st.override(t.id,t.overrides)),a}get(t){return this.items[t]}unregister(t){const e=this.items,n=t.id,i=this.scope;n in e&&delete e[n],i&&n in st[i]&&(delete st[i][n],this.override&&delete je[n])}}function nh(s,t,e){const n=Ms(Object.create(null),[e?st.get(e):{},st.get(t),s.defaults]);st.set(t,n),s.defaultRoutes&&ih(t,s.defaultRoutes),s.descriptors&&st.describe(t,s.descriptors)}function ih(s,t){Object.keys(t).forEach(e=>{const n=e.split("."),i=n.pop(),o=[s].concat(n).join("."),a=t[e].split("."),r=a.pop(),l=a.join(".");st.route(o,i,l,r)})}function oh(s){return"id"in s&&"defaults"in s}class ah{constructor(){this.controllers=new Ns(Vt,"datasets",!0),this.elements=new Ns(Wt,"elements"),this.plugins=new Ns(Object,"plugins"),this.scales=new Ns(Ve,"scales"),this._typedRegistries=[this.controllers,this.scales,this.elements]}add(...t){this._each("register",t)}remove(...t){this._each("unregister",t)}addControllers(...t){this._each("register",t,this.controllers)}addElements(...t){this._each("register",t,this.elements)}addPlugins(...t){this._each("register",t,this.plugins)}addScales(...t){this._each("register",t,this.scales)}getController(t){return this._get(t,this.controllers,"controller")}getElement(t){return this._get(t,this.elements,"element")}getPlugin(t){return this._get(t,this.plugins,"plugin")}getScale(t){return this._get(t,this.scales,"scale")}removeControllers(...t){this._each("unregister",t,this.controllers)}removeElements(...t){this._each("unregister",t,this.elements)}removePlugins(...t){this._each("unregister",t,this.plugins)}removeScales(...t){this._each("unregister",t,this.scales)}_each(t,e,n){[...e].forEach(i=>{const o=n||this._getRegistryForType(i);n||o.isForType(i)||o===this.plugins&&i.id?this._exec(t,o,i):U(i,a=>{const r=n||this._getRegistryForType(a);this._exec(t,r,a)})})}_exec(t,e,n){const i=hi(t);G(n["before"+i],[],n),e[t](n),G(n["after"+i],[],n)}_getRegistryForType(t){for(let e=0;e<this._typedRegistries.length;e++){const n=this._typedRegistries[e];if(n.isForType(t))return n}return this.plugins}_get(t,e,n){const i=e.get(t);if(i===void 0)throw new Error('"'+t+'" is not a registered '+n+".");return i}}var Xt=new ah;class rh{constructor(){this._init=void 0}notify(t,e,n,i){if(e==="beforeInit"&&(this._init=this._createDescriptors(t,!0),this._notify(this._init,t,"install")),this._init===void 0)return;const o=i?this._descriptors(t).filter(i):this._descriptors(t),a=this._notify(o,t,e,n);return e==="afterDestroy"&&(this._notify(o,t,"stop"),this._notify(this._init,t,"uninstall"),this._init=void 0),a}_notify(t,e,n,i){i=i||{};for(const o of t){const a=o.plugin,r=a[n],l=[e,i,o.options];if(G(r,l,a)===!1&&i.cancelable)return!1}return!0}invalidate(){j(this._cache)||(this._oldCache=this._cache,this._cache=void 0)}_descriptors(t){if(this._cache)return this._cache;const e=this._cache=this._createDescriptors(t);return this._notifyStateChanges(t),e}_createDescriptors(t,e){const n=t&&t.config,i=B(n.options&&n.options.plugins,{}),o=lh(n);return i===!1&&!e?[]:dh(t,o,i,e)}_notifyStateChanges(t){const e=this._oldCache||[],n=this._cache,i=(o,a)=>o.filter(r=>!a.some(l=>r.plugin.id===l.plugin.id));this._notify(i(e,n),t,"stop"),this._notify(i(n,e),t,"start")}}function lh(s){const t={},e=[],n=Object.keys(Xt.plugins.items);for(let o=0;o<n.length;o++)e.push(Xt.getPlugin(n[o]));const i=s.plugins||[];for(let o=0;o<i.length;o++){const a=i[o];e.indexOf(a)===-1&&(e.push(a),t[a.id]=!0)}return{plugins:e,localIds:t}}function ch(s,t){return!t&&s===!1?null:s===!0?{}:s}function dh(s,{plugins:t,localIds:e},n,i){const o=[],a=s.getContext();for(const r of t){const l=r.id,c=ch(n[l],i);c!==null&&o.push({plugin:r,options:hh(s.config,{plugin:r,local:e[l]},c,a)})}return o}function hh(s,{plugin:t,local:e},n,i){const o=s.pluginScopeKeys(t),a=s.getOptionScopes(n,o);return e&&t.defaults&&a.push(t.defaults),s.createResolver(a,i,[""],{scriptable:!1,indexable:!1,allKeys:!0})}function Un(s,t){const e=st.datasets[s]||{};return((t.datasets||{})[s]||{}).indexAxis||t.indexAxis||e.indexAxis||"x"}function uh(s,t){let e=s;return s==="_index_"?e=t:s==="_value_"&&(e=t==="x"?"y":"x"),e}function fh(s,t){return s===t?"_index_":"_value_"}function va(s){if(s==="x"||s==="y"||s==="r")return s}function ph(s){if(s==="top"||s==="bottom")return"x";if(s==="left"||s==="right")return"y"}function Xn(s,...t){if(va(s))return s;for(const e of t){const n=e.axis||ph(e.position)||s.length>1&&va(s[0].toLowerCase());if(n)return n}throw new Error(`Cannot determine type of '${s}' axis. Please provide 'axis' or 'position' option.`)}function _a(s,t,e){if(e[t+"AxisID"]===s)return{axis:t}}function gh(s,t){if(t.data&&t.data.datasets){const e=t.data.datasets.filter(n=>n.xAxisID===s||n.yAxisID===s);if(e.length)return _a(s,"x",e[0])||_a(s,"y",e[0])}return{}}function mh(s,t){const e=je[s.type]||{scales:{}},n=t.scales||{},i=Un(s.type,t),o=Object.create(null);return Object.keys(n).forEach(a=>{const r=n[a];if(!N(r))return console.error(`Invalid scale configuration for scale: ${a}`);if(r._proxy)return console.warn(`Ignoring resolver passed as options for scale: ${a}`);const l=Xn(a,r,gh(a,s),st.scales[r.type]),c=fh(l,i),d=e.scales||{};o[a]=bs(Object.create(null),[{axis:l},r,d[l],d[c]])}),s.data.datasets.forEach(a=>{const r=a.type||s.type,l=a.indexAxis||Un(r,t),d=(je[r]||{}).scales||{};Object.keys(d).forEach(h=>{const u=uh(h,l),f=a[u+"AxisID"]||u;o[f]=o[f]||Object.create(null),bs(o[f],[{axis:u},n[f],d[h]])})}),Object.keys(o).forEach(a=>{const r=o[a];bs(r,[st.scales[r.type],st.scale])}),o}function Rr(s){const t=s.options||(s.options={});t.plugins=B(t.plugins,{}),t.scales=mh(s,t)}function Fr(s){return s=s||{},s.datasets=s.datasets||[],s.labels=s.labels||[],s}function bh(s){return s=s||{},s.data=Fr(s.data),Rr(s),s}const wa=new Map,zr=new Set;function Vs(s,t){let e=wa.get(s);return e||(e=t(),wa.set(s,e),zr.add(e)),e}const as=(s,t,e)=>{const n=ve(t,e);n!==void 0&&s.add(n)};class xh{constructor(t){this._config=bh(t),this._scopeCache=new Map,this._resolverCache=new Map}get platform(){return this._config.platform}get type(){return this._config.type}set type(t){this._config.type=t}get data(){return this._config.data}set data(t){this._config.data=Fr(t)}get options(){return this._config.options}set options(t){this._config.options=t}get plugins(){return this._config.plugins}update(){const t=this._config;this.clearCache(),Rr(t)}clearCache(){this._scopeCache.clear(),this._resolverCache.clear()}datasetScopeKeys(t){return Vs(t,()=>[[`datasets.${t}`,""]])}datasetAnimationScopeKeys(t,e){return Vs(`${t}.transition.${e}`,()=>[[`datasets.${t}.transitions.${e}`,`transitions.${e}`],[`datasets.${t}`,""]])}datasetElementScopeKeys(t,e){return Vs(`${t}-${e}`,()=>[[`datasets.${t}.elements.${e}`,`datasets.${t}`,`elements.${e}`,""]])}pluginScopeKeys(t){const e=t.id,n=this.type;return Vs(`${n}-plugin-${e}`,()=>[[`plugins.${e}`,...t.additionalOptionScopes||[]]])}_cachedScopes(t,e){const n=this._scopeCache;let i=n.get(t);return(!i||e)&&(i=new Map,n.set(t,i)),i}getOptionScopes(t,e,n){const{options:i,type:o}=this,a=this._cachedScopes(t,n),r=a.get(e);if(r)return r;const l=new Set;e.forEach(d=>{t&&(l.add(t),d.forEach(h=>as(l,t,h))),d.forEach(h=>as(l,i,h)),d.forEach(h=>as(l,je[o]||{},h)),d.forEach(h=>as(l,st,h)),d.forEach(h=>as(l,Wn,h))});const c=Array.from(l);return c.length===0&&c.push(Object.create(null)),zr.has(e)&&a.set(e,c),c}chartOptionScopes(){const{options:t,type:e}=this;return[t,je[e]||{},st.datasets[e]||{},{type:e},st,Wn]}resolveNamedOptions(t,e,n,i=[""]){const o={$shared:!0},{resolver:a,subPrefixes:r}=ka(this._resolverCache,t,i);let l=a;if(vh(a,e)){o.$shared=!1,n=_e(n)?n():n;const c=this.createResolver(t,n,r);l=Qe(a,n,c)}for(const c of e)o[c]=l[c];return o}createResolver(t,e,n=[""],i){const{resolver:o}=ka(this._resolverCache,t,n);return N(e)?Qe(o,e,void 0,i):o}}function ka(s,t,e){let n=s.get(t);n||(n=new Map,s.set(t,n));const i=e.join();let o=n.get(i);return o||(o={resolver:bi(t,e),subPrefixes:e.filter(r=>!r.toLowerCase().includes("hover"))},n.set(i,o)),o}const yh=s=>N(s)&&Object.getOwnPropertyNames(s).some(t=>_e(s[t]));function vh(s,t){const{isScriptable:e,isIndexable:n}=br(s);for(const i of t){const o=e(i),a=n(i),r=(a||o)&&s[i];if(o&&(_e(r)||yh(r))||a&&et(r))return!0}return!1}var _h="4.5.1";const wh=["top","bottom","left","right","chartArea"];function Ma(s,t){return s==="top"||s==="bottom"||wh.indexOf(s)===-1&&t==="x"}function Sa(s,t){return function(e,n){return e[s]===n[s]?e[t]-n[t]:e[s]-n[s]}}function Ca(s){const t=s.chart,e=t.options.animation;t.notifyPlugins("afterRender"),G(e&&e.onComplete,[s],t)}function kh(s){const t=s.chart,e=t.options.animation;G(e&&e.onProgress,[s],t)}function jr(s){return vi()&&typeof s=="string"?s=document.getElementById(s):s&&s.length&&(s=s[0]),s&&s.canvas&&(s=s.canvas),s}const Zs={},Ea=s=>{const t=jr(s);return Object.values(Zs).filter(e=>e.canvas===t).pop()};function Mh(s,t,e){const n=Object.keys(s);for(const i of n){const o=+i;if(o>=t){const a=s[i];delete s[i],(e>0||o>t)&&(s[o+e]=a)}}}function Sh(s,t,e,n){return!e||s.type==="mouseout"?null:n?t:s}class Bt{static register(...t){Xt.add(...t),Aa()}static unregister(...t){Xt.remove(...t),Aa()}constructor(t,e){const n=this.config=new xh(e),i=jr(t),o=Ea(i);if(o)throw new Error("Canvas is already in use. Chart with ID '"+o.id+"' must be destroyed before the canvas with ID '"+o.canvas.id+"' can be reused.");const a=n.createResolver(n.chartOptionScopes(),this.getContext());this.platform=new(n.platform||Wd(i)),this.platform.updateConfig(n);const r=this.platform.acquireContext(i,a.aspectRatio),l=r&&r.canvas,c=l&&l.height,d=l&&l.width;if(this.id=Cl(),this.ctx=r,this.canvas=l,this.width=d,this.height=c,this._options=a,this._aspectRatio=this.aspectRatio,this._layers=[],this._metasets=[],this._stacks=void 0,this.boxes=[],this.currentDevicePixelRatio=void 0,this.chartArea=void 0,this._active=[],this._lastEvent=void 0,this._listeners={},this._responsiveListeners=void 0,this._sortedMetasets=[],this.scales={},this._plugins=new rh,this.$proxies={},this._hiddenIndices={},this.attached=!1,this._animationsDisabled=void 0,this.$context=void 0,this._doResize=Wl(h=>this.update(h),a.resizeDelay||0),this._dataChanges=[],Zs[this.id]=this,!r||!l){console.error("Failed to create chart: can't acquire context from the given item");return}Qt.listen(this,"complete",Ca),Qt.listen(this,"progress",kh),this._initialize(),this.attached&&this.update()}get aspectRatio(){const{options:{aspectRatio:t,maintainAspectRatio:e},width:n,height:i,_aspectRatio:o}=this;return j(t)?e&&o?o:i?n/i:null:t}get data(){return this.config.data}set data(t){this.config.data=t}get options(){return this._options}set options(t){this.config.options=t}get registry(){return Xt}_initialize(){return this.notifyPlugins("beforeInit"),this.options.responsive?this.resize():Ko(this,this.options.devicePixelRatio),this.bindEvents(),this.notifyPlugins("afterInit"),this}clear(){return Xo(this.canvas,this.ctx),this}stop(){return Qt.stop(this),this}resize(t,e){Qt.running(this)?this._resizeBeforeDraw={width:t,height:e}:this._resize(t,e)}_resize(t,e){const n=this.options,i=this.canvas,o=n.maintainAspectRatio&&this.aspectRatio,a=this.platform.getMaximumSize(i,t,e,o),r=n.devicePixelRatio||this.platform.getDevicePixelRatio(),l=this.width?"resize":"attach";this.width=a.width,this.height=a.height,this._aspectRatio=this.aspectRatio,Ko(this,r,!0)&&(this.notifyPlugins("resize",{size:a}),G(n.onResize,[this,a],this),this.attached&&this._doResize(l)&&this.render())}ensureScalesHaveIDs(){const e=this.options.scales||{};U(e,(n,i)=>{n.id=i})}buildOrUpdateScales(){const t=this.options,e=t.scales,n=this.scales,i=Object.keys(n).reduce((a,r)=>(a[r]=!1,a),{});let o=[];e&&(o=o.concat(Object.keys(e).map(a=>{const r=e[a],l=Xn(a,r),c=l==="r",d=l==="x";return{options:r,dposition:c?"chartArea":d?"bottom":"left",dtype:c?"radialLinear":d?"category":"linear"}}))),U(o,a=>{const r=a.options,l=r.id,c=Xn(l,r),d=B(r.type,a.dtype);(r.position===void 0||Ma(r.position,c)!==Ma(a.dposition))&&(r.position=a.dposition),i[l]=!0;let h=null;if(l in n&&n[l].type===d)h=n[l];else{const u=Xt.getScale(d);h=new u({id:l,type:d,ctx:this.ctx,chart:this}),n[h.id]=h}h.init(r,t)}),U(i,(a,r)=>{a||delete n[r]}),U(n,a=>{Mt.configure(this,a,a.options),Mt.addBox(this,a)})}_updateMetasets(){const t=this._metasets,e=this.data.datasets.length,n=t.length;if(t.sort((i,o)=>i.index-o.index),n>e){for(let i=e;i<n;++i)this._destroyDatasetMeta(i);t.splice(e,n-e)}this._sortedMetasets=t.slice(0).sort(Sa("order","index"))}_removeUnreferencedMetasets(){const{_metasets:t,data:{datasets:e}}=this;t.length>e.length&&delete this._stacks,t.forEach((n,i)=>{e.filter(o=>o===n._dataset).length===0&&this._destroyDatasetMeta(i)})}buildOrUpdateControllers(){const t=[],e=this.data.datasets;let n,i;for(this._removeUnreferencedMetasets(),n=0,i=e.length;n<i;n++){const o=e[n];let a=this.getDatasetMeta(n);const r=o.type||this.config.type;if(a.type&&a.type!==r&&(this._destroyDatasetMeta(n),a=this.getDatasetMeta(n)),a.type=r,a.indexAxis=o.indexAxis||Un(r,this.options),a.order=o.order||0,a.index=n,a.label=""+o.label,a.visible=this.isDatasetVisible(n),a.controller)a.controller.updateIndex(n),a.controller.linkScales();else{const l=Xt.getController(r),{datasetElementType:c,dataElementType:d}=st.datasets[r];Object.assign(l,{dataElementType:Xt.getElement(d),datasetElementType:c&&Xt.getElement(c)}),a.controller=new l(this,n),t.push(a.controller)}}return this._updateMetasets(),t}_resetElements(){U(this.data.datasets,(t,e)=>{this.getDatasetMeta(e).controller.reset()},this)}reset(){this._resetElements(),this.notifyPlugins("reset")}update(t){const e=this.config;e.update();const n=this._options=e.createResolver(e.chartOptionScopes(),this.getContext()),i=this._animationsDisabled=!n.animation;if(this._updateScales(),this._checkEventBindings(),this._updateHiddenIndices(),this._plugins.invalidate(),this.notifyPlugins("beforeUpdate",{mode:t,cancelable:!0})===!1)return;const o=this.buildOrUpdateControllers();this.notifyPlugins("beforeElementsUpdate");let a=0;for(let c=0,d=this.data.datasets.length;c<d;c++){const{controller:h}=this.getDatasetMeta(c),u=!i&&o.indexOf(h)===-1;h.buildOrUpdateElements(u),a=Math.max(+h.getMaxOverflow(),a)}a=this._minPadding=n.layout.autoPadding?a:0,this._updateLayout(a),i||U(o,c=>{c.reset()}),this._updateDatasets(t),this.notifyPlugins("afterUpdate",{mode:t}),this._layers.sort(Sa("z","_idx"));const{_active:r,_lastEvent:l}=this;l?this._eventHandler(l,!0):r.length&&this._updateHoverStyles(r,r,!0),this.render()}_updateScales(){U(this.scales,t=>{Mt.removeBox(this,t)}),this.ensureScalesHaveIDs(),this.buildOrUpdateScales()}_checkEventBindings(){const t=this.options,e=new Set(Object.keys(this._listeners)),n=new Set(t.events);(!Fo(e,n)||!!this._responsiveListeners!==t.responsive)&&(this.unbindEvents(),this.bindEvents())}_updateHiddenIndices(){const{_hiddenIndices:t}=this,e=this._getUniformDataChanges()||[];for(const{method:n,start:i,count:o}of e){const a=n==="_removeElements"?-o:o;Mh(t,i,a)}}_getUniformDataChanges(){const t=this._dataChanges;if(!t||!t.length)return;this._dataChanges=[];const e=this.data.datasets.length,n=o=>new Set(t.filter(a=>a[0]===o).map((a,r)=>r+","+a.splice(1).join(","))),i=n(0);for(let o=1;o<e;o++)if(!Fo(i,n(o)))return;return Array.from(i).map(o=>o.split(",")).map(o=>({method:o[1],start:+o[2],count:+o[3]}))}_updateLayout(t){if(this.notifyPlugins("beforeLayout",{cancelable:!0})===!1)return;Mt.update(this,this.width,this.height,t);const e=this.chartArea,n=e.width<=0||e.height<=0;this._layers=[],U(this.boxes,i=>{n&&i.position==="chartArea"||(i.configure&&i.configure(),this._layers.push(...i._layers()))},this),this._layers.forEach((i,o)=>{i._idx=o}),this.notifyPlugins("afterLayout")}_updateDatasets(t){if(this.notifyPlugins("beforeDatasetsUpdate",{mode:t,cancelable:!0})!==!1){for(let e=0,n=this.data.datasets.length;e<n;++e)this.getDatasetMeta(e).controller.configure();for(let e=0,n=this.data.datasets.length;e<n;++e)this._updateDataset(e,_e(t)?t({datasetIndex:e}):t);this.notifyPlugins("afterDatasetsUpdate",{mode:t})}}_updateDataset(t,e){const n=this.getDatasetMeta(t),i={meta:n,index:t,mode:e,cancelable:!0};this.notifyPlugins("beforeDatasetUpdate",i)!==!1&&(n.controller._update(e),i.cancelable=!1,this.notifyPlugins("afterDatasetUpdate",i))}render(){this.notifyPlugins("beforeRender",{cancelable:!0})!==!1&&(Qt.has(this)?this.attached&&!Qt.running(this)&&Qt.start(this):(this.draw(),Ca({chart:this})))}draw(){let t;if(this._resizeBeforeDraw){const{width:n,height:i}=this._resizeBeforeDraw;this._resizeBeforeDraw=null,this._resize(n,i)}if(this.clear(),this.width<=0||this.height<=0||this.notifyPlugins("beforeDraw",{cancelable:!0})===!1)return;const e=this._layers;for(t=0;t<e.length&&e[t].z<=0;++t)e[t].draw(this.chartArea);for(this._drawDatasets();t<e.length;++t)e[t].draw(this.chartArea);this.notifyPlugins("afterDraw")}_getSortedDatasetMetas(t){const e=this._sortedMetasets,n=[];let i,o;for(i=0,o=e.length;i<o;++i){const a=e[i];(!t||a.visible)&&n.push(a)}return n}getSortedVisibleDatasetMetas(){return this._getSortedDatasetMetas(!0)}_drawDatasets(){if(this.notifyPlugins("beforeDatasetsDraw",{cancelable:!0})===!1)return;const t=this.getSortedVisibleDatasetMetas();for(let e=t.length-1;e>=0;--e)this._drawDataset(t[e]);this.notifyPlugins("afterDatasetsDraw")}_drawDataset(t){const e=this.ctx,n={meta:t,index:t.index,cancelable:!0},i=Ar(this,t);this.notifyPlugins("beforeDatasetDraw",n)!==!1&&(i&&mn(e,i),t.controller.draw(),i&&bn(e),n.cancelable=!1,this.notifyPlugins("afterDatasetDraw",n))}isPointInArea(t){return oe(t,this.chartArea,this._minPadding)}getElementsAtEventForMode(t,e,n,i){const o=wd.modes[e];return typeof o=="function"?o(this,t,n,i):[]}getDatasetMeta(t){const e=this.data.datasets[t],n=this._metasets;let i=n.filter(o=>o&&o._dataset===e).pop();return i||(i={type:null,data:[],dataset:null,controller:null,hidden:null,xAxisID:null,yAxisID:null,order:e&&e.order||0,index:t,_dataset:e,_parsed:[],_sorted:!1},n.push(i)),i}getContext(){return this.$context||(this.$context=Ce(null,{chart:this,type:"chart"}))}getVisibleDatasetCount(){return this.getSortedVisibleDatasetMetas().length}isDatasetVisible(t){const e=this.data.datasets[t];if(!e)return!1;const n=this.getDatasetMeta(t);return typeof n.hidden=="boolean"?!n.hidden:!e.hidden}setDatasetVisibility(t,e){const n=this.getDatasetMeta(t);n.hidden=!e}toggleDataVisibility(t){this._hiddenIndices[t]=!this._hiddenIndices[t]}getDataVisibility(t){return!this._hiddenIndices[t]}_updateVisibility(t,e,n){const i=n?"show":"hide",o=this.getDatasetMeta(t),a=o.controller._resolveAnimations(void 0,i);Ss(e)?(o.data[e].hidden=!n,this.update()):(this.setDatasetVisibility(t,n),a.update(o,{visible:n}),this.update(r=>r.datasetIndex===t?i:void 0))}hide(t,e){this._updateVisibility(t,e,!1)}show(t,e){this._updateVisibility(t,e,!0)}_destroyDatasetMeta(t){const e=this._metasets[t];e&&e.controller&&e.controller._destroy(),delete this._metasets[t]}_stop(){let t,e;for(this.stop(),Qt.remove(this),t=0,e=this.data.datasets.length;t<e;++t)this._destroyDatasetMeta(t)}destroy(){this.notifyPlugins("beforeDestroy");const{canvas:t,ctx:e}=this;this._stop(),this.config.clearCache(),t&&(this.unbindEvents(),Xo(t,e),this.platform.releaseContext(e),this.canvas=null,this.ctx=null),delete Zs[this.id],this.notifyPlugins("afterDestroy")}toBase64Image(...t){return this.canvas.toDataURL(...t)}bindEvents(){this.bindUserEvents(),this.options.responsive?this.bindResponsiveEvents():this.attached=!0}bindUserEvents(){const t=this._listeners,e=this.platform,n=(o,a)=>{e.addEventListener(this,o,a),t[o]=a},i=(o,a,r)=>{o.offsetX=a,o.offsetY=r,this._eventHandler(o)};U(this.options.events,o=>n(o,i))}bindResponsiveEvents(){this._responsiveListeners||(this._responsiveListeners={});const t=this._responsiveListeners,e=this.platform,n=(l,c)=>{e.addEventListener(this,l,c),t[l]=c},i=(l,c)=>{t[l]&&(e.removeEventListener(this,l,c),delete t[l])},o=(l,c)=>{this.canvas&&this.resize(l,c)};let a;const r=()=>{i("attach",r),this.attached=!0,this.resize(),n("resize",o),n("detach",a)};a=()=>{this.attached=!1,i("resize",o),this._stop(),this._resize(0,0),n("attach",r)},e.isAttached(this.canvas)?r():a()}unbindEvents(){U(this._listeners,(t,e)=>{this.platform.removeEventListener(this,e,t)}),this._listeners={},U(this._responsiveListeners,(t,e)=>{this.platform.removeEventListener(this,e,t)}),this._responsiveListeners=void 0}updateHoverStyle(t,e,n){const i=n?"set":"remove";let o,a,r,l;for(e==="dataset"&&(o=this.getDatasetMeta(t[0].datasetIndex),o.controller["_"+i+"DatasetHoverStyle"]()),r=0,l=t.length;r<l;++r){a=t[r];const c=a&&this.getDatasetMeta(a.datasetIndex).controller;c&&c[i+"HoverStyle"](a.element,a.datasetIndex,a.index)}}getActiveElements(){return this._active||[]}setActiveElements(t){const e=this._active||[],n=t.map(({datasetIndex:o,index:a})=>{const r=this.getDatasetMeta(o);if(!r)throw new Error("No dataset found at index "+o);return{datasetIndex:o,element:r.data[a],index:a}});!on(n,e)&&(this._active=n,this._lastEvent=null,this._updateHoverStyles(n,e))}notifyPlugins(t,e,n){return this._plugins.notify(this,t,e,n)}isPluginEnabled(t){return this._plugins._cache.filter(e=>e.plugin.id===t).length===1}_updateHoverStyles(t,e,n){const i=this.options.hover,o=(l,c)=>l.filter(d=>!c.some(h=>d.datasetIndex===h.datasetIndex&&d.index===h.index)),a=o(e,t),r=n?t:o(t,e);a.length&&this.updateHoverStyle(a,i.mode,!1),r.length&&i.mode&&this.updateHoverStyle(r,i.mode,!0)}_eventHandler(t,e){const n={event:t,replay:e,cancelable:!0,inChartArea:this.isPointInArea(t)},i=a=>(a.options.events||this.options.events).includes(t.native.type);if(this.notifyPlugins("beforeEvent",n,i)===!1)return;const o=this._handleEvent(t,e,n.inChartArea);return n.cancelable=!1,this.notifyPlugins("afterEvent",n,i),(o||n.changed)&&this.render(),this}_handleEvent(t,e,n){const{_active:i=[],options:o}=this,a=e,r=this._getActiveElements(t,i,n,a),l=Ll(t),c=Sh(t,this._lastEvent,n,l);n&&(this._lastEvent=null,G(o.onHover,[t,r,this],this),l&&G(o.onClick,[t,r,this],this));const d=!on(r,i);return(d||e)&&(this._active=r,this._updateHoverStyles(r,i,e)),this._lastEvent=c,d}_getActiveElements(t,e,n,i){if(t.type==="mouseout")return[];if(!n)return e;const o=this.options.hover;return this.getElementsAtEventForMode(t,o.mode,o,i)}}C(Bt,"defaults",st),C(Bt,"instances",Zs),C(Bt,"overrides",je),C(Bt,"registry",Xt),C(Bt,"version",_h),C(Bt,"getChart",Ea);function Aa(){return U(Bt.instances,s=>s._plugins.invalidate())}function Ch(s,t,e){const{startAngle:n,x:i,y:o,outerRadius:a,innerRadius:r,options:l}=t,{borderWidth:c,borderJoinStyle:d}=l,h=Math.min(c/a,wt(n-e));if(s.beginPath(),s.arc(i,o,a-c/2,n+h/2,e-h/2),r>0){const u=Math.min(c/r,wt(n-e));s.arc(i,o,r+c/2,e-u/2,n+u/2,!0)}else{const u=Math.min(c/2,a*wt(n-e));if(d==="round")s.arc(i,o,u,e-V/2,n+V/2,!0);else if(d==="bevel"){const f=2*u*u,p=-f*Math.cos(e+V/2)+i,g=-f*Math.sin(e+V/2)+o,m=f*Math.cos(n+V/2)+i,b=f*Math.sin(n+V/2)+o;s.lineTo(p,g),s.lineTo(m,b)}}s.closePath(),s.moveTo(0,0),s.rect(0,0,s.canvas.width,s.canvas.height),s.clip("evenodd")}function Eh(s,t,e){const{startAngle:n,pixelMargin:i,x:o,y:a,outerRadius:r,innerRadius:l}=t;let c=i/r;s.beginPath(),s.arc(o,a,r,n-c,e+c),l>i?(c=i/l,s.arc(o,a,l,e+c,n-c,!0)):s.arc(o,a,i,e+lt,n-lt),s.closePath(),s.clip()}function Ah(s){return mi(s,["outerStart","outerEnd","innerStart","innerEnd"])}function Ph(s,t,e,n){const i=Ah(s.options.borderRadius),o=(e-t)/2,a=Math.min(o,n*t/2),r=l=>{const c=(e-Math.min(o,l))*n/2;return bt(l,0,Math.min(o,c))};return{outerStart:r(i.outerStart),outerEnd:r(i.outerEnd),innerStart:bt(i.innerStart,0,a),innerEnd:bt(i.innerEnd,0,a)}}function He(s,t,e,n){return{x:e+s*Math.cos(t),y:n+s*Math.sin(t)}}function hn(s,t,e,n,i,o){const{x:a,y:r,startAngle:l,pixelMargin:c,innerRadius:d}=t,h=Math.max(t.outerRadius+n+e-c,0),u=d>0?d+n+e+c:0;let f=0;const p=i-l;if(n){const W=d>0?d-n:0,X=h>0?h-n:0,Z=(W+X)/2,At=Z!==0?p*Z/(Z+n):p;f=(p-At)/2}const g=Math.max(.001,p*h-e/V)/h,m=(p-g)/2,b=l+m+f,v=i-m-f,{outerStart:M,outerEnd:k,innerStart:w,innerEnd:E}=Ph(t,u,h,v-b),P=h-M,D=h-k,$=b+M/P,R=v-k/D,F=u+w,z=u+E,ct=b+w/F,yt=v-E/z;if(s.beginPath(),o){const W=($+R)/2;if(s.arc(a,r,h,$,W),s.arc(a,r,h,W,R),k>0){const ut=He(D,R,a,r);s.arc(ut.x,ut.y,k,R,v+lt)}const X=He(z,v,a,r);if(s.lineTo(X.x,X.y),E>0){const ut=He(z,yt,a,r);s.arc(ut.x,ut.y,E,v+lt,yt+Math.PI)}const Z=(v-E/u+(b+w/u))/2;if(s.arc(a,r,u,v-E/u,Z,!0),s.arc(a,r,u,Z,b+w/u,!0),w>0){const ut=He(F,ct,a,r);s.arc(ut.x,ut.y,w,ct+Math.PI,b-lt)}const At=He(P,b,a,r);if(s.lineTo(At.x,At.y),M>0){const ut=He(P,$,a,r);s.arc(ut.x,ut.y,M,b-lt,$)}}else{s.moveTo(a,r);const W=Math.cos($)*h+a,X=Math.sin($)*h+r;s.lineTo(W,X);const Z=Math.cos(R)*h+a,At=Math.sin(R)*h+r;s.lineTo(Z,At)}s.closePath()}function Dh(s,t,e,n,i){const{fullCircles:o,startAngle:a,circumference:r}=t;let l=t.endAngle;if(o){hn(s,t,e,n,l,i);for(let c=0;c<o;++c)s.fill();isNaN(r)||(l=a+(r%J||J))}return hn(s,t,e,n,l,i),s.fill(),l}function Th(s,t,e,n,i){const{fullCircles:o,startAngle:a,circumference:r,options:l}=t,{borderWidth:c,borderJoinStyle:d,borderDash:h,borderDashOffset:u,borderRadius:f}=l,p=l.borderAlign==="inner";if(!c)return;s.setLineDash(h||[]),s.lineDashOffset=u,p?(s.lineWidth=c*2,s.lineJoin=d||"round"):(s.lineWidth=c,s.lineJoin=d||"bevel");let g=t.endAngle;if(o){hn(s,t,e,n,g,i);for(let m=0;m<o;++m)s.stroke();isNaN(r)||(g=a+(r%J||J))}p&&Eh(s,t,g),l.selfJoin&&g-a>=V&&f===0&&d!=="miter"&&Ch(s,t,g),o||(hn(s,t,e,n,g,i),s.stroke())}class hs extends Wt{constructor(e){super();C(this,"circumference");C(this,"endAngle");C(this,"fullCircles");C(this,"innerRadius");C(this,"outerRadius");C(this,"pixelMargin");C(this,"startAngle");this.options=void 0,this.circumference=void 0,this.startAngle=void 0,this.endAngle=void 0,this.innerRadius=void 0,this.outerRadius=void 0,this.pixelMargin=0,this.fullCircles=0,e&&Object.assign(this,e)}inRange(e,n,i){const o=this.getProps(["x","y"],i),{angle:a,distance:r}=rr(o,{x:e,y:n}),{startAngle:l,endAngle:c,innerRadius:d,outerRadius:h,circumference:u}=this.getProps(["startAngle","endAngle","innerRadius","outerRadius","circumference"],i),f=(this.options.spacing+this.options.borderWidth)/2,p=B(u,c-l),g=Cs(a,l,c)&&l!==c,m=p>=J||g,b=ne(r,d+f,h+f);return m&&b}getCenterPoint(e){const{x:n,y:i,startAngle:o,endAngle:a,innerRadius:r,outerRadius:l}=this.getProps(["x","y","startAngle","endAngle","innerRadius","outerRadius"],e),{offset:c,spacing:d}=this.options,h=(o+a)/2,u=(r+l+d+c)/2;return{x:n+Math.cos(h)*u,y:i+Math.sin(h)*u}}tooltipPosition(e){return this.getCenterPoint(e)}draw(e){const{options:n,circumference:i}=this,o=(n.offset||0)/4,a=(n.spacing||0)/2,r=n.circular;if(this.pixelMargin=n.borderAlign==="inner"?.33:0,this.fullCircles=i>J?Math.floor(i/J):0,i===0||this.innerRadius<0||this.outerRadius<0)return;e.save();const l=(this.startAngle+this.endAngle)/2;e.translate(Math.cos(l)*o,Math.sin(l)*o);const c=1-Math.sin(Math.min(V,i||0)),d=o*c;e.fillStyle=n.backgroundColor,e.strokeStyle=n.borderColor,Dh(e,this,d,a,r),Th(e,this,d,a,r),e.restore()}}C(hs,"id","arc"),C(hs,"defaults",{borderAlign:"center",borderColor:"#fff",borderDash:[],borderDashOffset:0,borderJoinStyle:void 0,borderRadius:0,borderWidth:2,offset:0,spacing:0,angle:void 0,circular:!0,selfJoin:!1}),C(hs,"defaultRoutes",{backgroundColor:"backgroundColor"}),C(hs,"descriptors",{_scriptable:!0,_indexable:e=>e!=="borderDash"});function Nr(s,t,e=t){s.lineCap=B(e.borderCapStyle,t.borderCapStyle),s.setLineDash(B(e.borderDash,t.borderDash)),s.lineDashOffset=B(e.borderDashOffset,t.borderDashOffset),s.lineJoin=B(e.borderJoinStyle,t.borderJoinStyle),s.lineWidth=B(e.borderWidth,t.borderWidth),s.strokeStyle=B(e.borderColor,t.borderColor)}function Lh(s,t,e){s.lineTo(e.x,e.y)}function Ih(s){return s.stepped?ec:s.tension||s.cubicInterpolationMode==="monotone"?sc:Lh}function Vr(s,t,e={}){const n=s.length,{start:i=0,end:o=n-1}=e,{start:a,end:r}=t,l=Math.max(i,a),c=Math.min(o,r),d=i<a&&o<a||i>r&&o>r;return{count:n,start:l,loop:t.loop,ilen:c<l&&!d?n+c-l:c-l}}function $h(s,t,e,n){const{points:i,options:o}=t,{count:a,start:r,loop:l,ilen:c}=Vr(i,e,n),d=Ih(o);let{move:h=!0,reverse:u}=n||{},f,p,g;for(f=0;f<=c;++f)p=i[(r+(u?c-f:f))%a],!p.skip&&(h?(s.moveTo(p.x,p.y),h=!1):d(s,g,p,u,o.stepped),g=p);return l&&(p=i[(r+(u?c:0))%a],d(s,g,p,u,o.stepped)),!!l}function Oh(s,t,e,n){const i=t.points,{count:o,start:a,ilen:r}=Vr(i,e,n),{move:l=!0,reverse:c}=n||{};let d=0,h=0,u,f,p,g,m,b;const v=k=>(a+(c?r-k:k))%o,M=()=>{g!==m&&(s.lineTo(d,m),s.lineTo(d,g),s.lineTo(d,b))};for(l&&(f=i[v(0)],s.moveTo(f.x,f.y)),u=0;u<=r;++u){if(f=i[v(u)],f.skip)continue;const k=f.x,w=f.y,E=k|0;E===p?(w<g?g=w:w>m&&(m=w),d=(h*d+k)/++h):(M(),s.lineTo(k,w),p=E,h=0,g=m=w),b=w}M()}function qn(s){const t=s.options,e=t.borderDash&&t.borderDash.length;return!s._decimated&&!s._loop&&!t.tension&&t.cubicInterpolationMode!=="monotone"&&!t.stepped&&!e?Oh:$h}function Bh(s){return s.stepped?$c:s.tension||s.cubicInterpolationMode==="monotone"?Oc:Ie}function Rh(s,t,e,n){let i=t._path;i||(i=t._path=new Path2D,t.path(i,e,n)&&i.closePath()),Nr(s,t.options),s.stroke(i)}function Fh(s,t,e,n){const{segments:i,options:o}=t,a=qn(t);for(const r of i)Nr(s,o,r.style),s.beginPath(),a(s,t,r,{start:e,end:e+n-1})&&s.closePath(),s.stroke()}const zh=typeof Path2D=="function";function jh(s,t,e,n){zh&&!t.options.segment?Rh(s,t,e,n):Fh(s,t,e,n)}class be extends Wt{constructor(t){super(),this.animated=!0,this.options=void 0,this._chart=void 0,this._loop=void 0,this._fullLoop=void 0,this._path=void 0,this._points=void 0,this._segments=void 0,this._decimated=!1,this._pointsUpdated=!1,this._datasetIndex=void 0,t&&Object.assign(this,t)}updateControlPoints(t,e){const n=this.options;if((n.tension||n.cubicInterpolationMode==="monotone")&&!n.stepped&&!this._pointsUpdated){const i=n.spanGaps?this._loop:this._fullLoop;Cc(this._points,n,t,i,e),this._pointsUpdated=!0}}set points(t){this._points=t,delete this._segments,delete this._path,this._pointsUpdated=!1}get points(){return this._points}get segments(){return this._segments||(this._segments=Nc(this,this.options.segment))}first(){const t=this.segments,e=this.points;return t.length&&e[t[0].start]}last(){const t=this.segments,e=this.points,n=t.length;return n&&e[t[n-1].end]}interpolate(t,e){const n=this.options,i=t[e],o=this.points,a=Er(this,{property:e,start:i,end:i});if(!a.length)return;const r=[],l=Bh(n);let c,d;for(c=0,d=a.length;c<d;++c){const{start:h,end:u}=a[c],f=o[h],p=o[u];if(f===p){r.push(f);continue}const g=Math.abs((i-f[e])/(p[e]-f[e])),m=l(f,p,g,n.stepped);m[e]=t[e],r.push(m)}return r.length===1?r[0]:r}pathSegment(t,e,n){return qn(this)(t,this,e,n)}path(t,e,n){const i=this.segments,o=qn(this);let a=this._loop;e=e||0,n=n||this.points.length-e;for(const r of i)a&=o(t,this,r,{start:e,end:e+n-1});return!!a}draw(t,e,n,i){const o=this.options||{};(this.points||[]).length&&o.borderWidth&&(t.save(),jh(t,this,n,i),t.restore()),this.animated&&(this._pointsUpdated=!1,this._path=void 0)}}C(be,"id","line"),C(be,"defaults",{borderCapStyle:"butt",borderDash:[],borderDashOffset:0,borderJoinStyle:"miter",borderWidth:3,capBezierPoints:!0,cubicInterpolationMode:"default",fill:!1,spanGaps:!1,stepped:!1,tension:0}),C(be,"defaultRoutes",{backgroundColor:"backgroundColor",borderColor:"borderColor"}),C(be,"descriptors",{_scriptable:!0,_indexable:t=>t!=="borderDash"&&t!=="fill"});function Pa(s,t,e,n){const i=s.options,{[e]:o}=s.getProps([e],n);return Math.abs(t-o)<i.radius+i.hitRadius}class Qs extends Wt{constructor(e){super();C(this,"parsed");C(this,"skip");C(this,"stop");this.options=void 0,this.parsed=void 0,this.skip=void 0,this.stop=void 0,e&&Object.assign(this,e)}inRange(e,n,i){const o=this.options,{x:a,y:r}=this.getProps(["x","y"],i);return Math.pow(e-a,2)+Math.pow(n-r,2)<Math.pow(o.hitRadius+o.radius,2)}inXRange(e,n){return Pa(this,e,"x",n)}inYRange(e,n){return Pa(this,e,"y",n)}getCenterPoint(e){const{x:n,y:i}=this.getProps(["x","y"],e);return{x:n,y:i}}size(e){e=e||this.options||{};let n=e.radius||0;n=Math.max(n,n&&e.hoverRadius||0);const i=n&&e.borderWidth||0;return(n+i)*2}draw(e,n){const i=this.options;this.skip||i.radius<.1||!oe(this,n,this.size(i)/2)||(e.strokeStyle=i.borderColor,e.lineWidth=i.borderWidth,e.fillStyle=i.backgroundColor,Hn(e,i,this.x,this.y))}getRange(){const e=this.options||{};return e.radius+e.hitRadius}}C(Qs,"id","point"),C(Qs,"defaults",{borderWidth:1,hitRadius:1,hoverBorderWidth:1,hoverRadius:4,pointStyle:"circle",radius:3,rotation:0}),C(Qs,"defaultRoutes",{backgroundColor:"backgroundColor",borderColor:"borderColor"});function Wr(s,t){const{x:e,y:n,base:i,width:o,height:a}=s.getProps(["x","y","base","width","height"],t);let r,l,c,d,h;return s.horizontal?(h=a/2,r=Math.min(e,i),l=Math.max(e,i),c=n-h,d=n+h):(h=o/2,r=e-h,l=e+h,c=Math.min(n,i),d=Math.max(n,i)),{left:r,top:c,right:l,bottom:d}}function xe(s,t,e,n){return s?0:bt(t,e,n)}function Nh(s,t,e){const n=s.options.borderWidth,i=s.borderSkipped,o=mr(n);return{t:xe(i.top,o.top,0,e),r:xe(i.right,o.right,0,t),b:xe(i.bottom,o.bottom,0,e),l:xe(i.left,o.left,0,t)}}function Vh(s,t,e){const{enableBorderRadius:n}=s.getProps(["enableBorderRadius"]),i=s.options.borderRadius,o=Fe(i),a=Math.min(t,e),r=s.borderSkipped,l=n||N(i);return{topLeft:xe(!l||r.top||r.left,o.topLeft,0,a),topRight:xe(!l||r.top||r.right,o.topRight,0,a),bottomLeft:xe(!l||r.bottom||r.left,o.bottomLeft,0,a),bottomRight:xe(!l||r.bottom||r.right,o.bottomRight,0,a)}}function Wh(s){const t=Wr(s),e=t.right-t.left,n=t.bottom-t.top,i=Nh(s,e/2,n/2),o=Vh(s,e/2,n/2);return{outer:{x:t.left,y:t.top,w:e,h:n,radius:o},inner:{x:t.left+i.l,y:t.top+i.t,w:e-i.l-i.r,h:n-i.t-i.b,radius:{topLeft:Math.max(0,o.topLeft-Math.max(i.t,i.l)),topRight:Math.max(0,o.topRight-Math.max(i.t,i.r)),bottomLeft:Math.max(0,o.bottomLeft-Math.max(i.b,i.l)),bottomRight:Math.max(0,o.bottomRight-Math.max(i.b,i.r))}}}}function In(s,t,e,n){const i=t===null,o=e===null,r=s&&!(i&&o)&&Wr(s,n);return r&&(i||ne(t,r.left,r.right))&&(o||ne(e,r.top,r.bottom))}function Hh(s){return s.topLeft||s.topRight||s.bottomLeft||s.bottomRight}function Yh(s,t){s.rect(t.x,t.y,t.w,t.h)}function $n(s,t,e={}){const n=s.x!==e.x?-t:0,i=s.y!==e.y?-t:0,o=(s.x+s.w!==e.x+e.w?t:0)-n,a=(s.y+s.h!==e.y+e.h?t:0)-i;return{x:s.x+n,y:s.y+i,w:s.w+o,h:s.h+a,radius:s.radius}}class tn extends Wt{constructor(t){super(),this.options=void 0,this.horizontal=void 0,this.base=void 0,this.width=void 0,this.height=void 0,this.inflateAmount=void 0,t&&Object.assign(this,t)}draw(t){const{inflateAmount:e,options:{borderColor:n,backgroundColor:i}}=this,{inner:o,outer:a}=Wh(this),r=Hh(a.radius)?Es:Yh;t.save(),(a.w!==o.w||a.h!==o.h)&&(t.beginPath(),r(t,$n(a,e,o)),t.clip(),r(t,$n(o,-e,a)),t.fillStyle=n,t.fill("evenodd")),t.beginPath(),r(t,$n(o,e)),t.fillStyle=i,t.fill(),t.restore()}inRange(t,e,n){return In(this,t,e,n)}inXRange(t,e){return In(this,t,null,e)}inYRange(t,e){return In(this,null,t,e)}getCenterPoint(t){const{x:e,y:n,base:i,horizontal:o}=this.getProps(["x","y","base","horizontal"],t);return{x:o?(e+i)/2:e,y:o?n:(n+i)/2}}getRange(t){return t==="x"?this.width/2:this.height/2}}C(tn,"id","bar"),C(tn,"defaults",{borderSkipped:"start",borderWidth:0,borderRadius:0,inflateAmount:"auto",pointStyle:void 0}),C(tn,"defaultRoutes",{backgroundColor:"backgroundColor",borderColor:"borderColor"});var Uh=Object.freeze({__proto__:null,ArcElement:hs,BarElement:tn,LineElement:be,PointElement:Qs});const Gn=["rgb(54, 162, 235)","rgb(255, 99, 132)","rgb(255, 159, 64)","rgb(255, 205, 86)","rgb(75, 192, 192)","rgb(153, 102, 255)","rgb(201, 203, 207)"],Da=Gn.map(s=>s.replace("rgb(","rgba(").replace(")",", 0.5)"));function Hr(s){return Gn[s%Gn.length]}function Yr(s){return Da[s%Da.length]}function Xh(s,t){return s.borderColor=Hr(t),s.backgroundColor=Yr(t),++t}function qh(s,t){return s.backgroundColor=s.data.map(()=>Hr(t++)),t}function Gh(s,t){return s.backgroundColor=s.data.map(()=>Yr(t++)),t}function Kh(s){let t=0;return(e,n)=>{const i=s.getDatasetMeta(n).controller;i instanceof Oe?t=qh(e,t):i instanceof _s?t=Gh(e,t):i&&(t=Xh(e,t))}}function Ta(s){let t;for(t in s)if(s[t].borderColor||s[t].backgroundColor)return!0;return!1}function Jh(s){return s&&(s.borderColor||s.backgroundColor)}function Zh(){return st.borderColor!=="rgba(0,0,0,0.1)"||st.backgroundColor!=="rgba(0,0,0,0.1)"}var Qh={id:"colors",defaults:{enabled:!0,forceOverride:!1},beforeLayout(s,t,e){if(!e.enabled)return;const{data:{datasets:n},options:i}=s.config,{elements:o}=i,a=Ta(n)||Jh(i)||o&&Ta(o)||Zh();if(!e.forceOverride&&a)return;const r=Kh(s);n.forEach(r)}};function tu(s,t,e,n,i){const o=i.samples||n;if(o>=e)return s.slice(t,t+e);const a=[],r=(e-2)/(o-2);let l=0;const c=t+e-1;let d=t,h,u,f,p,g;for(a[l++]=s[d],h=0;h<o-2;h++){let m=0,b=0,v;const M=Math.floor((h+1)*r)+1+t,k=Math.min(Math.floor((h+2)*r)+1,e)+t,w=k-M;for(v=M;v<k;v++)m+=s[v].x,b+=s[v].y;m/=w,b/=w;const E=Math.floor(h*r)+1+t,P=Math.min(Math.floor((h+1)*r)+1,e)+t,{x:D,y:$}=s[d];for(f=p=-1,v=E;v<P;v++)p=.5*Math.abs((D-m)*(s[v].y-$)-(D-s[v].x)*(b-$)),p>f&&(f=p,u=s[v],g=v);a[l++]=u,d=g}return a[l++]=s[c],a}function eu(s,t,e,n){let i=0,o=0,a,r,l,c,d,h,u,f,p,g;const m=[],b=t+e-1,v=s[t].x,k=s[b].x-v;for(a=t;a<t+e;++a){r=s[a],l=(r.x-v)/k*n,c=r.y;const w=l|0;if(w===d)c<p?(p=c,h=a):c>g&&(g=c,u=a),i=(o*i+r.x)/++o;else{const E=a-1;if(!j(h)&&!j(u)){const P=Math.min(h,u),D=Math.max(h,u);P!==f&&P!==E&&m.push({...s[P],x:i}),D!==f&&D!==E&&m.push({...s[D],x:i})}a>0&&E!==f&&m.push(s[E]),m.push(r),d=w,o=0,p=g=c,h=u=f=a}}return m}function Ur(s){if(s._decimated){const t=s._data;delete s._decimated,delete s._data,Object.defineProperty(s,"data",{configurable:!0,enumerable:!0,writable:!0,value:t})}}function La(s){s.data.datasets.forEach(t=>{Ur(t)})}function su(s,t){const e=t.length;let n=0,i;const{iScale:o}=s,{min:a,max:r,minDefined:l,maxDefined:c}=o.getUserBounds();return l&&(n=bt(ie(t,o.axis,a).lo,0,e-1)),c?i=bt(ie(t,o.axis,r).hi+1,n,e)-n:i=e-n,{start:n,count:i}}var nu={id:"decimation",defaults:{algorithm:"min-max",enabled:!1},beforeElementsUpdate:(s,t,e)=>{if(!e.enabled){La(s);return}const n=s.width;s.data.datasets.forEach((i,o)=>{const{_data:a,indexAxis:r}=i,l=s.getDatasetMeta(o),c=a||i.data;if(cs([r,s.options.indexAxis])==="y"||!l.controller.supportsDecimation)return;const d=s.scales[l.xAxisID];if(d.type!=="linear"&&d.type!=="time"||s.options.parsing)return;let{start:h,count:u}=su(l,c);const f=e.threshold||4*n;if(u<=f){Ur(i);return}j(a)&&(i._data=c,delete i.data,Object.defineProperty(i,"data",{configurable:!0,enumerable:!0,get:function(){return this._decimated},set:function(g){this._data=g}}));let p;switch(e.algorithm){case"lttb":p=tu(c,h,u,n,e);break;case"min-max":p=eu(c,h,u,n);break;default:throw new Error(`Unsupported decimation algorithm '${e.algorithm}'`)}i._decimated=p})},destroy(s){La(s)}};function iu(s,t,e){const n=s.segments,i=s.points,o=t.points,a=[];for(const r of n){let{start:l,end:c}=r;c=vn(l,c,i);const d=Kn(e,i[l],i[c],r.loop);if(!t.segments){a.push({source:r,target:d,start:i[l],end:i[c]});continue}const h=Er(t,d);for(const u of h){const f=Kn(e,o[u.start],o[u.end],u.loop),p=Cr(r,i,f);for(const g of p)a.push({source:g,target:u,start:{[e]:Ia(d,f,"start",Math.max)},end:{[e]:Ia(d,f,"end",Math.min)}})}}return a}function Kn(s,t,e,n){if(n)return;let i=t[s],o=e[s];return s==="angle"&&(i=wt(i),o=wt(o)),{property:s,start:i,end:o}}function ou(s,t){const{x:e=null,y:n=null}=s||{},i=t.points,o=[];return t.segments.forEach(({start:a,end:r})=>{r=vn(a,r,i);const l=i[a],c=i[r];n!==null?(o.push({x:l.x,y:n}),o.push({x:c.x,y:n})):e!==null&&(o.push({x:e,y:l.y}),o.push({x:e,y:c.y}))}),o}function vn(s,t,e){for(;t>s;t--){const n=e[t];if(!isNaN(n.x)&&!isNaN(n.y))break}return t}function Ia(s,t,e,n){return s&&t?n(s[e],t[e]):s?s[e]:t?t[e]:0}function Xr(s,t){let e=[],n=!1;return et(s)?(n=!0,e=s):e=ou(s,t),e.length?new be({points:e,options:{tension:0},_loop:n,_fullLoop:n}):null}function $a(s){return s&&s.fill!==!1}function au(s,t,e){let i=s[t].fill;const o=[t];let a;if(!e)return i;for(;i!==!1&&o.indexOf(i)===-1;){if(!nt(i))return i;if(a=s[i],!a)return!1;if(a.visible)return i;o.push(i),i=a.fill}return!1}function ru(s,t,e){const n=hu(s);if(N(n))return isNaN(n.value)?!1:n;let i=parseFloat(n);return nt(i)&&Math.floor(i)===i?lu(n[0],t,i,e):["origin","start","end","stack","shape"].indexOf(n)>=0&&n}function lu(s,t,e,n){return(s==="-"||s==="+")&&(e=t+e),e===t||e<0||e>=n?!1:e}function cu(s,t){let e=null;return s==="start"?e=t.bottom:s==="end"?e=t.top:N(s)?e=t.getPixelForValue(s.value):t.getBasePixel&&(e=t.getBasePixel()),e}function du(s,t,e){let n;return s==="start"?n=e:s==="end"?n=t.options.reverse?t.min:t.max:N(s)?n=s.value:n=t.getBaseValue(),n}function hu(s){const t=s.options,e=t.fill;let n=B(e&&e.target,e);return n===void 0&&(n=!!t.backgroundColor),n===!1||n===null?!1:n===!0?"origin":n}function uu(s){const{scale:t,index:e,line:n}=s,i=[],o=n.segments,a=n.points,r=fu(t,e);r.push(Xr({x:null,y:t.bottom},n));for(let l=0;l<o.length;l++){const c=o[l];for(let d=c.start;d<=c.end;d++)pu(i,a[d],r)}return new be({points:i,options:{}})}function fu(s,t){const e=[],n=s.getMatchingVisibleMetas("line");for(let i=0;i<n.length;i++){const o=n[i];if(o.index===t)break;o.hidden||e.unshift(o.dataset)}return e}function pu(s,t,e){const n=[];for(let i=0;i<e.length;i++){const o=e[i],{first:a,last:r,point:l}=gu(o,t,"x");if(!(!l||a&&r)){if(a)n.unshift(l);else if(s.push(l),!r)break}}s.push(...n)}function gu(s,t,e){const n=s.interpolate(t,e);if(!n)return{};const i=n[e],o=s.segments,a=s.points;let r=!1,l=!1;for(let c=0;c<o.length;c++){const d=o[c],h=a[d.start][e],u=a[d.end][e];if(ne(i,h,u)){r=i===h,l=i===u;break}}return{first:r,last:l,point:n}}class qr{constructor(t){this.x=t.x,this.y=t.y,this.radius=t.radius}pathSegment(t,e,n){const{x:i,y:o,radius:a}=this;return e=e||{start:0,end:J},t.arc(i,o,a,e.end,e.start,!0),!n.bounds}interpolate(t){const{x:e,y:n,radius:i}=this,o=t.angle;return{x:e+Math.cos(o)*i,y:n+Math.sin(o)*i,angle:o}}}function mu(s){const{chart:t,fill:e,line:n}=s;if(nt(e))return bu(t,e);if(e==="stack")return uu(s);if(e==="shape")return!0;const i=xu(s);return i instanceof qr?i:Xr(i,n)}function bu(s,t){const e=s.getDatasetMeta(t);return e&&s.isDatasetVisible(t)?e.dataset:null}function xu(s){return(s.scale||{}).getPointPositionForValue?vu(s):yu(s)}function yu(s){const{scale:t={},fill:e}=s,n=cu(e,t);if(nt(n)){const i=t.isHorizontal();return{x:i?n:null,y:i?null:n}}return null}function vu(s){const{scale:t,fill:e}=s,n=t.options,i=t.getLabels().length,o=n.reverse?t.max:t.min,a=du(e,t,o),r=[];if(n.grid.circular){const l=t.getPointPositionForValue(0,o);return new qr({x:l.x,y:l.y,radius:t.getDistanceFromCenterForValue(a)})}for(let l=0;l<i;++l)r.push(t.getPointPositionForValue(l,a));return r}function On(s,t,e){const n=mu(t),{chart:i,index:o,line:a,scale:r,axis:l}=t,c=a.options,d=c.fill,h=c.backgroundColor,{above:u=h,below:f=h}=d||{},p=i.getDatasetMeta(o),g=Ar(i,p);n&&a.points.length&&(mn(s,e),_u(s,{line:a,target:n,above:u,below:f,area:e,scale:r,axis:l,clip:g}),bn(s))}function _u(s,t){const{line:e,target:n,above:i,below:o,area:a,scale:r,clip:l}=t,c=e._loop?"angle":t.axis;s.save();let d=o;o!==i&&(c==="x"?(Oa(s,n,a.top),Bn(s,{line:e,target:n,color:i,scale:r,property:c,clip:l}),s.restore(),s.save(),Oa(s,n,a.bottom)):c==="y"&&(Ba(s,n,a.left),Bn(s,{line:e,target:n,color:o,scale:r,property:c,clip:l}),s.restore(),s.save(),Ba(s,n,a.right),d=i)),Bn(s,{line:e,target:n,color:d,scale:r,property:c,clip:l}),s.restore()}function Oa(s,t,e){const{segments:n,points:i}=t;let o=!0,a=!1;s.beginPath();for(const r of n){const{start:l,end:c}=r,d=i[l],h=i[vn(l,c,i)];o?(s.moveTo(d.x,d.y),o=!1):(s.lineTo(d.x,e),s.lineTo(d.x,d.y)),a=!!t.pathSegment(s,r,{move:a}),a?s.closePath():s.lineTo(h.x,e)}s.lineTo(t.first().x,e),s.closePath(),s.clip()}function Ba(s,t,e){const{segments:n,points:i}=t;let o=!0,a=!1;s.beginPath();for(const r of n){const{start:l,end:c}=r,d=i[l],h=i[vn(l,c,i)];o?(s.moveTo(d.x,d.y),o=!1):(s.lineTo(e,d.y),s.lineTo(d.x,d.y)),a=!!t.pathSegment(s,r,{move:a}),a?s.closePath():s.lineTo(e,h.y)}s.lineTo(e,t.first().y),s.closePath(),s.clip()}function Bn(s,t){const{line:e,target:n,property:i,color:o,scale:a,clip:r}=t,l=iu(e,n,i);for(const{source:c,target:d,start:h,end:u}of l){const{style:{backgroundColor:f=o}={}}=c,p=n!==!0;s.save(),s.fillStyle=f,wu(s,a,r,p&&Kn(i,h,u)),s.beginPath();const g=!!e.pathSegment(s,c);let m;if(p){g?s.closePath():Ra(s,n,u,i);const b=!!n.pathSegment(s,d,{move:g,reverse:!0});m=g&&b,m||Ra(s,n,h,i)}s.closePath(),s.fill(m?"evenodd":"nonzero"),s.restore()}}function wu(s,t,e,n){const i=t.chart.chartArea,{property:o,start:a,end:r}=n||{};if(o==="x"||o==="y"){let l,c,d,h;o==="x"?(l=a,c=i.top,d=r,h=i.bottom):(l=i.left,c=a,d=i.right,h=r),s.beginPath(),e&&(l=Math.max(l,e.left),d=Math.min(d,e.right),c=Math.max(c,e.top),h=Math.min(h,e.bottom)),s.rect(l,c,d-l,h-c),s.clip()}}function Ra(s,t,e,n){const i=t.interpolate(e,n);i&&s.lineTo(i.x,i.y)}var ku={id:"filler",afterDatasetsUpdate(s,t,e){const n=(s.data.datasets||[]).length,i=[];let o,a,r,l;for(a=0;a<n;++a)o=s.getDatasetMeta(a),r=o.dataset,l=null,r&&r.options&&r instanceof be&&(l={visible:s.isDatasetVisible(a),index:a,fill:ru(r,a,n),chart:s,axis:o.controller.options.indexAxis,scale:o.vScale,line:r}),o.$filler=l,i.push(l);for(a=0;a<n;++a)l=i[a],!(!l||l.fill===!1)&&(l.fill=au(i,a,e.propagate))},beforeDraw(s,t,e){const n=e.drawTime==="beforeDraw",i=s.getSortedVisibleDatasetMetas(),o=s.chartArea;for(let a=i.length-1;a>=0;--a){const r=i[a].$filler;r&&(r.line.updateControlPoints(o,r.axis),n&&r.fill&&On(s.ctx,r,o))}},beforeDatasetsDraw(s,t,e){if(e.drawTime!=="beforeDatasetsDraw")return;const n=s.getSortedVisibleDatasetMetas();for(let i=n.length-1;i>=0;--i){const o=n[i].$filler;$a(o)&&On(s.ctx,o,s.chartArea)}},beforeDatasetDraw(s,t,e){const n=t.meta.$filler;!$a(n)||e.drawTime!=="beforeDatasetDraw"||On(s.ctx,n,s.chartArea)},defaults:{propagate:!0,drawTime:"beforeDatasetDraw"}};const Fa=(s,t)=>{let{boxHeight:e=t,boxWidth:n=t}=s;return s.usePointStyle&&(e=Math.min(e,t),n=s.pointStyleWidth||Math.min(n,t)),{boxWidth:n,boxHeight:e,itemHeight:Math.max(t,e)}},Mu=(s,t)=>s!==null&&t!==null&&s.datasetIndex===t.datasetIndex&&s.index===t.index;class za extends Wt{constructor(t){super(),this._added=!1,this.legendHitBoxes=[],this._hoveredItem=null,this.doughnutMode=!1,this.chart=t.chart,this.options=t.options,this.ctx=t.ctx,this.legendItems=void 0,this.columnSizes=void 0,this.lineWidths=void 0,this.maxHeight=void 0,this.maxWidth=void 0,this.top=void 0,this.bottom=void 0,this.left=void 0,this.right=void 0,this.height=void 0,this.width=void 0,this._margins=void 0,this.position=void 0,this.weight=void 0,this.fullSize=void 0}update(t,e,n){this.maxWidth=t,this.maxHeight=e,this._margins=n,this.setDimensions(),this.buildLabels(),this.fit()}setDimensions(){this.isHorizontal()?(this.width=this.maxWidth,this.left=this._margins.left,this.right=this.width):(this.height=this.maxHeight,this.top=this._margins.top,this.bottom=this.height)}buildLabels(){const t=this.options.labels||{};let e=G(t.generateLabels,[this.chart],this)||[];t.filter&&(e=e.filter(n=>t.filter(n,this.chart.data))),t.sort&&(e=e.sort((n,i)=>t.sort(n,i,this.chart.data))),this.options.reverse&&e.reverse(),this.legendItems=e}fit(){const{options:t,ctx:e}=this;if(!t.display){this.width=this.height=0;return}const n=t.labels,i=gt(n.font),o=i.size,a=this._computeTitleHeight(),{boxWidth:r,itemHeight:l}=Fa(n,o);let c,d;e.font=i.string,this.isHorizontal()?(c=this.maxWidth,d=this._fitRows(a,o,r,l)+10):(d=this.maxHeight,c=this._fitCols(a,i,r,l)+10),this.width=Math.min(c,t.maxWidth||this.maxWidth),this.height=Math.min(d,t.maxHeight||this.maxHeight)}_fitRows(t,e,n,i){const{ctx:o,maxWidth:a,options:{labels:{padding:r}}}=this,l=this.legendHitBoxes=[],c=this.lineWidths=[0],d=i+r;let h=t;o.textAlign="left",o.textBaseline="middle";let u=-1,f=-d;return this.legendItems.forEach((p,g)=>{const m=n+e/2+o.measureText(p.text).width;(g===0||c[c.length-1]+m+2*r>a)&&(h+=d,c[c.length-(g>0?0:1)]=0,f+=d,u++),l[g]={left:0,top:f,row:u,width:m,height:i},c[c.length-1]+=m+r}),h}_fitCols(t,e,n,i){const{ctx:o,maxHeight:a,options:{labels:{padding:r}}}=this,l=this.legendHitBoxes=[],c=this.columnSizes=[],d=a-t;let h=r,u=0,f=0,p=0,g=0;return this.legendItems.forEach((m,b)=>{const{itemWidth:v,itemHeight:M}=Su(n,e,o,m,i);b>0&&f+M+2*r>d&&(h+=u+r,c.push({width:u,height:f}),p+=u+r,g++,u=f=0),l[b]={left:p,top:f,col:g,width:v,height:M},u=Math.max(u,v),f+=M+r}),h+=u,c.push({width:u,height:f}),h}adjustHitBoxes(){if(!this.options.display)return;const t=this._computeTitleHeight(),{legendHitBoxes:e,options:{align:n,labels:{padding:i},rtl:o}}=this,a=Ke(o,this.left,this.width);if(this.isHorizontal()){let r=0,l=vt(n,this.left+i,this.right-this.lineWidths[r]);for(const c of e)r!==c.row&&(r=c.row,l=vt(n,this.left+i,this.right-this.lineWidths[r])),c.top+=this.top+t+i,c.left=a.leftForLtr(a.x(l),c.width),l+=c.width+i}else{let r=0,l=vt(n,this.top+t+i,this.bottom-this.columnSizes[r].height);for(const c of e)c.col!==r&&(r=c.col,l=vt(n,this.top+t+i,this.bottom-this.columnSizes[r].height)),c.top=l,c.left+=this.left+i,c.left=a.leftForLtr(a.x(c.left),c.width),l+=c.height+i}}isHorizontal(){return this.options.position==="top"||this.options.position==="bottom"}draw(){if(this.options.display){const t=this.ctx;mn(t,this),this._draw(),bn(t)}}_draw(){const{options:t,columnSizes:e,lineWidths:n,ctx:i}=this,{align:o,labels:a}=t,r=st.color,l=Ke(t.rtl,this.left,this.width),c=gt(a.font),{padding:d}=a,h=c.size,u=h/2;let f;this.drawTitle(),i.textAlign=l.textAlign("left"),i.textBaseline="middle",i.lineWidth=.5,i.font=c.string;const{boxWidth:p,boxHeight:g,itemHeight:m}=Fa(a,h),b=function(E,P,D){if(isNaN(p)||p<=0||isNaN(g)||g<0)return;i.save();const $=B(D.lineWidth,1);if(i.fillStyle=B(D.fillStyle,r),i.lineCap=B(D.lineCap,"butt"),i.lineDashOffset=B(D.lineDashOffset,0),i.lineJoin=B(D.lineJoin,"miter"),i.lineWidth=$,i.strokeStyle=B(D.strokeStyle,r),i.setLineDash(B(D.lineDash,[])),a.usePointStyle){const R={radius:g*Math.SQRT2/2,pointStyle:D.pointStyle,rotation:D.rotation,borderWidth:$},F=l.xPlus(E,p/2),z=P+u;gr(i,R,F,z,a.pointStyleWidth&&p)}else{const R=P+Math.max((h-g)/2,0),F=l.leftForLtr(E,p),z=Fe(D.borderRadius);i.beginPath(),Object.values(z).some(ct=>ct!==0)?Es(i,{x:F,y:R,w:p,h:g,radius:z}):i.rect(F,R,p,g),i.fill(),$!==0&&i.stroke()}i.restore()},v=function(E,P,D){Ne(i,D.text,E,P+m/2,c,{strikethrough:D.hidden,textAlign:l.textAlign(D.textAlign)})},M=this.isHorizontal(),k=this._computeTitleHeight();M?f={x:vt(o,this.left+d,this.right-n[0]),y:this.top+d+k,line:0}:f={x:this.left+d,y:vt(o,this.top+k+d,this.bottom-e[0].height),line:0},kr(this.ctx,t.textDirection);const w=m+d;this.legendItems.forEach((E,P)=>{i.strokeStyle=E.fontColor,i.fillStyle=E.fontColor;const D=i.measureText(E.text).width,$=l.textAlign(E.textAlign||(E.textAlign=a.textAlign)),R=p+u+D;let F=f.x,z=f.y;l.setWidth(this.width),M?P>0&&F+R+d>this.right&&(z=f.y+=w,f.line++,F=f.x=vt(o,this.left+d,this.right-n[f.line])):P>0&&z+w>this.bottom&&(F=f.x=F+e[f.line].width+d,f.line++,z=f.y=vt(o,this.top+k+d,this.bottom-e[f.line].height));const ct=l.x(F);if(b(ct,z,E),F=Hl($,F+p+u,M?F+R:this.right,t.rtl),v(l.x(F),z,E),M)f.x+=R+d;else if(typeof E.text!="string"){const yt=c.lineHeight;f.y+=Gr(E,yt)+d}else f.y+=w}),Mr(this.ctx,t.textDirection)}drawTitle(){const t=this.options,e=t.title,n=gt(e.font),i=St(e.padding);if(!e.display)return;const o=Ke(t.rtl,this.left,this.width),a=this.ctx,r=e.position,l=n.size/2,c=i.top+l;let d,h=this.left,u=this.width;if(this.isHorizontal())u=Math.max(...this.lineWidths),d=this.top+c,h=vt(t.align,h,this.right-u);else{const p=this.columnSizes.reduce((g,m)=>Math.max(g,m.height),0);d=c+vt(t.align,this.top,this.bottom-p-t.labels.padding-this._computeTitleHeight())}const f=vt(r,h,h+u);a.textAlign=o.textAlign(pi(r)),a.textBaseline="middle",a.strokeStyle=e.color,a.fillStyle=e.color,a.font=n.string,Ne(a,e.text,f,d,n)}_computeTitleHeight(){const t=this.options.title,e=gt(t.font),n=St(t.padding);return t.display?e.lineHeight+n.height:0}_getLegendItemAt(t,e){let n,i,o;if(ne(t,this.left,this.right)&&ne(e,this.top,this.bottom)){for(o=this.legendHitBoxes,n=0;n<o.length;++n)if(i=o[n],ne(t,i.left,i.left+i.width)&&ne(e,i.top,i.top+i.height))return this.legendItems[n]}return null}handleEvent(t){const e=this.options;if(!Au(t.type,e))return;const n=this._getLegendItemAt(t.x,t.y);if(t.type==="mousemove"||t.type==="mouseout"){const i=this._hoveredItem,o=Mu(i,n);i&&!o&&G(e.onLeave,[t,i,this],this),this._hoveredItem=n,n&&!o&&G(e.onHover,[t,n,this],this)}else n&&G(e.onClick,[t,n,this],this)}}function Su(s,t,e,n,i){const o=Cu(n,s,t,e),a=Eu(i,n,t.lineHeight);return{itemWidth:o,itemHeight:a}}function Cu(s,t,e,n){let i=s.text;return i&&typeof i!="string"&&(i=i.reduce((o,a)=>o.length>a.length?o:a)),t+e.size/2+n.measureText(i).width}function Eu(s,t,e){let n=s;return typeof t.text!="string"&&(n=Gr(t,e)),n}function Gr(s,t){const e=s.text?s.text.length:0;return t*e}function Au(s,t){return!!((s==="mousemove"||s==="mouseout")&&(t.onHover||t.onLeave)||t.onClick&&(s==="click"||s==="mouseup"))}var Pu={id:"legend",_element:za,start(s,t,e){const n=s.legend=new za({ctx:s.ctx,options:e,chart:s});Mt.configure(s,n,e),Mt.addBox(s,n)},stop(s){Mt.removeBox(s,s.legend),delete s.legend},beforeUpdate(s,t,e){const n=s.legend;Mt.configure(s,n,e),n.options=e},afterUpdate(s){const t=s.legend;t.buildLabels(),t.adjustHitBoxes()},afterEvent(s,t){t.replay||s.legend.handleEvent(t.event)},defaults:{display:!0,position:"top",align:"center",fullSize:!0,reverse:!1,weight:1e3,onClick(s,t,e){const n=t.datasetIndex,i=e.chart;i.isDatasetVisible(n)?(i.hide(n),t.hidden=!0):(i.show(n),t.hidden=!1)},onHover:null,onLeave:null,labels:{color:s=>s.chart.options.color,boxWidth:40,padding:10,generateLabels(s){const t=s.data.datasets,{labels:{usePointStyle:e,pointStyle:n,textAlign:i,color:o,useBorderRadius:a,borderRadius:r}}=s.legend.options;return s._getSortedDatasetMetas().map(l=>{const c=l.controller.getStyle(e?0:void 0),d=St(c.borderWidth);return{text:t[l.index].label,fillStyle:c.backgroundColor,fontColor:o,hidden:!l.visible,lineCap:c.borderCapStyle,lineDash:c.borderDash,lineDashOffset:c.borderDashOffset,lineJoin:c.borderJoinStyle,lineWidth:(d.width+d.height)/4,strokeStyle:c.borderColor,pointStyle:n||c.pointStyle,rotation:c.rotation,textAlign:i||c.textAlign,borderRadius:a&&(r||c.borderRadius),datasetIndex:l.index}},this)}},title:{color:s=>s.chart.options.color,display:!1,position:"center",text:""}},descriptors:{_scriptable:s=>!s.startsWith("on"),labels:{_scriptable:s=>!["generateLabels","filter","sort"].includes(s)}}};class ki extends Wt{constructor(t){super(),this.chart=t.chart,this.options=t.options,this.ctx=t.ctx,this._padding=void 0,this.top=void 0,this.bottom=void 0,this.left=void 0,this.right=void 0,this.width=void 0,this.height=void 0,this.position=void 0,this.weight=void 0,this.fullSize=void 0}update(t,e){const n=this.options;if(this.left=0,this.top=0,!n.display){this.width=this.height=this.right=this.bottom=0;return}this.width=this.right=t,this.height=this.bottom=e;const i=et(n.text)?n.text.length:1;this._padding=St(n.padding);const o=i*gt(n.font).lineHeight+this._padding.height;this.isHorizontal()?this.height=o:this.width=o}isHorizontal(){const t=this.options.position;return t==="top"||t==="bottom"}_drawArgs(t){const{top:e,left:n,bottom:i,right:o,options:a}=this,r=a.align;let l=0,c,d,h;return this.isHorizontal()?(d=vt(r,n,o),h=e+t,c=o-n):(a.position==="left"?(d=n+t,h=vt(r,i,e),l=V*-.5):(d=o-t,h=vt(r,e,i),l=V*.5),c=i-e),{titleX:d,titleY:h,maxWidth:c,rotation:l}}draw(){const t=this.ctx,e=this.options;if(!e.display)return;const n=gt(e.font),o=n.lineHeight/2+this._padding.top,{titleX:a,titleY:r,maxWidth:l,rotation:c}=this._drawArgs(o);Ne(t,e.text,0,0,n,{color:e.color,maxWidth:l,rotation:c,textAlign:pi(e.align),textBaseline:"middle",translation:[a,r]})}}function Du(s,t){const e=new ki({ctx:s.ctx,options:t,chart:s});Mt.configure(s,e,t),Mt.addBox(s,e),s.titleBlock=e}var Tu={id:"title",_element:ki,start(s,t,e){Du(s,e)},stop(s){const t=s.titleBlock;Mt.removeBox(s,t),delete s.titleBlock},beforeUpdate(s,t,e){const n=s.titleBlock;Mt.configure(s,n,e),n.options=e},defaults:{align:"center",display:!1,font:{weight:"bold"},fullSize:!0,padding:10,position:"top",text:"",weight:2e3},defaultRoutes:{color:"color"},descriptors:{_scriptable:!0,_indexable:!1}};const Ws=new WeakMap;var Lu={id:"subtitle",start(s,t,e){const n=new ki({ctx:s.ctx,options:e,chart:s});Mt.configure(s,n,e),Mt.addBox(s,n),Ws.set(s,n)},stop(s){Mt.removeBox(s,Ws.get(s)),Ws.delete(s)},beforeUpdate(s,t,e){const n=Ws.get(s);Mt.configure(s,n,e),n.options=e},defaults:{align:"center",display:!1,font:{weight:"normal"},fullSize:!0,padding:0,position:"top",text:"",weight:1500},defaultRoutes:{color:"color"},descriptors:{_scriptable:!0,_indexable:!1}};const us={average(s){if(!s.length)return!1;let t,e,n=new Set,i=0,o=0;for(t=0,e=s.length;t<e;++t){const r=s[t].element;if(r&&r.hasValue()){const l=r.tooltipPosition();n.add(l.x),i+=l.y,++o}}return o===0||n.size===0?!1:{x:[...n].reduce((r,l)=>r+l)/n.size,y:i/o}},nearest(s,t){if(!s.length)return!1;let e=t.x,n=t.y,i=Number.POSITIVE_INFINITY,o,a,r;for(o=0,a=s.length;o<a;++o){const l=s[o].element;if(l&&l.hasValue()){const c=l.getCenterPoint(),d=Vn(t,c);d<i&&(i=d,r=l)}}if(r){const l=r.tooltipPosition();e=l.x,n=l.y}return{x:e,y:n}}};function Ut(s,t){return t&&(et(t)?Array.prototype.push.apply(s,t):s.push(t)),s}function te(s){return(typeof s=="string"||s instanceof String)&&s.indexOf(`
`)>-1?s.split(`
`):s}function Iu(s,t){const{element:e,datasetIndex:n,index:i}=t,o=s.getDatasetMeta(n).controller,{label:a,value:r}=o.getLabelAndValue(i);return{chart:s,label:a,parsed:o.getParsed(i),raw:s.data.datasets[n].data[i],formattedValue:r,dataset:o.getDataset(),dataIndex:i,datasetIndex:n,element:e}}function ja(s,t){const e=s.chart.ctx,{body:n,footer:i,title:o}=s,{boxWidth:a,boxHeight:r}=t,l=gt(t.bodyFont),c=gt(t.titleFont),d=gt(t.footerFont),h=o.length,u=i.length,f=n.length,p=St(t.padding);let g=p.height,m=0,b=n.reduce((k,w)=>k+w.before.length+w.lines.length+w.after.length,0);if(b+=s.beforeBody.length+s.afterBody.length,h&&(g+=h*c.lineHeight+(h-1)*t.titleSpacing+t.titleMarginBottom),b){const k=t.displayColors?Math.max(r,l.lineHeight):l.lineHeight;g+=f*k+(b-f)*l.lineHeight+(b-1)*t.bodySpacing}u&&(g+=t.footerMarginTop+u*d.lineHeight+(u-1)*t.footerSpacing);let v=0;const M=function(k){m=Math.max(m,e.measureText(k).width+v)};return e.save(),e.font=c.string,U(s.title,M),e.font=l.string,U(s.beforeBody.concat(s.afterBody),M),v=t.displayColors?a+2+t.boxPadding:0,U(n,k=>{U(k.before,M),U(k.lines,M),U(k.after,M)}),v=0,e.font=d.string,U(s.footer,M),e.restore(),m+=p.width,{width:m,height:g}}function $u(s,t){const{y:e,height:n}=t;return e<n/2?"top":e>s.height-n/2?"bottom":"center"}function Ou(s,t,e,n){const{x:i,width:o}=n,a=e.caretSize+e.caretPadding;if(s==="left"&&i+o+a>t.width||s==="right"&&i-o-a<0)return!0}function Bu(s,t,e,n){const{x:i,width:o}=e,{width:a,chartArea:{left:r,right:l}}=s;let c="center";return n==="center"?c=i<=(r+l)/2?"left":"right":i<=o/2?c="left":i>=a-o/2&&(c="right"),Ou(c,s,t,e)&&(c="center"),c}function Na(s,t,e){const n=e.yAlign||t.yAlign||$u(s,e);return{xAlign:e.xAlign||t.xAlign||Bu(s,t,e,n),yAlign:n}}function Ru(s,t){let{x:e,width:n}=s;return t==="right"?e-=n:t==="center"&&(e-=n/2),e}function Fu(s,t,e){let{y:n,height:i}=s;return t==="top"?n+=e:t==="bottom"?n-=i+e:n-=i/2,n}function Va(s,t,e,n){const{caretSize:i,caretPadding:o,cornerRadius:a}=s,{xAlign:r,yAlign:l}=e,c=i+o,{topLeft:d,topRight:h,bottomLeft:u,bottomRight:f}=Fe(a);let p=Ru(t,r);const g=Fu(t,l,c);return l==="center"?r==="left"?p+=c:r==="right"&&(p-=c):r==="left"?p-=Math.max(d,u)+i:r==="right"&&(p+=Math.max(h,f)+i),{x:bt(p,0,n.width-t.width),y:bt(g,0,n.height-t.height)}}function Hs(s,t,e){const n=St(e.padding);return t==="center"?s.x+s.width/2:t==="right"?s.x+s.width-n.right:s.x+n.left}function Wa(s){return Ut([],te(s))}function zu(s,t,e){return Ce(s,{tooltip:t,tooltipItems:e,type:"tooltip"})}function Ha(s,t){const e=t&&t.dataset&&t.dataset.tooltip&&t.dataset.tooltip.callbacks;return e?s.override(e):s}const Kr={beforeTitle:Zt,title(s){if(s.length>0){const t=s[0],e=t.chart.data.labels,n=e?e.length:0;if(this&&this.options&&this.options.mode==="dataset")return t.dataset.label||"";if(t.label)return t.label;if(n>0&&t.dataIndex<n)return e[t.dataIndex]}return""},afterTitle:Zt,beforeBody:Zt,beforeLabel:Zt,label(s){if(this&&this.options&&this.options.mode==="dataset")return s.label+": "+s.formattedValue||s.formattedValue;let t=s.dataset.label||"";t&&(t+=": ");const e=s.formattedValue;return j(e)||(t+=e),t},labelColor(s){const e=s.chart.getDatasetMeta(s.datasetIndex).controller.getStyle(s.dataIndex);return{borderColor:e.borderColor,backgroundColor:e.backgroundColor,borderWidth:e.borderWidth,borderDash:e.borderDash,borderDashOffset:e.borderDashOffset,borderRadius:0}},labelTextColor(){return this.options.bodyColor},labelPointStyle(s){const e=s.chart.getDatasetMeta(s.datasetIndex).controller.getStyle(s.dataIndex);return{pointStyle:e.pointStyle,rotation:e.rotation}},afterLabel:Zt,afterBody:Zt,beforeFooter:Zt,footer:Zt,afterFooter:Zt};function Pt(s,t,e,n){const i=s[t].call(e,n);return typeof i>"u"?Kr[t].call(e,n):i}class Jn extends Wt{constructor(t){super(),this.opacity=0,this._active=[],this._eventPosition=void 0,this._size=void 0,this._cachedAnimations=void 0,this._tooltipItems=[],this.$animations=void 0,this.$context=void 0,this.chart=t.chart,this.options=t.options,this.dataPoints=void 0,this.title=void 0,this.beforeBody=void 0,this.body=void 0,this.afterBody=void 0,this.footer=void 0,this.xAlign=void 0,this.yAlign=void 0,this.x=void 0,this.y=void 0,this.height=void 0,this.width=void 0,this.caretX=void 0,this.caretY=void 0,this.labelColors=void 0,this.labelPointStyles=void 0,this.labelTextColors=void 0}initialize(t){this.options=t,this._cachedAnimations=void 0,this.$context=void 0}_resolveAnimations(){const t=this._cachedAnimations;if(t)return t;const e=this.chart,n=this.options.setContext(this.getContext()),i=n.enabled&&e.options.animation&&n.animations,o=new Pr(this.chart,i);return i._cacheable&&(this._cachedAnimations=Object.freeze(o)),o}getContext(){return this.$context||(this.$context=zu(this.chart.getContext(),this,this._tooltipItems))}getTitle(t,e){const{callbacks:n}=e,i=Pt(n,"beforeTitle",this,t),o=Pt(n,"title",this,t),a=Pt(n,"afterTitle",this,t);let r=[];return r=Ut(r,te(i)),r=Ut(r,te(o)),r=Ut(r,te(a)),r}getBeforeBody(t,e){return Wa(Pt(e.callbacks,"beforeBody",this,t))}getBody(t,e){const{callbacks:n}=e,i=[];return U(t,o=>{const a={before:[],lines:[],after:[]},r=Ha(n,o);Ut(a.before,te(Pt(r,"beforeLabel",this,o))),Ut(a.lines,Pt(r,"label",this,o)),Ut(a.after,te(Pt(r,"afterLabel",this,o))),i.push(a)}),i}getAfterBody(t,e){return Wa(Pt(e.callbacks,"afterBody",this,t))}getFooter(t,e){const{callbacks:n}=e,i=Pt(n,"beforeFooter",this,t),o=Pt(n,"footer",this,t),a=Pt(n,"afterFooter",this,t);let r=[];return r=Ut(r,te(i)),r=Ut(r,te(o)),r=Ut(r,te(a)),r}_createItems(t){const e=this._active,n=this.chart.data,i=[],o=[],a=[];let r=[],l,c;for(l=0,c=e.length;l<c;++l)r.push(Iu(this.chart,e[l]));return t.filter&&(r=r.filter((d,h,u)=>t.filter(d,h,u,n))),t.itemSort&&(r=r.sort((d,h)=>t.itemSort(d,h,n))),U(r,d=>{const h=Ha(t.callbacks,d);i.push(Pt(h,"labelColor",this,d)),o.push(Pt(h,"labelPointStyle",this,d)),a.push(Pt(h,"labelTextColor",this,d))}),this.labelColors=i,this.labelPointStyles=o,this.labelTextColors=a,this.dataPoints=r,r}update(t,e){const n=this.options.setContext(this.getContext()),i=this._active;let o,a=[];if(!i.length)this.opacity!==0&&(o={opacity:0});else{const r=us[n.position].call(this,i,this._eventPosition);a=this._createItems(n),this.title=this.getTitle(a,n),this.beforeBody=this.getBeforeBody(a,n),this.body=this.getBody(a,n),this.afterBody=this.getAfterBody(a,n),this.footer=this.getFooter(a,n);const l=this._size=ja(this,n),c=Object.assign({},r,l),d=Na(this.chart,n,c),h=Va(n,c,d,this.chart);this.xAlign=d.xAlign,this.yAlign=d.yAlign,o={opacity:1,x:h.x,y:h.y,width:l.width,height:l.height,caretX:r.x,caretY:r.y}}this._tooltipItems=a,this.$context=void 0,o&&this._resolveAnimations().update(this,o),t&&n.external&&n.external.call(this,{chart:this.chart,tooltip:this,replay:e})}drawCaret(t,e,n,i){const o=this.getCaretPosition(t,n,i);e.lineTo(o.x1,o.y1),e.lineTo(o.x2,o.y2),e.lineTo(o.x3,o.y3)}getCaretPosition(t,e,n){const{xAlign:i,yAlign:o}=this,{caretSize:a,cornerRadius:r}=n,{topLeft:l,topRight:c,bottomLeft:d,bottomRight:h}=Fe(r),{x:u,y:f}=t,{width:p,height:g}=e;let m,b,v,M,k,w;return o==="center"?(k=f+g/2,i==="left"?(m=u,b=m-a,M=k+a,w=k-a):(m=u+p,b=m+a,M=k-a,w=k+a),v=m):(i==="left"?b=u+Math.max(l,d)+a:i==="right"?b=u+p-Math.max(c,h)-a:b=this.caretX,o==="top"?(M=f,k=M-a,m=b-a,v=b+a):(M=f+g,k=M+a,m=b+a,v=b-a),w=M),{x1:m,x2:b,x3:v,y1:M,y2:k,y3:w}}drawTitle(t,e,n){const i=this.title,o=i.length;let a,r,l;if(o){const c=Ke(n.rtl,this.x,this.width);for(t.x=Hs(this,n.titleAlign,n),e.textAlign=c.textAlign(n.titleAlign),e.textBaseline="middle",a=gt(n.titleFont),r=n.titleSpacing,e.fillStyle=n.titleColor,e.font=a.string,l=0;l<o;++l)e.fillText(i[l],c.x(t.x),t.y+a.lineHeight/2),t.y+=a.lineHeight+r,l+1===o&&(t.y+=n.titleMarginBottom-r)}}_drawColorBox(t,e,n,i,o){const a=this.labelColors[n],r=this.labelPointStyles[n],{boxHeight:l,boxWidth:c}=o,d=gt(o.bodyFont),h=Hs(this,"left",o),u=i.x(h),f=l<d.lineHeight?(d.lineHeight-l)/2:0,p=e.y+f;if(o.usePointStyle){const g={radius:Math.min(c,l)/2,pointStyle:r.pointStyle,rotation:r.rotation,borderWidth:1},m=i.leftForLtr(u,c)+c/2,b=p+l/2;t.strokeStyle=o.multiKeyBackground,t.fillStyle=o.multiKeyBackground,Hn(t,g,m,b),t.strokeStyle=a.borderColor,t.fillStyle=a.backgroundColor,Hn(t,g,m,b)}else{t.lineWidth=N(a.borderWidth)?Math.max(...Object.values(a.borderWidth)):a.borderWidth||1,t.strokeStyle=a.borderColor,t.setLineDash(a.borderDash||[]),t.lineDashOffset=a.borderDashOffset||0;const g=i.leftForLtr(u,c),m=i.leftForLtr(i.xPlus(u,1),c-2),b=Fe(a.borderRadius);Object.values(b).some(v=>v!==0)?(t.beginPath(),t.fillStyle=o.multiKeyBackground,Es(t,{x:g,y:p,w:c,h:l,radius:b}),t.fill(),t.stroke(),t.fillStyle=a.backgroundColor,t.beginPath(),Es(t,{x:m,y:p+1,w:c-2,h:l-2,radius:b}),t.fill()):(t.fillStyle=o.multiKeyBackground,t.fillRect(g,p,c,l),t.strokeRect(g,p,c,l),t.fillStyle=a.backgroundColor,t.fillRect(m,p+1,c-2,l-2))}t.fillStyle=this.labelTextColors[n]}drawBody(t,e,n){const{body:i}=this,{bodySpacing:o,bodyAlign:a,displayColors:r,boxHeight:l,boxWidth:c,boxPadding:d}=n,h=gt(n.bodyFont);let u=h.lineHeight,f=0;const p=Ke(n.rtl,this.x,this.width),g=function(D){e.fillText(D,p.x(t.x+f),t.y+u/2),t.y+=u+o},m=p.textAlign(a);let b,v,M,k,w,E,P;for(e.textAlign=a,e.textBaseline="middle",e.font=h.string,t.x=Hs(this,m,n),e.fillStyle=n.bodyColor,U(this.beforeBody,g),f=r&&m!=="right"?a==="center"?c/2+d:c+2+d:0,k=0,E=i.length;k<E;++k){for(b=i[k],v=this.labelTextColors[k],e.fillStyle=v,U(b.before,g),M=b.lines,r&&M.length&&(this._drawColorBox(e,t,k,p,n),u=Math.max(h.lineHeight,l)),w=0,P=M.length;w<P;++w)g(M[w]),u=h.lineHeight;U(b.after,g)}f=0,u=h.lineHeight,U(this.afterBody,g),t.y-=o}drawFooter(t,e,n){const i=this.footer,o=i.length;let a,r;if(o){const l=Ke(n.rtl,this.x,this.width);for(t.x=Hs(this,n.footerAlign,n),t.y+=n.footerMarginTop,e.textAlign=l.textAlign(n.footerAlign),e.textBaseline="middle",a=gt(n.footerFont),e.fillStyle=n.footerColor,e.font=a.string,r=0;r<o;++r)e.fillText(i[r],l.x(t.x),t.y+a.lineHeight/2),t.y+=a.lineHeight+n.footerSpacing}}drawBackground(t,e,n,i){const{xAlign:o,yAlign:a}=this,{x:r,y:l}=t,{width:c,height:d}=n,{topLeft:h,topRight:u,bottomLeft:f,bottomRight:p}=Fe(i.cornerRadius);e.fillStyle=i.backgroundColor,e.strokeStyle=i.borderColor,e.lineWidth=i.borderWidth,e.beginPath(),e.moveTo(r+h,l),a==="top"&&this.drawCaret(t,e,n,i),e.lineTo(r+c-u,l),e.quadraticCurveTo(r+c,l,r+c,l+u),a==="center"&&o==="right"&&this.drawCaret(t,e,n,i),e.lineTo(r+c,l+d-p),e.quadraticCurveTo(r+c,l+d,r+c-p,l+d),a==="bottom"&&this.drawCaret(t,e,n,i),e.lineTo(r+f,l+d),e.quadraticCurveTo(r,l+d,r,l+d-f),a==="center"&&o==="left"&&this.drawCaret(t,e,n,i),e.lineTo(r,l+h),e.quadraticCurveTo(r,l,r+h,l),e.closePath(),e.fill(),i.borderWidth>0&&e.stroke()}_updateAnimationTarget(t){const e=this.chart,n=this.$animations,i=n&&n.x,o=n&&n.y;if(i||o){const a=us[t.position].call(this,this._active,this._eventPosition);if(!a)return;const r=this._size=ja(this,t),l=Object.assign({},a,this._size),c=Na(e,t,l),d=Va(t,l,c,e);(i._to!==d.x||o._to!==d.y)&&(this.xAlign=c.xAlign,this.yAlign=c.yAlign,this.width=r.width,this.height=r.height,this.caretX=a.x,this.caretY=a.y,this._resolveAnimations().update(this,d))}}_willRender(){return!!this.opacity}draw(t){const e=this.options.setContext(this.getContext());let n=this.opacity;if(!n)return;this._updateAnimationTarget(e);const i={width:this.width,height:this.height},o={x:this.x,y:this.y};n=Math.abs(n)<.001?0:n;const a=St(e.padding),r=this.title.length||this.beforeBody.length||this.body.length||this.afterBody.length||this.footer.length;e.enabled&&r&&(t.save(),t.globalAlpha=n,this.drawBackground(o,t,i,e),kr(t,e.textDirection),o.y+=a.top,this.drawTitle(o,t,e),this.drawBody(o,t,e),this.drawFooter(o,t,e),Mr(t,e.textDirection),t.restore())}getActiveElements(){return this._active||[]}setActiveElements(t,e){const n=this._active,i=t.map(({datasetIndex:r,index:l})=>{const c=this.chart.getDatasetMeta(r);if(!c)throw new Error("Cannot find a dataset at index "+r);return{datasetIndex:r,element:c.data[l],index:l}}),o=!on(n,i),a=this._positionChanged(i,e);(o||a)&&(this._active=i,this._eventPosition=e,this._ignoreReplayEvents=!0,this.update(!0))}handleEvent(t,e,n=!0){if(e&&this._ignoreReplayEvents)return!1;this._ignoreReplayEvents=!1;const i=this.options,o=this._active||[],a=this._getActiveElements(t,o,e,n),r=this._positionChanged(a,t),l=e||!on(a,o)||r;return l&&(this._active=a,(i.enabled||i.external)&&(this._eventPosition={x:t.x,y:t.y},this.update(!0,e))),l}_getActiveElements(t,e,n,i){const o=this.options;if(t.type==="mouseout")return[];if(!i)return e.filter(r=>this.chart.data.datasets[r.datasetIndex]&&this.chart.getDatasetMeta(r.datasetIndex).controller.getParsed(r.index)!==void 0);const a=this.chart.getElementsAtEventForMode(t,o.mode,o,n);return o.reverse&&a.reverse(),a}_positionChanged(t,e){const{caretX:n,caretY:i,options:o}=this,a=us[o.position].call(this,t,e);return a!==!1&&(n!==a.x||i!==a.y)}}C(Jn,"positioners",us);var ju={id:"tooltip",_element:Jn,positioners:us,afterInit(s,t,e){e&&(s.tooltip=new Jn({chart:s,options:e}))},beforeUpdate(s,t,e){s.tooltip&&s.tooltip.initialize(e)},reset(s,t,e){s.tooltip&&s.tooltip.initialize(e)},afterDraw(s){const t=s.tooltip;if(t&&t._willRender()){const e={tooltip:t};if(s.notifyPlugins("beforeTooltipDraw",{...e,cancelable:!0})===!1)return;t.draw(s.ctx),s.notifyPlugins("afterTooltipDraw",e)}},afterEvent(s,t){if(s.tooltip){const e=t.replay;s.tooltip.handleEvent(t.event,e,t.inChartArea)&&(t.changed=!0)}},defaults:{enabled:!0,external:null,position:"average",backgroundColor:"rgba(0,0,0,0.8)",titleColor:"#fff",titleFont:{weight:"bold"},titleSpacing:2,titleMarginBottom:6,titleAlign:"left",bodyColor:"#fff",bodySpacing:2,bodyFont:{},bodyAlign:"left",footerColor:"#fff",footerSpacing:2,footerMarginTop:6,footerFont:{weight:"bold"},footerAlign:"left",padding:6,caretPadding:2,caretSize:5,cornerRadius:6,boxHeight:(s,t)=>t.bodyFont.size,boxWidth:(s,t)=>t.bodyFont.size,multiKeyBackground:"#fff",displayColors:!0,boxPadding:0,borderColor:"rgba(0,0,0,0)",borderWidth:0,animation:{duration:400,easing:"easeOutQuart"},animations:{numbers:{type:"number",properties:["x","y","width","height","caretX","caretY"]},opacity:{easing:"linear",duration:200}},callbacks:Kr},defaultRoutes:{bodyFont:"font",footerFont:"font",titleFont:"font"},descriptors:{_scriptable:s=>s!=="filter"&&s!=="itemSort"&&s!=="external",_indexable:!1,callbacks:{_scriptable:!1,_indexable:!1},animation:{_fallback:!1},animations:{_fallback:"animation"}},additionalOptionScopes:["interaction"]},Nu=Object.freeze({__proto__:null,Colors:Qh,Decimation:nu,Filler:ku,Legend:Pu,SubTitle:Lu,Title:Tu,Tooltip:ju});const Vu=(s,t,e,n)=>(typeof t=="string"?(e=s.push(t)-1,n.unshift({index:e,label:t})):isNaN(t)&&(e=null),e);function Wu(s,t,e,n){const i=s.indexOf(t);if(i===-1)return Vu(s,t,e,n);const o=s.lastIndexOf(t);return i!==o?e:i}const Hu=(s,t)=>s===null?null:bt(Math.round(s),0,t);function Ya(s){const t=this.getLabels();return s>=0&&s<t.length?t[s]:s}class Zn extends Ve{constructor(t){super(t),this._startValue=void 0,this._valueRange=0,this._addedLabels=[]}init(t){const e=this._addedLabels;if(e.length){const n=this.getLabels();for(const{index:i,label:o}of e)n[i]===o&&n.splice(i,1);this._addedLabels=[]}super.init(t)}parse(t,e){if(j(t))return null;const n=this.getLabels();return e=isFinite(e)&&n[e]===t?e:Wu(n,t,B(e,t),this._addedLabels),Hu(e,n.length-1)}determineDataLimits(){const{minDefined:t,maxDefined:e}=this.getUserBounds();let{min:n,max:i}=this.getMinMax(!0);this.options.bounds==="ticks"&&(t||(n=0),e||(i=this.getLabels().length-1)),this.min=n,this.max=i}buildTicks(){const t=this.min,e=this.max,n=this.options.offset,i=[];let o=this.getLabels();o=t===0&&e===o.length-1?o:o.slice(t,e+1),this._valueRange=Math.max(o.length-(n?0:1),1),this._startValue=this.min-(n?.5:0);for(let a=t;a<=e;a++)i.push({value:a});return i}getLabelForValue(t){return Ya.call(this,t)}configure(){super.configure(),this.isHorizontal()||(this._reversePixels=!this._reversePixels)}getPixelForValue(t){return typeof t!="number"&&(t=this.parse(t)),t===null?NaN:this.getPixelForDecimal((t-this._startValue)/this._valueRange)}getPixelForTick(t){const e=this.ticks;return t<0||t>e.length-1?null:this.getPixelForValue(e[t].value)}getValueForPixel(t){return Math.round(this._startValue+this.getDecimalForPixel(t)*this._valueRange)}getBasePixel(){return this.bottom}}C(Zn,"id","category"),C(Zn,"defaults",{ticks:{callback:Ya}});function Yu(s,t){const e=[],{bounds:i,step:o,min:a,max:r,precision:l,count:c,maxTicks:d,maxDigits:h,includeBounds:u}=s,f=o||1,p=d-1,{min:g,max:m}=t,b=!j(a),v=!j(r),M=!j(c),k=(m-g)/(h+1);let w=jo((m-g)/p/f)*f,E,P,D,$;if(w<1e-14&&!b&&!v)return[{value:g},{value:m}];$=Math.ceil(m/w)-Math.floor(g/w),$>p&&(w=jo($*w/p/f)*f),j(l)||(E=Math.pow(10,l),w=Math.ceil(w*E)/E),i==="ticks"?(P=Math.floor(g/w)*w,D=Math.ceil(m/w)*w):(P=g,D=m),b&&v&&o&&Rl((r-a)/o,w/1e3)?($=Math.round(Math.min((r-a)/w,d)),w=(r-a)/$,P=a,D=r):M?(P=b?a:P,D=v?r:D,$=c-1,w=(D-P)/$):($=(D-P)/w,xs($,Math.round($),w/1e3)?$=Math.round($):$=Math.ceil($));const R=Math.max(No(w),No(P));E=Math.pow(10,j(l)?R:l),P=Math.round(P*E)/E,D=Math.round(D*E)/E;let F=0;for(b&&(u&&P!==a?(e.push({value:a}),P<a&&F++,xs(Math.round((P+F*w)*E)/E,a,Ua(a,k,s))&&F++):P<a&&F++);F<$;++F){const z=Math.round((P+F*w)*E)/E;if(v&&z>r)break;e.push({value:z})}return v&&u&&D!==r?e.length&&xs(e[e.length-1].value,r,Ua(r,k,s))?e[e.length-1].value=r:e.push({value:r}):(!v||D===r)&&e.push({value:D}),e}function Ua(s,t,{horizontal:e,minRotation:n}){const i=Nt(n),o=(e?Math.sin(i):Math.cos(i))||.001,a=.75*t*(""+s).length;return Math.min(t/o,a)}class un extends Ve{constructor(t){super(t),this.start=void 0,this.end=void 0,this._startValue=void 0,this._endValue=void 0,this._valueRange=0}parse(t,e){return j(t)||(typeof t=="number"||t instanceof Number)&&!isFinite(+t)?null:+t}handleTickRangeOptions(){const{beginAtZero:t}=this.options,{minDefined:e,maxDefined:n}=this.getUserBounds();let{min:i,max:o}=this;const a=l=>i=e?i:l,r=l=>o=n?o:l;if(t){const l=Gt(i),c=Gt(o);l<0&&c<0?r(0):l>0&&c>0&&a(0)}if(i===o){let l=o===0?1:Math.abs(o*.05);r(o+l),t||a(i-l)}this.min=i,this.max=o}getTickLimit(){const t=this.options.ticks;let{maxTicksLimit:e,stepSize:n}=t,i;return n?(i=Math.ceil(this.max/n)-Math.floor(this.min/n)+1,i>1e3&&(console.warn(`scales.${this.id}.ticks.stepSize: ${n} would result generating up to ${i} ticks. Limiting to 1000.`),i=1e3)):(i=this.computeTickLimit(),e=e||11),e&&(i=Math.min(e,i)),i}computeTickLimit(){return Number.POSITIVE_INFINITY}buildTicks(){const t=this.options,e=t.ticks;let n=this.getTickLimit();n=Math.max(2,n);const i={maxTicks:n,bounds:t.bounds,min:t.min,max:t.max,precision:e.precision,step:e.stepSize,count:e.count,maxDigits:this._maxDigits(),horizontal:this.isHorizontal(),minRotation:e.minRotation||0,includeBounds:e.includeBounds!==!1},o=this._range||this,a=Yu(i,o);return t.bounds==="ticks"&&ar(a,this,"value"),t.reverse?(a.reverse(),this.start=this.max,this.end=this.min):(this.start=this.min,this.end=this.max),a}configure(){const t=this.ticks;let e=this.min,n=this.max;if(super.configure(),this.options.offset&&t.length){const i=(n-e)/Math.max(t.length-1,1)/2;e-=i,n+=i}this._startValue=e,this._endValue=n,this._valueRange=n-e}getLabelForValue(t){return Ls(t,this.chart.options.locale,this.options.ticks.format)}}class Qn extends un{determineDataLimits(){const{min:t,max:e}=this.getMinMax(!0);this.min=nt(t)?t:0,this.max=nt(e)?e:1,this.handleTickRangeOptions()}computeTickLimit(){const t=this.isHorizontal(),e=t?this.width:this.height,n=Nt(this.options.ticks.minRotation),i=(t?Math.sin(n):Math.cos(n))||.001,o=this._resolveTickFontOptions(0);return Math.ceil(e/Math.min(40,o.lineHeight/i))}getPixelForValue(t){return t===null?NaN:this.getPixelForDecimal((t-this._startValue)/this._valueRange)}getValueForPixel(t){return this._startValue+this.getDecimalForPixel(t)*this._valueRange}}C(Qn,"id","linear"),C(Qn,"defaults",{ticks:{callback:gn.formatters.numeric}});const Ps=s=>Math.floor(ge(s)),Te=(s,t)=>Math.pow(10,Ps(s)+t);function Xa(s){return s/Math.pow(10,Ps(s))===1}function qa(s,t,e){const n=Math.pow(10,e),i=Math.floor(s/n);return Math.ceil(t/n)-i}function Uu(s,t){const e=t-s;let n=Ps(e);for(;qa(s,t,n)>10;)n++;for(;qa(s,t,n)<10;)n--;return Math.min(n,Ps(s))}function Xu(s,{min:t,max:e}){t=$t(s.min,t);const n=[],i=Ps(t);let o=Uu(t,e),a=o<0?Math.pow(10,Math.abs(o)):1;const r=Math.pow(10,o),l=i>o?Math.pow(10,i):0,c=Math.round((t-l)*a)/a,d=Math.floor((t-l)/r/10)*r*10;let h=Math.floor((c-d)/Math.pow(10,o)),u=$t(s.min,Math.round((l+d+h*Math.pow(10,o))*a)/a);for(;u<e;)n.push({value:u,major:Xa(u),significand:h}),h>=10?h=h<15?15:20:h++,h>=20&&(o++,h=2,a=o>=0?1:a),u=Math.round((l+d+h*Math.pow(10,o))*a)/a;const f=$t(s.max,u);return n.push({value:f,major:Xa(f),significand:h}),n}class ti extends Ve{constructor(t){super(t),this.start=void 0,this.end=void 0,this._startValue=void 0,this._valueRange=0}parse(t,e){const n=un.prototype.parse.apply(this,[t,e]);if(n===0){this._zero=!0;return}return nt(n)&&n>0?n:null}determineDataLimits(){const{min:t,max:e}=this.getMinMax(!0);this.min=nt(t)?Math.max(0,t):null,this.max=nt(e)?Math.max(0,e):null,this.options.beginAtZero&&(this._zero=!0),this._zero&&this.min!==this._suggestedMin&&!nt(this._userMin)&&(this.min=t===Te(this.min,0)?Te(this.min,-1):Te(this.min,0)),this.handleTickRangeOptions()}handleTickRangeOptions(){const{minDefined:t,maxDefined:e}=this.getUserBounds();let n=this.min,i=this.max;const o=r=>n=t?n:r,a=r=>i=e?i:r;n===i&&(n<=0?(o(1),a(10)):(o(Te(n,-1)),a(Te(i,1)))),n<=0&&o(Te(i,-1)),i<=0&&a(Te(n,1)),this.min=n,this.max=i}buildTicks(){const t=this.options,e={min:this._userMin,max:this._userMax},n=Xu(e,this);return t.bounds==="ticks"&&ar(n,this,"value"),t.reverse?(n.reverse(),this.start=this.max,this.end=this.min):(this.start=this.min,this.end=this.max),n}getLabelForValue(t){return t===void 0?"0":Ls(t,this.chart.options.locale,this.options.ticks.format)}configure(){const t=this.min;super.configure(),this._startValue=ge(t),this._valueRange=ge(this.max)-ge(t)}getPixelForValue(t){return(t===void 0||t===0)&&(t=this.min),t===null||isNaN(t)?NaN:this.getPixelForDecimal(t===this.min?0:(ge(t)-this._startValue)/this._valueRange)}getValueForPixel(t){const e=this.getDecimalForPixel(t);return Math.pow(10,this._startValue+e*this._valueRange)}}C(ti,"id","logarithmic"),C(ti,"defaults",{ticks:{callback:gn.formatters.logarithmic,major:{enabled:!0}}});function ei(s){const t=s.ticks;if(t.display&&s.display){const e=St(t.backdropPadding);return B(t.font&&t.font.size,st.font.size)+e.height}return 0}function qu(s,t,e){return e=et(e)?e:[e],{w:tc(s,t.string,e),h:e.length*t.lineHeight}}function Ga(s,t,e,n,i){return s===n||s===i?{start:t-e/2,end:t+e/2}:s<n||s>i?{start:t-e,end:t}:{start:t,end:t+e}}function Gu(s){const t={l:s.left+s._padding.left,r:s.right-s._padding.right,t:s.top+s._padding.top,b:s.bottom-s._padding.bottom},e=Object.assign({},t),n=[],i=[],o=s._pointLabels.length,a=s.options.pointLabels,r=a.centerPointLabels?V/o:0;for(let l=0;l<o;l++){const c=a.setContext(s.getPointLabelContext(l));i[l]=c.padding;const d=s.getPointPosition(l,s.drawingArea+i[l],r),h=gt(c.font),u=qu(s.ctx,h,s._pointLabels[l]);n[l]=u;const f=wt(s.getIndexAngle(l)+r),p=Math.round(ui(f)),g=Ga(p,d.x,u.w,0,180),m=Ga(p,d.y,u.h,90,270);Ku(e,t,f,g,m)}s.setCenterPoint(t.l-e.l,e.r-t.r,t.t-e.t,e.b-t.b),s._pointLabelItems=Qu(s,n,i)}function Ku(s,t,e,n,i){const o=Math.abs(Math.sin(e)),a=Math.abs(Math.cos(e));let r=0,l=0;n.start<t.l?(r=(t.l-n.start)/o,s.l=Math.min(s.l,t.l-r)):n.end>t.r&&(r=(n.end-t.r)/o,s.r=Math.max(s.r,t.r+r)),i.start<t.t?(l=(t.t-i.start)/a,s.t=Math.min(s.t,t.t-l)):i.end>t.b&&(l=(i.end-t.b)/a,s.b=Math.max(s.b,t.b+l))}function Ju(s,t,e){const n=s.drawingArea,{extra:i,additionalAngle:o,padding:a,size:r}=e,l=s.getPointPosition(t,n+i+a,o),c=Math.round(ui(wt(l.angle+lt))),d=sf(l.y,r.h,c),h=tf(c),u=ef(l.x,r.w,h);return{visible:!0,x:l.x,y:d,textAlign:h,left:u,top:d,right:u+r.w,bottom:d+r.h}}function Zu(s,t){if(!t)return!0;const{left:e,top:n,right:i,bottom:o}=s;return!(oe({x:e,y:n},t)||oe({x:e,y:o},t)||oe({x:i,y:n},t)||oe({x:i,y:o},t))}function Qu(s,t,e){const n=[],i=s._pointLabels.length,o=s.options,{centerPointLabels:a,display:r}=o.pointLabels,l={extra:ei(o)/2,additionalAngle:a?V/i:0};let c;for(let d=0;d<i;d++){l.padding=e[d],l.size=t[d];const h=Ju(s,d,l);n.push(h),r==="auto"&&(h.visible=Zu(h,c),h.visible&&(c=h))}return n}function tf(s){return s===0||s===180?"center":s<180?"left":"right"}function ef(s,t,e){return e==="right"?s-=t:e==="center"&&(s-=t/2),s}function sf(s,t,e){return e===90||e===270?s-=t/2:(e>270||e<90)&&(s-=t),s}function nf(s,t,e){const{left:n,top:i,right:o,bottom:a}=e,{backdropColor:r}=t;if(!j(r)){const l=Fe(t.borderRadius),c=St(t.backdropPadding);s.fillStyle=r;const d=n-c.left,h=i-c.top,u=o-n+c.width,f=a-i+c.height;Object.values(l).some(p=>p!==0)?(s.beginPath(),Es(s,{x:d,y:h,w:u,h:f,radius:l}),s.fill()):s.fillRect(d,h,u,f)}}function of(s,t){const{ctx:e,options:{pointLabels:n}}=s;for(let i=t-1;i>=0;i--){const o=s._pointLabelItems[i];if(!o.visible)continue;const a=n.setContext(s.getPointLabelContext(i));nf(e,a,o);const r=gt(a.font),{x:l,y:c,textAlign:d}=o;Ne(e,s._pointLabels[i],l,c+r.lineHeight/2,r,{color:a.color,textAlign:d,textBaseline:"middle"})}}function Jr(s,t,e,n){const{ctx:i}=s;if(e)i.arc(s.xCenter,s.yCenter,t,0,J);else{let o=s.getPointPosition(0,t);i.moveTo(o.x,o.y);for(let a=1;a<n;a++)o=s.getPointPosition(a,t),i.lineTo(o.x,o.y)}}function af(s,t,e,n,i){const o=s.ctx,a=t.circular,{color:r,lineWidth:l}=t;!a&&!n||!r||!l||e<0||(o.save(),o.strokeStyle=r,o.lineWidth=l,o.setLineDash(i.dash||[]),o.lineDashOffset=i.dashOffset,o.beginPath(),Jr(s,e,a,n),o.closePath(),o.stroke(),o.restore())}function rf(s,t,e){return Ce(s,{label:e,index:t,type:"pointLabel"})}class fs extends un{constructor(t){super(t),this.xCenter=void 0,this.yCenter=void 0,this.drawingArea=void 0,this._pointLabels=[],this._pointLabelItems=[]}setDimensions(){const t=this._padding=St(ei(this.options)/2),e=this.width=this.maxWidth-t.width,n=this.height=this.maxHeight-t.height;this.xCenter=Math.floor(this.left+e/2+t.left),this.yCenter=Math.floor(this.top+n/2+t.top),this.drawingArea=Math.floor(Math.min(e,n)/2)}determineDataLimits(){const{min:t,max:e}=this.getMinMax(!1);this.min=nt(t)&&!isNaN(t)?t:0,this.max=nt(e)&&!isNaN(e)?e:0,this.handleTickRangeOptions()}computeTickLimit(){return Math.ceil(this.drawingArea/ei(this.options))}generateTickLabels(t){un.prototype.generateTickLabels.call(this,t),this._pointLabels=this.getLabels().map((e,n)=>{const i=G(this.options.pointLabels.callback,[e,n],this);return i||i===0?i:""}).filter((e,n)=>this.chart.getDataVisibility(n))}fit(){const t=this.options;t.display&&t.pointLabels.display?Gu(this):this.setCenterPoint(0,0,0,0)}setCenterPoint(t,e,n,i){this.xCenter+=Math.floor((t-e)/2),this.yCenter+=Math.floor((n-i)/2),this.drawingArea-=Math.min(this.drawingArea/2,Math.max(t,e,n,i))}getIndexAngle(t){const e=J/(this._pointLabels.length||1),n=this.options.startAngle||0;return wt(t*e+Nt(n))}getDistanceFromCenterForValue(t){if(j(t))return NaN;const e=this.drawingArea/(this.max-this.min);return this.options.reverse?(this.max-t)*e:(t-this.min)*e}getValueForDistanceFromCenter(t){if(j(t))return NaN;const e=t/(this.drawingArea/(this.max-this.min));return this.options.reverse?this.max-e:this.min+e}getPointLabelContext(t){const e=this._pointLabels||[];if(t>=0&&t<e.length){const n=e[t];return rf(this.getContext(),t,n)}}getPointPosition(t,e,n=0){const i=this.getIndexAngle(t)-lt+n;return{x:Math.cos(i)*e+this.xCenter,y:Math.sin(i)*e+this.yCenter,angle:i}}getPointPositionForValue(t,e){return this.getPointPosition(t,this.getDistanceFromCenterForValue(e))}getBasePosition(t){return this.getPointPositionForValue(t||0,this.getBaseValue())}getPointLabelPosition(t){const{left:e,top:n,right:i,bottom:o}=this._pointLabelItems[t];return{left:e,top:n,right:i,bottom:o}}drawBackground(){const{backgroundColor:t,grid:{circular:e}}=this.options;if(t){const n=this.ctx;n.save(),n.beginPath(),Jr(this,this.getDistanceFromCenterForValue(this._endValue),e,this._pointLabels.length),n.closePath(),n.fillStyle=t,n.fill(),n.restore()}}drawGrid(){const t=this.ctx,e=this.options,{angleLines:n,grid:i,border:o}=e,a=this._pointLabels.length;let r,l,c;if(e.pointLabels.display&&of(this,a),i.display&&this.ticks.forEach((d,h)=>{if(h!==0||h===0&&this.min<0){l=this.getDistanceFromCenterForValue(d.value);const u=this.getContext(h),f=i.setContext(u),p=o.setContext(u);af(this,f,l,a,p)}}),n.display){for(t.save(),r=a-1;r>=0;r--){const d=n.setContext(this.getPointLabelContext(r)),{color:h,lineWidth:u}=d;!u||!h||(t.lineWidth=u,t.strokeStyle=h,t.setLineDash(d.borderDash),t.lineDashOffset=d.borderDashOffset,l=this.getDistanceFromCenterForValue(e.reverse?this.min:this.max),c=this.getPointPosition(r,l),t.beginPath(),t.moveTo(this.xCenter,this.yCenter),t.lineTo(c.x,c.y),t.stroke())}t.restore()}}drawBorder(){}drawLabels(){const t=this.ctx,e=this.options,n=e.ticks;if(!n.display)return;const i=this.getIndexAngle(0);let o,a;t.save(),t.translate(this.xCenter,this.yCenter),t.rotate(i),t.textAlign="center",t.textBaseline="middle",this.ticks.forEach((r,l)=>{if(l===0&&this.min>=0&&!e.reverse)return;const c=n.setContext(this.getContext(l)),d=gt(c.font);if(o=this.getDistanceFromCenterForValue(this.ticks[l].value),c.showLabelBackdrop){t.font=d.string,a=t.measureText(r.label).width,t.fillStyle=c.backdropColor;const h=St(c.backdropPadding);t.fillRect(-a/2-h.left,-o-d.size/2-h.top,a+h.width,d.size+h.height)}Ne(t,r.label,0,-o,d,{color:c.color,strokeColor:c.textStrokeColor,strokeWidth:c.textStrokeWidth})}),t.restore()}drawTitle(){}}C(fs,"id","radialLinear"),C(fs,"defaults",{display:!0,animate:!0,position:"chartArea",angleLines:{display:!0,lineWidth:1,borderDash:[],borderDashOffset:0},grid:{circular:!1},startAngle:0,ticks:{showLabelBackdrop:!0,callback:gn.formatters.numeric},pointLabels:{backdropColor:void 0,backdropPadding:2,display:!0,font:{size:10},callback(t){return t},padding:5,centerPointLabels:!1}}),C(fs,"defaultRoutes",{"angleLines.color":"borderColor","pointLabels.color":"color","ticks.color":"color"}),C(fs,"descriptors",{angleLines:{_fallback:"grid"}});const _n={millisecond:{common:!0,size:1,steps:1e3},second:{common:!0,size:1e3,steps:60},minute:{common:!0,size:6e4,steps:60},hour:{common:!0,size:36e5,steps:24},day:{common:!0,size:864e5,steps:30},week:{common:!1,size:6048e5,steps:4},month:{common:!0,size:2628e6,steps:12},quarter:{common:!1,size:7884e6,steps:4},year:{common:!0,size:3154e7}},Lt=Object.keys(_n);function Ka(s,t){return s-t}function Ja(s,t){if(j(t))return null;const e=s._adapter,{parser:n,round:i,isoWeekday:o}=s._parseOpts;let a=t;return typeof n=="function"&&(a=n(a)),nt(a)||(a=typeof n=="string"?e.parse(a,n):e.parse(a)),a===null?null:(i&&(a=i==="week"&&(Ze(o)||o===!0)?e.startOf(a,"isoWeek",o):e.startOf(a,i)),+a)}function Za(s,t,e,n){const i=Lt.length;for(let o=Lt.indexOf(s);o<i-1;++o){const a=_n[Lt[o]],r=a.steps?a.steps:Number.MAX_SAFE_INTEGER;if(a.common&&Math.ceil((e-t)/(r*a.size))<=n)return Lt[o]}return Lt[i-1]}function lf(s,t,e,n,i){for(let o=Lt.length-1;o>=Lt.indexOf(e);o--){const a=Lt[o];if(_n[a].common&&s._adapter.diff(i,n,a)>=t-1)return a}return Lt[e?Lt.indexOf(e):0]}function cf(s){for(let t=Lt.indexOf(s)+1,e=Lt.length;t<e;++t)if(_n[Lt[t]].common)return Lt[t]}function Qa(s,t,e){if(!e)s[t]=!0;else if(e.length){const{lo:n,hi:i}=fi(e,t),o=e[n]>=t?e[n]:e[i];s[o]=!0}}function df(s,t,e,n){const i=s._adapter,o=+i.startOf(t[0].value,n),a=t[t.length-1].value;let r,l;for(r=o;r<=a;r=+i.add(r,1,n))l=e[r],l>=0&&(t[l].major=!0);return t}function tr(s,t,e){const n=[],i={},o=t.length;let a,r;for(a=0;a<o;++a)r=t[a],i[r]=a,n.push({value:r,major:!1});return o===0||!e?n:df(s,n,i,e)}class Ds extends Ve{constructor(t){super(t),this._cache={data:[],labels:[],all:[]},this._unit="day",this._majorUnit=void 0,this._offsets={},this._normalized=!1,this._parseOpts=void 0}init(t,e={}){const n=t.time||(t.time={}),i=this._adapter=new bd._date(t.adapters.date);i.init(e),bs(n.displayFormats,i.formats()),this._parseOpts={parser:n.parser,round:n.round,isoWeekday:n.isoWeekday},super.init(t),this._normalized=e.normalized}parse(t,e){return t===void 0?null:Ja(this,t)}beforeLayout(){super.beforeLayout(),this._cache={data:[],labels:[],all:[]}}determineDataLimits(){const t=this.options,e=this._adapter,n=t.time.unit||"day";let{min:i,max:o,minDefined:a,maxDefined:r}=this.getUserBounds();function l(c){!a&&!isNaN(c.min)&&(i=Math.min(i,c.min)),!r&&!isNaN(c.max)&&(o=Math.max(o,c.max))}(!a||!r)&&(l(this._getLabelBounds()),(t.bounds!=="ticks"||t.ticks.source!=="labels")&&l(this.getMinMax(!1))),i=nt(i)&&!isNaN(i)?i:+e.startOf(Date.now(),n),o=nt(o)&&!isNaN(o)?o:+e.endOf(Date.now(),n)+1,this.min=Math.min(i,o-1),this.max=Math.max(i+1,o)}_getLabelBounds(){const t=this.getLabelTimestamps();let e=Number.POSITIVE_INFINITY,n=Number.NEGATIVE_INFINITY;return t.length&&(e=t[0],n=t[t.length-1]),{min:e,max:n}}buildTicks(){const t=this.options,e=t.time,n=t.ticks,i=n.source==="labels"?this.getLabelTimestamps():this._generate();t.bounds==="ticks"&&i.length&&(this.min=this._userMin||i[0],this.max=this._userMax||i[i.length-1]);const o=this.min,a=this.max,r=Nl(i,o,a);return this._unit=e.unit||(n.autoSkip?Za(e.minUnit,this.min,this.max,this._getLabelCapacity(o)):lf(this,r.length,e.minUnit,this.min,this.max)),this._majorUnit=!n.major.enabled||this._unit==="year"?void 0:cf(this._unit),this.initOffsets(i),t.reverse&&r.reverse(),tr(this,r,this._majorUnit)}afterAutoSkip(){this.options.offsetAfterAutoskip&&this.initOffsets(this.ticks.map(t=>+t.value))}initOffsets(t=[]){let e=0,n=0,i,o;this.options.offset&&t.length&&(i=this.getDecimalForValue(t[0]),t.length===1?e=1-i:e=(this.getDecimalForValue(t[1])-i)/2,o=this.getDecimalForValue(t[t.length-1]),t.length===1?n=o:n=(o-this.getDecimalForValue(t[t.length-2]))/2);const a=t.length<3?.5:.25;e=bt(e,0,a),n=bt(n,0,a),this._offsets={start:e,end:n,factor:1/(e+1+n)}}_generate(){const t=this._adapter,e=this.min,n=this.max,i=this.options,o=i.time,a=o.unit||Za(o.minUnit,e,n,this._getLabelCapacity(e)),r=B(i.ticks.stepSize,1),l=a==="week"?o.isoWeekday:!1,c=Ze(l)||l===!0,d={};let h=e,u,f;if(c&&(h=+t.startOf(h,"isoWeek",l)),h=+t.startOf(h,c?"day":a),t.diff(n,e,a)>1e5*r)throw new Error(e+" and "+n+" are too far apart with stepSize of "+r+" "+a);const p=i.ticks.source==="data"&&this.getDataTimestamps();for(u=h,f=0;u<n;u=+t.add(u,r,a),f++)Qa(d,u,p);return(u===n||i.bounds==="ticks"||f===1)&&Qa(d,u,p),Object.keys(d).sort(Ka).map(g=>+g)}getLabelForValue(t){const e=this._adapter,n=this.options.time;return n.tooltipFormat?e.format(t,n.tooltipFormat):e.format(t,n.displayFormats.datetime)}format(t,e){const i=this.options.time.displayFormats,o=this._unit,a=e||i[o];return this._adapter.format(t,a)}_tickFormatFunction(t,e,n,i){const o=this.options,a=o.ticks.callback;if(a)return G(a,[t,e,n],this);const r=o.time.displayFormats,l=this._unit,c=this._majorUnit,d=l&&r[l],h=c&&r[c],u=n[e],f=c&&h&&u&&u.major;return this._adapter.format(t,i||(f?h:d))}generateTickLabels(t){let e,n,i;for(e=0,n=t.length;e<n;++e)i=t[e],i.label=this._tickFormatFunction(i.value,e,t)}getDecimalForValue(t){return t===null?NaN:(t-this.min)/(this.max-this.min)}getPixelForValue(t){const e=this._offsets,n=this.getDecimalForValue(t);return this.getPixelForDecimal((e.start+n)*e.factor)}getValueForPixel(t){const e=this._offsets,n=this.getDecimalForPixel(t)/e.factor-e.end;return this.min+n*(this.max-this.min)}_getLabelSize(t){const e=this.options.ticks,n=this.ctx.measureText(t).width,i=Nt(this.isHorizontal()?e.maxRotation:e.minRotation),o=Math.cos(i),a=Math.sin(i),r=this._resolveTickFontOptions(0).size;return{w:n*o+r*a,h:n*a+r*o}}_getLabelCapacity(t){const e=this.options.time,n=e.displayFormats,i=n[e.unit]||n.millisecond,o=this._tickFormatFunction(t,0,tr(this,[t],this._majorUnit),i),a=this._getLabelSize(o),r=Math.floor(this.isHorizontal()?this.width/a.w:this.height/a.h)-1;return r>0?r:1}getDataTimestamps(){let t=this._cache.data||[],e,n;if(t.length)return t;const i=this.getMatchingVisibleMetas();if(this._normalized&&i.length)return this._cache.data=i[0].controller.getAllParsedValues(this);for(e=0,n=i.length;e<n;++e)t=t.concat(i[e].controller.getAllParsedValues(this));return this._cache.data=this.normalize(t)}getLabelTimestamps(){const t=this._cache.labels||[];let e,n;if(t.length)return t;const i=this.getLabels();for(e=0,n=i.length;e<n;++e)t.push(Ja(this,i[e]));return this._cache.labels=this._normalized?t:this.normalize(t)}normalize(t){return cr(t.sort(Ka))}}C(Ds,"id","time"),C(Ds,"defaults",{bounds:"data",adapters:{},time:{parser:!1,unit:!1,round:!1,isoWeekday:!1,minUnit:"millisecond",displayFormats:{}},ticks:{source:"auto",callback:!1,major:{enabled:!1}}});function Ys(s,t,e){let n=0,i=s.length-1,o,a,r,l;e?(t>=s[n].pos&&t<=s[i].pos&&({lo:n,hi:i}=ie(s,"pos",t)),{pos:o,time:r}=s[n],{pos:a,time:l}=s[i]):(t>=s[n].time&&t<=s[i].time&&({lo:n,hi:i}=ie(s,"time",t)),{time:o,pos:r}=s[n],{time:a,pos:l}=s[i]);const c=a-o;return c?r+(l-r)*(t-o)/c:r}class si extends Ds{constructor(t){super(t),this._table=[],this._minPos=void 0,this._tableRange=void 0}initOffsets(){const t=this._getTimestampsForTable(),e=this._table=this.buildLookupTable(t);this._minPos=Ys(e,this.min),this._tableRange=Ys(e,this.max)-this._minPos,super.initOffsets(t)}buildLookupTable(t){const{min:e,max:n}=this,i=[],o=[];let a,r,l,c,d;for(a=0,r=t.length;a<r;++a)c=t[a],c>=e&&c<=n&&i.push(c);if(i.length<2)return[{time:e,pos:0},{time:n,pos:1}];for(a=0,r=i.length;a<r;++a)d=i[a+1],l=i[a-1],c=i[a],Math.round((d+l)/2)!==c&&o.push({time:c,pos:a/(r-1)});return o}_generate(){const t=this.min,e=this.max;let n=super.getDataTimestamps();return(!n.includes(t)||!n.length)&&n.splice(0,0,t),(!n.includes(e)||n.length===1)&&n.push(e),n.sort((i,o)=>i-o)}_getTimestampsForTable(){let t=this._cache.all||[];if(t.length)return t;const e=this.getDataTimestamps(),n=this.getLabelTimestamps();return e.length&&n.length?t=this.normalize(e.concat(n)):t=e.length?e:n,t=this._cache.all=t,t}getDecimalForValue(t){return(Ys(this._table,t)-this._minPos)/this._tableRange}getValueForPixel(t){const e=this._offsets,n=this.getDecimalForPixel(t)/e.factor-e.end;return Ys(this._table,n*this._tableRange+this._minPos,!0)}}C(si,"id","timeseries"),C(si,"defaults",Ds.defaults);var hf=Object.freeze({__proto__:null,CategoryScale:Zn,LinearScale:Qn,LogarithmicScale:ti,RadialLinearScale:fs,TimeScale:Ds,TimeSeriesScale:si});const uf=[md,Uh,Nu,hf];Bt.register(...uf);let Rn=null,Fn=null,zn=null,jn=null;function ff(s,t){const e=document.getElementById(s);if(!e)return;Rn&&Rn.destroy();const n=t.map(a=>a.category_name),i=t.map(a=>a.total_amount),o=t.map(a=>a.color_hex||"#3B82F6");Rn=new Bt(e,{type:"doughnut",data:{labels:n.length>0?n:["No Expenses Yet"],datasets:[{data:i.length>0?i:[1],backgroundColor:o.length>0?o:["#334155"],borderWidth:0}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"bottom",labels:{color:"#94a3b8",font:{size:11}}}},cutout:"70%"}})}function pf(s,t){const e=document.getElementById(s);if(!e)return;Fn&&Fn.destroy();const n=t.map(a=>a.month),i=t.map(a=>a.income),o=t.map(a=>a.expenses);Fn=new Bt(e,{type:"bar",data:{labels:n.length>0?n:["Current Month"],datasets:[{label:"Income (₪)",data:i.length>0?i:[0],backgroundColor:"#10B981",borderRadius:6},{label:"Expenses (₪)",data:o.length>0?o:[0],backgroundColor:"#F43F5E",borderRadius:6}]},options:{responsive:!0,maintainAspectRatio:!1,scales:{x:{ticks:{color:"#94a3b8"},grid:{color:"#1e293b"}},y:{ticks:{color:"#94a3b8"},grid:{color:"#1e293b"}}},plugins:{legend:{labels:{color:"#94a3b8"}}}}})}function gf(s,t){const e=document.getElementById(s);if(!e)return;zn&&zn.destroy();const n=t.map(o=>o.date),i=t.map(o=>o.net_worth);zn=new Bt(e,{type:"line",data:{labels:n.length>0?n:["Today"],datasets:[{label:"Net Worth (₪)",data:i.length>0?i:[0],borderColor:"#3B82F6",backgroundColor:"rgba(59, 130, 246, 0.15)",borderWidth:2,fill:!0,tension:.3}]},options:{responsive:!0,maintainAspectRatio:!1,scales:{x:{ticks:{color:"#94a3b8"},grid:{color:"#1e293b"}},y:{ticks:{color:"#94a3b8"},grid:{color:"#1e293b"}}},plugins:{legend:{labels:{color:"#94a3b8"}}}}})}function mf(s,t){const e=document.getElementById(s);if(!e)return;jn&&jn.destroy();const n=t.map(o=>o.month),i=t.map(o=>o.installment_cost);jn=new Bt(e,{type:"bar",data:{labels:n.length>0?n:["No Installments"],datasets:[{label:"Future Installments (₪)",data:i.length>0?i:[0],backgroundColor:"#8B5CF6",borderRadius:6}]},options:{responsive:!0,maintainAspectRatio:!1,scales:{x:{ticks:{color:"#94a3b8"},grid:{color:"#1e293b"}},y:{ticks:{color:"#94a3b8"},grid:{color:"#1e293b"}}},plugins:{legend:{labels:{color:"#94a3b8"}}}}})}let Et="dashboard",Ft=[],Rt=[],kt=[],ni=[],ii=[],Zr=[],qe=[],Ge=[],Mi=[],oi=[],ai=[],Xe=[],en=[],qt={},ht=null,Je=0,ot=0,jt=25,we="",pt="",at=[],ke="",Me="",Se="",$e=!1,fn=!1,xt={running:!1,canceled:!1,processed:0,total:0,current_batch:0,total_batches:0,batches:[]},ws="",Qr="",Be=null,rs=null;function bf(){const s=new Date,t=s.getFullYear(),e=String(s.getMonth()+1).padStart(2,"0"),n=`${t}-${e}`,i=new Date(s.getFullYear(),s.getMonth()-5,1),o=i.getFullYear(),a=String(i.getMonth()+1).padStart(2,"0");return{fromStr:`${o}-${a}`,toStr:n}}const ce=bf();let L={cashflowAcc:"",cashflowFromMonth:ce.fromStr,cashflowToMonth:ce.toStr,donutAcc:"",donutFromMonth:ce.fromStr,donutToMonth:ce.toStr,networthFromMonth:ce.fromStr,networthToMonth:ce.toStr,payoffAcc:"",budgetAcc:"",subscriptionsAcc:"",momAcc:"",momFromMonth:ce.fromStr,momToMonth:ce.toStr};function Ye(s,t){return`
    <select id="${s}" class="bg-slate-900 border border-slate-700/80 rounded-md px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-brand-500">
      <option value="">All Accounts</option>
      ${Ft.map(e=>`<option value="${e.id}" ${t===e.id?"selected":""}>${e.name}</option>`).join("")}
    </select>
  `}let ps=!1,Q=null,gs=!1,ee=null,sn=[],pn="",Re="",fe=null,ue=[],zt="",ms=!1;function rt(s){return`₪ ${(s??0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`}function ri(s){return s.current_balance??s.opening_balance??0}function xf(){const s=document.createElement("div");return s.id="toast-container",document.body.appendChild(s),s}function T(s,t="info"){const e=document.getElementById("toast-container")??xf(),n=document.createElement("div");n.className=`toast-item toast-${t}`,n.textContent=s,e.appendChild(n),setTimeout(()=>{n.classList.add("toast-exit"),setTimeout(()=>n.remove(),350)},4e3)}async function yf(){document.getElementById("app")&&(await q(),A())}async function q(){try{const s=new URLSearchParams({limit:String(jt),offset:String(ot*jt)});we&&s.set("account_id",we),pt&&s.set("category_type",pt),ke&&s.set("start_date",ke),Me&&s.set("end_date",Me),Se&&s.set("search",Se);const[t,e,n,i,o,a,r,l,c,d,h,u,f,p,g,m,b]=await Promise.all([fetch("/api/v1/accounts"),fetch(`/api/v1/transactions?${s.toString()}`),fetch("/api/v1/categories"),fetch(`/api/v1/reports/budget-vs-actual?account_id=${L.budgetAcc}`),fetch(`/api/v1/reports/subscriptions?account_id=${L.subscriptionsAcc}`),fetch(`/api/v1/reports/category-donut?account_id=${L.donutAcc}&start_date=${L.donutFromMonth}&end_date=${L.donutToMonth}`),fetch(`/api/v1/reports/cash-flow?account_id=${L.cashflowAcc}&start_date=${L.cashflowFromMonth}&end_date=${L.cashflowToMonth}`),fetch("/api/v1/auth/info"),fetch(`/api/v1/reports/net-worth?start_date=${L.networthFromMonth}&end_date=${L.networthToMonth}`),fetch(`/api/v1/reports/cc-payoff?account_id=${L.payoffAcc}`),fetch("/api/v1/reports/foreign-currency"),fetch("/api/v1/reports/anomalies"),fetch(`/api/v1/reports/mom-heatmap?account_id=${L.momAcc}&start_date=${L.momFromMonth}&end_date=${L.momToMonth}`),fetch("/api/v1/reports/sankey"),fetch("/api/v1/settings"),fetch("/api/v1/categorize/prompt"),fetch("/api/v1/categorize/status")]);if(t.status===401||e.status===401){fn=!0,l.ok&&(ht=await l.json());return}if(fn=!1,t.ok&&(Ft=await t.json()||[]),e.ok){const v=await e.json();Rt=v.transactions||[],Je=v.total??Rt.length}if(n.ok&&(kt=await n.json()||[]),i.ok&&(ni=await i.json()||[]),o.ok&&(ii=await o.json()||[]),a.ok&&(Zr=await a.json()||[]),r.ok&&(qe=await r.json()||[]),l.ok&&(ht=await l.json()),c.ok&&(Ge=await c.json()||[]),d.ok&&(Mi=await d.json()||[]),h.ok&&(oi=await h.json()||[]),u.ok&&(ai=await u.json()||[]),f.ok&&(Xe=await f.json()||[]),p.ok&&(en=await p.json()||[]),g.ok&&(qt=await g.json()||{}),m&&m.ok){const v=await m.json();ws=v.prompt||"",Qr=v.default_prompt||""}b&&b.ok&&(xt=await b.json()),await he()}catch(s){console.error("Failed to fetch data from API server",s)}}async function he(){try{const s=new URLSearchParams;pn&&s.set("account_id",pn),Re&&s.set("status",Re);const t=await fetch(`/api/v1/billing-cycles?${s.toString()}`);t.ok&&(sn=await t.json()||[])}catch(s){console.error("Failed to fetch billing cycles",s)}}async function Dt(){try{const s=new URLSearchParams({limit:String(jt),offset:String(ot*jt)});we&&s.set("account_id",we),pt&&s.set("category_type",pt),at.length>0&&s.set("category_ids",at.join(",")),ke&&s.set("start_date",ke),Me&&s.set("end_date",Me),Se&&s.set("search",Se);const t=await fetch(`/api/v1/transactions?${s.toString()}`);if(t.status===401){fn=!0,A();return}if(t.ok){const e=await t.json();Rt=e.transactions||[],Je=e.total??Rt.length}}catch(s){console.error("Failed to load transactions",s)}}function vf(){return`
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
  `}function A(){const s=document.getElementById("app");if(!s)return;const t=Ft.map(o=>ri(o)).filter(o=>o>=0).reduce((o,a)=>o+a,0),e=Ft.map(o=>ri(o)).filter(o=>o<0).reduce((o,a)=>o+Math.abs(a),0),n=t-e;Rt.filter(o=>o.suggested_category_en).length;const i=fn||(ht==null?void 0:ht.oidc_enabled)&&!(ht!=null&&ht.user);s.innerHTML=`
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
            ${de("dashboard","📊 Dashboard")}
            ${de("accounts","🏦 Accounts")}
            ${de("transactions","💳 Transactions")}
            ${de("categories","🏷️ Categories")}
            ${de("autocat","✨ Auto-Categorization")}
            ${de("import","📤 Import")}
            ${de("reconciliation","🔗 Reconciliation")}
            ${de("settings","⚙️ Settings")}
          </nav>
        `}

        <div class="flex items-center gap-3">
          ${ht!=null&&ht.user?`
            <div class="flex items-center gap-2.5">
              <span class="text-xs px-3 py-1.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700 flex items-center gap-1.5 font-medium shadow-sm">
                <span class="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                👤 ${ht.user.name||ht.user.email}
              </span>
              ${ht.oidc_enabled?`
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
      ${i?vf():`
        ${Et==="dashboard"?_f(n,t,e):""}
        ${Et==="accounts"?wf():""}
        ${Et==="transactions"?Mf():""}
        ${Et==="categories"?Sf():""}
        ${Et==="autocat"?Cf():""}
        ${Et==="import"?Pf():""}
        ${Et==="reconciliation"?Df():""}
        ${Et==="settings"?If():""}
      `}
    </main>

    ${ps?kf():""}
    ${gs||ee?Af():""}
    ${Be?Ef():""}

    <!-- Footer -->
    <footer class="border-t border-slate-800/60 py-6 text-center text-xs text-slate-500">
      Financial Reporting Application &copy; 2026 &bull; Powered by Go + Echo + Vite + LocalAI
    </footer>
  `,$f(),Et==="dashboard"&&setTimeout(()=>{ff("donut-chart-canvas",Zr),pf("cashflow-chart-canvas",qe),gf("networth-chart-canvas",Ge),mf("ccpayoff-chart-canvas",Mi)},50)}function de(s,t){return`
    <button class="nav-tab px-3 py-1.5 rounded-lg text-xs font-medium transition ${Et===s?"bg-brand-600 text-white shadow-md":"text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"}" data-tab="${s}">
      ${t}
    </button>
  `}function _f(s,t,e){const n=Xe.length>0?Xe[0].months.map(o=>o.month):[],i=Xe.flatMap(o=>o.months.map(a=>a.amount)).reduce((o,a)=>Math.max(o,a),1);return`
    <div class="space-y-8">
      <!-- Metric Overview Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="glass-panel p-6 relative overflow-hidden">
          <div class="absolute -right-4 -bottom-4 w-24 h-24 bg-brand-500/10 rounded-full blur-xl"></div>
          <p class="text-xs font-medium text-slate-400 uppercase tracking-wider">Net Worth (ILS)</p>
          <h2 class="text-3xl font-extrabold text-white mt-2">${rt(s)}</h2>
          <span class="text-xs text-emerald-400 mt-2 inline-block">↑ Aggregated across accounts</span>
        </div>

        <div class="glass-panel p-6 relative overflow-hidden">
          <p class="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Assets</p>
          <h2 class="text-3xl font-extrabold text-emerald-400 mt-2">${rt(t)}</h2>
          <span class="text-xs text-slate-500 mt-2 inline-block">Bank &amp; Liquid Cash</span>
        </div>

        <div class="glass-panel p-6 relative overflow-hidden">
          <p class="text-xs font-medium text-slate-400 uppercase tracking-wider">Liabilities &amp; Card Balances</p>
          <h2 class="text-3xl font-extrabold text-rose-400 mt-2">${rt(e)}</h2>
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
                  ${qe.length} Months (${L.cashflowFromMonth} to ${L.cashflowToMonth})
                </span>
              </h3>
              <p class="text-xs text-slate-400 mt-0.5">Income vs Expenses breakdown</p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <!-- Quick Presets -->
              <div class="inline-flex rounded-md border border-slate-800 bg-slate-950 p-0.5 text-[11px]">
                <button id="btn-cashflow-preset-3m" class="px-2.5 py-1 rounded text-slate-400 hover:text-white transition ${qe.length===3?"bg-brand-600 text-white font-bold":""}">3M</button>
                <button id="btn-cashflow-preset-6m" class="px-2.5 py-1 rounded text-slate-400 hover:text-white transition ${qe.length===6?"bg-brand-600 text-white font-bold":""}">6M</button>
                <button id="btn-cashflow-preset-12m" class="px-2.5 py-1 rounded text-slate-400 hover:text-white transition ${qe.length===12?"bg-brand-600 text-white font-bold":""}">12M</button>
              </div>

              <!-- Month Pickers -->
              <div class="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-md px-2.5 py-1 text-[11px]">
                <span class="text-slate-400">From:</span>
                <input type="month" id="widget-cashflow-from" value="${L.cashflowFromMonth}" class="bg-transparent text-slate-200 focus:outline-none font-mono">
                <span class="text-slate-400">To:</span>
                <input type="month" id="widget-cashflow-to" value="${L.cashflowToMonth}" class="bg-transparent text-slate-200 focus:outline-none font-mono">
              </div>

              <!-- Account Selector -->
              ${Ye("widget-acc-cashflow",L.cashflowAcc)}
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
              ${Ye("widget-acc-donut",L.donutAcc)}
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
                  ${Ge.length} Points (${L.networthFromMonth} to ${L.networthToMonth})
                </span>
              </h3>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <!-- Quick Presets -->
              <div class="inline-flex rounded-md border border-slate-800 bg-slate-950 p-0.5 text-[11px]">
                <button id="btn-networth-preset-3m" class="px-2.5 py-1 rounded text-slate-400 hover:text-white transition ${Ge.length===3?"bg-brand-600 text-white font-bold":""}">3M</button>
                <button id="btn-networth-preset-6m" class="px-2.5 py-1 rounded text-slate-400 hover:text-white transition ${Ge.length===6?"bg-brand-600 text-white font-bold":""}">6M</button>
                <button id="btn-networth-preset-12m" class="px-2.5 py-1 rounded text-slate-400 hover:text-white transition ${Ge.length===12?"bg-brand-600 text-white font-bold":""}">12M</button>
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
            ${Ye("widget-acc-payoff",L.payoffAcc)}
          </div>
          <div class="h-64 relative">
            ${Mi.length===0?'<div class="flex items-center justify-center h-full text-slate-500 text-xs">No installment transactions found.</div>':'<canvas id="ccpayoff-chart-canvas"></canvas>'}
          </div>
        </div>
      </div>

      <!-- Budget vs Actual & Subscriptions -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="glass-panel p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-sm text-white">Budget vs Actual (This Month)</h3>
            ${Ye("widget-acc-budget",L.budgetAcc)}
          </div>
          <div class="space-y-3">
            ${ni.length===0?'<p class="text-xs text-slate-500">No category budgets defined yet. Set budgets in the Categories tab.</p>':ni.map(o=>{const a=o.monthly_budget>0?Math.min(100,o.actual_spent/o.monthly_budget*100):0,r=o.actual_spent>o.monthly_budget&&o.monthly_budget>0;return`
                    <div class="space-y-1">
                      <div class="flex justify-between text-xs">
                        <span class="text-slate-300 font-medium">${o.category_name}</span>
                        <span class="${r?"text-rose-400 font-bold":"text-slate-400"}">${rt(o.actual_spent)} / ${rt(o.monthly_budget)}</span>
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
            ${Ye("widget-acc-subscriptions",L.subscriptionsAcc)}
          </div>
          <div class="space-y-2">
            ${ii.length===0?'<p class="text-xs text-slate-500">No recurring subscriptions detected.</p>':ii.slice(0,8).map(o=>`
                  <div class="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                    <div>
                      <h4 class="text-xs font-bold text-white">${o.payee}</h4>
                      <span class="text-xs text-slate-400">${o.category_name} &bull; ${o.occurrence_count} occurrences</span>
                    </div>
                    <span class="text-xs font-bold text-rose-400 font-mono">${rt(o.monthly_cost)}/mo</span>
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
            ${Ye("widget-acc-mom",L.momAcc)}
          </div>
        </div>

        ${Xe.length===0?'<p class="text-xs text-slate-500 py-6 text-center">No categorized expense data found for selected month range.</p>':`<div id="mom-heatmap-container" class="overflow-x-auto">
              <table class="w-full text-xs border-collapse">
                <thead>
                  <tr class="border-b border-slate-800">
                    <th class="text-left py-2.5 pr-4 text-slate-400 font-medium sticky left-0 bg-slate-950/95 z-10 min-w-[140px]">Category</th>
                    ${n.map(o=>`<th class="text-center py-2.5 px-2 text-slate-400 font-medium font-mono min-w-[75px]">${o}</th>`).join("")}
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/40" id="mom-heatmap-tbody">
                  ${Xe.map(o=>`
                    <tr class="hover:bg-slate-900/40 transition">
                      <td class="py-2.5 pr-4 text-slate-300 font-medium flex items-center gap-2 sticky left-0 bg-slate-950/95 z-10 min-w-[140px]">
                        <span class="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style="background:${o.color_hex}"></span>
                        <span class="truncate">${o.category_name}</span>
                      </td>
                      ${o.months.map(a=>{const l=(.1+(i>0?a.amount/i:0)*.75).toFixed(2);return`<td class="py-2.5 px-2 text-center rounded font-mono min-w-[75px]" style="background:${a.amount>0?`rgba(244,63,94,${l})`:"transparent"}">
                          ${a.amount>0?rt(a.amount):"-"}
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
        ${en.length===0?'<p class="text-xs text-slate-500">No flow data for current month.</p>':`<div class="space-y-2">
              ${en.slice(0,15).map(o=>{var a;return`
                <div class="flex items-center gap-3 text-xs">
                  <span class="text-slate-300 w-40 truncate font-medium">${o.source}</span>
                  <div class="flex-1 bg-slate-800 rounded-full h-3 overflow-hidden">
                    <div class="h-3 rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all"
                         style="width: ${Math.min(100,o.value/(((a=en[0])==null?void 0:a.value)||1)*100)}%"></div>
                  </div>
                  <span class="text-slate-300 w-40 truncate">${o.target}</span>
                  <span class="text-slate-400 font-mono w-28 text-right">${rt(o.value)}</span>
                </div>
              `}).join("")}
            </div>`}
      </div>

      <!-- Foreign Currency & Anomalies -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="glass-panel p-6 space-y-4">
          <h3 class="font-bold text-sm text-white">Foreign Currency Analysis</h3>
          ${oi.length===0?'<p class="text-xs text-slate-500">No foreign currency transactions found.</p>':`<table class="w-full text-xs">
                <thead><tr class="text-slate-400 border-b border-slate-800">
                  <th class="text-left py-2">Currency</th>
                  <th class="text-right py-2">Original Total</th>
                  <th class="text-right py-2">ILS Billed</th>
                  <th class="text-right py-2">Avg Rate</th>
                </tr></thead>
                <tbody class="divide-y divide-slate-800/40">
                  ${oi.map(o=>`
                    <tr>
                      <td class="py-2 font-bold text-white">${o.original_currency}</td>
                      <td class="py-2 text-right text-slate-300">${o.original_total.toFixed(2)}</td>
                      <td class="py-2 text-right text-slate-300">${rt(o.ils_billed_total)}</td>
                      <td class="py-2 text-right text-brand-400 font-mono">${o.implied_avg_rate.toFixed(4)}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>`}
        </div>

        <div class="glass-panel p-6 space-y-4">
          <h3 class="font-bold text-sm text-white">Transaction Anomalies</h3>
          ${ai.length===0?'<p class="text-xs text-slate-500">No anomalies detected.</p>':`<div class="space-y-2">
                ${ai.map(o=>`
                  <div class="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-bold text-white truncate max-w-[180px]">${o.payee}</span>
                      <span class="text-xs font-bold text-rose-400 font-mono">${rt(o.amount)}</span>
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
          <span class="text-xs text-slate-400">${Rt.length} loaded</span>
        </div>
        ${tl(Rt.slice(0,10))}
      </div>
    </div>
  `}function wf(){return`
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

      ${Ft.length===0?`
        <div class="glass-panel p-12 text-center space-y-3">
          <div class="text-4xl">🏦</div>
          <p class="text-sm text-slate-400">No financial accounts registered yet.</p>
          <button id="btn-add-account-empty" class="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow">
            + Create First Account
          </button>
        </div>
      `:`
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${Ft.map(s=>{const t=ri(s);return`
              <div class="glass-card flex flex-col justify-between">
                <div>
                  <div class="flex items-center justify-between">
                    <span class="px-2.5 py-1 rounded-full text-xs font-bold ${s.account_type==="BANK"?"bg-emerald-500/10 text-emerald-400 border border-emerald-500/20":"bg-purple-500/10 text-purple-400 border border-purple-500/20"}">
                      ${s.account_type}
                    </span>
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-slate-500 font-mono">${s.institution}</span>
                      <button class="btn-edit-account text-slate-400 hover:text-brand-300 text-xs px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 transition" data-id="${s.id}">✏️ Edit</button>
                      <button class="btn-delete-account text-slate-500 hover:text-rose-400 text-xs px-1.5 py-0.5 rounded transition" data-id="${s.id}">✕</button>
                    </div>
                  </div>
                  <h3 class="text-lg font-bold text-white mt-3">${s.name}</h3>
                  <p class="text-xs text-slate-400">Currency: ${s.currency}</p>
                </div>
                <div class="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <span class="text-xs text-slate-400">Current Balance</span>
                  <span class="text-xl font-extrabold ${t>=0?"text-emerald-400":"text-rose-400"}">
                    ${rt(t)}
                  </span>
                </div>
              </div>
            `}).join("")}
        </div>
      `}
    </div>
  `}function kf(){const s=!!Q,t=s?"Edit Financial Account":"Add Financial Account",e=s?"Update Account":"Save Account",n=Q?Q.name:"",i=Q?Q.account_type:"BANK",o=Q?Q.institution:"",a=Q?Q.currency:"ILS",r=Q?Q.opening_balance:0,l=Q&&Q.billing_day_primary?Q.billing_day_primary:10,c=Q&&Q.billing_day_secondary?Q.billing_day_secondary:"";return`
    <div class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="glass-panel max-w-md w-full p-6 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 class="text-lg font-bold text-white">${t}</h3>
          <button id="btn-close-modal" class="text-slate-400 hover:text-white text-sm">✕</button>
        </div>

        <form id="form-account" class="space-y-4">
          <div id="modal-error-msg" class="hidden p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium"></div>

          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Account Name</label>
            <input type="text" id="acc-name" required value="${n}" placeholder="e.g. Bank Hapoalim Checking" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Account Type</label>
              <select id="acc-type" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                <option value="BANK" ${i==="BANK"?"selected":""}>BANK</option>
                <option value="CREDIT_CARD" ${i==="CREDIT_CARD"?"selected":""}>CREDIT_CARD</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Institution</label>
              <input type="text" id="acc-institution" required value="${o}" placeholder="e.g. Hapoalim" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Currency</label>
              <select id="acc-currency" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                <option value="ILS" ${a==="ILS"?"selected":""}>ILS (₪)</option>
                <option value="USD" ${a==="USD"?"selected":""}>USD ($)</option>
                <option value="EUR" ${a==="EUR"?"selected":""}>EUR (€)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Opening Balance</label>
              <input type="number" step="0.01" id="acc-balance" value="${r}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
            </div>
          </div>

          <div id="acc-cc-billing-block" class="grid grid-cols-2 gap-3 p-3 rounded-lg bg-brand-500/10 border border-brand-500/20 ${i==="CREDIT_CARD"?"":"hidden"}">
            <div>
              <label class="block text-xs font-semibold text-brand-300 mb-1">Primary Billing Day (1-31)</label>
              <input type="number" min="1" max="31" id="acc-billing-primary" value="${l}" placeholder="e.g. 10" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Secondary Day (Optional)</label>
              <input type="number" min="1" max="31" id="acc-billing-secondary" value="${c}" placeholder="e.g. 2" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button type="button" id="btn-cancel-modal" class="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-900">Cancel</button>
            <button type="submit" id="btn-save-account" class="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow">${e}</button>
          </div>
        </form>
      </div>
    </div>
  `}function Mf(){const s=Rt.filter(c=>c.suggested_category_en).length,t=Rt.filter(c=>!c.category_id&&!c.suggested_category_en).length,e=Math.max(1,Math.ceil(Je/jt)),n=ot+1,i=!!(we||pt||at.length>0||ke||Me||Se),o={id:"UNCATEGORIZED",name_en:"Uncategorized",name_he:"ללא קטגוריה",color_hex:"#F59E0B",category_type:""},a=pt?kt.filter(c=>c.category_type===pt):kt,r=[o,...a];let l='<span class="text-emerald-400 font-semibold">✓ All transactions categorized</span>';return s>0?l=`<span class="text-amber-400 font-semibold">⚠️ ${s} AI suggestions pending review</span>`:t>0&&(l=`<span class="text-amber-400 font-semibold">⚠️ ${t} uncategorized transactions (select category below or run LocalAI)</span>`),`
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-white">Transaction Ledger</h2>
          <p class="text-xs text-slate-400 mt-1">${l}</p>
        </div>
        <span class="text-xs text-slate-400">${Je} total transactions ${i?"(filtered)":""}</span>
      </div>

      <!-- Smart Filter Toolbar -->
      <div class="glass-panel p-4 space-y-3 relative z-30">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <!-- Account Filter -->
          <div>
            <label class="block text-[11px] font-medium text-slate-400 mb-1">Account</label>
            <select id="tx-filter-account" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500">
              <option value="">All Accounts</option>
              ${Ft.map(c=>`<option value="${c.id}" ${we===c.id?"selected":""}>${c.name}</option>`).join("")}
            </select>
          </div>

          <!-- Category Type Filter -->
          <div>
            <label class="block text-[11px] font-medium text-slate-400 mb-1">Category Type</label>
            <select id="tx-filter-type" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500">
              <option value="" ${pt===""?"selected":""}>All Types</option>
              <option value="EXPENSE" ${pt==="EXPENSE"?"selected":""}>Expense</option>
              <option value="INCOME" ${pt==="INCOME"?"selected":""}>Income</option>
              <option value="TRANSFER" ${pt==="TRANSFER"?"selected":""}>Transfer</option>
            </select>
          </div>

          <!-- Category Subfilter (Multi-Select) -->
          <div class="relative">
            <label class="block text-[11px] font-medium text-slate-400 mb-1">
              Category Subfilter (${r.length})
            </label>
            <button id="btn-toggle-cat-dropdown" type="button" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500 flex items-center justify-between">
              <span class="truncate">
                ${at.length===0?"All Categories":`${at.length} Selected`}
              </span>
              <span class="text-[10px] text-slate-400 ml-1">${$e?"▲":"▼"}</span>
            </button>

            <!-- Dropdown Panel -->
            <div id="tx-cat-dropdown-panel" class="${$e?"":"hidden"} absolute top-full left-0 mt-1 z-50 w-72 max-w-[90vw] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-2.5 space-y-1.5 max-h-72 overflow-y-auto" style="z-index: 9999;">
              <div class="flex items-center justify-between px-1 border-b border-slate-800 pb-1.5">
                <span class="text-[10px] font-bold text-slate-400 uppercase">
                  ${pt?`${pt}`:"All"} Categories
                </span>
                <div class="flex items-center gap-2 text-[10px]">
                  <button id="btn-select-all-cats" type="button" class="text-brand-400 hover:underline">Select All</button>
                  <button id="btn-clear-all-cats" type="button" class="text-slate-400 hover:underline">Clear</button>
                </div>
              </div>

              ${r.length===0?`
                <p class="text-xs text-slate-500 p-2 text-center">No categories found.</p>
              `:r.map(c=>{const d=at.includes(c.id);return`
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
            <input type="date" id="tx-filter-start" value="${ke}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500" />
          </div>

          <!-- Date Range: To -->
          <div>
            <label class="block text-[11px] font-medium text-slate-400 mb-1">To Date</label>
            <input type="date" id="tx-filter-end" value="${Me}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500" />
          </div>

          <!-- Search Input & Clear Button -->
          <div class="flex items-center gap-2">
            <div class="flex-1">
              <label class="block text-[11px] font-medium text-slate-400 mb-1">Search</label>
              <input type="text" id="tx-filter-search" value="${Se}" placeholder="Payee or notes..." class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500" />
            </div>
            ${i?`
              <button id="btn-tx-clear-filters" title="Clear Filters" class="mt-5 px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs font-semibold transition">Clear</button>
            `:""}
          </div>
        </div>

        ${at.length>0?`
          <div class="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-800/80">
            <span class="text-[11px] text-slate-400 font-medium mr-1">Active Category Filters (${at.length}):</span>
            ${at.map(c=>{if(c==="UNCATEGORIZED")return`
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 text-xs border border-amber-500/30 shadow-sm">
                    <span class="w-2 h-2 rounded-full inline-block bg-amber-400"></span>
                    <span>⚠️ Uncategorized (ללא קטגוריה)</span>
                    <button type="button" class="btn-remove-cat-filter text-amber-400 hover:text-rose-400 font-bold ml-1 transition" data-cat-id="UNCATEGORIZED">✕</button>
                  </span>
                `;const d=kt.find(f=>f.id===c),h=d?`${d.name_en} ${d.name_he?`(${d.name_he})`:""}`:c;return`
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
        ${tl(Rt)}

        <!-- Pagination & Page Size Toolbar -->
        <div class="flex flex-wrap items-center justify-between mt-6 pt-4 border-t border-slate-800 gap-4">
          <div class="flex items-center gap-3">
            <span class="text-xs text-slate-400">Page ${n} of ${e} &bull; ${Je} total</span>
            <div class="flex items-center gap-1.5 pl-3 border-l border-slate-800 text-xs text-slate-400">
              <span>Per page:</span>
              <select id="tx-page-size" class="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white">
                <option value="10" ${jt===10?"selected":""}>10</option>
                <option value="25" ${jt===25?"selected":""}>25</option>
                <option value="50" ${jt===50?"selected":""}>50</option>
                <option value="100" ${jt===100?"selected":""}>100</option>
              </select>
            </div>
          </div>

          <div class="flex gap-2">
            <button id="btn-tx-prev" ${ot===0?"disabled":""} class="px-3 py-1.5 rounded-lg text-xs font-medium ${ot===0?"text-slate-600 bg-slate-900/40 cursor-not-allowed":"text-slate-300 bg-slate-800 hover:bg-slate-700 transition"}">← Prev</button>
            <button id="btn-tx-next" ${n>=e?"disabled":""} class="px-3 py-1.5 rounded-lg text-xs font-medium ${n>=e?"text-slate-600 bg-slate-900/40 cursor-not-allowed":"text-slate-300 bg-slate-800 hover:bg-slate-700 transition"}">Next →</button>
          </div>
        </div>
      </div>
    </div>
  `}function tl(s){return s.length===0?`<div class="py-12 text-center">
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
                    ${kt.map(e=>`
                      <option value="${e.id}" ${t.category_id===e.id?"selected":""}>
                        ${e.name_en} (${e.name_he})
                      </option>
                    `).join("")}
                  </select>
                `}
              </td>
              <td class="py-3 px-4 text-right font-bold font-mono ${(t.amount??0)<0?"text-rose-400":"text-emerald-400"}">
                ${rt(t.amount)}
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `}function Sf(){const s=kt.filter(i=>i.category_type==="EXPENSE"),t=kt.filter(i=>i.category_type==="INCOME"),e=kt.filter(i=>i.category_type!=="EXPENSE"&&i.category_type!=="INCOME"),n=(i,o)=>o.length===0?"":`
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
                <div class="mt-2 text-xs text-slate-400">Budget: <span class="text-brand-400 font-mono">${rt(a.monthly_budget)}/mo</span></div>
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
          <p class="text-xs text-slate-400 mt-1">${kt.length} categories total</p>
        </div>
        <button id="btn-add-category" class="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-lg shadow-brand-500/20 transition">
          + Add Category
        </button>
      </div>

      ${kt.length===0?`
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
  `}function Cf(){const s=xt.running,t=xt.canceled,e=xt.total,n=xt.processed,i=xt.current_batch,o=xt.total_batches,a=xt.batches||[],r=a.filter(d=>d.status==="pending").length,l=Rt.filter(d=>!d.category_id&&!d.suggested_category_en).length,c=e>0?Math.min(100,Math.round(n/e*100)):0;return`
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

                ${xt.last_error?`
                  <div class="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                    ❌ ${xt.last_error}
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

            <textarea id="autocat-prompt-input" rows="12" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-brand-500 leading-relaxed">${ws}</textarea>

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
                <span class="text-slate-200 font-mono truncate max-w-[180px]">${qt.localai_url||"http://localhost:8080"}</span>
              </div>
              <div class="flex justify-between py-1 border-b border-slate-800">
                <span class="text-slate-400">Model Name</span>
                <span class="text-slate-200 font-mono">${qt.localai_model||"llama-3-8b"}</span>
              </div>
              <div class="flex justify-between py-1 border-b border-slate-800">
                <span class="text-slate-400">Batch Size</span>
                <span class="text-slate-200 font-mono">${qt.localai_batch_size||"5"} tx / batch</span>
              </div>
            </div>
            <button id="btn-nav-settings" class="w-full text-center text-xs text-brand-400 hover:text-brand-300 font-medium py-1 transition">
              ⚙️ Change LLM Settings in Settings Tab →
            </button>
          </div>

        </div>

      </div>
    </div>
  `}function Ef(){return Be?`
    <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div class="glass-panel max-w-3xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto border border-slate-700 shadow-2xl">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 class="text-base font-bold text-white flex items-center gap-2">
            <span>🔍 Batch #${Be.index} Results</span>
            <span class="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-normal">
              ${Be.tx_count} Transactions
            </span>
          </h3>
          <button id="btn-close-batch-modal" class="text-slate-400 hover:text-white text-lg font-bold px-2 py-0.5 rounded hover:bg-slate-800 transition">✕</button>
        </div>

        <div class="space-y-3">
          ${(Be.results||[]).map(s=>{const t=Rt.find(a=>a.id===s.transaction_id),e=s.payee_raw||(t?t.payee_raw:"Transaction Item"),n=s.amount!==void 0?s.amount:t?t.amount:0,i=s.date||(t?t.date:"");let o="";if(s.category_name_en||s.category_name_he){const a=kt.find(l=>l.id===s.category_id);o=`
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand-500/20 text-brand-300 font-semibold border border-brand-500/30">
                  <span class="w-2 h-2 rounded-full inline-block" style="background:${a?a.color_hex:"#3B82F6"}"></span>
                  ${s.category_name_en||s.category_name_he} ${s.category_name_he&&s.category_name_en?`(${s.category_name_he})`:""}
                </span>
              `}else if(s.category_id){const a=kt.find(r=>r.id===s.category_id);a?o=`
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
                  <span class="text-slate-300 font-mono text-xs">${rt(n)} &bull; ${i}</span>
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
  `:""}function Af(){const s=ee,t=s!==null;return`
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
  `}let _t=0,nn="",Ue=null,tt=null,I={date_col:"",payee_col:"",payee_col_2:"",amount_mode:"amount",amount_col:"",debit_col:"",credit_col:"",billing_date_col:"",original_amount_col:"",original_currency_col:"",cutoff_date:""},dt=null,Tt=null;function Pf(){return`
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
        ${[{num:0,label:"0. Account & File"},{num:1,label:"1-2. Columns & Mapping"},{num:3,label:"3. Preview"},{num:4,label:"4. Staging Validation"},{num:5,label:"5. Finish"}].map(t=>{const e=_t===t.num,n=_t>t.num;return`
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
      ${_t===0?`
        <div class="space-y-6">
          ${Ft.length===0?`
            <div class="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
              ⚠️ No accounts registered yet. Please add at least one account in the Accounts tab before importing statements.
            </div>
          `:""}

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Target Account</label>
              <select id="w0-account-id" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500">
                ${Ft.map(t=>`<option value="${t.id}" ${nn===t.id?"selected":""}>${t.name} (${t.institution} - ${t.account_type})</option>`).join("")}
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
      ${_t===1&&tt?`
        <div class="space-y-6">
          <div class="p-4 rounded-lg bg-brand-500/10 border border-brand-500/20 space-y-2">
            <h3 class="text-xs font-bold text-brand-300">Found ${tt.columns.length} columns &amp; ${tt.total_rows} total rows in CSV</h3>
            <div class="flex flex-wrap gap-1.5">
              ${tt.columns.map(t=>`<span class="px-2 py-0.5 rounded-md bg-slate-900 text-slate-200 border border-slate-700 text-[11px] font-mono">${t}</span>`).join("")}
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
                    ${tt.columns.map(t=>`<th class="py-2 px-3 whitespace-nowrap">${t}</th>`).join("")}
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/40">
                  ${tt.sample_rows.map((t,e)=>`
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
                  ${tt.columns.map(t=>`
                    <option value="${t}" ${I.date_col===t?"selected":""}>${t}</option>
                  `).join("")}
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Primary Description / Payee Column *</label>
                <select id="w1-payee-col" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                  ${tt.columns.map(t=>`
                    <option value="${t}" ${I.payee_col===t?"selected":""}>${t}</option>
                  `).join("")}
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Secondary Column (Optional - Concatenated)</label>
                <select id="w1-payee-col-2" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                  <option value="">(None - Single Column)</option>
                  ${tt.columns.map(t=>`
                    <option value="${t}" ${I.payee_col_2===t?"selected":""}>${t}</option>
                  `).join("")}
                </select>
              </div>
            </div>

            <div class="space-y-2">
              <label class="block text-xs font-semibold text-slate-300">Amount Structure</label>
              <div class="flex gap-4">
                <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input type="radio" name="w1-mode" value="amount" ${I.amount_mode==="amount"?"checked":""} id="radio-mode-single" />
                  <span>Single Signed Amount Column (e.g. סכום)</span>
                </label>
                <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input type="radio" name="w1-mode" value="debit_credit" ${I.amount_mode==="debit_credit"?"checked":""} id="radio-mode-split" />
                  <span>Separate Debit &amp; Credit Columns (e.g. חיוב / זיכוי)</span>
                </label>
              </div>
            </div>

            <div id="w1-single-amount-block" class="${I.amount_mode==="amount"?"":"hidden"}">
              <label class="block text-xs font-semibold text-slate-300 mb-1">Amount Column</label>
              <select id="w1-amount-col" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                ${tt.columns.map(t=>`
                  <option value="${t}" ${I.amount_col===t?"selected":""}>${t}</option>
                `).join("")}
              </select>
            </div>

            <div id="w1-split-amount-block" class="grid grid-cols-2 gap-4 ${I.amount_mode==="debit_credit"?"":"hidden"}">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Debit Column (Expense)</label>
                <select id="w1-debit-col" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                  ${tt.columns.map(t=>`
                    <option value="${t}" ${I.debit_col===t?"selected":""}>${t}</option>
                  `).join("")}
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Credit Column (Income)</label>
                <select id="w1-credit-col" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                  ${tt.columns.map(t=>`
                    <option value="${t}" ${I.credit_col===t?"selected":""}>${t}</option>
                  `).join("")}
                </select>
              </div>
            </div>

            <!-- Optional Credit Card & Import Cutoff Mappings -->
            <div class="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-3">
              <h5 class="text-[11px] font-bold text-brand-300 uppercase tracking-wider">Statement Filters &amp; Credit Card Fields (Optional)</h5>
              <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label class="block text-[11px] font-medium text-slate-400 mb-1">Billing Date Column</label>
                  <select id="w1-billing-date-col" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white">
                    <option value="">(None - Default to cycle day)</option>
                    ${tt.columns.map(t=>`
                      <option value="${t}" ${I.billing_date_col===t?"selected":""}>${t}</option>
                    `).join("")}
                  </select>
                </div>
                <div>
                  <label class="block text-[11px] font-medium text-slate-400 mb-1">Original Amount Column</label>
                  <select id="w1-orig-amount-col" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white">
                    <option value="">(None)</option>
                    ${tt.columns.map(t=>`
                      <option value="${t}" ${I.original_amount_col===t?"selected":""}>${t}</option>
                    `).join("")}
                  </select>
                </div>
                <div>
                  <label class="block text-[11px] font-medium text-slate-400 mb-1">Original Currency Column</label>
                  <select id="w1-orig-currency-col" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white">
                    <option value="">(None)</option>
                    ${tt.columns.map(t=>`
                      <option value="${t}" ${I.original_currency_col===t?"selected":""}>${t}</option>
                    `).join("")}
                  </select>
                </div>
                <div>
                  <label class="block text-[11px] font-medium text-slate-400 mb-1">Cutoff Month / Date</label>
                  <input type="text" id="w1-cutoff-date" placeholder="e.g. 2024-06 or YYYY-MM-DD" value="${I.cutoff_date||""}" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500" />
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
      ${_t===3&&dt?`
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-white">Mapping Preview (${dt.passed_count} transactions parsed)</h3>
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
                ${dt.passed_transactions.slice(0,15).map(t=>`
                  <tr class="hover:bg-slate-900/50">
                    <td class="py-2 px-3 text-slate-300 font-mono">${t.date}</td>
                    <td class="py-2 px-3 font-medium text-white">${t.payee_raw}</td>
                    <td class="py-2 px-3 text-slate-400">
                      ${t.current_installment&&t.total_installments?`<span class="bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded text-[11px]">תשלום ${t.current_installment}/${t.total_installments}</span>`:"-"}
                    </td>
                    <td class="py-2 px-3 text-right font-bold font-mono ${t.amount<0?"text-rose-400":"text-emerald-400"}">
                      ${rt(t.amount)}
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
          ${dt.passed_count>15?`<p class="text-xs text-slate-500 text-center">+ ${dt.passed_count-15} more parsed transactions</p>`:""}

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
      ${_t===4&&dt?`
        <div class="space-y-6">
          <div class="grid grid-cols-2 gap-4">
            <div class="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span class="text-xs text-slate-400 uppercase font-semibold">Passed Transactions</span>
              <h3 class="text-2xl font-extrabold text-emerald-400 mt-1">${dt.passed_count}</h3>
              <p class="text-[11px] text-emerald-300/80 mt-1">Ready to be saved to database</p>
            </div>
            <div class="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <span class="text-xs text-slate-400 uppercase font-semibold">Failed / Skipped Rows</span>
              <h3 class="text-2xl font-extrabold text-rose-400 mt-1">${dt.failed_count}</h3>
              <p class="text-[11px] text-rose-300/80 mt-1">Invalid dates, 0 amounts, or formatting errors</p>
            </div>
          </div>

          <!-- Failed Rows Section -->
          ${dt.failed_count>0?`
            <div class="space-y-2">
              <h4 class="text-xs font-bold text-rose-400 flex items-center gap-2">
                <span>⚠️ Failed Rows Breakdown (${dt.failed_count})</span>
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
                    ${dt.failed_rows.map(t=>`
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
            <h4 class="text-xs font-bold text-emerald-400">Approved Transactions to Import (${dt.passed_count})</h4>
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
                  ${dt.passed_transactions.map(t=>`
                    <tr class="hover:bg-slate-900/40">
                      <td class="py-1.5 px-3 text-slate-300 font-mono">${t.date}</td>
                      <td class="py-1.5 px-3 font-medium text-white">${t.payee_raw}</td>
                      <td class="py-1.5 px-3 text-right font-bold font-mono ${t.amount<0?"text-rose-400":"text-emerald-400"}">${rt(t.amount)}</td>
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
              <span>Approve &amp; Import ${dt.passed_count} Transactions 🚀</span>
            </button>
          </div>
        </div>
      `:""}

      <!-- STEP 5: Finished -->
      ${_t===5&&Tt?`
        <div class="text-center py-8 space-y-6">
          <div class="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-3xl mx-auto text-emerald-400">
            ✓
          </div>
          <div>
            <h3 class="text-2xl font-extrabold text-white">Import Complete!</h3>
            <p class="text-xs text-slate-400 mt-2">
              Successfully added <span class="text-emerald-400 font-bold">${Tt.imported}</span> transactions to the database.
              ${Tt.duplicates>0?`<span class="text-amber-400 font-bold">(${Tt.duplicates} duplicate records skipped)</span>`:""}
            </p>
          </div>

          ${Tt.duplicate_records&&Tt.duplicate_records.length>0?`
            <div class="mt-4 text-left bg-slate-900/80 rounded-xl p-4 border border-amber-500/30 max-w-3xl mx-auto space-y-3 shadow-lg">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <span>⚠️ Skipped Duplicate Records (${Tt.duplicate_records.length})</span>
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
                    ${Tt.duplicate_records.map(t=>`
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
  `}function Df(){return`
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
              ${Ft.filter(t=>t.account_type==="CREDIT_CARD").map(t=>`<option value="${t.id}" ${pn===t.id?"selected":""}>${t.name}</option>`).join("")}
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-semibold text-slate-400 mb-0.5">Status Filter</label>
            <select id="cycle-status-filter" class="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white">
              <option value="">All Statuses</option>
              <option value="OPEN" ${Re==="OPEN"?"selected":""}>OPEN</option>
              <option value="BILLED" ${Re==="BILLED"?"selected":""}>BILLED</option>
              <option value="PAID" ${Re==="PAID"?"selected":""}>PAID</option>
              <option value="PARTIAL" ${Re==="PARTIAL"?"selected":""}>PARTIAL</option>
            </select>
          </div>
        </div>

        <div class="text-xs text-slate-400">
          Showing <span class="font-bold text-white">${sn.length}</span> billing cycles
        </div>
      </div>

      <!-- Cycles Table -->
      <div class="glass-panel overflow-hidden">
        ${sn.length===0?`
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
                ${sn.map(t=>{let e="";return t.status==="PAID"?e='<span class="px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">✓ PAID</span>':t.status==="PARTIAL"?e='<span class="px-2 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold">⚠ PARTIAL</span>':t.status==="BILLED"?e='<span class="px-2 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[10px] font-bold">BILLED</span>':e='<span class="px-2 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-medium">OPEN</span>',`
                    <tr class="hover:bg-slate-900/50 transition">
                      <td class="py-3 px-4 font-bold text-white">${t.account_name||t.account_id}</td>
                      <td class="py-3 px-4 text-slate-400 font-mono">Day ${t.billing_day}</td>
                      <td class="py-3 px-4 text-slate-300 font-mono">${t.cycle_start_date} → ${t.cycle_end_date}</td>
                      <td class="py-3 px-4 text-slate-300 font-mono">${t.expected_bill_date}</td>
                      <td class="py-3 px-4 text-right font-bold font-mono text-rose-400">${rt(t.expected_amount)}</td>
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

    ${ms?Tf():""}
    ${fe?Lf():""}
  `}function Tf(){const s=Ft.filter(n=>n.account_type==="CREDIT_CARD"),t=new Date,e=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}`;return`
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
  `}function Lf(){if(!fe)return"";const{billing_cycle:s,transactions:t}=fe;return`
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
            <div class="text-2xl font-extrabold text-rose-400 font-mono">${rt(s.expected_amount)}</div>
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
                    <td class="py-2 px-3 text-right font-bold font-mono text-rose-400">${rt(e.amount)}</td>
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

          ${ue.length>0?`
            <div class="space-y-2">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                ${ue.map(e=>`
                  <div class="p-3 rounded-lg border cursor-pointer transition ${zt===e.id?"border-brand-500 bg-brand-500/10":"border-slate-800 bg-slate-900/40 hover:border-slate-700"} candidate-card" data-txid="${e.id}">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-bold text-white truncate max-w-[160px]">${e.payee_raw}</span>
                      <span class="text-xs font-bold text-rose-400 font-mono">${rt(e.amount)}</span>
                    </div>
                    <div class="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                      <span>${e.date} &bull; ${e.account_name||"Bank"}</span>
                      <span class="text-amber-400 font-mono font-semibold">Diff: ${rt(Math.abs(Math.abs(e.amount)-Math.abs(s.expected_amount)))}</span>
                    </div>
                  </div>
                `).join("")}
              </div>

              <div class="flex justify-end pt-2">
                <button id="btn-reconcile-cycle-submit" data-id="${s.id}" ${zt?"":"disabled"} class="px-4 py-2 rounded-lg text-xs font-bold transition ${zt?"bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/20":"bg-slate-800 text-slate-500 cursor-not-allowed"}">
                  🔗 Link Selected Bank Payment
                </button>
              </div>
            </div>
          `:""}
        </div>
      </div>
    </div>
  `}function If(){var e;const s=qt.localai_model||"llama-3-8b",t=qt.localai_batch_size||"5";return`
    <div class="max-w-2xl mx-auto glass-panel p-8 space-y-6">
      <h2 class="text-2xl font-bold text-white">Application &amp; LocalAI Settings</h2>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-slate-300 mb-1">LocalAI Endpoint URL</label>
          <input type="text" id="setting-localai-url" value="${qt.localai_url||"http://localhost:8080"}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
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
          <input type="password" id="setting-localai-key" value="${qt.localai_api_key||""}" placeholder="Leave blank if not required" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500" />
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
        <p>OIDC Enabled: <span class="text-white">${ht!=null&&ht.oidc_enabled?"Yes":"No (Dev Mode)"}</span></p>
        <p>Logged in as: <span class="text-white">${((e=ht==null?void 0:ht.user)==null?void 0:e.name)||"Local Admin"}</span></p>
      </div>
    </div>
  `}function $f(){var g,m,b,v,M,k,w,E,P,D,$,R,F,z,ct,yt,W,X,Z,At,ut,Kt,Ee,Jt,ae,Ht,re,Yt,Si,Ci,Ei,Ai,Pi,Di,Ti,Li,Ii,$i,Oi,Bi,Ri,Fi,zi,ji,Ni,Vi,Wi,Hi,Yi,Ui,Xi,qi,Gi,Ki,Ji,Zi,Qi,to,eo,so,no,io,oo,ao,ro,lo,co,ho,uo,fo,po,go,mo,bo,xo,yo,vo,_o,wo,ko,Mo,So,Co,Eo,Ao,Po,Do,To,Lo;document.querySelectorAll(".nav-tab").forEach(x=>{x.addEventListener("click",y=>{const _=y.currentTarget.getAttribute("data-tab");_&&(Et=_,A())})});const s=()=>{Q=null,ps=!0,A()},t=()=>{Q=null,ps=!1,A()};(g=document.getElementById("btn-add-account"))==null||g.addEventListener("click",s),(m=document.getElementById("btn-add-account-empty"))==null||m.addEventListener("click",s),(b=document.getElementById("btn-close-modal"))==null||b.addEventListener("click",t),(v=document.getElementById("btn-cancel-modal"))==null||v.addEventListener("click",t),(M=document.getElementById("acc-type"))==null||M.addEventListener("change",x=>{const y=x.target.value,_=document.getElementById("acc-cc-billing-block");_&&(y==="CREDIT_CARD"?_.classList.remove("hidden"):_.classList.add("hidden"))}),document.querySelectorAll(".btn-edit-account").forEach(x=>{x.addEventListener("click",y=>{const _=y.currentTarget.getAttribute("data-id"),S=Ft.find(O=>O.id===_);S&&(Q=S,ps=!0,A())})});const e=document.getElementById("form-account");e&&e.addEventListener("submit",async x=>{var S,O;x.preventDefault();const y=document.getElementById("modal-error-msg"),_=document.getElementById("btn-save-account");y&&(y.classList.add("hidden"),y.textContent=""),_&&(_.disabled=!0,_.textContent="Saving...");try{const Y=document.getElementById("acc-name").value,H=document.getElementById("acc-type").value,it=document.getElementById("acc-institution").value,ft=document.getElementById("acc-currency").value,mt=parseFloat(document.getElementById("acc-balance").value)||0,It=H==="CREDIT_CARD"?parseInt((S=document.getElementById("acc-billing-primary"))==null?void 0:S.value)||10:null,K=H==="CREDIT_CARD"&&((O=document.getElementById("acc-billing-secondary"))!=null&&O.value)&&parseInt(document.getElementById("acc-billing-secondary").value)||null,Ct=!!Q,le=Ct?`/api/v1/accounts/${Q.id}`:"/api/v1/accounts",es=await fetch(le,{method:Ct?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:Y,account_type:H,institution:it,currency:ft,opening_balance:mt,billing_day_primary:It,billing_day_secondary:K})});if(es.ok)ps=!1,Q=null,await q(),A(),T(Ct?"Account updated successfully":"Account created successfully","success");else{const el=(await es.json().catch(()=>({}))).error||es.statusText||"Failed to save account";y&&(y.textContent=el,y.classList.remove("hidden"))}}catch(Y){if(document.getElementById("modal-error-msg")){const H=document.getElementById("modal-error-msg");H.textContent=`Network error: ${Y.message||Y}`,H.classList.remove("hidden")}}finally{_&&(_.disabled=!1,_.textContent=Q?"Update Account":"Save Account")}}),document.querySelectorAll(".btn-delete-account").forEach(x=>{x.addEventListener("click",async y=>{const _=y.currentTarget.getAttribute("data-id");if(!_||!confirm("Delete this account? This will NOT delete its transactions."))return;(await fetch(`/api/v1/accounts/${_}`,{method:"DELETE"})).ok?(await q(),A(),T("Account deleted","success")):T("Failed to delete account","error")})});const n=()=>{gs=!0,ee=null,A()},i=()=>{gs=!1,ee=null,A()};(k=document.getElementById("btn-add-category"))==null||k.addEventListener("click",n),(w=document.getElementById("btn-add-category-empty"))==null||w.addEventListener("click",n),(E=document.getElementById("btn-close-cat-modal"))==null||E.addEventListener("click",i),(P=document.getElementById("btn-cancel-cat-modal"))==null||P.addEventListener("click",i),document.querySelectorAll(".btn-edit-cat").forEach(x=>{x.addEventListener("click",y=>{const _=y.currentTarget.getAttribute("data-id"),S=kt.find(O=>O.id===_);S&&(ee=S,gs=!1,A())})}),document.querySelectorAll(".btn-delete-cat").forEach(x=>{x.addEventListener("click",async y=>{const _=y.currentTarget.getAttribute("data-id");if(!_||!confirm("Delete this category? Transactions linked to it will become Uncategorized."))return;(await fetch(`/api/v1/categories/${_}`,{method:"DELETE"})).ok?(await q(),A(),T("Category deleted","success")):T("Failed to delete category","error")})});const o=document.getElementById("form-category");o&&o.addEventListener("submit",async x=>{x.preventDefault();const y=document.getElementById("cat-modal-error"),_=document.getElementById("btn-save-category");y&&(y.classList.add("hidden"),y.textContent=""),_&&(_.disabled=!0,_.textContent="Saving...");try{const S=document.getElementById("cat-name-en").value.trim(),O=document.getElementById("cat-name-he").value.trim(),Y=document.getElementById("cat-type").value,H=document.getElementById("cat-color").value,it=document.getElementById("cat-icon").value.trim()||"tag",ft=document.getElementById("cat-budget").value,mt=ft?parseFloat(ft):null;if(!S){y&&(y.textContent="English name is required",y.classList.remove("hidden"));return}const It={name_en:S,name_he:O||S,category_type:Y,color_hex:H,icon:it,monthly_budget:mt},K=ee!==null,Ct=K?`/api/v1/categories/${ee.id}`:"/api/v1/categories",wn=await fetch(Ct,{method:K?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(It)});if(wn.ok)gs=!1,ee=null,await q(),A(),T(K?"Category updated":"Category created","success");else{const es=await wn.json().catch(()=>({}));y&&(y.textContent=es.error||"Save failed",y.classList.remove("hidden"))}}finally{_&&(_.disabled=!1,_.textContent=ee?"Update Category":"Create Category")}}),(D=document.getElementById("btn-reset-wizard"))==null||D.addEventListener("click",()=>{_t=0,Ue=null,tt=null,dt=null,Tt=null,A()}),($=document.getElementById("btn-w0-next"))==null||$.addEventListener("click",async()=>{var O;const x=document.getElementById("w0-account-id"),y=document.getElementById("w0-file");if(!(x!=null&&x.value)){T("Please select a target account","error");return}const _=((O=y==null?void 0:y.files)==null?void 0:O[0])||Ue;if(!_){T("Please select a CSV file to inspect","error");return}nn=x.value,Ue=_;const S=document.getElementById("btn-w0-next");S&&(S.disabled=!0,S.innerText="⏳ Inspecting CSV...");try{const Y=new FormData;Y.append("file",_);const H=await fetch("/api/v1/import/inspect",{method:"POST",body:Y});if(H.ok){tt=await H.json();const it=(tt==null?void 0:tt.columns)||[],ft=K=>it.find(Ct=>K.some(le=>Ct.toLowerCase().includes(le)))||it[0]||"",mt=K=>it.find(Ct=>K.some(le=>Ct.toLowerCase().includes(le)))||"";I.date_col=ft(["תאריך","date"]);const It=it.filter(K=>["תיאור","payee","merchant","name","פרטים","description","extended","הרחבה","פירוט"].some(Ct=>K.toLowerCase().includes(Ct)));I.payee_col=It[0]||ft(["תיאור","payee","merchant","name","פרטים"]),I.payee_col_2=It.length>1?It[1]:"",I.amount_col=ft(["סכום","amount","total"]),I.debit_col=ft(["חיוב","debit"]),I.credit_col=ft(["זיכוי","credit"]),I.billing_date_col=mt(["תאריך חיוב","billing_date","billing date","chiyuv"]),I.original_amount_col=mt(["סכום מקורי","original_amount","original amount","mekori"]),I.original_currency_col=mt(["מטבע מקורי","original_currency","original currency","matbea"]),_t=1,A(),T(`Identified ${it.length} columns & ${tt==null?void 0:tt.total_rows} rows`,"success")}else{const it=await H.json().catch(()=>({}));T(it.error||"Failed to inspect CSV file","error")}}catch{T("Network error inspecting CSV file","error")}finally{S&&(S.disabled=!1,S.innerText="Step 1: Inspect Columns & Load Preview →")}}),(R=document.getElementById("radio-mode-single"))==null||R.addEventListener("change",()=>{var x,y;I.amount_mode="amount",(x=document.getElementById("w1-single-amount-block"))==null||x.classList.remove("hidden"),(y=document.getElementById("w1-split-amount-block"))==null||y.classList.add("hidden")}),(F=document.getElementById("radio-mode-split"))==null||F.addEventListener("change",()=>{var x,y;I.amount_mode="debit_credit",(x=document.getElementById("w1-single-amount-block"))==null||x.classList.add("hidden"),(y=document.getElementById("w1-split-amount-block"))==null||y.classList.remove("hidden")}),(z=document.getElementById("btn-w1-back"))==null||z.addEventListener("click",()=>{_t=0,A()}),(ct=document.getElementById("btn-w1-next"))==null||ct.addEventListener("click",async()=>{var y,_,S,O,Y,H,it,ft,mt,It;if(!Ue||!nn)return;I.date_col=((y=document.getElementById("w1-date-col"))==null?void 0:y.value)||I.date_col,I.payee_col=((_=document.getElementById("w1-payee-col"))==null?void 0:_.value)||I.payee_col,I.payee_col_2=((S=document.getElementById("w1-payee-col-2"))==null?void 0:S.value)||"",I.amount_mode==="amount"?I.amount_col=((O=document.getElementById("w1-amount-col"))==null?void 0:O.value)||I.amount_col:(I.debit_col=((Y=document.getElementById("w1-debit-col"))==null?void 0:Y.value)||I.debit_col,I.credit_col=((H=document.getElementById("w1-credit-col"))==null?void 0:H.value)||I.credit_col),I.billing_date_col=((it=document.getElementById("w1-billing-date-col"))==null?void 0:it.value)||"",I.original_amount_col=((ft=document.getElementById("w1-orig-amount-col"))==null?void 0:ft.value)||"",I.original_currency_col=((mt=document.getElementById("w1-orig-currency-col"))==null?void 0:mt.value)||"",I.cutoff_date=((It=document.getElementById("w1-cutoff-date"))==null?void 0:It.value.trim())||"";const x=document.getElementById("btn-w1-next");x&&(x.disabled=!0,x.innerText="⏳ Parsing Preview...");try{const K=new FormData;K.append("file",Ue),K.append("account_id",nn),K.append("date_column",I.date_col),K.append("payee_column",I.payee_col),I.payee_col_2&&K.append("payee_column_2",I.payee_col_2),I.amount_mode==="amount"?K.append("amount_column",I.amount_col):(K.append("debit_column",I.debit_col),K.append("credit_column",I.credit_col)),I.billing_date_col&&K.append("billing_date_column",I.billing_date_col),I.original_amount_col&&K.append("original_amount_column",I.original_amount_col),I.original_currency_col&&K.append("original_currency_column",I.original_currency_col),I.cutoff_date&&K.append("cutoff_date",I.cutoff_date);const Ct=await fetch("/api/v1/import/stage",{method:"POST",body:K});if(Ct.ok)dt=await Ct.json(),_t=3,A();else{const le=await Ct.json().catch(()=>({}));T(le.error||"Failed to parse CSV preview","error")}}catch{T("Network error generating preview","error")}finally{x&&(x.disabled=!1,x.innerText="Step 3: Preview Transactions Mapping →")}}),(yt=document.getElementById("btn-w3-back"))==null||yt.addEventListener("click",()=>{_t=1,A()}),(W=document.getElementById("btn-w3-next"))==null||W.addEventListener("click",()=>{_t=4,A()}),(X=document.getElementById("btn-w4-back"))==null||X.addEventListener("click",()=>{_t=1,A()}),(Z=document.getElementById("btn-w4-commit"))==null||Z.addEventListener("click",async()=>{if(!dt||dt.passed_transactions.length===0){T("No valid transactions to commit","error");return}const x=document.getElementById("btn-w4-commit");x&&(x.disabled=!0,x.innerText="⏳ Saving to Database...");try{const y=await fetch("/api/v1/import/commit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({transactions:dt.passed_transactions})});if(y.ok)Tt=await y.json(),_t=5,await q(),A(),T(`Successfully imported ${Tt==null?void 0:Tt.imported} transactions`,"success");else{const _=await y.json().catch(()=>({}));T(_.error||"Failed to commit import to database","error")}}catch{T("Network error committing import","error")}finally{x&&(x.disabled=!1)}}),(At=document.getElementById("btn-w5-view-txs"))==null||At.addEventListener("click",()=>{Et="transactions",A()}),(ut=document.getElementById("btn-w5-again"))==null||ut.addEventListener("click",()=>{_t=0,Ue=null,tt=null,dt=null,Tt=null,A()}),(Kt=document.getElementById("cycle-account-filter"))==null||Kt.addEventListener("change",async x=>{pn=x.currentTarget.value,await he(),A()}),(Ee=document.getElementById("cycle-status-filter"))==null||Ee.addEventListener("change",async x=>{Re=x.currentTarget.value,await he(),A()}),(Jt=document.getElementById("btn-open-generate-modal"))==null||Jt.addEventListener("click",()=>{ms=!0,A()}),(ae=document.getElementById("btn-close-generate-modal"))==null||ae.addEventListener("click",()=>{ms=!1,A()}),(Ht=document.getElementById("btn-cancel-generate-modal"))==null||Ht.addEventListener("click",()=>{ms=!1,A()}),(re=document.getElementById("form-generate-cycles"))==null||re.addEventListener("submit",async x=>{x.preventDefault();const y=document.getElementById("gen-account-id").value,_=document.getElementById("gen-from-month").value,S=document.getElementById("gen-to-month").value,O=document.getElementById("btn-submit-generate");O&&(O.disabled=!0,O.innerText="Generating...");try{const Y=await fetch("/api/v1/billing-cycles/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({account_id:y,from_month:_,to_month:S})});if(Y.ok)ms=!1,await he(),A(),T("Billing cycles generated successfully","success");else{const H=await Y.json().catch(()=>({}));T(H.error||"Failed to generate cycles","error")}}catch{T("Network error generating cycles","error")}finally{O&&(O.disabled=!1)}}),document.querySelectorAll(".btn-view-cycle").forEach(x=>{x.addEventListener("click",async y=>{const _=y.currentTarget.getAttribute("data-id");if(_)try{const S=await fetch(`/api/v1/billing-cycles/${_}`);S.ok?(fe=await S.json(),ue=[],zt="",A()):T("Failed to load cycle detail","error")}catch{T("Network error loading cycle detail","error")}})}),(Yt=document.getElementById("btn-close-cycle-detail"))==null||Yt.addEventListener("click",()=>{fe=null,ue=[],zt="",A()}),(Si=document.getElementById("btn-auto-populate-cycle"))==null||Si.addEventListener("click",async x=>{const y=x.currentTarget.getAttribute("data-id");if(y)try{const _=await fetch(`/api/v1/billing-cycles/${y}/auto-populate`,{method:"POST"});if(_.ok){const S=await _.json();T(`Auto-assigned ${S.assigned_count} transactions`,"success");const O=await fetch(`/api/v1/billing-cycles/${y}`);O.ok&&(fe=await O.json()),await he(),A()}else{const S=await _.json().catch(()=>({}));T(S.error||"Auto-populate failed","error")}}catch{T("Network error auto-populating cycle","error")}}),(Ci=document.getElementById("btn-find-bank-candidates"))==null||Ci.addEventListener("click",async x=>{const y=x.currentTarget.getAttribute("data-id");if(y)try{const _=await fetch(`/api/v1/billing-cycles/${y}/bank-candidates`);_.ok?(ue=await _.json()||[],zt="",ue.length===0&&T("No bank payment candidates found within ±10 days","info"),A()):T("Failed to find bank payment candidates","error")}catch{T("Network error searching bank candidates","error")}}),document.querySelectorAll(".candidate-card").forEach(x=>{x.addEventListener("click",y=>{const _=y.currentTarget.getAttribute("data-txid");_&&(zt=_,A())})}),(Ei=document.getElementById("btn-reconcile-cycle-submit"))==null||Ei.addEventListener("click",async x=>{const y=x.currentTarget.getAttribute("data-id");if(!(!y||!zt))try{const _=await fetch(`/api/v1/billing-cycles/${y}/reconcile`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bank_transaction_id:zt})});if(_.ok)T("Cycle reconciled with bank payment!","success"),fe=null,ue=[],zt="",await he(),await q(),A();else{const S=await _.json().catch(()=>({}));T(S.error||"Reconciliation failed","error")}}catch{T("Network error reconciling cycle","error")}}),document.querySelectorAll(".btn-reconcile-cycle").forEach(x=>{x.addEventListener("click",async y=>{const _=y.currentTarget.getAttribute("data-id");if(_)try{const S=await fetch(`/api/v1/billing-cycles/${_}`);if(S.ok){fe=await S.json();const O=await fetch(`/api/v1/billing-cycles/${_}/bank-candidates`);O.ok&&(ue=await O.json()||[]),zt="",A()}}catch{T("Network error loading cycle","error")}})}),document.querySelectorAll(".btn-unlink-cycle").forEach(x=>{x.addEventListener("click",async y=>{const _=y.currentTarget.getAttribute("data-id");if(_&&confirm("Unlink this bank payment from the billing cycle?"))try{(await fetch(`/api/v1/billing-cycles/${_}/unlink`,{method:"POST"})).ok?(T("Billing cycle unlinked","success"),await he(),await q(),A()):T("Failed to unlink cycle","error")}catch{T("Network error unlinking cycle","error")}})}),document.querySelectorAll(".btn-delete-cycle").forEach(x=>{x.addEventListener("click",async y=>{const _=y.currentTarget.getAttribute("data-id");if(_&&confirm("Delete this billing cycle?"))try{(await fetch(`/api/v1/billing-cycles/${_}`,{method:"DELETE"})).ok?(T("Billing cycle deleted","success"),await he(),A()):T("Failed to delete cycle","error")}catch{T("Network error deleting cycle","error")}})}),(Ai=document.getElementById("btn-fetch-models"))==null||Ai.addEventListener("click",async()=>{var H,it;const x=document.getElementById("btn-fetch-models"),y=(H=document.getElementById("setting-localai-url"))==null?void 0:H.value,_=(it=document.getElementById("setting-localai-key"))==null?void 0:it.value,S=document.getElementById("setting-localai-model-select"),O=document.getElementById("setting-localai-model"),Y=x.innerHTML;x.innerHTML="⏳ Fetching models...",x.disabled=!0;try{const ft=await fetch("/api/v1/categorize/localai/models",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({localai_url:y,localai_api_key:_})}),mt=await ft.json();ft.ok&&mt.models&&Array.isArray(mt.models)&&mt.models.length>0?(S&&(S.innerHTML=mt.models.map(It=>`<option value="${It}">${It}</option>`).join(""),O&&(O.value=mt.models[0])),T(`Fetched ${mt.models.length} available model(s)`,"success")):T(`Could not fetch models: ${mt.error||"No models returned"}`,"error")}catch{T("Network error fetching models from server","error")}finally{x.innerHTML=Y,x.disabled=!1}}),(Pi=document.getElementById("setting-localai-model-select"))==null||Pi.addEventListener("change",x=>{const y=x.target.value,_=document.getElementById("setting-localai-model");_&&(_.value=y)}),(Di=document.getElementById("btn-save-settings"))==null||Di.addEventListener("click",async()=>{const x=document.getElementById("setting-localai-url").value,y=document.getElementById("setting-localai-model").value,_=document.getElementById("setting-localai-key").value,S=document.getElementById("setting-localai-batch-size").value||"5";(await fetch("/api/v1/settings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({localai_url:x,localai_model:y,localai_api_key:_,localai_batch_size:S})})).ok?(qt={...qt,localai_url:x,localai_model:y,localai_api_key:_,localai_batch_size:S},T("Settings saved successfully","success"),A()):T("Failed to save settings","error")}),(Ti=document.getElementById("btn-test-localai"))==null||Ti.addEventListener("click",async()=>{var O,Y,H;const x=document.getElementById("btn-test-localai"),y=(O=document.getElementById("setting-localai-url"))==null?void 0:O.value,_=(Y=document.getElementById("setting-localai-model"))==null?void 0:Y.value,S=(H=document.getElementById("setting-localai-key"))==null?void 0:H.value;x.innerHTML="⏳ Testing connection...",x.disabled=!0;try{const it=await fetch("/api/v1/categorize/localai/test",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({localai_url:y,localai_model:_,localai_api_key:S})}),ft=await it.json();it.ok?T(ft.message||"Connection successful!","success"):T(`LocalAI Test Error: ${ft.error||it.statusText}`,"error")}catch{T("Network error testing LocalAI connection","error")}finally{x.innerHTML="🔌 Test LocalAI Connection",x.disabled=!1}});const a=async()=>{try{const x=await fetch("/api/v1/categorize/status");if(!x.ok)return;const y=await x.json(),_=xt.running;xt=y,y.running?Et==="autocat"&&A():(rs&&(clearInterval(rs),rs=null),_&&(y.canceled?T("Categorization run canceled by user","info"):y.last_error?T(`Categorization run stopped: ${y.last_error}`,"error"):y.total>0&&T(`Finished categorizing ${y.processed} transactions!`,"success"),await q(),A()))}catch{}};(Li=document.getElementById("btn-trigger-ai"))==null||Li.addEventListener("click",()=>{Et="autocat",A()}),(Ii=document.getElementById("btn-start-autocat"))==null||Ii.addEventListener("click",async()=>{try{const x=await fetch("/api/v1/categorize/start",{method:"POST"}),y=await x.json().catch(()=>({}));x.ok||x.status===202?(xt=y,y.total===0?T("No uncategorized transactions to process","info"):(T(`Auto-categorization started (${y.total} transactions across ${y.total_batches} batches)`,"info"),rs||(rs=setInterval(a,2e3))),A()):T(`Failed to start categorization: ${y.error||x.statusText}`,"error")}catch(x){T(`Error starting categorization: ${x.message||x}`,"error")}}),($i=document.getElementById("btn-cancel-autocat"))==null||$i.addEventListener("click",async()=>{try{const x=await fetch("/api/v1/categorize/cancel",{method:"POST"});x.ok&&(xt=await x.json(),T("Categorization run cancel signal sent","info"),A())}catch(x){T(`Error canceling categorization: ${x.message||x}`,"error")}}),(Oi=document.getElementById("btn-save-prompt"))==null||Oi.addEventListener("click",async()=>{const x=document.getElementById("autocat-prompt-input");if(!x)return;const y=x.value;try{(await fetch("/api/v1/categorize/prompt",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:y})})).ok?(ws=y,T("System prompt parameters saved","success")):T("Failed to save prompt parameters","error")}catch{T("Error saving prompt parameters","error")}}),(Bi=document.getElementById("btn-reset-prompt"))==null||Bi.addEventListener("click",async()=>{try{const x=await fetch("/api/v1/categorize/prompt/reset",{method:"POST"});if(x.ok){ws=(await x.json()).prompt||Qr;const _=document.getElementById("autocat-prompt-input");_&&(_.value=ws),T("System prompt reset to default","info")}}catch{T("Error resetting prompt","error")}}),document.querySelectorAll(".btn-view-batch-results").forEach(x=>{x.addEventListener("click",y=>{const _=y.currentTarget.getAttribute("data-batch-idx");if(_!==null&&xt.batches){const S=parseInt(_,10);S>=0&&S<xt.batches.length&&(Be=xt.batches[S],A())}})}),(Ri=document.getElementById("btn-close-batch-modal"))==null||Ri.addEventListener("click",()=>{Be=null,A()}),(Fi=document.getElementById("btn-nav-settings"))==null||Fi.addEventListener("click",()=>{Et="settings",A()}),document.querySelectorAll(".btn-accept-suggestion").forEach(x=>{x.addEventListener("click",async y=>{const _=y.currentTarget.getAttribute("data-txid");if(!_)return;(await fetch("/api/v1/categories/accept-suggestion",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({transaction_id:_})})).ok?(await q(),A(),T("Category suggestion accepted","success")):T("Failed to accept suggestion","error")})}),document.querySelectorAll(".btn-reject-suggestion").forEach(x=>{x.addEventListener("click",async y=>{const _=y.currentTarget.getAttribute("data-txid");if(!_)return;(await fetch("/api/v1/categories/reject-suggestion",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({transaction_id:_})})).ok?(await q(),A(),T("Category suggestion rejected","info")):T("Failed to reject suggestion","error")})}),document.querySelectorAll(".tx-cat-select").forEach(x=>{x.addEventListener("change",async y=>{const _=y.currentTarget,S=_.getAttribute("data-txid"),O=_.value||null;if(!S)return;(await fetch(`/api/v1/transactions/${S}/category`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({category_id:O,categorized_by:O?"MANUAL":"UNSET",is_reviewed:!!O})})).ok?(await q(),A(),T(O?"Category updated":"Category cleared","success")):T("Failed to update category","error")})}),(zi=document.getElementById("widget-acc-cashflow"))==null||zi.addEventListener("change",async x=>{L.cashflowAcc=x.target.value,await q(),A()});const r=async()=>{const x=document.getElementById("widget-cashflow-from"),y=document.getElementById("widget-cashflow-to");if(!x||!y)return;const _=x.value,S=y.value;_&&S&&(_!==L.cashflowFromMonth||S!==L.cashflowToMonth)&&(L.cashflowFromMonth=_,L.cashflowToMonth=S,await q(),A())};(ji=document.getElementById("widget-cashflow-from"))==null||ji.addEventListener("change",r),(Ni=document.getElementById("widget-cashflow-from"))==null||Ni.addEventListener("input",r),(Vi=document.getElementById("widget-cashflow-to"))==null||Vi.addEventListener("change",r),(Wi=document.getElementById("widget-cashflow-to"))==null||Wi.addEventListener("input",r);const l=async x=>{const y=new Date,_=y.getFullYear(),S=String(y.getMonth()+1).padStart(2,"0");L.cashflowToMonth=`${_}-${S}`;const O=new Date(y.getFullYear(),y.getMonth()-(x-1),1),Y=O.getFullYear(),H=String(O.getMonth()+1).padStart(2,"0");L.cashflowFromMonth=`${Y}-${H}`,await q(),A()};(Hi=document.getElementById("btn-cashflow-preset-3m"))==null||Hi.addEventListener("click",()=>l(3)),(Yi=document.getElementById("btn-cashflow-preset-6m"))==null||Yi.addEventListener("click",()=>l(6)),(Ui=document.getElementById("btn-cashflow-preset-12m"))==null||Ui.addEventListener("click",()=>l(12)),(Xi=document.getElementById("widget-acc-donut"))==null||Xi.addEventListener("change",async x=>{L.donutAcc=x.target.value,await q(),A()});const c=async()=>{const x=document.getElementById("widget-donut-from"),y=document.getElementById("widget-donut-to");if(!x||!y)return;const _=x.value,S=y.value;_&&S&&(_!==L.donutFromMonth||S!==L.donutToMonth)&&(L.donutFromMonth=_,L.donutToMonth=S,await q(),A())};(qi=document.getElementById("widget-donut-from"))==null||qi.addEventListener("change",c),(Gi=document.getElementById("widget-donut-from"))==null||Gi.addEventListener("input",c),(Ki=document.getElementById("widget-donut-to"))==null||Ki.addEventListener("change",c),(Ji=document.getElementById("widget-donut-to"))==null||Ji.addEventListener("input",c);const d=async x=>{const y=new Date,_=y.getFullYear(),S=String(y.getMonth()+1).padStart(2,"0");L.donutToMonth=`${_}-${S}`;const O=new Date(y.getFullYear(),y.getMonth()-(x-1),1),Y=O.getFullYear(),H=String(O.getMonth()+1).padStart(2,"0");L.donutFromMonth=`${Y}-${H}`,await q(),A()};(Zi=document.getElementById("btn-donut-preset-3m"))==null||Zi.addEventListener("click",()=>d(3)),(Qi=document.getElementById("btn-donut-preset-6m"))==null||Qi.addEventListener("click",()=>d(6)),(to=document.getElementById("btn-donut-preset-12m"))==null||to.addEventListener("click",()=>d(12));const h=async()=>{const x=document.getElementById("widget-networth-from"),y=document.getElementById("widget-networth-to");if(!x||!y)return;const _=x.value,S=y.value;_&&S&&(_!==L.networthFromMonth||S!==L.networthToMonth)&&(L.networthFromMonth=_,L.networthToMonth=S,await q(),A())};(eo=document.getElementById("widget-networth-from"))==null||eo.addEventListener("change",h),(so=document.getElementById("widget-networth-from"))==null||so.addEventListener("input",h),(no=document.getElementById("widget-networth-to"))==null||no.addEventListener("change",h),(io=document.getElementById("widget-networth-to"))==null||io.addEventListener("input",h);const u=async x=>{const y=new Date,_=y.getFullYear(),S=String(y.getMonth()+1).padStart(2,"0");L.networthToMonth=`${_}-${S}`;const O=new Date(y.getFullYear(),y.getMonth()-(x-1),1),Y=O.getFullYear(),H=String(O.getMonth()+1).padStart(2,"0");L.networthFromMonth=`${Y}-${H}`,await q(),A()};(oo=document.getElementById("btn-networth-preset-3m"))==null||oo.addEventListener("click",()=>u(3)),(ao=document.getElementById("btn-networth-preset-6m"))==null||ao.addEventListener("click",()=>u(6)),(ro=document.getElementById("btn-networth-preset-12m"))==null||ro.addEventListener("click",()=>u(12)),(lo=document.getElementById("widget-acc-payoff"))==null||lo.addEventListener("change",async x=>{L.payoffAcc=x.target.value,await q(),A()}),(co=document.getElementById("widget-acc-budget"))==null||co.addEventListener("change",async x=>{L.budgetAcc=x.target.value,await q(),A()}),(ho=document.getElementById("widget-acc-subscriptions"))==null||ho.addEventListener("change",async x=>{L.subscriptionsAcc=x.target.value,await q(),A()}),(uo=document.getElementById("widget-acc-mom"))==null||uo.addEventListener("change",async x=>{L.momAcc=x.target.value,await q(),A()});const f=async()=>{const x=document.getElementById("widget-mom-from"),y=document.getElementById("widget-mom-to");if(!x||!y)return;const _=x.value,S=y.value;_&&S&&(_!==L.momFromMonth||S!==L.momToMonth)&&(L.momFromMonth=_,L.momToMonth=S,await q(),A())};(fo=document.getElementById("widget-mom-from"))==null||fo.addEventListener("change",f),(po=document.getElementById("widget-mom-from"))==null||po.addEventListener("input",f),(go=document.getElementById("widget-mom-to"))==null||go.addEventListener("change",f),(mo=document.getElementById("widget-mom-to"))==null||mo.addEventListener("input",f);const p=async x=>{const y=new Date,_=y.getFullYear(),S=String(y.getMonth()+1).padStart(2,"0");L.momToMonth=`${_}-${S}`;const O=new Date(y.getFullYear(),y.getMonth()-(x-1),1),Y=O.getFullYear(),H=String(O.getMonth()+1).padStart(2,"0");L.momFromMonth=`${Y}-${H}`,await q(),A()};(bo=document.getElementById("btn-mom-preset-3m"))==null||bo.addEventListener("click",()=>p(3)),(xo=document.getElementById("btn-mom-preset-6m"))==null||xo.addEventListener("click",()=>p(6)),(yo=document.getElementById("btn-mom-preset-12m"))==null||yo.addEventListener("click",()=>p(12)),(vo=document.getElementById("tx-filter-account"))==null||vo.addEventListener("change",async x=>{we=x.target.value,ot=0,await Dt(),A()}),(_o=document.getElementById("tx-filter-type"))==null||_o.addEventListener("change",async x=>{if(pt=x.target.value,pt){const y=new Set(kt.filter(_=>_.category_type===pt).map(_=>_.id));at=at.filter(_=>y.has(_))}ot=0,await Dt(),A()}),(wo=document.getElementById("btn-toggle-cat-dropdown"))==null||wo.addEventListener("click",x=>{x.stopPropagation(),$e=!$e,A()}),(ko=document.getElementById("btn-select-all-cats"))==null||ko.addEventListener("click",async x=>{x.stopPropagation(),at=(pt?kt.filter(_=>_.category_type===pt):kt).map(_=>_.id),ot=0,await Dt(),A()}),(Mo=document.getElementById("btn-clear-all-cats"))==null||Mo.addEventListener("click",async x=>{x.stopPropagation(),at=[],ot=0,await Dt(),A()}),document.querySelectorAll(".chk-category-filter").forEach(x=>{x.addEventListener("change",async y=>{y.stopPropagation();const _=y.currentTarget,S=_.getAttribute("data-cat-id");S&&(_.checked?at.includes(S)||at.push(S):at=at.filter(O=>O!==S),ot=0,await Dt(),A())})}),document.querySelectorAll(".btn-remove-cat-filter").forEach(x=>{x.addEventListener("click",async y=>{const _=y.currentTarget.getAttribute("data-cat-id");_&&(at=at.filter(S=>S!==_),ot=0,await Dt(),A())})}),(So=document.getElementById("btn-clear-cat-pills"))==null||So.addEventListener("click",async()=>{at=[],ot=0,await Dt(),A()}),(Co=document.getElementById("tx-filter-start"))==null||Co.addEventListener("change",async x=>{ke=x.target.value,ot=0,await Dt(),A()}),(Eo=document.getElementById("tx-filter-end"))==null||Eo.addEventListener("change",async x=>{Me=x.target.value,ot=0,await Dt(),A()}),(Ao=document.getElementById("tx-filter-search"))==null||Ao.addEventListener("change",async x=>{Se=x.target.value,ot=0,await Dt(),A()}),(Po=document.getElementById("btn-tx-clear-filters"))==null||Po.addEventListener("click",async()=>{we="",pt="",at=[],ke="",Me="",Se="",$e=!1,ot=0,await Dt(),A()}),(Do=document.getElementById("tx-page-size"))==null||Do.addEventListener("change",async x=>{jt=parseInt(x.target.value)||25,ot=0,await Dt(),A()}),(To=document.getElementById("btn-tx-prev"))==null||To.addEventListener("click",async()=>{ot>0&&(ot--,await Dt(),A())}),(Lo=document.getElementById("btn-tx-next"))==null||Lo.addEventListener("click",async()=>{(ot+1)*jt<Je&&(ot++,await Dt(),A())}),document.addEventListener("click",x=>{const y=document.getElementById("tx-cat-dropdown-panel"),_=document.getElementById("btn-toggle-cat-dropdown");if($e&&y&&_){const S=x.target;!y.contains(S)&&!_.contains(S)&&($e=!1,A())}})}document.addEventListener("DOMContentLoaded",yf);
