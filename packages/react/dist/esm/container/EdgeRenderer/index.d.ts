import { ReactNode } from 'react';
import { GraphViewProps } from '../GraphView';
import type { Edge, Node } from '../../types';
type EdgeRendererProps<EdgeType extends Edge = Edge> = Pick<GraphViewProps<Node, EdgeType>, 'onEdgeClick' | 'onEdgeDoubleClick' | 'defaultMarkerColor' | 'onlyRenderVisibleElements' | 'onEdgeUpdate' | 'onEdgeContextMenu' | 'onEdgeMouseEnter' | 'onEdgeMouseMove' | 'onEdgeMouseLeave' | 'onEdgeUpdateStart' | 'onEdgeUpdateEnd' | 'edgeUpdaterRadius' | 'noPanClassName' | 'rfId' | 'disableKeyboardA11y' | 'edgeTypes'> & {
    children?: ReactNode;
};
declare function EdgeRendererComponent<EdgeType extends Edge = Edge>({ defaultMarkerColor, onlyRenderVisibleElements, rfId, edgeTypes, noPanClassName, onEdgeUpdate, onEdgeContextMenu, onEdgeMouseEnter, onEdgeMouseMove, onEdgeMouseLeave, onEdgeClick, edgeUpdaterRadius, onEdgeDoubleClick, onEdgeUpdateStart, onEdgeUpdateEnd, disableKeyboardA11y, }: EdgeRendererProps<EdgeType>): import("react/jsx-runtime").JSX.Element;
declare namespace EdgeRendererComponent {
    var displayName: string;
}
export declare const EdgeRenderer: typeof EdgeRendererComponent;
export {};
//# sourceMappingURL=index.d.ts.map