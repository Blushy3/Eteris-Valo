(function(){
  const VERSION='advanced-v5';
  const ETERIS_PLAYER_SR=10000;
  const STAT_FIELDS=[
    ['acs','ACS'],['kills','K'],['deaths','D'],['assists','A'],['plus_minus','+/-'],
    ['kd_ratio','K/D'],['damage_delta','DDA'],['adr','ADR'],['hs_percent','HS%'],
    ['kast_percent','KAST'],['first_kills','FK'],['first_deaths','FD'],['multi_kills','MK']
  ];

  function num(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback}
  function clamp(value,min,max){return Math.max(min,Math.min(max,value))}
  function round(value,digits=0){const m=10**digits;return Math.round(num(value)*m)/m}
  function avg(values){const list=values.map(Number).filter(Number.isFinite);return list.length?list.reduce((a,b)=>a+b,0)/list.length:0}
  function curve(value,target,scale,weight,power=1.16){
    const diff=num(value)-target;
    const sign=diff>=0?1:-1;
    return sign*Math.pow(Math.abs(diff)/scale,power)*weight;
  }

  function normalize(input){
    const kills=num(input.kills),deaths=Math.max(1,num(input.deaths,1));
    const plus=Number.isFinite(Number(input.plus_minus))?num(input.plus_minus):kills-deaths;
    return {
      acs:num(input.acs),kills,deaths,assists:num(input.assists),plus_minus:plus,
      kd_ratio:num(input.kd_ratio,kills/deaths),damage_delta:num(input.damage_delta),
      adr:num(input.adr),hs_percent:num(input.hs_percent),kast_percent:num(input.kast_percent),
      first_kills:num(input.first_kills ?? input.first_bloods),
      first_deaths:num(input.first_deaths),multi_kills:num(input.multi_kills),
      result:input.result==='loss'?'loss':'win'
    };
  }

  function statsSnapshot(input){
    const s=normalize(input);
    return {
      result:s.result,acs:s.acs,kills:s.kills,deaths:s.deaths,assists:s.assists,
      plus_minus:s.plus_minus,kd_ratio:round(s.kd_ratio,2),damage_delta:s.damage_delta,
      adr:round(s.adr,1),hs_percent:round(s.hs_percent,1),kast_percent:round(s.kast_percent,1),
      first_kills:s.first_kills,first_deaths:s.first_deaths,multi_kills:s.multi_kills
    };
  }

  function addIssue(list,severity,title,message,code){list.push({severity,title,message,code})}
  function validate(input){
    const s=normalize(input);
    const issues=[];
    const expectedKd=s.kills/s.deaths;
    const expectedPlus=s.kills-s.deaths;
    const zeros=['acs','kills','deaths','adr','kast_percent'].filter(k=>num(s[k])===0).length;
    if(s.acs<0||s.acs>650)addIssue(issues,'high','ACS outside range',`ACS ${s.acs} is outside a normal Tracker row range.`,'acs_range');
    else if(s.acs>420)addIssue(issues,'medium','Very high ACS',`ACS ${s.acs} is possible, but rare. Verify the row was read correctly.`,'acs_high');
    if(s.kills<0||s.kills>65)addIssue(issues,'high','Kills outside range',`Kills ${s.kills} look outside a normal match range.`,'kills_range');
    if(s.deaths<1||s.deaths>45)addIssue(issues,'high','Deaths outside range',`Deaths ${s.deaths} look outside a normal match range.`,'deaths_range');
    if(s.adr<0||s.adr>360)addIssue(issues,'high','ADR outside range',`ADR ${s.adr} is outside a normal Tracker row range.`,'adr_range');
    else if(s.adr>260)addIssue(issues,'medium','Very high ADR',`ADR ${s.adr} is possible, but rare. Check the screenshot.`,'adr_high');
    if(s.hs_percent<0||s.hs_percent>100)addIssue(issues,'high','HS% invalid','HS% must be between 0 and 100.','hs_range');
    if(s.kast_percent<0||s.kast_percent>100)addIssue(issues,'high','KAST invalid','KAST must be between 0 and 100.','kast_range');
    if(Math.abs(expectedPlus-s.plus_minus)>1)addIssue(issues,'high','Plus/minus mismatch',`+/- should be close to K-D (${expectedPlus}), but the report has ${s.plus_minus}.`,'plus_mismatch');
    if(Math.abs(expectedKd-s.kd_ratio)>.08)addIssue(issues,'medium','K/D mismatch',`K/D should be about ${round(expectedKd,2)} from K and D, but the report has ${round(s.kd_ratio,2)}.`,'kd_mismatch');
    if(s.first_deaths>s.deaths)addIssue(issues,'high','FD cannot exceed deaths',`FD ${s.first_deaths} is higher than deaths ${s.deaths}.`,'fd_gt_deaths');
    if(s.first_kills>s.kills)addIssue(issues,'high','FK cannot exceed kills',`FK ${s.first_kills} is higher than kills ${s.kills}.`,'fk_gt_kills');
    if(s.multi_kills>s.kills)addIssue(issues,'medium','MK higher than kills',`MK ${s.multi_kills} is higher than kills ${s.kills}.`,'mk_gt_kills');
    if(zeros>=4)addIssue(issues,'medium','OCR may have missed values','Several important stats are zero. This often means the screenshot was cropped or read incorrectly.','many_zeroes');
    if(s.acs>0&&s.adr===0)addIssue(issues,'medium','ADR missing','ACS exists but ADR is zero. The OCR may have missed the ADR column.','adr_missing');
    if(s.kills===0&&s.acs>160)addIssue(issues,'medium','Kills look suspicious','ACS is not low, but kills are zero. Check if the OCR shifted columns.','shifted_columns');
    const warnings=issues.map(i=>i.message);
    const score=issues.reduce((sum,i)=>sum+(i.severity==='high'?35:i.severity==='medium'?18:8),0);
    return {stats:s,warnings,issues,anomalies:issues,confidence:score>=50?'Low':score>=18?'Medium':'High',valid:!issues.some(i=>i.severity==='high')};
  }

  function dimensionScores(input){
    const s=normalize(input);
    const aim=curve(s.hs_percent,24,14,8,.95)+curve(s.kd_ratio,1,0.55,16);
    const damage=curve(s.acs,205,70,26)+curve(s.adr,135,45,20)+curve(s.damage_delta,0,80,22);
    const survival=curve(s.kast_percent,70,20,18)+curve(s.plus_minus,0,10,18)-s.first_deaths*4.2;
    const entry=s.first_kills*6.2-s.first_deaths*5.4+s.multi_kills*4.2;
    const team=s.assists*.9+curve(s.kast_percent,72,18,8);
    const consistency=curve(s.acs,170,85,8)+curve(s.adr,115,60,7)+curve(s.kd_ratio,.85,.5,7);
    return {aim,damage,survival,entry,team,consistency};
  }

  function performanceScore(input){
    const s=normalize(input);
    const d=dimensionScores(s);
    let score=d.aim+d.damage+d.survival+d.entry+d.team+d.consistency;
    if(s.acs<115)score-=Math.pow((115-s.acs)/24,1.18)*10;
    if(s.acs<80)score-=Math.pow((80-s.acs)/18,1.25)*12;
    if(s.adr<85)score-=Math.pow((85-s.adr)/24,1.12)*8;
    if(s.kast_percent<55)score-=Math.pow((55-s.kast_percent)/10,1.18)*10;
    if(s.damage_delta<-55)score-=Math.pow((Math.abs(s.damage_delta)-55)/28,1.12)*9;
    if(s.kd_ratio<.65)score-=Math.pow((.65-s.kd_ratio)/.16,1.16)*8;
    return score;
  }

  function calculateRawDelta(input){
    const s=normalize(input);
    const perf=performanceScore(s);
    let delta;
    if(s.result==='win')delta=Math.max(0,Math.round(74+(perf*.55)));
    else delta=Math.min(0,Math.round(-92+(perf*.26)));
    return {delta,performance:Math.round(perf),dimensions:dimensionScores(s),version:VERSION};
  }

  function applyAdjustment(raw,row,result){
    const gain=Math.max(0,num(row?.sr_gain_multiplier,1));
    const loss=Math.max(0,num(row?.sr_loss_multiplier,1));
    const flat=Math.round(num(row?.sr_flat_bonus,0));
    const scaled=raw>=0?raw*gain:raw*loss;
    const adjusted=Math.round(scaled+flat);
    const delta=result==='win'?Math.max(0,adjusted):result==='loss'?Math.min(0,adjusted):adjusted;
    return {delta,gain,loss,flat};
  }

  function calculate(input,row){
    const raw=calculateRawDelta(input);
    const adjusted=applyAdjustment(raw.delta,row,input.result);
    return {...raw,raw_delta:raw.delta,adjusted_delta:adjusted.delta,delta:adjusted.delta,adjustment:adjusted};
  }

  function explain(input,row){
    const s=normalize(input);
    const d=dimensionScores(s);
    const perf=performanceScore(s);
    const factor=s.result==='win'?.55:.26;
    const base=s.result==='win'?74:-92;
    const lines=[
      {key:'match',label:'Match result',value:base,detail:s.result==='win'?'Win starts positive. Bad performance can reduce it to 0, but never below 0.':'Loss starts negative. Strong performance can soften it to 0, but never above 0.'},
      {key:'damage',label:'Damage impact',value:d.damage*factor,detail:'Uses ACS, ADR and DDA. Good damage raises SR; low damage or negative DDA lowers it.'},
      {key:'survival',label:'Survival',value:d.survival*factor,detail:'Uses KAST, +/- and first deaths. Staying useful in rounds protects SR.'},
      {key:'entry',label:'Entry',value:d.entry*factor,detail:'Uses FK, FD and multi-kills. Clean openings help; dying first hurts.'},
      {key:'team',label:'Team value',value:d.team*factor,detail:'Uses assists and KAST. Rewards support value that may not show as kills.'},
      {key:'aim',label:'Aim / duels',value:d.aim*factor,detail:'Uses HS% and K/D to measure duel conversion.'},
      {key:'consistency',label:'Consistency',value:d.consistency*factor,detail:'Checks if ACS, ADR and K/D are above a stable baseline.'}
    ].map(x=>({...x,value:Math.round(x.value)}));
    const raw=calculateRawDelta(s);
    const adjusted=applyAdjustment(raw.delta,row,s.result);
    const adjustmentValue=adjusted.delta-raw.delta;
    if(adjustmentValue)lines.push({key:'adjustment',label:'Admin adjustment',value:adjustmentValue,detail:'Custom multiplier or flat correction from the admin panel.'});
    return {version:VERSION,result:s.result,performance:Math.round(perf),raw_delta:raw.delta,adjusted_delta:adjusted.delta,final:adjusted.delta,adjustment:adjusted,lines};
  }

  function coachNotes(input){
    const s=normalize(input);
    const d=dimensionScores(s);
    const notes=[];
    const push=(title,body,level='info')=>notes.push({title,body,level});
    if(s.adr>=145&&s.kd_ratio<.85)push('Damage is not converting','High ADR with low K/D means damage is being dealt, but not finished into kills. Focus on trade timing and closing duels.','warning');
    if(s.kd_ratio<.72&&s.plus_minus<=-6)push('Duel conversion is weak','Low K/D and negative +/- mean too many direct exchanges are being lost. Review crosshair placement, trade spacing and safer re-peeks.','warning');
    if(s.kast_percent<62&&s.first_deaths>=3)push('Too many early deaths','Low KAST and high FD suggest the player dies before round value is created. Slow the first contact or ask for utility support.','danger');
    if(s.first_deaths>=3&&s.first_kills===0)push('Entry timing problem','No first kills with multiple first deaths points to poor opening timing. Avoid dry first contact for now.','warning');
    if(s.acs>=230&&d.team<0)push('Solo impact pattern','Good ACS with weak team value can mean impact is mostly solo. Look for more trades, assists and round-saving decisions.','warning');
    if(s.acs<160&&s.kast_percent>=74)push('Supportive but low pressure','Low ACS with good KAST suggests safe/supportive play, but the player needs more damage or stronger mid-round pressure.','info');
    if(s.first_kills>=3&&s.first_deaths<=1)push('Clean opener','Strong FK with low FD. This player can take first contact when the plan supports it.','good');
    if(s.plus_minus<-8&&s.kast_percent<65)push('Survival gap','Large negative +/- with low KAST points to weak round presence. Review positioning and escape routes.','danger');
    if(s.multi_kills>=3&&s.acs>=220)push('Round swing potential','Multi-kills and ACS show carry potential. Protect this player in rounds where they are hot.','good');
    if(!notes.length)push('Stable profile','No major pattern stands out from this report. Use more matches before changing multipliers.','info');
    return notes.slice(0,4);
  }

  function roleProfile(input){
    const s=normalize(input);
    const d=dimensionScores(s);
    let role='Stable',description='Balanced profile with no extreme statistical signal yet.';
    const tags=[];
    if(s.first_kills>=3||d.entry>18){role='Entry';description='Creates first contact and opens rounds, but needs support if FD rises.';tags.push('first contact')}
    if(s.kast_percent>=76&&s.first_deaths<=1&&s.acs<210){role='Anchor';description='Stays alive, holds value and stabilizes rounds without needing huge ACS.';tags.push('low risk')}
    if(s.assists>=7||s.kast_percent>=78){role='Support';description='Adds team value through assists, survival and round presence.';tags.push('team value')}
    if(s.acs>=245||s.kd_ratio>=1.25){role='Fragger';description='High direct impact through kills and damage.';tags.push('damage')}
    if(s.first_deaths>=4||s.kast_percent<58||(s.first_deaths>=3&&s.first_kills===0)||(s.kd_ratio<.7&&s.plus_minus<=-6)){role='Risky';description='High death or weak-duel risk. Can still create pressure, but needs cleaner timing and more controlled first contacts.';tags.push('volatile')}
    if(s.acs>=250&&s.adr>=160&&s.kast_percent>=72){role='Carry potential';description='Strong damage, round presence and conversion. Give this player resources when form is high.';tags.push('priority resource')}
    return {role,description,tags};
  }

  function matchQuality(input,calc){
    const s=normalize(input);
    const delta=num(calc?.delta ?? calculate(input,{}).delta);
    const d=dimensionScores(s);
    let grade='Stable match',description='The match has no extreme quality signal. SR mostly follows the core stat balance.';
    if(s.result==='win'&&delta>=110&&s.acs>=235&&s.kd_ratio>=1.1){grade='Clean carry';description='Strong win impact: high ACS/KD and enough round presence made the gain clearly deserved.'}
    else if(s.assists>=6&&s.kast_percent>=74&&d.team>8){grade='Solid team value';description='The player helped the team through KAST, assists and round presence even if raw fragging was not the whole story.'}
    else if(s.result==='win'&&delta<=18){grade='Low impact win';description='The team won, but individual impact was weak. The win base stayed positive, then low damage, duel conversion or entry value reduced most of the gain.'}
    else if(s.result==='loss'&&delta<=-115){grade='Painful loss';description='The loss was heavy statistically. Low impact signals were strong enough that the penalty stayed large.'}
    else if(s.acs>=230&&s.kast_percent<62){grade='Stat-padding risk';description='Damage is visible, but low KAST suggests impact may not be converting into stable round value.'}
    else if(s.first_deaths>=3&&s.first_kills===0){grade='Entry problem';description='Opening contact is hurting the rating. The player died first too often without creating first-kill pressure.'}
    return {grade,description};
  }

  function verdict(input,analysis){
    const s=analysis?.stats||normalize(input);
    const q=analysis?.matchQuality||matchQuality(s,analysis?.calculation);
    const ex=analysis?.explain||explain(s,{});
    const topNeg=ex.lines.filter(x=>x.value<0).sort((a,b)=>a.value-b.value).slice(0,2).map(x=>x.label.toLowerCase());
    const topPos=ex.lines.filter(x=>x.value>0).sort((a,b)=>b.value-a.value).slice(0,2).map(x=>x.label.toLowerCase());
    if(s.result==='win'){
      if(ex.final===0)return `No SR gain is fair: the win base was fully cancelled by weak ${topNeg.join(' and ') || 'performance signals'}.`;
      return `${q.grade}: the win gives a positive base, ${topPos.length?`${topPos.join(' and ')} helped, `:''}but ${topNeg.join(' and ') || 'weak impact signals'} limited the final gain to ${ex.final} SR.`;
    }
    if(ex.final===0)return `No SR loss: the match was lost, but performance was strong enough to fully soften the penalty.`;
    return `${q.grade}: the loss starts negative, and ${topNeg.join(' and ') || 'weak impact signals'} kept the final penalty at ${ex.final} SR.`;
  }

  function analysisSnapshot(analysis){
    return {
      version:VERSION,
      confidence:analysis.validation.confidence,
      match_quality:analysis.matchQuality,
      role_profile:analysis.roleProfile,
      coach_notes:analysis.coachNotes,
      anomalies:analysis.anomalies,
      performance:analysis.calculation.performance,
      raw_delta:analysis.calculation.raw_delta,
      adjusted_delta:analysis.calculation.adjusted_delta,
      verdict:analysis.verdict,
      explain:analysis.explain.lines
    };
  }

  function analyzeReport(input,row){
    const validation=validate(input);
    const calc=calculate(input,row);
    const analysis={
      stats:validation.stats,
      validation,
      anomalies:validation.anomalies,
      calculation:calc,
      explain:explain(input,row),
      coachNotes:coachNotes(input),
      roleProfile:roleProfile(input)
    };
    analysis.matchQuality=matchQuality(input,calc);
    analysis.verdict=verdict(input,analysis);
    analysis.statsSnapshot=statsSnapshot(input);
    analysis.analysisSnapshot=analysisSnapshot(analysis);
    return analysis;
  }

  function logAnalysis(log){
    if(log?.analysis_snapshot)return log.analysis_snapshot;
    if(log?.stats_snapshot)return analyzeReport(log.stats_snapshot,{}).analysisSnapshot;
    return null;
  }

  function trendForPlayer({logs=[],reports=[],current={}}={}){
    const analyses=[
      ...logs.map(logAnalysis).filter(Boolean),
      ...reports.map(r=>analyzeReport(r,current).analysisSnapshot)
    ].slice(0,10);
    const deltas=analyses.map(a=>num(a.adjusted_delta ?? a.final_delta ?? a.raw_delta));
    const roles=analyses.map(a=>a.role_profile?.role).filter(Boolean);
    const recent=avg(deltas.slice(0,3)),older=avg(deltas.slice(3,8));
    const firstDeathFlags=analyses.filter(a=>JSON.stringify(a.coach_notes||[]).includes('early deaths')||JSON.stringify(a.coach_notes||[]).includes('Entry timing')).length;
    let label='No trend yet',description='Not enough analyzed matches to build a trend.';
    if(analyses.length>=3){
      if(recent-older>30){label='Form rising';description='Recent reports are outperforming the previous baseline.'}
      else if(older-recent>30){label='Form dropping';description='Recent reports are weaker than the previous baseline.'}
      else if(firstDeathFlags>=3){label='Often dies first';description='Recent reports repeatedly point to early-death or entry timing problems.'}
      else if(roles.filter(r=>r==='Support'||r==='Anchor').length>=Math.ceil(analyses.length*.55)){label='Stable support';description='The player repeatedly creates value through survival, assists or team presence.'}
      else if(volatilityForPlayer({logs,reports,current}).score>=70){label='Unstable form';description='SR movement swings strongly between high gains and heavy losses.'}
      else{label='Stable form';description='Recent SR movement is predictable, without major spikes or collapses.'}
    }
    return {label,description,matches:analyses.length,recent_average:Math.round(recent),previous_average:Math.round(older)};
  }

  function roleDriftForPlayer({logs=[],reports=[],current={}}={}){
    const roles=[
      ...logs.map(logAnalysis).filter(Boolean).map(a=>a.role_profile?.role),
      ...reports.map(r=>roleProfile(r).role)
    ].filter(Boolean).slice(0,10);
    if(roles.length<4)return {label:'No role drift yet',description:'Need more analyzed matches before detecting role changes.'};
    const recent=roles.slice(0,3),older=roles.slice(3,8);
    const top=list=>Object.entries(list.reduce((a,r)=>(a[r]=(a[r]||0)+1,a),{})).sort((a,b)=>b[1]-a[1])[0]?.[0];
    const a=top(recent),b=top(older);
    if(a&&b&&a!==b)return {label:`${b} -> ${a}`,description:`Recent reports look more like ${a}, while older reports looked more like ${b}.`};
    const carryCount=roles.filter(r=>r==='Carry potential').length;
    if(carryCount>=3)return {label:'Carry potential rising',description:'Carry potential appears often enough to watch this player as a resource priority.'};
    return {label:'Role stable',description:`Recent role profile stays mostly around ${a||'one style'}.`};
  }

  function volatilityForPlayer({logs=[],reports=[],current={}}={}){
    const deltas=[
      ...logs.map(l=>num(l.adjusted_delta ?? l.delta)).filter(Number.isFinite),
      ...reports.map(r=>calculate(r,current).delta)
    ].slice(0,10);
    if(deltas.length<3)return {score:0,label:'No volatility data',description:'Need more matches.'};
    const mean=avg(deltas);
    const variance=avg(deltas.map(x=>(x-mean)**2));
    const stdev=Math.sqrt(variance);
    const signFlips=deltas.slice(1).filter((d,i)=>(d>=0)!==(deltas[i]>=0)).length;
    const score=clamp(Math.round(stdev*.75+signFlips*9),0,100);
    const label=score>=70?'High volatility':score>=40?'Medium volatility':'Low volatility';
    const description=score>=70?'Player SR swings are large. Be careful with aggressive multipliers.':score>=40?'Player has some variance, but not enough to call it chaotic.':'Player movement is relatively predictable.';
    return {score,label,description,stdev:Math.round(stdev),sign_flips:signFlips};
  }

  function personalBaseline({logs=[],reports=[],current={}}={}){
    const analyses=[
      ...logs.map(logAnalysis).filter(Boolean),
      ...reports.map(r=>analyzeReport(r,current).analysisSnapshot)
    ].slice(0,10);
    if(analyses.length<4)return {ready:false,label:'Baseline building',description:'Need at least 4 analyzed matches to compare player against their own average.'};
    const perf=analyses.map(a=>num(a.performance));
    const deltas=analyses.map(a=>num(a.adjusted_delta ?? a.raw_delta));
    const recent=avg(perf.slice(0,3)),base=avg(perf.slice(3));
    const diff=recent-base;
    const label=diff>20?'Above personal baseline':diff<-20?'Below personal baseline':'Near personal baseline';
    const description=diff>20?'Recent performance is better than this player normally produces.':diff<-20?'Recent performance is below this player’s own average.':'Recent matches are close to the player’s normal level.';
    return {ready:true,label,description,recent_performance:Math.round(recent),baseline_performance:Math.round(base),delta_average:Math.round(avg(deltas))};
  }

  function ratingLabel(rating){return Math.max(0,num(rating))>=ETERIS_PLAYER_SR?'Eteris Player':'Chasing Eteris Player'}

  function recommendationForPlayer({reports=[],logs=[],rating=0,current={}}={}){
    const recentReports=reports.slice(-10);
    const analyses=recentReports.map(r=>analyzeReport(r,current));
    const logAnalyses=logs.map(logAnalysis).filter(Boolean).slice(0,10);
    const recentDeltas=logs.slice(0,10).map(x=>num(x.adjusted_delta ?? x.delta)).filter(Number.isFinite);
    const sample=[...analyses.map(a=>a.calculation.raw_delta),...recentDeltas];
    const avgDelta=sample.length?avg(sample):0;
    const highRisk=[...analyses.map(a=>a.analysisSnapshot),...logAnalyses].filter(a=>a.role_profile?.role==='Risky'||(a.coach_notes||[]).some(n=>n.level==='danger')).length;
    const carry=[...analyses.map(a=>a.analysisSnapshot),...logAnalyses].filter(a=>['Carry potential','Fragger'].includes(a.role_profile?.role)).length;
    const anomalyCount=analyses.reduce((sum,a)=>sum+a.anomalies.filter(x=>x.severity!=='low').length,0);
    const weakLosses=analyses.filter(a=>a.stats.result==='loss'&&a.calculation.raw_delta<-105).length;
    const strongWins=analyses.filter(a=>a.stats.result==='win'&&a.calculation.raw_delta>120).length;
    const volatility=volatilityForPlayer({logs,reports,current});
    const baseline=personalBaseline({logs,reports,current});
    const trend=trendForPlayer({logs,reports,current});
    let gain=1,loss=1,flat=0,reason='Recent SR movement is healthy. No multiplier change is suggested right now.';
    let confidence=sample.length>=7?'High':sample.length>=3?'Medium':'Low';
    if(sample.length<3)reason='Need at least 3 analyzed matches before suggesting a multiplier change.';
    else if(anomalyCount>=3){gain=.95;loss=1.05;reason='Multiple pending reports contain data anomalies. Keep scaling conservative until screenshots are cleaner.'}
    else if(highRisk>=3&&weakLosses>=2){gain=.94;loss=1.18;reason='Pattern: risky deaths and heavy negative reports. Suggested: stricter losses and slightly lower gains until stability improves.'}
    else if(carry>=3&&strongWins>=2){gain=1.1;loss=.96;reason='Pattern: repeated high impact. Suggested: small gain boost and slightly softer losses while form stays strong.'}
    else if(volatility.score>=75){gain=.97;loss=1.06;reason='High volatility detected. Suggested: slightly conservative scaling until SR movement becomes more predictable.'}
    else if(baseline.ready&&baseline.label==='Above personal baseline'&&avgDelta>35){gain=1.05;loss=.98;reason='Player is outperforming their personal baseline. Suggested: small gain boost while the trend holds.'}
    else if(baseline.ready&&baseline.label==='Below personal baseline'&&avgDelta<0){gain=.97;loss=1.08;reason='Player is below their personal baseline. Suggested: small pressure on losses until form stabilizes.'}
    else if(sample.length>=4&&avgDelta<-80){gain=.96;loss=1.14;reason='Recent SR trend is strongly negative. Suggested: increase loss pressure and reduce gains a little.'}
    else if(sample.length>=4&&avgDelta>105){gain=1.08;loss=.96;reason='Recent SR trend is strongly positive. Suggested: reward form with a controlled gain boost.'}
    gain=round(gain,2);loss=round(loss,2);flat=Math.round(flat);
    return {
      gain_multiplier:gain,loss_multiplier:loss,flat_correction:flat,reason,confidence,
      changed:gain!==1||loss!==1||flat!==0,
      signals:{average_delta:Math.round(avgDelta),high_risk:highRisk,carry_reports:carry,anomalies:anomalyCount,trend:trend.label,volatility:volatility.score,baseline:baseline.label},
      current:{gain_multiplier:num(current.sr_gain_multiplier,1),loss_multiplier:num(current.sr_loss_multiplier,1),flat_correction:num(current.sr_flat_bonus,0)}
    };
  }

  window.EterisSkillRating={
    VERSION,STAT_FIELDS,normalize,statsSnapshot,validate,dimensionScores,performanceScore,
    calculateRawDelta,applyAdjustment,calculate,explain,coachNotes,roleProfile,
    matchQuality,verdict,analysisSnapshot,analyzeReport,logAnalysis,trendForPlayer,
    roleDriftForPlayer,volatilityForPlayer,personalBaseline,ratingLabel,recommendationForPlayer
  };
})();
