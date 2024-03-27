import { MarkerType, type EdgeMarker } from '@xyflow/system';
type SymbolProps = Omit<EdgeMarker, 'type'>;
export declare const MarkerSymbols: {
    [x: number]: ({ color, strokeWidth }: SymbolProps) => import("react/jsx-runtime").JSX.Element;
};
export declare function useMarkerSymbol(type: MarkerType): (({ color, strokeWidth }: SymbolProps) => import("react/jsx-runtime").JSX.Element) | null;
export {};
//# sourceMappingURL=MarkerSymbols.d.ts.map