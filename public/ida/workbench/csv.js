export function parseCSV(text,fs=256){
 if(text.length>64*1024*1024)throw Error('64 MB import limit in this prototype');
 const records=[];let row=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++}else quoted=!quoted}
  else if(c===','&&!quoted){row.push(field);field=''}
  else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(x=>x.trim()))records.push(row);row=[];field=''}
  else field+=c;
 }
 if(quoted)throw Error('Unclosed CSV quote');row.push(field);if(row.some(x=>x.trim()))records.push(row);
 const headers=(records.shift()||[]).map(s=>s.replace(/^\uFEFF/,'').trim().toLowerCase());
 const index=['raw_tp9','raw_af7','raw_af8','raw_tp10'].map(k=>headers.indexOf(k));const ti=headers.indexOf('timestamp');
 if(ti<0||index.some(i=>i<0))throw Error('Raw CSV needs TimeStamp and RAW_TP9/AF7/AF8/TP10. Band-only data is not raw EEG.');
 const rows=[],markers=[];let first=null,last=-Infinity;
 for(const row of records){
  const raw=row[ti]?.trim();if(!raw)continue;
  let stamp=/^[\d.+-]+$/.test(raw)?Number(raw):Date.parse(raw)/1000;if(!Number.isFinite(stamp))continue;
  if(first===null)first=stamp;const t=stamp-first;
  if(t<last)throw Error('CSV timestamps move backwards');last=t;
  const marker=row[headers.indexOf('elements')];if(marker)markers.push({t,value:marker});
  if(index.some(i=>!row[i]?.trim()))continue;const values=index.map(i=>Number(row[i]));if(values.some(v=>!Number.isFinite(v)))continue;
  rows.push({t,values});
 }
 if(rows.length<512)throw Error('Too few full raw samples');const duration=rows.at(-1).t-rows[0].t,rate=(rows.length-1)/duration;
 if(!Number.isFinite(rate)||rate<64)throw Error('Sparse snapshots cannot reconstruct full-rate EEG');
 if(Math.abs(rate-fs)/fs>.15)throw Error(`Observed ${rate.toFixed(1)} rows/s; set the source-rate dial before importing.`);
 let reconstructed=0;
 for(let i=0;i<rows.length;){
  let j=i+1;while(j<rows.length&&rows[j].t===rows[i].t)j++;
  const base=rows[i].t;
  if(j-i>1){
   if(j<rows.length&&base+(j-i-1)/fs>=rows[j].t)throw Error('Repeated timestamp groups overlap at the selected sample rate');
   for(let k=i;k<j;k++){rows[k].original_t=base;rows[k].t=base+(k-i)/fs;reconstructed++}
  }
  i=j;
 }
 return {rows,markers,metadata:{samples:rows.length,duration_s:duration,observed_rows_per_s:rate,reconstructed_samples:reconstructed,timing:'Equal timestamps expanded at configured rate; original gaps retained'}};
}
