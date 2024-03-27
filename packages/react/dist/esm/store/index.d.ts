import type { ReactFlowState, Node, Edge } from '../types';
declare const createRFStore: ({ nodes, edges, defaultNodes, defaultEdges, width, height, fitView, }: {
    nodes?: any[] | undefined;
    edges?: any[] | undefined;
    defaultNodes?: any[] | undefined;
    defaultEdges?: any[] | undefined;
    width?: number | undefined;
    height?: number | undefined;
    fitView?: boolean | undefined;
}) => import("zustand/traditional").UseBoundStoreWithEqualityFn<import("zustand").StoreApi<ReactFlowState<any, any>>>;
export { createRFStore };
//# sourceMappingURL=index.d.ts.map