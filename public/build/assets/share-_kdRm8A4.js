import{a as e}from"./app-logo-ebWEaL9l.js";/**
 * @license lucide-react v0.475.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const r=[["rect",{width:"14",height:"14",x:"8",y:"8",rx:"2",ry:"2",key:"17jyea"}],["path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",key:"zix9uf"}]],c=e("Copy",r);function n(t){return`https://wa.me/?text=${encodeURIComponent(t)}`}function a(){return typeof navigator<"u"&&typeof navigator.share=="function"}async function i(t){if(a())try{return await navigator.share({text:t}),!0}catch{return!1}return window.open(n(t),"_blank","noopener,noreferrer"),!0}async function u(t){try{return await navigator.clipboard.writeText(t),!0}catch{return!1}}export{c as C,u as c,i as s};
