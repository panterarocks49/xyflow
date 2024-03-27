/**
 * Test whether an object is useable as a Node
 * @public
 * @remarks In TypeScript this is a type guard that will narrow the type of whatever you pass in to Node if it returns true
 * @param element - The element to test
 * @returns A boolean indicating whether the element is an Node
 */
export declare const isNode: <NodeType extends unknown = any>(element: unknown) => element is NodeType;
/**
 * Test whether an object is useable as an Edge
 * @public
 * @remarks In TypeScript this is a type guard that will narrow the type of whatever you pass in to Edge if it returns true
 * @param element - The element to test
 * @returns A boolean indicating whether the element is an Edge
 */
export declare const isEdge: <EdgeType extends unknown = any>(element: unknown) => element is EdgeType;
//# sourceMappingURL=general.d.ts.map