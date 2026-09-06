// V8.4 lightweight UI/design-system helpers.
const UIService=(()=>{
 function kpi(label,value,sub=""){return `<div class="kpi"><div class="label">${label}</div><div class="value">${value}</div>${sub?`<div class="muted">${sub}</div>`:""}</div>`}
 function metric(label,value){return `<div class="metric"><div class="l">${label}</div><div class="n">${value}</div></div>`}
 function go(page){state.page=page;render()}
 return {kpi,metric,go};
})();
