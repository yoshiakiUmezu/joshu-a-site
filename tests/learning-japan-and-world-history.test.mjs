import assert from 'node:assert/strict';import {test} from 'node:test';import {events,historyAt} from '../learning/japan-and-world-history/model.mjs';
import {references,sourcesByJapanDate} from '../learning/japan-and-world-history/sources.mjs';
function displayedYears(label){
  const crossing=label.match(/^紀元前(\d+)世紀.*紀元後(\d+)世紀/);
  if(crossing)return [-Number(crossing[1])*100,Number(crossing[2])*100];
  const century=label.match(/(\d+)世紀/);
  if(century){const start=(Number(century[1])-1)*100+1;const end=start+99;return label.includes('前半')||label.includes('初め')?[start,start+49]:label.includes('後半')||label.includes('末')?[start+50,end]:label.includes('半ば')?[start+33,start+66]:[start,end];}
  const years=[...label.matchAll(/\d{1,4}/g)].map(match=>Number(match[0]));
  if(label.includes('年代'))return [years[0],years[0]+9];
  return [Math.min(...years),Math.max(...years)];
}
test('history entries cover Yayoi through Taisho with paired world context',()=>{assert.ok(events.length>=20&&events.length<=30);assert.equal(events[0].era,'弥生');assert.equal(events.at(-1).era,'大正');assert.ok(events.every(e=>e.jp&&e.jpDate&&e.world&&e.worldDate&&e.note));assert.throws(()=>historyAt(-1),RangeError);assert.throws(()=>historyAt(events.length),RangeError);assert.match(historyAt(4).note,/538年説と552年説/);assert.match(events[0].note,/年代観/);});
test('Song context is dated to the 11th century without moving its 960 founding date',()=>{const event=events.find(e=>e.jpDate==='11世紀前半');assert.equal(event?.worldDate,'11世紀');assert.equal(event?.world,'宋の時代に商業と都市が発展');assert.match(event?.note??'',/960年に成立/);});
test('all 30 pairs have claim-specific Japanese and world references with plausible date and region',()=>{
  assert.equal(events.length,30);
  assert.deepEqual(Object.keys(sourcesByJapanDate).sort(),events.map(e=>e.jpDate).sort());
  const trusted=/^(www\.(rekihaku\.ac\.jp|nabunken\.go\.jp|metmuseum\.org|archives\.go\.jp|ndl\.go\.jp|historist\.jp|parliament\.uk|nam\.ac\.uk|suezcanal\.gov\.eg|bundesarchiv\.de|toureiffel\.paris|iwm\.org\.uk|tbmm\.gov\.tr)|museum\.city\.fukuoka\.jp|resources\.metmuseum\.org|afe\.easia\.columbia\.edu|guides\.loc\.gov|archive\.cdc\.gov)$/;
  let previous=-Infinity;
  for(const [index,event] of events.entries()){
    const cited=event.sources;
    assert.ok(cited.japan.length>=1&&cited.world.length>=1,`row ${index+1}: both sides cited`);
    const jpYears=cited.japan.map(s=>s.years[0]);
    const worldYears=cited.world.map(s=>s.years[0]);
    const jpStart=Math.min(...jpYears);
    assert.ok(jpStart>=previous,`row ${index+1}: chronology does not reverse`);
    previous=jpStart;
    for(const [side,claim,date] of [[cited.japan,event.jp,event.jpDate],[cited.world,event.world,event.worldDate]]) for(const citation of side){
      assert.ok(references[citation.ref],`row ${index+1}: registered source`);
      assert.ok(claim.includes(citation.claim),`row ${index+1}: citation matches displayed claim`);
      assert.ok(citation.region.length>=2,`row ${index+1}: geographic context`);
      assert.ok(citation.years.length===2&&citation.years.every(Number.isInteger)&&citation.years[0]<=citation.years[1],`row ${index+1}: valid evidence years`);
      const [displayStart,displayEnd]=displayedYears(date);
      assert.ok(citation.years[0]<=displayEnd&&citation.years[1]>=displayStart,`row ${index+1}: evidence period matches displayed date`);
      const url=new URL(citation.url);
      assert.equal(url.protocol,'https:');
      assert.match(url.hostname,trusted,`row ${index+1}: trusted source host`);
      assert.ok(url.pathname.length>1,`row ${index+1}: specific source page`);
    }
    const gap=Math.min(...cited.japan.flatMap(j=>cited.world.map(w=>Math.max(0,j.years[0]-w.years[1],w.years[0]-j.years[1]))));
    assert.ok(gap<=15,`row ${index+1}: evidence periods too far apart (${gap} years)`);
    if(gap>10)assert.match(event.note,/年後|十数年後/,`row ${index+1}: adjacent years must be explicit`);
  }
  assert.equal(events[0].worldDate,'紀元前8世紀〜紀元後3世紀');
  assert.match(events[18].jp,/上方を中心/);
});
