export type BeautyFlowAccessState="active"|"expiring"|"expired_grace"|"expired"|"suspended";
export const BEAUTYFLOW_GRACE_DAYS=7;

type SubscriptionLike={active?:boolean|null;subscription_status?:string|null;subscription_ends_at?:string|null;trial_ends_at?:string|null};

export function subscriptionEnd(value:SubscriptionLike){return value.subscription_ends_at||value.trial_ends_at||null}
export function beautyFlowAccessState(value:SubscriptionLike,nowMs=Date.now()):BeautyFlowAccessState{
 const status=String(value.subscription_status||"").toLowerCase();
 if(value.active===false||status==="suspended")return"suspended";
 const end=subscriptionEnd(value);if(!end)return"active";
 const endMs=new Date(end).getTime();if(!Number.isFinite(endMs))return"active";
 const days=(endMs-nowMs)/86400000;
 if(days>=0)return days<=7?"expiring":"active";
 const elapsed=Math.abs(days);return elapsed<=BEAUTYFLOW_GRACE_DAYS?"expired_grace":"expired";
}
export function canCreateBeautyFlowBookings(value:SubscriptionLike,nowMs=Date.now()){const s=beautyFlowAccessState(value,nowMs);return s==="active"||s==="expiring"}
export function accessDays(value:SubscriptionLike,nowMs=Date.now()){const end=subscriptionEnd(value);if(!end)return null;const ms=new Date(end).getTime();if(!Number.isFinite(ms))return null;return Math.ceil((ms-nowMs)/86400000)}
