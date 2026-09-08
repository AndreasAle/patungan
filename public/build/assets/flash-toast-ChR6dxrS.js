import{K as m,r as i,j as s}from"./app-e4rxlttD.js";import{a as c}from"./app-logo-DBdXjpr9.js";/**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]],d=c("CircleCheck",l);/**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m15 9-6 6",key:"1uzhvr"}],["path",{d:"m9 9 6 6",key:"z0biqf"}]],x=c("CircleX",u);/**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]],f=c("X",p);function y(){const{flash:e}=m().props,[a,r]=i.useState(!1),t=(e==null?void 0:e.success)??(e==null?void 0:e.error)??null,o=!!(e!=null&&e.error);return i.useEffect(()=>{if(!t)return;r(!0);const n=window.setTimeout(()=>r(!1),4e3);return()=>window.clearTimeout(n)},[t]),!t||!a?null:s.jsx("div",{className:"fixed inset-x-4 top-4 z-[60] mx-auto max-w-sm sm:right-4 sm:left-auto sm:mx-0",children:s.jsxs("div",{role:"status",className:`flex items-start gap-2.5 rounded-2xl border px-4 py-3 shadow-lg ${o?"border-destructive/30 bg-card text-destructive":"border-success/30 bg-card text-success"}`,children:[o?s.jsx(x,{className:"mt-0.5 size-4 shrink-0"}):s.jsx(d,{className:"mt-0.5 size-4 shrink-0"}),s.jsx("p",{className:"text-foreground flex-1 text-sm font-medium",children:t}),s.jsx("button",{type:"button",onClick:()=>r(!1),"aria-label":"Tutup notifikasi",className:"text-muted-foreground",children:s.jsx(f,{className:"size-4"})})]})})}export{d as C,y as F,f as X,x as a};
