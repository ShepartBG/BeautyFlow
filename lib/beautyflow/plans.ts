export const BEAUTYFLOW_PLANS={
 solo:{id:"solo",name:"Solo",staffLimit:1,price:40,description:"За самостоятелен специалист."},
 studio:{id:"studio",name:"Studio",staffLimit:3,price:60,description:"За малък екип до 3 активни специалисти."},
 pro:{id:"pro",name:"Pro",staffLimit:7,price:90,description:"За развиващ се салон до 7 специалисти."},
 premium:{id:"premium",name:"Premium",staffLimit:15,price:120,description:"За голям екип до 15 специалисти."},
} as const;
export type BeautyFlowPlanId=keyof typeof BEAUTYFLOW_PLANS;
export function beautyPlan(id?:string|null){return BEAUTYFLOW_PLANS[(id||"solo") as BeautyFlowPlanId]||BEAUTYFLOW_PLANS.solo}
export const BEAUTYFLOW_PLAN_LIST=Object.values(BEAUTYFLOW_PLANS);
