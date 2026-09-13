function Icon({type}:{type:"scissors"|"comb"|"brush"|"spark"}){
 if(type==="scissors")return <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="15" cy="46" r="9"/><circle cx="49" cy="46" r="9"/><path d="M21 39 48 13M43 39 18 13"/></svg>;
 if(type==="comb")return <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 16h44v11H10zM14 27v22M21 27v22M28 27v22M35 27v22M42 27v22M49 27v22"/></svg>;
 if(type==="brush")return <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M19 43 42 20c6-6 12 0 6 6L25 49z"/><path d="M17 45c-7 3-8 9-8 9s6 1 10-5"/></svg>;
 return <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 7v18M32 39v18M7 32h18M39 32h18M15 15l12 12M37 37l12 12M49 15 37 27M27 37 15 49"/></svg>;
}
export default function BeautyDecor(){return <div className="bf-decor-layer" aria-hidden="true">
  <div className="bf-decor bf-decor-a"><Icon type="scissors"/></div>
  <div className="bf-decor bf-decor-b"><Icon type="comb"/></div>
  <div className="bf-decor bf-decor-c"><Icon type="brush"/></div>
  <div className="bf-decor bf-decor-d"><Icon type="spark"/></div>
</div>}
