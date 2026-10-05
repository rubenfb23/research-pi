// Parse a measured value only inside its own transducer block, never across
// the next transducer header from another stage of the five-script pipeline.
export function transducerFPower(text) {
 let current,values=[];
 for(const line of text.split(/\r?\n/)) {
  const header=line.match(/^Transducer:\s*([A-F])\s*$/);
  if(header){current=header[1];continue;}
  const value=line.match(/^Pload\s*=\s*([-+\d.eE]+)\s*(?:mW)?\s*$/);
  if(current==='F'&&value)values.push(Number(value[1]));
 }
 if(!values.length||values.some(v=>!Number.isFinite(v)))return null;
 if(values.some(v=>Math.abs(v-values[0])>Math.max(1e-9,Math.abs(v)*1e-9)))throw Error('Ambiguous Transducer F measured powers');
 return values[0];
}
