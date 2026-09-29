import { Panel } from './Panel';
import { getMenaIntelligenceStore, subscribeMenaIntelligenceStore } from '@/services/mena-intelligence-store';

const COUNTRIES = [
  ['YE','Yemen'],['SA','Saudi Arabia'],['AE','United Arab Emirates'],['OM','Oman'],
  ['QA','Qatar'],['BH','Bahrain'],['KW','Kuwait'],['IQ','Iraq'],
  ['IR','Iran'],['IL','Israel'],['PS','Palestine'],['JO','Jordan'],
  ['LB','Lebanon'],['SY','Syria'],['TR','Türkiye'],['EG','Egypt'],
] as const;

function age(ts:number):string {
  if (!ts) return '—';
  const m=Math.max(0,Math.floor((Date.now()-ts)/60000));
  return m<60 ? `${m}m` : m<1440 ? `${Math.floor(m/60)}h` : `${Math.floor(m/1440)}d`;
}

export class MenaCountryIntelligencePanel extends Panel {
  private body:HTMLElement;
  private unsubscribe:(()=>void)|null=null;
  private timer:ReturnType<typeof setTimeout>|null=null;

  constructor(){
    super({
      id:'mena-country-intelligence',
      title:'MENA Country Intelligence',
      infoTooltip:'Descriptive country intelligence assembled from normalized events, entities, sources and recent observations. It is not a political or severity ranking.',
      showCount:true,
      className:'panel-wide',
      collapsible:true,
    });
    this.body=document.createElement('div');
    this.body.className='mena-country-intel-body';
    this.content.appendChild(this.body);
    this.render();
    this.unsubscribe=subscribeMenaIntelligenceStore(()=>{
      if(this.timer) clearTimeout(this.timer);
      this.timer=setTimeout(()=>this.render(),150);
    });
  }

  override destroy(){
    this.unsubscribe?.(); this.unsubscribe=null;
    if(this.timer) clearTimeout(this.timer);
    this.timer=null;
    super.destroy();
  }

  private render(){
    const {events,entities}=getMenaIntelligenceStore();
    const now=Date.now();
    this.body.replaceChildren();
    this.setCount(COUNTRIES.length);

    const grid=document.createElement('div');
    grid.className='mena-country-intel-grid';

    for(const [code,name] of COUNTRIES){
      const recent=events.filter(e=>e.location?.countryCode===code && e.timestamp>=now-86400000);
      const week=events.filter(e=>e.location?.countryCode===code && e.timestamp>=now-7*86400000);
      const linked=new Set(week.flatMap(e=>[...e.actorIds,...e.entityIds]));
      const sources=new Set(week.flatMap(e=>e.sourceIds));
      const types=new Map<string,number>();
      for(const e of week) types.set(e.eventType,(types.get(e.eventType)||0)+1);
      const latest=week.reduce((m,e)=>Math.max(m,e.lastUpdatedAt||e.timestamp),0);
      const topType=[...types.entries()].sort((a,b)=>b[1]-a[1])[0];

      const card=document.createElement('article');
      card.className='mena-country-intel-card';
      card.innerHTML=`
        <div class="mena-country-intel-head"><strong></strong><span>${code}</span></div>
        <div class="mena-country-intel-stats">
          <div><b>${recent.length}</b><small>24h events</small></div>
          <div><b>${week.length}</b><small>7d events</small></div>
          <div><b>${linked.size}</b><small>entities</small></div>
          <div><b>${sources.size}</b><small>sources</small></div>
        </div>
        <div class="mena-country-intel-meta"><span>Latest</span><b>${age(latest)}</b></div>
        <div class="mena-country-intel-meta"><span>Dominant type</span><b>${topType ? topType[0]+' ('+topType[1]+')' : '—'}</b></div>
      `;
      (card.querySelector('strong') as HTMLElement).textContent=name;
      card.title='Descriptive OSINT aggregation; not a risk ranking.';
      grid.appendChild(card);
    }

    this.body.appendChild(grid);
    if(!events.length){
      const empty=document.createElement('div');
      empty.className='mena-country-intel-empty';
      empty.textContent='Waiting for regional intelligence ingestion…';
      this.body.appendChild(empty);
    }

    const footer=document.createElement('div');
    footer.className='mena-country-intel-footer';
    footer.textContent=`Entity registry: ${entities.length} • Windows: 24h / 7d • Values describe observed reporting volume only.`;
    this.body.appendChild(footer);
  }
}
