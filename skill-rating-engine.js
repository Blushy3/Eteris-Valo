(function(){
  const VERSION='advanced-v4';
  const STAT_FIELDS=[
    ['acs','ACS'],['kills','K'],['deaths','D'],['assists','A'],['plus_minus','+/-'],
    ['kd_ratio','K/D'],['damage_delta','DDA'],['adr','ADR'],['hs_percent','HS%'],
    ['kast_percent','KAST'],['first_kills','FK'],['first_deaths','FD'],['multi_kills','MK']
  ];

  function num(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback}
  function clamp(value,min,max){return Math.max(min,Math.min(max,value))}
  function round(value,digits=0){const m=10**digits;return Math.round(num(value)*m)/m}
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

  function addIssue(list,severity,title,message,code){
    list.push({severity,title,message,code});
  }

  function validate(input){
    const s=normalize(input);
    const issues=[];
    const expectedKd=s.kills/s.deaths;
    const expectedPlus=s.kills-s.deaths;
    const zeros=['acs','kills','deaths','adr','kast_percent'].filter(k=>num(s[k])===0).length;

    if(s.acs<0||s.acs>650)addIssue(issues,'high','ACS outside range',`ACS ${s.acs} is outside a normal Tracker row range.`, 'acs_range');
    else if(s.acs>420)addIssue(issues,'medium','Very high ACS',`ACS ${s.acs} is possible, but rare. Verify the row was read correctly.`, 'acs_high');
    if(s.kills<0||s.kills>65)addIssue(issues,'high','Kills outside range',`Kills ${s.kills} look outside a normal match range.`, 'kills_range');
    if(s.deaths<1||s.deaths>45)addIssue(issues,'high','Deaths outside range',`Deaths ${s.deaths} look outside a normal match range.`, 'deaths_range');
    if(s.adr<0||s.adr>360)addIssue(issues,'high','ADR outside range',`ADR ${s.adr} is outside a normal Tracker row range.`, 'adr_range');
    else if(s.adr>260)addIssue(issues,'medium','Very high ADR',`ADR ${s.adr} is possible, but rare. Check the screenshot.`, 'adr_high');
    if(s.hs_percent<0||s.hs_percent>100)addIssue(issues,'high','HS% invalid','HS% must be between 0 and 100.', 'hs_range');
    if(s.kast_percent<0||s.kast_percent>100)addIssue(issues,'high','KAST invalid','KAST must be between 0 and 100.', 'kast_range');
    if(Math.abs(expectedPlus-s.plus_minus)>1)addIssue(issues,'high','Plus/minus mismatch',`+/- should be close to K-D (${expectedPlus}), but the report has ${s.plus_minus}.`, 'plus_mismatch');
    if(Math.abs(expectedKd-s.kd_ratio)>.08)addIssue(issues,'medium','K/D mismatch',`K/D should be about ${round(expectedKd,2)} from K and D, but the report has ${round(s.kd_ratio,2)}.`, 'kd_mismatch');
    if(s.first_deaths>s.deaths)addIssue(issues,'high','FD cannot exceed deaths',`FD ${s.first_deaths} is higher than deaths ${s.deaths}.`, 'fd_gt_deaths');
    if(s.first_kills>s.kills)addIssue(issues,'high','FK cannot exceed kills',`FK ${s.first_kills} is higher than kills ${s.kills}.`, 'fk_gt_kills');
    if(s.multi_kills>s.kills)addIssue(issues,'medium','MK higher than kills',`MK ${s.multi_kills} is higher than kills ${s.kills}.`, 'mk_gt_kills');
    if(zeros>=4)addIssue(issues,'medium','OCR may have missed values','Several important stats are zero. This often means the screenshot was cropped or read incorrectly.', 'many_zeroes');
    if(s.acs>0&&s.adr===0)addIssue(issues,'medium','ADR missing','ACS exists but ADR is zero. The OCR may have missed the ADR column.', 'adr_missing');
    if(s.kills===0&&s.acs>160)addIssue(issues,'medium','Kills look suspicious','ACS is not low, but kills are zero. Check if the OCR shifted columns.', 'shifted_columns');

    const warnings=issues.map(i=>i.message);
    return {stats:s,warnings,issues,anomalies:issues,valid:!issues.some(i=>i.severity==='high')};
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

  function explain(input,row){
    const s=normalize(input);
    const d=dimensionScores(s);
    const perf=performanceScore(s);
    const factor=s.result==='win'?.55:.26;
    const base=s.result==='win'?74:-92;
    const lines=[
      {key:'match',label:'Match result',value:base,kind:s.result},
      {key:'damage',label:'Damage',value:d.damage*factor},
      {key:'survival',label:'Survival',value:d.survival*factor},
      {key:'entry',label:'Entry',value:d.entry*factor},
      {key:'team',label:'Team',value:d.team*factor},
      {key:'aim',label:'Aim',value:d.aim*factor},
      {key:'consistency',label:'Consistency',value:d.consistency*factor}
    ].map(x=>({...x,value:Math.round(x.value)}));
    const raw=calculateRawDelta(s);
    const adjusted=applyAdjustment(raw.delta,row,s.result);
    const adjustmentValue=adjusted.delta-raw.delta;
    if(adjustmentValue)lines.push({key:'adjustment',label:'Admin adjustment',value:adjustmentValue});
    return {
      version:VERSION,
      result:s.result,
      performance:Math.round(perf),
      raw_delta:raw.delta,
      adjusted_delta:adjusted.delta,
      final:adjusted.delta,
      adjustment:adjusted,
      lines
    };
  }

  function calculateRawDelta(input){
    const s=normalize(input);
    const perf=performanceScore(s);
    let delta;
    if(s.result==='win'){
      delta=74+(perf*.55);
      delta=Math.max(0,Math.round(delta));
    }else{
      delta=-92+(perf*.26);
      delta=Math.min(0,Math.round(delta));
    }
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

  function coachNotes(input){
    const s=normalize(input);
    const d=dimensionScores(s);
    const notes=[];
    const push=(title,body,level='info')=>notes.push({title,body,level});
    if(s.adr>=145&&s.kd_ratio<.85)push('Damage is not converting','High ADR with low K/D usually means damage is being dealt, but not finished into kills. Focus on trade timing and closing duels.','warning');
    if(s.kd_ratio<.72&&s.plus_minus<=-6)push('Duel conversion is weak','Low K/D and negative +/- mean the player is losing too many direct exchanges. Review crosshair placement, trade spacing and safer re-peeks.','warning');
    if(s.kast_percent<62&&s.first_deaths>=3)push('Too many early deaths','Low KAST and high FD suggest the player dies before the round value is created. Slow the first contact or ask for utility support.','danger');
    if(s.first_deaths>=3&&s.first_kills===0)push('Entry timing problem','No first kills with multiple first deaths points to poor opening timing. This player should avoid dry first contact for now.','warning');
    if(s.acs>=230&&d.team<0)push('Solo impact pattern','Good ACS with weak team value can mean the impact is mostly solo. Look for more trades, assists and round-saving decisions.','warning');
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
    let role='Stable';
    let description='Balanced profile with no extreme statistical signal yet.';
    const tags=[];
    if(s.first_kills>=3||d.entry>18){role='Entry';description='Creates first contact and opens rounds, but needs support if FD rises.';tags.push('first contact');}
    if(s.kast_percent>=76&&s.first_deaths<=1&&s.acs<210){role='Anchor';description='Stays alive, holds value and stabilizes rounds without needing huge ACS.';tags.push('low risk');}
    if(s.assists>=7||s.kast_percent>=78){role='Support';description='Adds team value through assists, survival and round presence.';tags.push('team value');}
    if(s.acs>=245||s.kd_ratio>=1.25){role='Fragger';description='High direct impact through kills and damage.';tags.push('damage');}
    if(s.first_deaths>=4||s.kast_percent<58||(s.first_deaths>=3&&s.first_kills===0)||(s.kd_ratio<.7&&s.plus_minus<=-6)){role='Risky';description='High death or weak-duel risk. Can still create pressure, but needs cleaner timing and more controlled first contacts.';tags.push('volatile');}
    if(s.acs>=250&&s.adr>=160&&s.kast_percent>=72){role='Carry potential';description='Strong damage, round presence and conversion. Give this player resources when form is high.';tags.push('priority resource');}
    return {role,description,tags};
  }

  function analyzeReport(input,row){
    const validation=validate(input);
    const calc=calculate(input,row);
    return {
      stats:validation.stats,
      validation,
      anomalies:validation.anomalies,
      calculation:calc,
      explain:explain(input,row),
      coachNotes:coachNotes(input),
      roleProfile:roleProfile(input)
    };
  }

  function ratingLabel(rating){
    const sr=Math.max(0,num(rating));
    return sr>=10000?'Eteris Player':'Chasing Eteris Player';
  }

  function recommendationForPlayer({reports=[],logs=[],rating=0,current={}}={}){
    const recentReports=reports.slice(-10);
    const analyses=recentReports.map(r=>analyzeReport(r,current));
    const recentDeltas=logs.slice(0,10).map(x=>num(x.delta)).filter(Number.isFinite);
    const sample=[...analyses.map(a=>a.calculation.raw_delta),...recentDeltas];
    const avg=sample.length?sample.reduce((a,b)=>a+b,0)/sample.length:0;
    const highRisk=analyses.filter(a=>a.roleProfile.role==='Risky'||a.coachNotes.some(n=>n.level==='danger')).length;
    const carry=analyses.filter(a=>a.roleProfile.role==='Carry potential'||a.roleProfile.role==='Fragger').length;
    const anomalyCount=analyses.reduce((sum,a)=>sum+a.anomalies.filter(x=>x.severity!=='low').length,0);
    const weakLosses=analyses.filter(a=>a.stats.result==='loss'&&a.calculation.raw_delta<-105).length;
    const strongWins=analyses.filter(a=>a.stats.result==='win'&&a.calculation.raw_delta>120).length;

    let gain=1,loss=1,flat=0;
    let reason='Not enough match data for an adjustment. Keep default multipliers and collect more reports.';
    let confidence=sample.length>=7?'High':sample.length>=3?'Medium':'Low';

    if(anomalyCount>=3){
      gain=.95;loss=1.05;flat=0;
      reason='Several reports contain anomalies. Suggested: keep scaling conservative until screenshots are cleaner.';
    }else if(highRisk>=3&&weakLosses>=2){
      gain=.94;loss=1.18;flat=0;
      reason='Pattern: risky deaths and heavy negative reports. Suggested: stricter losses and slightly lower gains until stability improves.';
    }else if(carry>=3&&strongWins>=2){
      gain=1.1;loss=.96;flat=0;
      reason='Pattern: repeated high impact. Suggested: small gain boost and slightly softer losses while form stays strong.';
    }else if(sample.length>=4&&avg<-80){
      gain=.96;loss=1.14;flat=0;
      reason='Recent SR trend is strongly negative. Suggested: increase loss pressure and reduce gains a little.';
    }else if(sample.length>=4&&avg>105){
      gain=1.08;loss=.96;flat=0;
      reason='Recent SR trend is strongly positive. Suggested: reward form with a controlled gain boost.';
    }else if(sample.length>=4&&Math.abs(avg)<22){
      gain=1;loss=1;flat=0;
      reason='Recent SR movement is stable. No custom multiplier is suggested.';
    }

    gain=round(gain,2);loss=round(loss,2);flat=Math.round(flat);
    const changed=gain!==1||loss!==1||flat!==0;
    return {
      gain_multiplier:gain,
      loss_multiplier:loss,
      flat_correction:flat,
      reason,
      confidence,
      changed,
      signals:{average_delta:Math.round(avg),high_risk:highRisk,carry_reports:carry,anomalies:anomalyCount},
      current:{
        gain_multiplier:num(current.sr_gain_multiplier,1),
        loss_multiplier:num(current.sr_loss_multiplier,1),
        flat_correction:num(current.sr_flat_bonus,0)
      }
    };
  }

  window.EterisSkillRating={
    VERSION,STAT_FIELDS,normalize,validate,dimensionScores,performanceScore,
    calculateRawDelta,applyAdjustment,calculate,explain,coachNotes,roleProfile,
    analyzeReport,ratingLabel,recommendationForPlayer
  };
})();
