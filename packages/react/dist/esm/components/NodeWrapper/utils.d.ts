import type { XYPosition } from '@xyflow/system';
import type { Node, NodeTypes } from '../../types';
export declare const arrowKeyDiffs: Record<string, XYPosition>;
export declare const builtinNodeTypes: NodeTypes;
export declare function getNodeInlineStyleDimensions<NodeType extends Node = Node>(node: NodeType): {
    width: number | string | undefined;
    height: number | string | undefined;
};
//# sourceMappingURL=utils.d.ts.map