import { type HTMLAttributes } from 'react';
import { type HandleProps } from '@xyflow/system';
export interface HandleComponentProps extends HandleProps, Omit<HTMLAttributes<HTMLDivElement>, 'id'> {
}
/**
 * The Handle component is a UI element that is used to connect nodes.
 */
export declare const Handle: import("react").MemoExoticComponent<(props: HandleComponentProps & import("react").RefAttributes<HTMLDivElement>) => import("react").ReactElement<any, string | import("react").JSXElementConstructor<any>> | null>;
//# sourceMappingURL=index.d.ts.map