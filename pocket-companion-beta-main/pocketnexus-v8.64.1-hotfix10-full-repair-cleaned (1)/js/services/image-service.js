// V8.4 centralized card-art URL and failure behavior.
const ImageService=(()=>{
  function absoluteHttpUrl(value){if(typeof value!=="string")return "";const v=value.trim();if(!v)return "";if(/^https?:\/\//i.test(v))return v;if(/^\/\//.test(v))return "https:"+v;return ""}
  function fields(raw){return [...new Set([raw?.thumbnailUrl,raw?.fullImageUrl,raw?.image_url,raw?.imageUrl,raw?.image_png,raw?.imagePng,raw?.images?.thumbnail,raw?.images?.small,raw?.images?.large,raw?.images?.original,raw?.artwork?.thumbnail,raw?.artwork?.small,raw?.artwork?.large,raw?.artwork?.original,raw?.art?.thumbnail,raw?.art?.large,raw?.cardImage?.small,raw?.cardImage?.large,raw?.image].map(absoluteHttpUrl).filter(Boolean))]}
  function failover(img){const sources=(img?.dataset?.sources||"").split("|").filter(Boolean);let idx=Number(img?.dataset?.idx||0)+1;while(idx<sources.length&&sources[idx]===img.src)idx++;if(idx<sources.length){img.dataset.idx=String(idx);img.src=sources[idx];return true}if(img){img.style.display="none";img.dataset.failed="true";const ph=img.nextElementSibling;if(ph)ph.style.display="flex"}return false}
  return {absoluteHttpUrl,fields,failover};
})();
