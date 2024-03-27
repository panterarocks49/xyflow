"use client"
import { jsxs, Fragment, jsx } from 'react/jsx-runtime';
import { createContext, useContext, useMemo, useEffect, useRef, useState, useLayoutEffect, useCallback, memo, forwardRef } from 'react';
import cc from 'classcat';
import { errorMessages, infiniteExtent, isInputDOMNode, fitView, getViewportForBounds, pointToRendererPoint, rendererPointToPoint, isNodeBase, isEdgeBase, getElementsToRemove, isRectObject, nodeToRect, getOverlappingArea, getDimensions, XYPanZoom, PanOnScrollMode, SelectionMode, getEventPosition, getNodesInside, XYDrag, snapPosition, calculateNodePosition, Position, ConnectionMode, isMouseEvent, XYHandle, getHostForElement, addEdge, getNodesBounds, clampPosition, internalsSymbol, getNodeDimensions, nodeHasDimensions, getPositionWithOrigin, elementSelectionKeys, isEdgeVisible, MarkerType, createMarkerIds, isNumeric, getBezierEdgeCenter, getSmoothStepPath, getStraightPath, getBezierPath, getEdgePosition, getElevatedEdgeZIndex, getMarkerId, ConnectionLineType, updateConnectionLookup, adoptUserProvidedNodes, devWarn, updateNodeDimensions, updateAbsolutePositions, panBy, isMacOs, areConnectionMapsEqual, handleConnectionChange, shallowNodeData, getNodePositionWithOrigin, XYMinimap, getBoundsOfRects, ResizeControlVariant, XYResizer, XY_RESIZER_LINE_POSITIONS, XY_RESIZER_HANDLE_POSITIONS, getNodeToolbarTransform } from '@xyflow/system';
export { ConnectionLineType, ConnectionMode, MarkerType, PanOnScrollMode, Position, SelectionMode, addEdge, getBezierEdgeCenter, getBezierPath, getConnectedEdges, getEdgeCenter, getIncomers, getNodesBounds, getOutgoers, getSmoothStepPath, getStraightPath, getViewportForBounds, internalsSymbol, updateEdge } from '@xyflow/system';
import { useStoreWithEqualityFn, createWithEqualityFn } from 'zustand/traditional';
import { shallow } from 'zustand/shallow';
import { createPortal } from 'react-dom';

const StoreContext = createContext(null);
const Provider$1 = StoreContext.Provider;

const zustandErrorMessage = errorMessages['error001']();
/**
 * Hook for accessing the internal store. Should only be used in rare cases.
 *
 * @public
 * @param selector
 * @param equalityFn
 * @returns The selected state slice
 *
 * @example
 * const nodes = useStore((state: ReactFlowState<MyNodeType>) => state.nodes);
 *
 */
function useStore(selector, equalityFn) {
    const store = useContext(StoreContext);
    if (store === null) {
        throw new Error(zustandErrorMessage);
    }
    return useStoreWithEqualityFn(store, selector, equalityFn);
}
function useStoreApi() {
    const store = useContext(StoreContext);
    if (store === null) {
        throw new Error(zustandErrorMessage);
    }
    return useMemo(() => ({
        getState: store.getState,
        setState: store.setState,
        subscribe: store.subscribe,
        destroy: store.destroy,
    }), [store]);
}

const style = { display: 'none' };
const ariaLiveStyle = {
    position: 'absolute',
    width: 1,
    height: 1,
    margin: -1,
    border: 0,
    padding: 0,
    overflow: 'hidden',
    clip: 'rect(0px, 0px, 0px, 0px)',
    clipPath: 'inset(100%)',
};
const ARIA_NODE_DESC_KEY = 'react-flow__node-desc';
const ARIA_EDGE_DESC_KEY = 'react-flow__edge-desc';
const ARIA_LIVE_MESSAGE = 'react-flow__aria-live';
const selector$q = (s) => s.ariaLiveMessage;
function AriaLiveMessage({ rfId }) {
    const ariaLiveMessage = useStore(selector$q);
    return (jsx("div", { id: `${ARIA_LIVE_MESSAGE}-${rfId}`, "aria-live": "assertive", "aria-atomic": "true", style: ariaLiveStyle, children: ariaLiveMessage }));
}
function A11yDescriptions({ rfId, disableKeyboardA11y }) {
    return (jsxs(Fragment, { children: [jsxs("div", { id: `${ARIA_NODE_DESC_KEY}-${rfId}`, style: style, children: ["Press enter or space to select a node.", !disableKeyboardA11y && 'You can then use the arrow keys to move the node around.', " Press delete to remove it and escape to cancel.", ' '] }), jsx("div", { id: `${ARIA_EDGE_DESC_KEY}-${rfId}`, style: style, children: "Press enter or space to select an edge. You can then press delete to remove it or escape to cancel." }), !disableKeyboardA11y && jsx(AriaLiveMessage, { rfId: rfId })] }));
}

const selector$p = (s) => (s.userSelectionActive ? 'none' : 'all');
function Panel({ position = 'top-left', children, className, style, ...rest }) {
    const pointerEvents = useStore(selector$p);
    const positionClasses = `${position}`.split('-');
    return (jsx("div", { className: cc(['react-flow__panel', className, ...positionClasses]), style: { ...style, pointerEvents }, ...rest, children: children }));
}

function Attribution({ proOptions, position = 'bottom-right' }) {
    if (proOptions?.hideAttribution) {
        return null;
    }
    return (jsx(Panel, { position: position, className: "react-flow__attribution", "data-message": "Please only hide this attribution when you are subscribed to React Flow Pro: https://pro.reactflow.dev", children: jsx("a", { href: "https://reactflow.dev", target: "_blank", rel: "noopener noreferrer", "aria-label": "React Flow attribution", children: "React Flow" }) }));
}

const selector$o = (s) => ({
    selectedNodes: s.nodes.filter((n) => n.selected),
    selectedEdges: s.edges.filter((e) => e.selected),
});
const selectId = (obj) => obj.id;
function areEqual(a, b) {
    return (shallow(a.selectedNodes.map(selectId), b.selectedNodes.map(selectId)) &&
        shallow(a.selectedEdges.map(selectId), b.selectedEdges.map(selectId)));
}
function SelectionListenerInner({ onSelectionChange }) {
    const store = useStoreApi();
    const { selectedNodes, selectedEdges } = useStore(selector$o, areEqual);
    useEffect(() => {
        const params = { nodes: selectedNodes, edges: selectedEdges };
        onSelectionChange?.(params);
        store.getState().onSelectionChangeHandlers.forEach((fn) => fn(params));
    }, [selectedNodes, selectedEdges, onSelectionChange]);
    return null;
}
const changeSelector = (s) => !!s.onSelectionChangeHandlers;
function SelectionListener({ onSelectionChange }) {
    const storeHasSelectionChangeHandlers = useStore(changeSelector);
    if (onSelectionChange || storeHasSelectionChangeHandlers) {
        return jsx(SelectionListenerInner, { onSelectionChange: onSelectionChange });
    }
    return null;
}

const defaultNodeOrigin = [0, 0];
const defaultViewport = { x: 0, y: 0, zoom: 1 };

/*
 * This component helps us to update the store with the vlues coming from the user.
 * We distinguish between values we can update directly with `useDirectStoreUpdater` (like `snapGrid`)
 * and values that have a dedicated setter function in the store (like `setNodes`).
 */
// these fields exist in the global store and we need to keep them up to date
const reactFlowFieldsToTrack = [
    'nodes',
    'edges',
    'defaultNodes',
    'defaultEdges',
    'onConnect',
    'onConnectStart',
    'onConnectEnd',
    'onClickConnectStart',
    'onClickConnectEnd',
    'nodesDraggable',
    'nodesConnectable',
    'nodesFocusable',
    'edgesFocusable',
    'edgesUpdatable',
    'elevateNodesOnSelect',
    'elevateEdgesOnSelect',
    'minZoom',
    'maxZoom',
    'nodeExtent',
    'onNodesChange',
    'onEdgesChange',
    'elementsSelectable',
    'connectionMode',
    'snapGrid',
    'snapToGrid',
    'translateExtent',
    'connectOnClick',
    'defaultEdgeOptions',
    'fitView',
    'fitViewOptions',
    'onNodesDelete',
    'onEdgesDelete',
    'onDelete',
    'onNodeDrag',
    'onNodeDragStart',
    'onNodeDragStop',
    'onSelectionDrag',
    'onSelectionDragStart',
    'onSelectionDragStop',
    'onMoveStart',
    'onMove',
    'onMoveEnd',
    'noPanClassName',
    'nodeOrigin',
    'autoPanOnConnect',
    'autoPanOnNodeDrag',
    'onError',
    'connectionRadius',
    'isValidConnection',
    'selectNodesOnDrag',
    'nodeDragThreshold',
    'onBeforeDelete',
    'debug',
];
// rfId doesn't exist in ReactFlowProps, but it's one of the fields we want to update
const fieldsToTrack = [...reactFlowFieldsToTrack, 'rfId'];
const selector$n = (s) => ({
    setNodes: s.setNodes,
    setEdges: s.setEdges,
    setMinZoom: s.setMinZoom,
    setMaxZoom: s.setMaxZoom,
    setTranslateExtent: s.setTranslateExtent,
    setNodeExtent: s.setNodeExtent,
    reset: s.reset,
    setDefaultNodesAndEdges: s.setDefaultNodesAndEdges,
});
const initPrevValues = {
    // these are values that are also passed directly to other components
    // than the StoreUpdater. We can reduce the number of setStore calls
    // by setting the same values here as prev fields.
    translateExtent: infiniteExtent,
    nodeOrigin: defaultNodeOrigin,
    minZoom: 0.5,
    maxZoom: 2,
    elementsSelectable: true,
    noPanClassName: 'nopan',
    rfId: '1',
};
function StoreUpdater(props) {
    const { setNodes, setEdges, setMinZoom, setMaxZoom, setTranslateExtent, setNodeExtent, reset, setDefaultNodesAndEdges, } = useStore(selector$n, shallow);
    const store = useStoreApi();
    useEffect(() => {
        setDefaultNodesAndEdges(props.defaultNodes, props.defaultEdges);
        return () => {
            // when we reset the store we also need to reset the previous fields
            previousFields.current = initPrevValues;
            reset();
        };
    }, []);
    const previousFields = useRef(initPrevValues);
    useEffect(() => {
        for (const fieldName of fieldsToTrack) {
            const fieldValue = props[fieldName];
            const previousFieldValue = previousFields.current[fieldName];
            if (fieldValue === previousFieldValue)
                continue;
            if (typeof props[fieldName] === 'undefined')
                continue;
            // Custom handling with dedicated setters for some fields
            if (fieldName === 'nodes')
                setNodes(fieldValue);
            else if (fieldName === 'edges')
                setEdges(fieldValue);
            else if (fieldName === 'minZoom')
                setMinZoom(fieldValue);
            else if (fieldName === 'maxZoom')
                setMaxZoom(fieldValue);
            else if (fieldName === 'translateExtent')
                setTranslateExtent(fieldValue);
            else if (fieldName === 'nodeExtent')
                setNodeExtent(fieldValue);
            // Renamed fields
            else if (fieldName === 'fitView')
                store.setState({ fitViewOnInit: fieldValue });
            else if (fieldName === 'fitViewOptions')
                store.setState({ fitViewOnInitOptions: fieldValue });
            // General case
            else
                store.setState({ [fieldName]: fieldValue });
        }
        previousFields.current = props;
    }, 
    // Only re-run the effect if one of the fields we track changes
    fieldsToTrack.map((fieldName) => props[fieldName]));
    return null;
}

function getMediaQuery() {
    if (typeof window === 'undefined' || !window.matchMedia) {
        return null;
    }
    return window.matchMedia('(prefers-color-scheme: dark)');
}
/**
 * Hook for receiving the current color mode class 'dark' or 'light'.
 *
 * @internal
 * @param colorMode - The color mode to use ('dark', 'light' or 'system')
 */
function useColorModeClass(colorMode) {
    const [colorModeClass, setColorModeClass] = useState(colorMode === 'system' ? null : colorMode);
    useEffect(() => {
        if (colorMode !== 'system') {
            setColorModeClass(colorMode);
            return;
        }
        const mediaQuery = getMediaQuery();
        const updateColorModeClass = () => setColorModeClass(mediaQuery?.matches ? 'dark' : 'light');
        updateColorModeClass();
        mediaQuery?.addEventListener('change', updateColorModeClass);
        return () => {
            mediaQuery?.removeEventListener('change', updateColorModeClass);
        };
    }, [colorMode]);
    return colorModeClass !== null ? colorModeClass : getMediaQuery()?.matches ? 'dark' : 'light';
}

const defaultDoc = typeof document !== 'undefined' ? document : null;
/**
 * Hook for handling key events.
 *
 * @public
 * @param param.keyCode - The key code (string or array of strings) to use
 * @param param.options - Options
 * @returns boolean
 */
function useKeyPress(
// the keycode can be a string 'a' or an array of strings ['a', 'a+d']
// a string means a single key 'a' or a combination when '+' is used 'a+d'
// an array means different possibilites. Explainer: ['a', 'd+s'] here the
// user can use the single key 'a' or the combination 'd' + 's'
keyCode = null, options = { target: defaultDoc, actInsideInputWithModifier: true }) {
    const [keyPressed, setKeyPressed] = useState(false);
    // we need to remember if a modifier key is pressed in order to track it
    const modifierPressed = useRef(false);
    // we need to remember the pressed keys in order to support combinations
    const pressedKeys = useRef(new Set([]));
    // keyCodes = array with single keys [['a']] or key combinations [['a', 's']]
    // keysToWatch = array with all keys flattened ['a', 'd', 'ShiftLeft']
    // used to check if we store event.code or event.key. When the code is in the list of keysToWatch
    // we use the code otherwise the key. Explainer: When you press the left "command" key, the code is "MetaLeft"
    // and the key is "Meta". We want users to be able to pass keys and codes so we assume that the key is meant when
    // we can't find it in the list of keysToWatch.
    const [keyCodes, keysToWatch] = useMemo(() => {
        if (keyCode !== null) {
            const keyCodeArr = Array.isArray(keyCode) ? keyCode : [keyCode];
            const keys = keyCodeArr.filter((kc) => typeof kc === 'string').map((kc) => kc.split('+'));
            const keysFlat = keys.reduce((res, item) => res.concat(...item), []);
            return [keys, keysFlat];
        }
        return [[], []];
    }, [keyCode]);
    useEffect(() => {
        const target = options?.target || defaultDoc;
        if (keyCode !== null) {
            const downHandler = (event) => {
                modifierPressed.current = event.ctrlKey || event.metaKey || event.shiftKey;
                const preventAction = (!modifierPressed.current || (modifierPressed.current && !options.actInsideInputWithModifier)) &&
                    isInputDOMNode(event);
                if (preventAction) {
                    return false;
                }
                const keyOrCode = useKeyOrCode(event.code, keysToWatch);
                pressedKeys.current.add(event[keyOrCode]);
                if (isMatchingKey(keyCodes, pressedKeys.current, false)) {
                    event.preventDefault();
                    setKeyPressed(true);
                }
            };
            const upHandler = (event) => {
                const preventAction = (!modifierPressed.current || (modifierPressed.current && !options.actInsideInputWithModifier)) &&
                    isInputDOMNode(event);
                if (preventAction) {
                    return false;
                }
                const keyOrCode = useKeyOrCode(event.code, keysToWatch);
                if (isMatchingKey(keyCodes, pressedKeys.current, true)) {
                    setKeyPressed(false);
                    pressedKeys.current.clear();
                }
                else {
                    pressedKeys.current.delete(event[keyOrCode]);
                }
                // fix for Mac: when cmd key is pressed, keyup is not triggered for any other key, see: https://stackoverflow.com/questions/27380018/when-cmd-key-is-kept-pressed-keyup-is-not-triggered-for-any-other-key
                if (event.key === 'Meta') {
                    pressedKeys.current.clear();
                }
                modifierPressed.current = false;
            };
            const resetHandler = () => {
                pressedKeys.current.clear();
                setKeyPressed(false);
            };
            target?.addEventListener('keydown', downHandler);
            target?.addEventListener('keyup', upHandler);
            window.addEventListener('blur', resetHandler);
            return () => {
                target?.removeEventListener('keydown', downHandler);
                target?.removeEventListener('keyup', upHandler);
                window.removeEventListener('blur', resetHandler);
            };
        }
    }, [keyCode, setKeyPressed]);
    return keyPressed;
}
// utils
function isMatchingKey(keyCodes, pressedKeys, isUp) {
    return (keyCodes
        // we only want to compare same sizes of keyCode definitions
        // and pressed keys. When the user specified 'Meta' as a key somewhere
        // this would also be truthy without this filter when user presses 'Meta' + 'r'
        .filter((keys) => isUp || keys.length === pressedKeys.size)
        // since we want to support multiple possibilities only one of the
        // combinations need to be part of the pressed keys
        .some((keys) => keys.every((k) => pressedKeys.has(k))));
}
function useKeyOrCode(eventCode, keysToWatch) {
    return keysToWatch.includes(eventCode) ? 'code' : 'key';
}

const selector$m = (s) => !!s.panZoom;
/**
 * Hook for getting viewport helper functions.
 *
 * @internal
 * @returns viewport helper functions
 */
const useViewportHelper = () => {
    const store = useStoreApi();
    const panZoomInitialized = useStore(selector$m);
    const viewportHelperFunctions = useMemo(() => {
        return {
            zoomIn: (options) => store.getState().panZoom?.scaleBy(1.2, { duration: options?.duration }),
            zoomOut: (options) => store.getState().panZoom?.scaleBy(1 / 1.2, { duration: options?.duration }),
            zoomTo: (zoomLevel, options) => store.getState().panZoom?.scaleTo(zoomLevel, { duration: options?.duration }),
            getZoom: () => store.getState().transform[2],
            setViewport: (viewport, options) => {
                const { transform: [tX, tY, tZoom], panZoom, } = store.getState();
                panZoom?.setViewport({
                    x: viewport.x ?? tX,
                    y: viewport.y ?? tY,
                    zoom: viewport.zoom ?? tZoom,
                }, { duration: options?.duration });
            },
            getViewport: () => {
                const [x, y, zoom] = store.getState().transform;
                return { x, y, zoom };
            },
            fitView: (options) => {
                const { nodes, width, height, nodeOrigin, minZoom, maxZoom, panZoom } = store.getState();
                return panZoom
                    ? fitView({
                        nodes,
                        width,
                        height,
                        nodeOrigin,
                        minZoom,
                        maxZoom,
                        panZoom,
                    }, options)
                    : false;
            },
            setCenter: (x, y, options) => {
                const { width, height, maxZoom, panZoom } = store.getState();
                const nextZoom = typeof options?.zoom !== 'undefined' ? options.zoom : maxZoom;
                const centerX = width / 2 - x * nextZoom;
                const centerY = height / 2 - y * nextZoom;
                panZoom?.setViewport({
                    x: centerX,
                    y: centerY,
                    zoom: nextZoom,
                }, { duration: options?.duration });
            },
            fitBounds: (bounds, options) => {
                const { width, height, minZoom, maxZoom, panZoom } = store.getState();
                const viewport = getViewportForBounds(bounds, width, height, minZoom, maxZoom, options?.padding ?? 0.1);
                panZoom?.setViewport(viewport, { duration: options?.duration });
            },
            screenToFlowPosition: (clientPosition, options = { snapToGrid: true }) => {
                const { transform, snapGrid, domNode } = store.getState();
                if (!domNode) {
                    return clientPosition;
                }
                const { x: domX, y: domY } = domNode.getBoundingClientRect();
                const correctedPosition = {
                    x: clientPosition.x - domX,
                    y: clientPosition.y - domY,
                };
                return pointToRendererPoint(correctedPosition, transform, options.snapToGrid, snapGrid);
            },
            flowToScreenPosition: (flowPosition) => {
                const { transform, domNode } = store.getState();
                if (!domNode) {
                    return flowPosition;
                }
                const { x: domX, y: domY } = domNode.getBoundingClientRect();
                const rendererPosition = rendererPointToPoint(flowPosition, transform);
                return {
                    x: rendererPosition.x + domX,
                    y: rendererPosition.y + domY,
                };
            },
            viewportInitialized: panZoomInitialized,
        };
    }, [panZoomInitialized]);
    return viewportHelperFunctions;
};

function handleParentExpand(updatedElements, updateItem) {
    for (const [index, item] of updatedElements.entries()) {
        if (item.id === updateItem.parentNode) {
            const parent = { ...item };
            parent.computed ??= {};
            const extendWidth = updateItem.position.x + updateItem.computed.width - parent.computed.width;
            const extendHeight = updateItem.position.y + updateItem.computed.height - parent.computed.height;
            if (extendWidth > 0 || extendHeight > 0 || updateItem.position.x < 0 || updateItem.position.y < 0) {
                parent.width = parent.width ?? parent.computed.width;
                parent.height = parent.height ?? parent.computed.height;
                if (extendWidth > 0) {
                    parent.width += extendWidth;
                }
                if (extendHeight > 0) {
                    parent.height += extendHeight;
                }
                if (updateItem.position.x < 0) {
                    const xDiff = Math.abs(updateItem.position.x);
                    parent.position.x = parent.position.x - xDiff;
                    parent.width += xDiff;
                    updateItem.position.x = 0;
                }
                if (updateItem.position.y < 0) {
                    const yDiff = Math.abs(updateItem.position.y);
                    parent.position.y = parent.position.y - yDiff;
                    parent.height += yDiff;
                    updateItem.position.y = 0;
                }
                parent.computed.width = parent.width;
                parent.computed.height = parent.height;
                updatedElements[index] = parent;
            }
            break;
        }
    }
}
// This function applies changes to nodes or edges that are triggered by React Flow internally.
// When you drag a node for example, React Flow will send a position change update.
// This function then applies the changes and returns the updated elements.
function applyChanges(changes, elements) {
    const updatedElements = [];
    // By storing a map of changes for each element, we can a quick lookup as we
    // iterate over the elements array!
    const changesMap = new Map();
    for (const change of changes) {
        if (change.type === 'add') {
            updatedElements.push(change.item);
            continue;
        }
        else if (change.type === 'remove' || change.type === 'replace') {
            // For a 'remove' change we can safely ignore any other changes queued for
            // the same element, it's going to be removed anyway!
            changesMap.set(change.id, [change]);
        }
        else {
            const elementChanges = changesMap.get(change.id);
            if (elementChanges) {
                // If we have some changes queued already, we can do a mutable update of
                // that array and save ourselves some copying.
                elementChanges.push(change);
            }
            else {
                changesMap.set(change.id, [change]);
            }
        }
    }
    for (const element of elements) {
        const changes = changesMap.get(element.id);
        // When there are no changes for an element we can just push it unmodified,
        // no need to copy it.
        if (!changes) {
            updatedElements.push(element);
            continue;
        }
        // If we have a 'remove' change queued, it'll be the only change in the array
        if (changes[0].type === 'remove') {
            continue;
        }
        if (changes[0].type === 'replace') {
            updatedElements.push({ ...changes[0].item });
            continue;
        }
        // For other types of changes, we want to start with a shallow copy of the
        // object so React knows this element has changed. Sequential changes will
        /// each _mutate_ this object, so there's only ever one copy.
        const updatedElement = { ...element };
        for (const change of changes) {
            applyChange(change, updatedElement, updatedElements);
        }
        updatedElements.push(updatedElement);
    }
    return updatedElements;
}
// Applies a single change to an element. This is a *mutable* update.
function applyChange(change, element, elements = []) {
    switch (change.type) {
        case 'select': {
            element.selected = change.selected;
            break;
        }
        case 'position': {
            if (typeof change.position !== 'undefined') {
                element.position = change.position;
            }
            if (typeof change.positionAbsolute !== 'undefined') {
                element.computed ??= {};
                element.computed.positionAbsolute = change.positionAbsolute;
            }
            if (typeof change.dragging !== 'undefined') {
                element.dragging = change.dragging;
            }
            if (element.expandParent) {
                handleParentExpand(elements, element);
            }
            break;
        }
        case 'dimensions': {
            if (typeof change.dimensions !== 'undefined') {
                element.computed ??= {};
                element.computed.width = change.dimensions.width;
                element.computed.height = change.dimensions.height;
                if (change.resizing) {
                    element.width = change.dimensions.width;
                    element.height = change.dimensions.height;
                }
            }
            if (typeof change.resizing === 'boolean') {
                element.resizing = change.resizing;
            }
            if (element.expandParent) {
                handleParentExpand(elements, element);
            }
            break;
        }
    }
}
/**
 * Drop in function that applies node changes to an array of nodes.
 * @public
 * @remarks Various events on the <ReactFlow /> component can produce an {@link NodeChange} that describes how to update the edges of your flow in some way.
 If you don't need any custom behaviour, this util can be used to take an array of these changes and apply them to your edges.
 * @param changes - Array of changes to apply
 * @param nodes - Array of nodes to apply the changes to
 * @returns Array of updated nodes
 * @example
 *  const onNodesChange = useCallback(
      (changes) => {
        setNodes((oldNodes) => applyNodeChanges(changes, oldNodes));
      },
      [setNodes],
    );
  
    return (
      <ReactFLow nodes={nodes} edges={edges} onNodesChange={onNodesChange} />
    );
 */
function applyNodeChanges(changes, nodes) {
    return applyChanges(changes, nodes);
}
/**
 * Drop in function that applies edge changes to an array of edges.
 * @public
 * @remarks Various events on the <ReactFlow /> component can produce an {@link EdgeChange} that describes how to update the edges of your flow in some way.
 If you don't need any custom behaviour, this util can be used to take an array of these changes and apply them to your edges.
 * @param changes - Array of changes to apply
 * @param edges - Array of edge to apply the changes to
 * @returns Array of updated edges
 * @example
 *  const onEdgesChange = useCallback(
      (changes) => {
        setEdges((oldEdges) => applyEdgeChanges(changes, oldEdges));
      },
      [setEdges],
    );
  
    return (
      <ReactFlow nodes={nodes} edges={edges} onEdgesChange={onEdgesChange} />
    );
 */
function applyEdgeChanges(changes, edges) {
    return applyChanges(changes, edges);
}
function createSelectionChange(id, selected) {
    return {
        id,
        type: 'select',
        selected,
    };
}
function getSelectionChanges(items, selectedIds = new Set(), mutateItem = false) {
    const changes = [];
    for (const item of items) {
        const willBeSelected = selectedIds.has(item.id);
        // we don't want to set all items to selected=false on the first selection
        if (!(item.selected === undefined && !willBeSelected) && item.selected !== willBeSelected) {
            if (mutateItem) {
                // this hack is needed for nodes. When the user dragged a node, it's selected.
                // When another node gets dragged, we need to deselect the previous one,
                // in order to have only one selected node at a time - the onNodesChange callback comes too late here :/
                item.selected = willBeSelected;
            }
            changes.push(createSelectionChange(item.id, willBeSelected));
        }
    }
    return changes;
}
function getElementsDiffChanges({ items = [], lookup, }) {
    const changes = [];
    const itemsLookup = new Map(items.map((item) => [item.id, item]));
    for (const item of items) {
        const storeItem = lookup.get(item.id);
        if (storeItem !== undefined && storeItem !== item) {
            changes.push({ id: item.id, item: item, type: 'replace' });
        }
        if (storeItem === undefined) {
            changes.push({ item: item, type: 'add' });
        }
    }
    for (const [id] of lookup) {
        const nextNode = itemsLookup.get(id);
        if (nextNode === undefined) {
            changes.push({ id, type: 'remove' });
        }
    }
    return changes;
}

/**
 * Test whether an object is useable as a Node
 * @public
 * @remarks In TypeScript this is a type guard that will narrow the type of whatever you pass in to Node if it returns true
 * @param element - The element to test
 * @returns A boolean indicating whether the element is an Node
 */
const isNode = (element) => isNodeBase(element);
/**
 * Test whether an object is useable as an Edge
 * @public
 * @remarks In TypeScript this is a type guard that will narrow the type of whatever you pass in to Edge if it returns true
 * @param element - The element to test
 * @returns A boolean indicating whether the element is an Edge
 */
const isEdge = (element) => isEdgeBase(element);

// we need this hook to prevent a warning when using react-flow in SSR
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Hook for accessing the ReactFlow instance.
 *
 * @public
 * @returns ReactFlowInstance
 */
function useReactFlow() {
    const viewportHelper = useViewportHelper();
    const store = useStoreApi();
    const getNodes = useCallback(() => {
        return store.getState().nodes.map((n) => ({ ...n }));
    }, []);
    const getNode = useCallback((id) => {
        return store.getState().nodeLookup.get(id);
    }, []);
    const getEdges = useCallback(() => {
        const { edges = [] } = store.getState();
        return edges.map((e) => ({ ...e }));
    }, []);
    const getEdge = useCallback((id) => {
        const { edges = [] } = store.getState();
        return edges.find((e) => e.id === id);
    }, []);
    // A reference of all the batched updates to process before the next render. We
    // want a mutable reference here so multiple synchronous calls to `setNodes` etc
    // can be batched together.
    const setElementsQueue = useRef({ nodes: [], edges: [] });
    // Because we're using a ref above, we need some way to let React know when to
    // actually process the queue. We flip this bit of state to `true` any time we
    // mutate the queue and then flip it back to `false` after flushing the queue.
    const [shouldFlushQueue, setShouldFlushQueue] = useState(false);
    // Layout effects are guaranteed to run before the next render which means we
    // shouldn't run into any issues with stale state or weird issues that come from
    // rendering things one frame later than expected (we used to use `setTimeout`).
    useIsomorphicLayoutEffect(() => {
        // Because we need to flip the state back to false after flushing, this should
        // trigger the hook again (!). If the hook is being run again we know that any
        // updates should have been processed by now and we can safely clear the queue
        // and bail early.
        if (!shouldFlushQueue) {
            setElementsQueue.current = { nodes: [], edges: [] };
            return;
        }
        if (setElementsQueue.current.nodes.length) {
            const { nodes = [], setNodes, hasDefaultNodes, onNodesChange, nodeLookup } = store.getState();
            // This is essentially an `Array.reduce` in imperative clothing. Processing
            // this queue is a relatively hot path so we'd like to avoid the overhead of
            // array methods where we can.
            let next = nodes;
            for (const payload of setElementsQueue.current.nodes) {
                next = typeof payload === 'function' ? payload(next) : payload;
            }
            if (hasDefaultNodes) {
                setNodes(next);
            }
            else if (onNodesChange) {
                onNodesChange(getElementsDiffChanges({
                    items: next,
                    lookup: nodeLookup,
                }));
            }
            setElementsQueue.current.nodes = [];
        }
        if (setElementsQueue.current.edges.length) {
            const { edges = [], setEdges, hasDefaultEdges, onEdgesChange, edgeLookup } = store.getState();
            let next = edges;
            for (const payload of setElementsQueue.current.edges) {
                next = typeof payload === 'function' ? payload(next) : payload;
            }
            if (hasDefaultEdges) {
                setEdges(next);
            }
            else if (onEdgesChange) {
                onEdgesChange(getElementsDiffChanges({
                    items: next,
                    lookup: edgeLookup,
                }));
            }
            setElementsQueue.current.edges = [];
        }
        // Beacuse we're using reactive state to trigger this effect, we need to flip
        // it back to false.
        setShouldFlushQueue(false);
    }, [shouldFlushQueue]);
    const setNodes = useCallback((payload) => {
        setElementsQueue.current.nodes.push(payload);
        setShouldFlushQueue(true);
    }, []);
    const setEdges = useCallback((payload) => {
        setElementsQueue.current.edges.push(payload);
        setShouldFlushQueue(true);
    }, []);
    const addNodes = useCallback((payload) => {
        const newNodes = Array.isArray(payload) ? payload : [payload];
        // Queueing a functional update means that we won't worry about other calls
        // to `setNodes` that might happen elsewhere.
        setElementsQueue.current.nodes.push((nodes) => [...nodes, ...newNodes]);
        setShouldFlushQueue(true);
    }, []);
    const addEdges = useCallback((payload) => {
        const newEdges = Array.isArray(payload) ? payload : [payload];
        setElementsQueue.current.edges.push((edges) => [...edges, ...newEdges]);
        setShouldFlushQueue(true);
    }, []);
    const toObject = useCallback(() => {
        const { nodes = [], edges = [], transform } = store.getState();
        const [x, y, zoom] = transform;
        return {
            nodes: nodes.map((n) => ({ ...n })),
            edges: edges.map((e) => ({ ...e })),
            viewport: {
                x,
                y,
                zoom,
            },
        };
    }, []);
    const deleteElements = useCallback(async ({ nodes: nodesToRemove = [], edges: edgesToRemove = [] }) => {
        const { nodes, edges, hasDefaultNodes, hasDefaultEdges, onNodesDelete, onEdgesDelete, onNodesChange, onEdgesChange, onDelete, onBeforeDelete, } = store.getState();
        const { nodes: matchingNodes, edges: matchingEdges } = await getElementsToRemove({
            nodesToRemove,
            edgesToRemove,
            nodes,
            edges,
            onBeforeDelete,
        });
        const hasMatchingEdges = matchingEdges.length > 0;
        const hasMatchingNodes = matchingNodes.length > 0;
        if (hasMatchingEdges) {
            if (hasDefaultEdges) {
                const nextEdges = edges.filter((e) => !matchingEdges.some((mE) => mE.id === e.id));
                store.getState().setEdges(nextEdges);
            }
            onEdgesDelete?.(matchingEdges);
            onEdgesChange?.(matchingEdges.map((edge) => ({
                id: edge.id,
                type: 'remove',
            })));
        }
        if (hasMatchingNodes) {
            if (hasDefaultNodes) {
                const nextNodes = nodes.filter((n) => !matchingNodes.some((mN) => mN.id === n.id));
                store.getState().setNodes(nextNodes);
            }
            onNodesDelete?.(matchingNodes);
            onNodesChange?.(matchingNodes.map((node) => ({ id: node.id, type: 'remove' })));
        }
        if (hasMatchingNodes || hasMatchingEdges) {
            onDelete?.({ nodes: matchingNodes, edges: matchingEdges });
        }
        return { deletedNodes: matchingNodes, deletedEdges: matchingEdges };
    }, []);
    const getNodeRect = useCallback((nodeOrRect) => {
        const isRect = isRectObject(nodeOrRect);
        const node = isRect ? null : store.getState().nodeLookup.get(nodeOrRect.id);
        if (!isRect && !node) {
            return [null, null, isRect];
        }
        const nodeRect = isRect ? nodeOrRect : nodeToRect(node);
        return [nodeRect, node, isRect];
    }, []);
    const getIntersectingNodes = useCallback((nodeOrRect, partially = true, nodes) => {
        const [nodeRect, node, isRect] = getNodeRect(nodeOrRect);
        if (!nodeRect) {
            return [];
        }
        return (nodes || store.getState().nodes).filter((n) => {
            if (!isRect && (n.id === node.id || !n.computed?.positionAbsolute)) {
                return false;
            }
            const currNodeRect = nodeToRect(n);
            const overlappingArea = getOverlappingArea(currNodeRect, nodeRect);
            const partiallyVisible = partially && overlappingArea > 0;
            return partiallyVisible || overlappingArea >= nodeRect.width * nodeRect.height;
        });
    }, []);
    const isNodeIntersecting = useCallback((nodeOrRect, area, partially = true) => {
        const [nodeRect] = getNodeRect(nodeOrRect);
        if (!nodeRect) {
            return false;
        }
        const overlappingArea = getOverlappingArea(nodeRect, area);
        const partiallyVisible = partially && overlappingArea > 0;
        return partiallyVisible || overlappingArea >= nodeRect.width * nodeRect.height;
    }, []);
    const updateNode = useCallback((id, nodeUpdate, options = { replace: true }) => {
        setNodes((prevNodes) => prevNodes.map((node) => {
            if (node.id === id) {
                const nextNode = typeof nodeUpdate === 'function' ? nodeUpdate(node) : nodeUpdate;
                return options.replace && isNode(nextNode) ? nextNode : { ...node, ...nextNode };
            }
            return node;
        }));
    }, [setNodes]);
    const updateNodeData = useCallback((id, dataUpdate, options = { replace: false }) => {
        updateNode(id, (node) => {
            const nextData = typeof dataUpdate === 'function' ? dataUpdate(node) : dataUpdate;
            return options.replace ? { ...node, data: nextData } : { ...node, data: { ...node.data, ...nextData } };
        }, options);
    }, [updateNode]);
    return useMemo(() => {
        return {
            ...viewportHelper,
            getNodes,
            getNode,
            getEdges,
            getEdge,
            setNodes,
            setEdges,
            addNodes,
            addEdges,
            toObject,
            deleteElements,
            getIntersectingNodes,
            isNodeIntersecting,
            updateNode,
            updateNodeData,
        };
    }, [
        viewportHelper,
        getNodes,
        getNode,
        getEdges,
        getEdge,
        setNodes,
        setEdges,
        addNodes,
        addEdges,
        toObject,
        deleteElements,
        getIntersectingNodes,
        isNodeIntersecting,
        updateNode,
        updateNodeData,
    ]);
}

const selected = (item) => item.selected;
const deleteKeyOptions = { actInsideInputWithModifier: false };
/**
 * Hook for handling global key events.
 *
 * @internal
 */
function useGlobalKeyHandler({ deleteKeyCode, multiSelectionKeyCode, }) {
    const store = useStoreApi();
    const { deleteElements } = useReactFlow();
    const deleteKeyPressed = useKeyPress(deleteKeyCode, deleteKeyOptions);
    const multiSelectionKeyPressed = useKeyPress(multiSelectionKeyCode);
    useEffect(() => {
        if (deleteKeyPressed) {
            const { edges, nodes } = store.getState();
            deleteElements({ nodes: nodes.filter(selected), edges: edges.filter(selected) });
            store.setState({ nodesSelectionActive: false });
        }
    }, [deleteKeyPressed]);
    useEffect(() => {
        store.setState({ multiSelectionActive: multiSelectionKeyPressed });
    }, [multiSelectionKeyPressed]);
}

/**
 * Hook for handling resize events.
 *
 * @internal
 */
function useResizeHandler(domNode) {
    const store = useStoreApi();
    useEffect(() => {
        const updateDimensions = () => {
            if (!domNode.current) {
                return false;
            }
            const size = getDimensions(domNode.current);
            if (size.height === 0 || size.width === 0) {
                store.getState().onError?.('004', errorMessages['error004']());
            }
            store.setState({ width: size.width || 500, height: size.height || 500 });
        };
        if (domNode.current) {
            updateDimensions();
            window.addEventListener('resize', updateDimensions);
            const resizeObserver = new ResizeObserver(() => updateDimensions());
            resizeObserver.observe(domNode.current);
            return () => {
                window.removeEventListener('resize', updateDimensions);
                if (resizeObserver && domNode.current) {
                    resizeObserver.unobserve(domNode.current);
                }
            };
        }
    }, []);
}

const containerStyle = {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
};

const selector$l = (s) => ({
    userSelectionActive: s.userSelectionActive,
    lib: s.lib,
});
function ZoomPane({ onPaneContextMenu, zoomOnScroll = true, zoomOnPinch = true, panOnScroll = false, panOnScrollSpeed = 0.5, panOnScrollMode = PanOnScrollMode.Free, zoomOnDoubleClick = true, panOnDrag = true, defaultViewport, translateExtent, minZoom, maxZoom, zoomActivationKeyCode, preventScrolling = true, children, noWheelClassName, noPanClassName, onViewportChange, isControlledViewport, }) {
    const store = useStoreApi();
    const zoomPane = useRef(null);
    const { userSelectionActive, lib } = useStore(selector$l, shallow);
    const zoomActivationKeyPressed = useKeyPress(zoomActivationKeyCode);
    const panZoom = useRef();
    useResizeHandler(zoomPane);
    useEffect(() => {
        if (zoomPane.current) {
            panZoom.current = XYPanZoom({
                domNode: zoomPane.current,
                minZoom,
                maxZoom,
                translateExtent,
                viewport: defaultViewport,
                onTransformChange: (transform) => {
                    onViewportChange?.({ x: transform[0], y: transform[1], zoom: transform[2] });
                    if (!isControlledViewport) {
                        store.setState({ transform });
                    }
                },
                onDraggingChange: (paneDragging) => store.setState({ paneDragging }),
                onPanZoomStart: (event, vp) => {
                    const { onViewportChangeStart, onMoveStart } = store.getState();
                    onMoveStart?.(event, vp);
                    onViewportChangeStart?.(vp);
                },
                onPanZoom: (event, vp) => {
                    const { onViewportChange, onMove } = store.getState();
                    onMove?.(event, vp);
                    onViewportChange?.(vp);
                },
                onPanZoomEnd: (event, vp) => {
                    const { onViewportChangeEnd, onMoveEnd } = store.getState();
                    onMoveEnd?.(event, vp);
                    onViewportChangeEnd?.(vp);
                },
            });
            const { x, y, zoom } = panZoom.current.getViewport();
            store.setState({
                panZoom: panZoom.current,
                transform: [x, y, zoom],
                domNode: zoomPane.current.closest('.react-flow'),
            });
            return () => {
                panZoom.current?.destroy();
            };
        }
    }, []);
    useEffect(() => {
        panZoom.current?.update({
            onPaneContextMenu,
            zoomOnScroll,
            zoomOnPinch,
            panOnScroll,
            panOnScrollSpeed,
            panOnScrollMode,
            zoomOnDoubleClick,
            panOnDrag,
            zoomActivationKeyPressed,
            preventScrolling,
            noPanClassName,
            userSelectionActive,
            noWheelClassName,
            lib,
        });
    }, [
        onPaneContextMenu,
        zoomOnScroll,
        zoomOnPinch,
        panOnScroll,
        panOnScrollSpeed,
        panOnScrollMode,
        zoomOnDoubleClick,
        panOnDrag,
        zoomActivationKeyPressed,
        preventScrolling,
        noPanClassName,
        userSelectionActive,
        noWheelClassName,
        lib,
    ]);
    return (jsx("div", { className: "react-flow__renderer", ref: zoomPane, style: containerStyle, children: children }));
}

const selector$k = (s) => ({
    userSelectionActive: s.userSelectionActive,
    userSelectionRect: s.userSelectionRect,
});
function UserSelection() {
    const { userSelectionActive, userSelectionRect } = useStore(selector$k, shallow);
    const isActive = userSelectionActive && userSelectionRect;
    if (!isActive) {
        return null;
    }
    return (jsx("div", { className: "react-flow__selection react-flow__container", style: {
            width: userSelectionRect.width,
            height: userSelectionRect.height,
            transform: `translate(${userSelectionRect.x}px, ${userSelectionRect.y}px)`,
        } }));
}

const wrapHandler = (handler, containerRef) => {
    return (event) => {
        if (event.target !== containerRef.current) {
            return;
        }
        handler?.(event);
    };
};
const selector$j = (s) => ({
    userSelectionActive: s.userSelectionActive,
    elementsSelectable: s.elementsSelectable,
    dragging: s.paneDragging,
});
function Pane({ isSelecting, selectionMode = SelectionMode.Full, panOnDrag, onSelectionStart, onSelectionEnd, onPaneClick, onPaneContextMenu, onPaneScroll, onPaneMouseEnter, onPaneMouseMove, onPaneMouseLeave, children, }) {
    const container = useRef(null);
    const store = useStoreApi();
    const prevSelectedNodesCount = useRef(0);
    const prevSelectedEdgesCount = useRef(0);
    const containerBounds = useRef();
    const { userSelectionActive, elementsSelectable, dragging } = useStore(selector$j, shallow);
    const resetUserSelection = () => {
        store.setState({ userSelectionActive: false, userSelectionRect: null });
        prevSelectedNodesCount.current = 0;
        prevSelectedEdgesCount.current = 0;
    };
    const onClick = (event) => {
        onPaneClick?.(event);
        store.getState().resetSelectedElements();
        store.setState({ nodesSelectionActive: false });
    };
    const onContextMenu = (event) => {
        if (Array.isArray(panOnDrag) && panOnDrag?.includes(2)) {
            event.preventDefault();
            return;
        }
        onPaneContextMenu?.(event);
    };
    const onWheel = onPaneScroll ? (event) => onPaneScroll(event) : undefined;
    const onMouseDown = (event) => {
        const { resetSelectedElements, domNode } = store.getState();
        containerBounds.current = domNode?.getBoundingClientRect();
        if (!elementsSelectable ||
            !isSelecting ||
            event.button !== 0 ||
            event.target !== container.current ||
            !containerBounds.current) {
            return;
        }
        const { x, y } = getEventPosition(event.nativeEvent, containerBounds.current);
        resetSelectedElements();
        store.setState({
            userSelectionRect: {
                width: 0,
                height: 0,
                startX: x,
                startY: y,
                x,
                y,
            },
        });
        onSelectionStart?.(event);
    };
    const onMouseMove = (event) => {
        const { userSelectionRect, edges, transform, nodeOrigin, nodes, triggerNodeChanges, triggerEdgeChanges } = store.getState();
        if (!isSelecting || !containerBounds.current || !userSelectionRect) {
            return;
        }
        store.setState({ userSelectionActive: true, nodesSelectionActive: false });
        const mousePos = getEventPosition(event.nativeEvent, containerBounds.current);
        const startX = userSelectionRect.startX ?? 0;
        const startY = userSelectionRect.startY ?? 0;
        const nextUserSelectRect = {
            ...userSelectionRect,
            x: mousePos.x < startX ? mousePos.x : startX,
            y: mousePos.y < startY ? mousePos.y : startY,
            width: Math.abs(mousePos.x - startX),
            height: Math.abs(mousePos.y - startY),
        };
        const selectedNodes = getNodesInside(nodes, nextUserSelectRect, transform, selectionMode === SelectionMode.Partial, true, nodeOrigin);
        const selectedEdgeIds = new Set();
        const selectedNodeIds = new Set();
        for (const selectedNode of selectedNodes) {
            selectedNodeIds.add(selectedNode.id);
            for (const edge of edges) {
                if (edge.source === selectedNode.id || edge.target === selectedNode.id) {
                    selectedEdgeIds.add(edge.id);
                }
            }
        }
        if (prevSelectedNodesCount.current !== selectedNodeIds.size) {
            prevSelectedNodesCount.current = selectedNodeIds.size;
            const changes = getSelectionChanges(nodes, selectedNodeIds, true);
            triggerNodeChanges(changes);
        }
        if (prevSelectedEdgesCount.current !== selectedEdgeIds.size) {
            prevSelectedEdgesCount.current = selectedEdgeIds.size;
            const changes = getSelectionChanges(edges, selectedEdgeIds);
            triggerEdgeChanges(changes);
        }
        store.setState({
            userSelectionRect: nextUserSelectRect,
        });
    };
    const onMouseUp = (event) => {
        if (event.button !== 0) {
            return;
        }
        const { userSelectionRect } = store.getState();
        // We only want to trigger click functions when in selection mode if
        // the user did not move the mouse.
        if (!userSelectionActive && userSelectionRect && event.target === container.current) {
            onClick?.(event);
        }
        store.setState({ nodesSelectionActive: prevSelectedNodesCount.current > 0 });
        resetUserSelection();
        onSelectionEnd?.(event);
    };
    const onMouseLeave = (event) => {
        if (userSelectionActive) {
            store.setState({ nodesSelectionActive: prevSelectedNodesCount.current > 0 });
            onSelectionEnd?.(event);
        }
        resetUserSelection();
    };
    const hasActiveSelection = elementsSelectable && (isSelecting || userSelectionActive);
    return (jsxs("div", { className: cc(['react-flow__pane', { draggable: panOnDrag, dragging, selection: isSelecting }]), onClick: hasActiveSelection ? undefined : wrapHandler(onClick, container), onContextMenu: wrapHandler(onContextMenu, container), onWheel: wrapHandler(onWheel, container), onMouseEnter: hasActiveSelection ? undefined : onPaneMouseEnter, onMouseDown: hasActiveSelection ? onMouseDown : undefined, onMouseMove: hasActiveSelection ? onMouseMove : onPaneMouseMove, onMouseUp: hasActiveSelection ? onMouseUp : undefined, onMouseLeave: hasActiveSelection ? onMouseLeave : onPaneMouseLeave, ref: container, style: containerStyle, children: [children, jsx(UserSelection, {})] }));
}

// this handler is called by
// 1. the click handler when node is not draggable or selectNodesOnDrag = false
// or
// 2. the on drag start handler when node is draggable and selectNodesOnDrag = true
function handleNodeClick({ id, store, unselect = false, nodeRef, }) {
    const { addSelectedNodes, unselectNodesAndEdges, multiSelectionActive, nodeLookup, onError } = store.getState();
    const node = nodeLookup.get(id);
    if (!node) {
        onError?.('012', errorMessages['error012'](id));
        return;
    }
    store.setState({ nodesSelectionActive: false });
    if (!node.selected) {
        addSelectedNodes([id]);
    }
    else if (unselect || (node.selected && multiSelectionActive)) {
        unselectNodesAndEdges({ nodes: [node], edges: [] });
        requestAnimationFrame(() => nodeRef?.current?.blur());
    }
}

/**
 * Hook for calling XYDrag helper from @xyflow/system.
 *
 * @internal
 */
function useDrag({ nodeRef, disabled = false, noDragClassName, handleSelector, nodeId, isSelectable, }) {
    const store = useStoreApi();
    const [dragging, setDragging] = useState(false);
    const xyDrag = useRef();
    useEffect(() => {
        xyDrag.current = XYDrag({
            getStoreItems: () => store.getState(),
            onNodeMouseDown: (id) => {
                handleNodeClick({
                    id,
                    store,
                    nodeRef,
                });
            },
            onDragStart: () => {
                setDragging(true);
            },
            onDragStop: () => {
                setDragging(false);
            },
        });
    }, []);
    useEffect(() => {
        if (disabled) {
            xyDrag.current?.destroy();
        }
        else if (nodeRef.current) {
            xyDrag.current?.update({
                noDragClassName,
                handleSelector,
                domNode: nodeRef.current,
                isSelectable,
                nodeId,
            });
            return () => {
                xyDrag.current?.destroy();
            };
        }
    }, [noDragClassName, handleSelector, disabled, isSelectable, nodeRef, nodeId]);
    return dragging;
}

const selectedAndDraggable = (nodesDraggable) => (n) => n.selected && (n.draggable || (nodesDraggable && typeof n.draggable === 'undefined'));
/**
 * Hook for updating node positions by passing a direction and factor
 *
 * @internal
 * @returns function for updating node positions
 */
function useMoveSelectedNodes() {
    const store = useStoreApi();
    const moveSelectedNodes = useCallback((params) => {
        const { nodeExtent, nodes, snapToGrid, snapGrid, nodesDraggable, onError, updateNodePositions, nodeLookup, nodeOrigin, } = store.getState();
        const selectedNodes = nodes.filter(selectedAndDraggable(nodesDraggable));
        // by default a node moves 5px on each key press
        // if snap grid is enabled, we use that for the velocity
        const xVelo = snapToGrid ? snapGrid[0] : 5;
        const yVelo = snapToGrid ? snapGrid[1] : 5;
        const xDiff = params.direction.x * xVelo * params.factor;
        const yDiff = params.direction.y * yVelo * params.factor;
        const nodeUpdates = selectedNodes.map((node) => {
            if (node.computed?.positionAbsolute) {
                let nextPosition = {
                    x: node.computed.positionAbsolute.x + xDiff,
                    y: node.computed.positionAbsolute.y + yDiff,
                };
                if (snapToGrid) {
                    nextPosition = snapPosition(nextPosition, snapGrid);
                }
                const { position, positionAbsolute } = calculateNodePosition({
                    nodeId: node.id,
                    nextPosition,
                    nodeLookup,
                    nodeExtent,
                    nodeOrigin,
                    onError,
                });
                node.position = position;
                node.computed.positionAbsolute = positionAbsolute;
            }
            return node;
        });
        updateNodePositions(nodeUpdates);
    }, []);
    return moveSelectedNodes;
}

const NodeIdContext = createContext(null);
const Provider = NodeIdContext.Provider;
NodeIdContext.Consumer;
const useNodeId = () => {
    const nodeId = useContext(NodeIdContext);
    return nodeId;
};

const selector$i = (s) => ({
    connectOnClick: s.connectOnClick,
    noPanClassName: s.noPanClassName,
    rfId: s.rfId,
});
const connectingSelector = (nodeId, handleId, type) => (state) => {
    const { connectionStartHandle: startHandle, connectionEndHandle: endHandle, connectionClickStartHandle: clickHandle, connectionMode, connectionStatus, } = state;
    const connectingTo = endHandle?.nodeId === nodeId && endHandle?.handleId === handleId && endHandle?.type === type;
    return {
        connectingFrom: startHandle?.nodeId === nodeId && startHandle?.handleId === handleId && startHandle?.type === type,
        connectingTo,
        clickConnecting: clickHandle?.nodeId === nodeId && clickHandle?.handleId === handleId && clickHandle?.type === type,
        isPossibleEndHandle: connectionMode === ConnectionMode.Strict
            ? startHandle?.type !== type
            : nodeId !== startHandle?.nodeId || handleId !== startHandle?.handleId,
        connectionInProcess: !!startHandle,
        valid: connectingTo && connectionStatus === 'valid',
    };
};
function HandleComponent({ type = 'source', position = Position.Top, isValidConnection, isConnectable = true, isConnectableStart = true, isConnectableEnd = true, id, onConnect, children, className, onMouseDown, onTouchStart, ...rest }, ref) {
    const handleId = id || null;
    const isTarget = type === 'target';
    const store = useStoreApi();
    const nodeId = useNodeId();
    const { connectOnClick, noPanClassName, rfId } = useStore(selector$i, shallow);
    const { connectingFrom, connectingTo, clickConnecting, isPossibleEndHandle, connectionInProcess, valid } = useStore(connectingSelector(nodeId, handleId, type), shallow);
    if (!nodeId) {
        store.getState().onError?.('010', errorMessages['error010']());
    }
    const onConnectExtended = (params) => {
        const { defaultEdgeOptions, onConnect: onConnectAction, hasDefaultEdges } = store.getState();
        const edgeParams = {
            ...defaultEdgeOptions,
            ...params,
        };
        if (hasDefaultEdges) {
            const { edges, setEdges } = store.getState();
            setEdges(addEdge(edgeParams, edges));
        }
        onConnectAction?.(edgeParams);
        onConnect?.(edgeParams);
    };
    const onPointerDown = (event) => {
        if (!nodeId) {
            return;
        }
        const isMouseTriggered = isMouseEvent(event.nativeEvent);
        if (isConnectableStart &&
            ((isMouseTriggered && event.button === 0) || !isMouseTriggered)) {
            const currentStore = store.getState();
            XYHandle.onPointerDown(event.nativeEvent, {
                autoPanOnConnect: currentStore.autoPanOnConnect,
                connectionMode: currentStore.connectionMode,
                connectionRadius: currentStore.connectionRadius,
                domNode: currentStore.domNode,
                nodes: currentStore.nodes,
                lib: currentStore.lib,
                isTarget,
                handleId,
                nodeId,
                flowId: currentStore.rfId,
                panBy: currentStore.panBy,
                cancelConnection: currentStore.cancelConnection,
                onConnectStart: currentStore.onConnectStart,
                onConnectEnd: currentStore.onConnectEnd,
                updateConnection: currentStore.updateConnection,
                onConnect: onConnectExtended,
                isValidConnection: isValidConnection || currentStore.isValidConnection,
                getTransform: () => store.getState().transform,
            });
        }
        if (isMouseTriggered) {
            onMouseDown?.(event);
        }
        else {
            onTouchStart?.(event);
        }
    };
    const onClick = (event) => {
        const { onClickConnectStart, onClickConnectEnd, connectionClickStartHandle, connectionMode, isValidConnection: isValidConnectionStore, lib, rfId: flowId, } = store.getState();
        if (!nodeId || (!connectionClickStartHandle && !isConnectableStart)) {
            return;
        }
        if (!connectionClickStartHandle) {
            onClickConnectStart?.(event.nativeEvent, { nodeId, handleId, handleType: type });
            store.setState({ connectionClickStartHandle: { nodeId, type, handleId } });
            return;
        }
        const doc = getHostForElement(event.target);
        const isValidConnectionHandler = isValidConnection || isValidConnectionStore;
        const { connection, isValid } = XYHandle.isValid(event.nativeEvent, {
            handle: {
                nodeId,
                id: handleId,
                type,
            },
            connectionMode,
            fromNodeId: connectionClickStartHandle.nodeId,
            fromHandleId: connectionClickStartHandle.handleId || null,
            fromType: connectionClickStartHandle.type,
            isValidConnection: isValidConnectionHandler,
            flowId,
            doc,
            lib,
        });
        if (isValid && connection) {
            onConnectExtended(connection);
        }
        onClickConnectEnd?.(event);
        store.setState({ connectionClickStartHandle: null });
    };
    return (jsx("div", { "data-handleid": handleId, "data-nodeid": nodeId, "data-handlepos": position, "data-id": `${rfId}-${nodeId}-${handleId}-${type}`, className: cc([
            'react-flow__handle',
            `react-flow__handle-${position}`,
            'nodrag',
            noPanClassName,
            className,
            {
                source: !isTarget,
                target: isTarget,
                connectable: isConnectable,
                connectablestart: isConnectableStart,
                connectableend: isConnectableEnd,
                clickconnecting: clickConnecting,
                connectingfrom: connectingFrom,
                connectingto: connectingTo,
                valid,
                // shows where you can start a connection from
                // and where you can end it while connecting
                connectionindicator: isConnectable &&
                    (!connectionInProcess || isPossibleEndHandle) &&
                    (connectionInProcess ? isConnectableEnd : isConnectableStart),
            },
        ]), onMouseDown: onPointerDown, onTouchStart: onPointerDown, onClick: connectOnClick ? onClick : undefined, ref: ref, ...rest, children: children }));
}
/**
 * The Handle component is a UI element that is used to connect nodes.
 */
const Handle = memo(forwardRef(HandleComponent));

function InputNode({ data, isConnectable, sourcePosition = Position.Bottom }) {
    return (jsxs(Fragment, { children: [data?.label, jsx(Handle, { type: "source", position: sourcePosition, isConnectable: isConnectable })] }));
}

function DefaultNode({ data, isConnectable, targetPosition = Position.Top, sourcePosition = Position.Bottom, }) {
    return (jsxs(Fragment, { children: [jsx(Handle, { type: "target", position: targetPosition, isConnectable: isConnectable }), data?.label, jsx(Handle, { type: "source", position: sourcePosition, isConnectable: isConnectable })] }));
}

function GroupNode() {
    return null;
}

function OutputNode({ data, isConnectable, targetPosition = Position.Top }) {
    return (jsxs(Fragment, { children: [jsx(Handle, { type: "target", position: targetPosition, isConnectable: isConnectable }), data?.label] }));
}

const arrowKeyDiffs = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
};
const builtinNodeTypes = {
    input: InputNode,
    default: DefaultNode,
    output: OutputNode,
    group: GroupNode,
};
function getNodeInlineStyleDimensions(node) {
    if (!node.computed) {
        return {
            width: node.width ?? node.initialWidth ?? node.style?.width,
            height: node.height ?? node.initialHeight ?? node.style?.height,
        };
    }
    return {
        width: node.width ?? node.style?.width,
        height: node.height ?? node.style?.height,
    };
}

const selector$h = (s) => {
    const selectedNodes = s.nodes.filter((n) => n.selected);
    const { width, height, x, y } = getNodesBounds(selectedNodes, { nodeOrigin: s.nodeOrigin });
    return {
        width,
        height,
        userSelectionActive: s.userSelectionActive,
        transformString: `translate(${s.transform[0]}px,${s.transform[1]}px) scale(${s.transform[2]}) translate(${x}px,${y}px)`,
    };
};
function NodesSelection({ onSelectionContextMenu, noPanClassName, disableKeyboardA11y, }) {
    const store = useStoreApi();
    const { width, height, transformString, userSelectionActive } = useStore(selector$h, shallow);
    const moveSelectedNodes = useMoveSelectedNodes();
    const nodeRef = useRef(null);
    useEffect(() => {
        if (!disableKeyboardA11y) {
            nodeRef.current?.focus({
                preventScroll: true,
            });
        }
    }, [disableKeyboardA11y]);
    useDrag({
        nodeRef,
    });
    if (userSelectionActive || !width || !height) {
        return null;
    }
    const onContextMenu = onSelectionContextMenu
        ? (event) => {
            const selectedNodes = store.getState().nodes.filter((n) => n.selected);
            onSelectionContextMenu(event, selectedNodes);
        }
        : undefined;
    const onKeyDown = (event) => {
        if (Object.prototype.hasOwnProperty.call(arrowKeyDiffs, event.key)) {
            moveSelectedNodes({
                direction: arrowKeyDiffs[event.key],
                factor: event.shiftKey ? 4 : 1,
            });
        }
    };
    return (jsx("div", { className: cc(['react-flow__nodesselection', 'react-flow__container', noPanClassName]), style: {
            transform: transformString,
        }, children: jsx("div", { ref: nodeRef, className: "react-flow__nodesselection-rect", onContextMenu: onContextMenu, tabIndex: disableKeyboardA11y ? undefined : -1, onKeyDown: disableKeyboardA11y ? undefined : onKeyDown, style: {
                width,
                height,
            } }) }));
}

const selector$g = (s) => {
    return { nodesSelectionActive: s.nodesSelectionActive, userSelectionActive: s.userSelectionActive };
};
function FlowRendererComponent({ children, onPaneClick, onPaneMouseEnter, onPaneMouseMove, onPaneMouseLeave, onPaneContextMenu, onPaneScroll, deleteKeyCode, selectionKeyCode, selectionOnDrag, selectionMode, onSelectionStart, onSelectionEnd, multiSelectionKeyCode, panActivationKeyCode, zoomActivationKeyCode, elementsSelectable, zoomOnScroll, zoomOnPinch, panOnScroll: _panOnScroll, panOnScrollSpeed, panOnScrollMode, zoomOnDoubleClick, panOnDrag: _panOnDrag, defaultViewport, translateExtent, minZoom, maxZoom, preventScrolling, onSelectionContextMenu, noWheelClassName, noPanClassName, disableKeyboardA11y, onViewportChange, isControlledViewport, }) {
    const { nodesSelectionActive, userSelectionActive } = useStore(selector$g);
    const selectionKeyPressed = useKeyPress(selectionKeyCode);
    const panActivationKeyPressed = useKeyPress(panActivationKeyCode);
    const panOnDrag = panActivationKeyPressed || _panOnDrag;
    const panOnScroll = panActivationKeyPressed || _panOnScroll;
    const isSelecting = selectionKeyPressed || userSelectionActive || (selectionOnDrag && panOnDrag !== true);
    useGlobalKeyHandler({ deleteKeyCode, multiSelectionKeyCode });
    return (jsx(ZoomPane, { onPaneContextMenu: onPaneContextMenu, elementsSelectable: elementsSelectable, zoomOnScroll: zoomOnScroll, zoomOnPinch: zoomOnPinch, panOnScroll: panOnScroll, panOnScrollSpeed: panOnScrollSpeed, panOnScrollMode: panOnScrollMode, zoomOnDoubleClick: zoomOnDoubleClick, panOnDrag: !selectionKeyPressed && panOnDrag, defaultViewport: defaultViewport, translateExtent: translateExtent, minZoom: minZoom, maxZoom: maxZoom, zoomActivationKeyCode: zoomActivationKeyCode, preventScrolling: preventScrolling, noWheelClassName: noWheelClassName, noPanClassName: noPanClassName, onViewportChange: onViewportChange, isControlledViewport: isControlledViewport, children: jsxs(Pane, { onSelectionStart: onSelectionStart, onSelectionEnd: onSelectionEnd, onPaneClick: onPaneClick, onPaneMouseEnter: onPaneMouseEnter, onPaneMouseMove: onPaneMouseMove, onPaneMouseLeave: onPaneMouseLeave, onPaneContextMenu: onPaneContextMenu, onPaneScroll: onPaneScroll, panOnDrag: panOnDrag, isSelecting: !!isSelecting, selectionMode: selectionMode, children: [children, nodesSelectionActive && (jsx(NodesSelection, { onSelectionContextMenu: onSelectionContextMenu, noPanClassName: noPanClassName, disableKeyboardA11y: disableKeyboardA11y }))] }) }));
}
FlowRendererComponent.displayName = 'FlowRenderer';
const FlowRenderer = memo(FlowRendererComponent);

const selector$f = (onlyRenderVisible) => (s) => {
    return onlyRenderVisible
        ? getNodesInside(s.nodes, { x: 0, y: 0, width: s.width, height: s.height }, s.transform, true).map((node) => node.id)
        : Array.from(s.nodeLookup.keys());
};
/**
 * Hook for getting the visible node ids from the store.
 *
 * @internal
 * @param onlyRenderVisible
 * @returns array with visible node ids
 */
function useVisibleNodeIds(onlyRenderVisible) {
    const nodeIds = useStore(useCallback(selector$f(onlyRenderVisible), [onlyRenderVisible]), shallow);
    return nodeIds;
}

const selector$e = (s) => s.updateNodeDimensions;
function useResizeObserver() {
    const updateNodeDimensions = useStore(selector$e);
    const resizeObserverRef = useRef();
    const resizeObserver = useMemo(() => {
        if (typeof ResizeObserver === 'undefined') {
            return null;
        }
        const observer = new ResizeObserver((entries) => {
            const updates = new Map();
            entries.forEach((entry) => {
                const id = entry.target.getAttribute('data-id');
                updates.set(id, {
                    id,
                    nodeElement: entry.target,
                    forceUpdate: true,
                });
            });
            updateNodeDimensions(updates);
        });
        resizeObserverRef.current = observer;
        return observer;
    }, []);
    useEffect(() => {
        return () => {
            resizeObserverRef?.current?.disconnect();
        };
    }, []);
    return resizeObserver;
}

function NodeWrapper({ id, onClick, onMouseEnter, onMouseMove, onMouseLeave, onContextMenu, onDoubleClick, nodesDraggable, elementsSelectable, nodesConnectable, nodesFocusable, resizeObserver, noDragClassName, noPanClassName, disableKeyboardA11y, rfId, nodeTypes, nodeExtent, nodeOrigin, onError, }) {
    const { node, positionAbsoluteX, positionAbsoluteY, zIndex, isParent } = useStore((s) => {
        const node = s.nodeLookup.get(id);
        const positionAbsolute = nodeExtent
            ? clampPosition(node.computed?.positionAbsolute, nodeExtent)
            : node.computed?.positionAbsolute || { x: 0, y: 0 };
        return {
            node,
            // we are mutating positionAbsolute, z and isParent attributes for sub flows
            // so we we need to force a re-render when some change
            positionAbsoluteX: positionAbsolute.x,
            positionAbsoluteY: positionAbsolute.y,
            zIndex: node[internalsSymbol]?.z ?? 0,
            isParent: !!node[internalsSymbol]?.isParent,
        };
    }, shallow);
    let nodeType = node.type || 'default';
    let NodeComponent = nodeTypes?.[nodeType] || builtinNodeTypes[nodeType];
    if (NodeComponent === undefined) {
        onError?.('003', errorMessages['error003'](nodeType));
        nodeType = 'default';
        NodeComponent = builtinNodeTypes.default;
    }
    const isDraggable = !!(node.draggable || (nodesDraggable && typeof node.draggable === 'undefined'));
    const isSelectable = !!(node.selectable || (elementsSelectable && typeof node.selectable === 'undefined'));
    const isConnectable = !!(node.connectable || (nodesConnectable && typeof node.connectable === 'undefined'));
    const isFocusable = !!(node.focusable || (nodesFocusable && typeof node.focusable === 'undefined'));
    const store = useStoreApi();
    const nodeRef = useRef(null);
    const prevSourcePosition = useRef(node.sourcePosition);
    const prevTargetPosition = useRef(node.targetPosition);
    const prevType = useRef(nodeType);
    const nodeDimensions = getNodeDimensions(node);
    const inlineDimensions = getNodeInlineStyleDimensions(node);
    const initialized = nodeHasDimensions(node);
    const hasHandleBounds = !!node[internalsSymbol]?.handleBounds;
    const moveSelectedNodes = useMoveSelectedNodes();
    useEffect(() => {
        return () => {
            if (nodeRef.current) {
                resizeObserver?.unobserve(nodeRef.current);
            }
        };
    }, []);
    useEffect(() => {
        if (nodeRef.current && !node.hidden) {
            const currNode = nodeRef.current;
            if (!initialized || !hasHandleBounds) {
                resizeObserver?.unobserve(currNode);
                resizeObserver?.observe(currNode);
            }
        }
    }, [node.hidden, initialized, hasHandleBounds]);
    useEffect(() => {
        // when the user programmatically changes the source or handle position, we re-initialize the node
        const typeChanged = prevType.current !== nodeType;
        const sourcePosChanged = prevSourcePosition.current !== node.sourcePosition;
        const targetPosChanged = prevTargetPosition.current !== node.targetPosition;
        if (nodeRef.current && (typeChanged || sourcePosChanged || targetPosChanged)) {
            if (typeChanged) {
                prevType.current = nodeType;
            }
            if (sourcePosChanged) {
                prevSourcePosition.current = node.sourcePosition;
            }
            if (targetPosChanged) {
                prevTargetPosition.current = node.targetPosition;
            }
            store.getState().updateNodeDimensions(new Map([[id, { id, nodeElement: nodeRef.current, forceUpdate: true }]]));
        }
    }, [id, nodeType, node.sourcePosition, node.targetPosition]);
    const dragging = useDrag({
        nodeRef,
        disabled: node.hidden || !isDraggable,
        noDragClassName,
        handleSelector: node.dragHandle,
        nodeId: id,
        isSelectable,
    });
    if (node.hidden) {
        return null;
    }
    const positionAbsoluteOrigin = getPositionWithOrigin({
        x: positionAbsoluteX,
        y: positionAbsoluteY,
        ...nodeDimensions,
        origin: node.origin || nodeOrigin,
    });
    const hasPointerEvents = isSelectable || isDraggable || onClick || onMouseEnter || onMouseMove || onMouseLeave;
    const onMouseEnterHandler = onMouseEnter ? (event) => onMouseEnter(event, { ...node }) : undefined;
    const onMouseMoveHandler = onMouseMove ? (event) => onMouseMove(event, { ...node }) : undefined;
    const onMouseLeaveHandler = onMouseLeave ? (event) => onMouseLeave(event, { ...node }) : undefined;
    const onContextMenuHandler = onContextMenu ? (event) => onContextMenu(event, { ...node }) : undefined;
    const onDoubleClickHandler = onDoubleClick ? (event) => onDoubleClick(event, { ...node }) : undefined;
    const onSelectNodeHandler = (event) => {
        const { selectNodesOnDrag, nodeDragThreshold } = store.getState();
        if (isSelectable && (!selectNodesOnDrag || !isDraggable || nodeDragThreshold > 0)) {
            // this handler gets called by XYDrag on drag start when selectNodesOnDrag=true
            // here we only need to call it when selectNodesOnDrag=false
            handleNodeClick({
                id,
                store,
                nodeRef,
            });
        }
        if (onClick) {
            onClick(event, { ...node });
        }
    };
    const onKeyDown = (event) => {
        if (isInputDOMNode(event.nativeEvent) || disableKeyboardA11y) {
            return;
        }
        if (elementSelectionKeys.includes(event.key) && isSelectable) {
            const unselect = event.key === 'Escape';
            handleNodeClick({
                id,
                store,
                unselect,
                nodeRef,
            });
        }
        else if (isDraggable && node.selected && Object.prototype.hasOwnProperty.call(arrowKeyDiffs, event.key)) {
            store.setState({
                ariaLiveMessage: `Moved selected node ${event.key
                    .replace('Arrow', '')
                    .toLowerCase()}. New position, x: ${~~positionAbsoluteX}, y: ${~~positionAbsoluteY}`,
            });
            moveSelectedNodes({
                direction: arrowKeyDiffs[event.key],
                factor: event.shiftKey ? 4 : 1,
            });
        }
    };
    return (jsx("div", { className: cc([
            'react-flow__node',
            `react-flow__node-${nodeType}`,
            {
                // this is overwritable by passing `nopan` as a class name
                [noPanClassName]: isDraggable,
            },
            node.className,
            {
                selected: node.selected,
                selectable: isSelectable,
                parent: isParent,
                draggable: isDraggable,
                dragging,
            },
        ]), ref: nodeRef, style: {
            zIndex,
            transform: `translate(${positionAbsoluteOrigin.x}px,${positionAbsoluteOrigin.y}px)`,
            pointerEvents: hasPointerEvents ? 'all' : 'none',
            visibility: initialized ? 'visible' : 'hidden',
            ...node.style,
            ...inlineDimensions,
        }, "data-id": id, "data-testid": `rf__node-${id}`, onMouseEnter: onMouseEnterHandler, onMouseMove: onMouseMoveHandler, onMouseLeave: onMouseLeaveHandler, onContextMenu: onContextMenuHandler, onClick: onSelectNodeHandler, onDoubleClick: onDoubleClickHandler, onKeyDown: isFocusable ? onKeyDown : undefined, tabIndex: isFocusable ? 0 : undefined, role: isFocusable ? 'button' : undefined, "aria-describedby": disableKeyboardA11y ? undefined : `${ARIA_NODE_DESC_KEY}-${rfId}`, "aria-label": node.ariaLabel, children: jsx(Provider, { value: id, children: jsx(NodeComponent, { id: id, data: node.data, type: nodeType, positionAbsoluteX: positionAbsoluteX, positionAbsoluteY: positionAbsoluteY, selected: node.selected, isConnectable: isConnectable, sourcePosition: node.sourcePosition, targetPosition: node.targetPosition, dragging: dragging, dragHandle: node.dragHandle, zIndex: zIndex, ...nodeDimensions }) }) }));
}

const selector$d = (s) => ({
    nodesDraggable: s.nodesDraggable,
    nodesConnectable: s.nodesConnectable,
    nodesFocusable: s.nodesFocusable,
    elementsSelectable: s.elementsSelectable,
    onError: s.onError,
});
function NodeRendererComponent(props) {
    const { nodesDraggable, nodesConnectable, nodesFocusable, elementsSelectable, onError } = useStore(selector$d, shallow);
    const nodeIds = useVisibleNodeIds(props.onlyRenderVisibleElements);
    const resizeObserver = useResizeObserver();
    return (jsx("div", { className: "react-flow__nodes", style: containerStyle, children: nodeIds.map((nodeId) => {
            return (
            // The split of responsibilities between NodeRenderer and
            // NodeComponentWrapper may appear weird. However, it’s designed to
            // minimize the cost of updates when individual nodes change.
            //
            // For example, when you’re dragging a single node, that node gets
            // updated multiple times per second. If `NodeRenderer` were to update
            // every time, it would have to re-run the `nodes.map()` loop every
            // time. This gets pricey with hundreds of nodes, especially if every
            // loop cycle does more than just rendering a JSX element!
            //
            // As a result of this choice, we took the following implementation
            // decisions:
            // - NodeRenderer subscribes *only* to node IDs – and therefore
            //   rerender *only* when visible nodes are added or removed.
            // - NodeRenderer performs all operations the result of which can be
            //   shared between nodes (such as creating the `ResizeObserver`
            //   instance, or subscribing to `selector`). This means extra prop
            //   drilling into `NodeComponentWrapper`, but it means we need to run
            //   these operations only once – instead of once per node.
            // - Any operations that you’d normally write inside `nodes.map` are
            //   moved into `NodeComponentWrapper`. This ensures they are
            //   memorized – so if `NodeRenderer` *has* to rerender, it only
            //   needs to regenerate the list of nodes, nothing else.
            jsx(NodeWrapper, { id: nodeId, nodeTypes: props.nodeTypes, nodeExtent: props.nodeExtent, nodeOrigin: props.nodeOrigin, onClick: props.onNodeClick, onMouseEnter: props.onNodeMouseEnter, onMouseMove: props.onNodeMouseMove, onMouseLeave: props.onNodeMouseLeave, onContextMenu: props.onNodeContextMenu, onDoubleClick: props.onNodeDoubleClick, noDragClassName: props.noDragClassName, noPanClassName: props.noPanClassName, rfId: props.rfId, disableKeyboardA11y: props.disableKeyboardA11y, resizeObserver: resizeObserver, nodesDraggable: nodesDraggable, nodesConnectable: nodesConnectable, nodesFocusable: nodesFocusable, elementsSelectable: elementsSelectable, onError: onError }, nodeId));
        }) }));
}
NodeRendererComponent.displayName = 'NodeRenderer';
const NodeRenderer = memo(NodeRendererComponent);

/**
 * Hook for getting the visible edge ids from the store.
 *
 * @internal
 * @param onlyRenderVisible
 * @returns array with visible edge ids
 */
function useVisibleEdgeIds(onlyRenderVisible) {
    const edgeIds = useStore(useCallback((s) => {
        if (!onlyRenderVisible) {
            return s.edges.map((edge) => edge.id);
        }
        const visibleEdgeIds = [];
        if (s.width && s.height) {
            for (const edge of s.edges) {
                const sourceNode = s.nodeLookup.get(edge.source);
                const targetNode = s.nodeLookup.get(edge.target);
                if (sourceNode &&
                    targetNode &&
                    isEdgeVisible({
                        sourceNode,
                        targetNode,
                        width: s.width,
                        height: s.height,
                        transform: s.transform,
                    })) {
                    visibleEdgeIds.push(edge.id);
                }
            }
        }
        return visibleEdgeIds;
    }, [onlyRenderVisible]), shallow);
    return edgeIds;
}

const ArrowSymbol = ({ color = 'none', strokeWidth = 1 }) => {
    return (jsx("polyline", { style: {
            stroke: color,
            strokeWidth,
        }, strokeLinecap: "round", strokeLinejoin: "round", fill: "none", points: "-5,-4 0,0 -5,4" }));
};
const ArrowClosedSymbol = ({ color = 'none', strokeWidth = 1 }) => {
    return (jsx("polyline", { style: {
            stroke: color,
            fill: color,
            strokeWidth,
        }, strokeLinecap: "round", strokeLinejoin: "round", points: "-5,-4 0,0 -5,4 -5,-4" }));
};
const MarkerSymbols = {
    [MarkerType.Arrow]: ArrowSymbol,
    [MarkerType.ArrowClosed]: ArrowClosedSymbol,
};
function useMarkerSymbol(type) {
    const store = useStoreApi();
    const symbol = useMemo(() => {
        const symbolExists = Object.prototype.hasOwnProperty.call(MarkerSymbols, type);
        if (!symbolExists) {
            store.getState().onError?.('009', errorMessages['error009'](type));
            return null;
        }
        return MarkerSymbols[type];
    }, [type]);
    return symbol;
}

const Marker = ({ id, type, color, width = 12.5, height = 12.5, markerUnits = 'strokeWidth', strokeWidth, orient = 'auto-start-reverse', }) => {
    const Symbol = useMarkerSymbol(type);
    if (!Symbol) {
        return null;
    }
    return (jsx("marker", { className: "react-flow__arrowhead", id: id, markerWidth: `${width}`, markerHeight: `${height}`, viewBox: "-10 -10 20 20", markerUnits: markerUnits, orient: orient, refX: "0", refY: "0", children: jsx(Symbol, { color: color, strokeWidth: strokeWidth }) }));
};
// when you have multiple flows on a page and you hide the first one, the other ones have no markers anymore
// when they do have markers with the same ids. To prevent this the user can pass a unique id to the react flow wrapper
// that we can then use for creating our unique marker ids
const MarkerDefinitions = ({ defaultColor, rfId }) => {
    const edges = useStore((s) => s.edges);
    const defaultEdgeOptions = useStore((s) => s.defaultEdgeOptions);
    const markers = useMemo(() => {
        const markers = createMarkerIds(edges, {
            id: rfId,
            defaultColor,
            defaultMarkerStart: defaultEdgeOptions?.markerStart,
            defaultMarkerEnd: defaultEdgeOptions?.markerEnd,
        });
        return markers;
    }, [edges, defaultEdgeOptions, rfId, defaultColor]);
    if (!markers.length) {
        return null;
    }
    return (jsx("svg", { className: "react-flow__marker", children: jsx("defs", { children: markers.map((marker) => (jsx(Marker, { id: marker.id, type: marker.type, color: marker.color, width: marker.width, height: marker.height, markerUnits: marker.markerUnits, strokeWidth: marker.strokeWidth, orient: marker.orient }, marker.id))) }) }));
};
MarkerDefinitions.displayName = 'MarkerDefinitions';
var MarkerDefinitions$1 = memo(MarkerDefinitions);

function EdgeTextComponent({ x, y, label, labelStyle = {}, labelShowBg = true, labelBgStyle = {}, labelBgPadding = [2, 4], labelBgBorderRadius = 2, children, className, ...rest }) {
    const [edgeTextBbox, setEdgeTextBbox] = useState({ x: 1, y: 0, width: 0, height: 0 });
    const edgeTextClasses = cc(['react-flow__edge-textwrapper', className]);
    const onEdgeTextRefChange = useCallback((edgeRef) => {
        if (edgeRef === null)
            return;
        const textBbox = edgeRef.getBBox();
        setEdgeTextBbox({
            x: textBbox.x,
            y: textBbox.y,
            width: textBbox.width,
            height: textBbox.height,
        });
    }, []);
    if (typeof label === 'undefined' || !label) {
        return null;
    }
    return (jsxs("g", { transform: `translate(${x - edgeTextBbox.width / 2} ${y - edgeTextBbox.height / 2})`, className: edgeTextClasses, visibility: edgeTextBbox.width ? 'visible' : 'hidden', ...rest, children: [labelShowBg && (jsx("rect", { width: edgeTextBbox.width + 2 * labelBgPadding[0], x: -labelBgPadding[0], y: -labelBgPadding[1], height: edgeTextBbox.height + 2 * labelBgPadding[1], className: "react-flow__edge-textbg", style: labelBgStyle, rx: labelBgBorderRadius, ry: labelBgBorderRadius })), jsx("text", { className: "react-flow__edge-text", y: edgeTextBbox.height / 2, dy: "0.3em", ref: onEdgeTextRefChange, style: labelStyle, children: label }), children] }));
}
EdgeTextComponent.displayName = 'EdgeText';
const EdgeText = memo(EdgeTextComponent);

function BaseEdge({ id, path, labelX, labelY, label, labelStyle, labelShowBg, labelBgStyle, labelBgPadding, labelBgBorderRadius, style, markerEnd, markerStart, className, interactionWidth = 20, }) {
    return (jsxs(Fragment, { children: [jsx("path", { id: id, style: style, d: path, fill: "none", className: cc(['react-flow__edge-path', className]), markerEnd: markerEnd, markerStart: markerStart }), interactionWidth && (jsx("path", { d: path, fill: "none", strokeOpacity: 0, strokeWidth: interactionWidth, className: "react-flow__edge-interaction" })), label && isNumeric(labelX) && isNumeric(labelY) ? (jsx(EdgeText, { x: labelX, y: labelY, label: label, labelStyle: labelStyle, labelShowBg: labelShowBg, labelBgStyle: labelBgStyle, labelBgPadding: labelBgPadding, labelBgBorderRadius: labelBgBorderRadius })) : null] }));
}

function getControl({ pos, x1, y1, x2, y2 }) {
    if (pos === Position.Left || pos === Position.Right) {
        return [0.5 * (x1 + x2), y1];
    }
    return [x1, 0.5 * (y1 + y2)];
}
function getSimpleBezierPath({ sourceX, sourceY, sourcePosition = Position.Bottom, targetX, targetY, targetPosition = Position.Top, }) {
    const [sourceControlX, sourceControlY] = getControl({
        pos: sourcePosition,
        x1: sourceX,
        y1: sourceY,
        x2: targetX,
        y2: targetY,
    });
    const [targetControlX, targetControlY] = getControl({
        pos: targetPosition,
        x1: targetX,
        y1: targetY,
        x2: sourceX,
        y2: sourceY,
    });
    const [labelX, labelY, offsetX, offsetY] = getBezierEdgeCenter({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourceControlX,
        sourceControlY,
        targetControlX,
        targetControlY,
    });
    return [
        `M${sourceX},${sourceY} C${sourceControlX},${sourceControlY} ${targetControlX},${targetControlY} ${targetX},${targetY}`,
        labelX,
        labelY,
        offsetX,
        offsetY,
    ];
}
function createSimpleBezierEdge(params) {
    // eslint-disable-next-line react/display-name
    return memo(({ id, sourceX, sourceY, targetX, targetY, sourcePosition = Position.Bottom, targetPosition = Position.Top, label, labelStyle, labelShowBg, labelBgStyle, labelBgPadding, labelBgBorderRadius, style, markerEnd, markerStart, interactionWidth, }) => {
        const [path, labelX, labelY] = getSimpleBezierPath({
            sourceX,
            sourceY,
            sourcePosition,
            targetX,
            targetY,
            targetPosition,
        });
        const _id = params.isInternal ? undefined : id;
        return (jsx(BaseEdge, { id: _id, path: path, labelX: labelX, labelY: labelY, label: label, labelStyle: labelStyle, labelShowBg: labelShowBg, labelBgStyle: labelBgStyle, labelBgPadding: labelBgPadding, labelBgBorderRadius: labelBgBorderRadius, style: style, markerEnd: markerEnd, markerStart: markerStart, interactionWidth: interactionWidth }));
    });
}
const SimpleBezierEdge = createSimpleBezierEdge({ isInternal: false });
const SimpleBezierEdgeInternal = createSimpleBezierEdge({ isInternal: true });
SimpleBezierEdge.displayName = 'SimpleBezierEdge';
SimpleBezierEdgeInternal.displayName = 'SimpleBezierEdgeInternal';

function createSmoothStepEdge(params) {
    // eslint-disable-next-line react/display-name
    return memo(({ id, sourceX, sourceY, targetX, targetY, label, labelStyle, labelShowBg, labelBgStyle, labelBgPadding, labelBgBorderRadius, style, sourcePosition = Position.Bottom, targetPosition = Position.Top, markerEnd, markerStart, pathOptions, interactionWidth, }) => {
        const [path, labelX, labelY] = getSmoothStepPath({
            sourceX,
            sourceY,
            sourcePosition,
            targetX,
            targetY,
            targetPosition,
            borderRadius: pathOptions?.borderRadius,
            offset: pathOptions?.offset,
        });
        const _id = params.isInternal ? undefined : id;
        return (jsx(BaseEdge, { id: _id, path: path, labelX: labelX, labelY: labelY, label: label, labelStyle: labelStyle, labelShowBg: labelShowBg, labelBgStyle: labelBgStyle, labelBgPadding: labelBgPadding, labelBgBorderRadius: labelBgBorderRadius, style: style, markerEnd: markerEnd, markerStart: markerStart, interactionWidth: interactionWidth }));
    });
}
const SmoothStepEdge = createSmoothStepEdge({ isInternal: false });
const SmoothStepEdgeInternal = createSmoothStepEdge({ isInternal: true });
SmoothStepEdge.displayName = 'SmoothStepEdge';
SmoothStepEdgeInternal.displayName = 'SmoothStepEdgeInternal';

function createStepEdge(params) {
    // eslint-disable-next-line react/display-name
    return memo(({ id, ...props }) => {
        const _id = params.isInternal ? undefined : id;
        return (jsx(SmoothStepEdge, { ...props, id: _id, pathOptions: useMemo(() => ({ borderRadius: 0, offset: props.pathOptions?.offset }), [props.pathOptions?.offset]) }));
    });
}
const StepEdge = createStepEdge({ isInternal: false });
const StepEdgeInternal = createStepEdge({ isInternal: true });
StepEdge.displayName = 'StepEdge';
StepEdgeInternal.displayName = 'StepEdgeInternal';

function createStraightEdge(params) {
    // eslint-disable-next-line react/display-name
    return memo(({ id, sourceX, sourceY, targetX, targetY, label, labelStyle, labelShowBg, labelBgStyle, labelBgPadding, labelBgBorderRadius, style, markerEnd, markerStart, interactionWidth, }) => {
        const [path, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
        const _id = params.isInternal ? undefined : id;
        return (jsx(BaseEdge, { id: _id, path: path, labelX: labelX, labelY: labelY, label: label, labelStyle: labelStyle, labelShowBg: labelShowBg, labelBgStyle: labelBgStyle, labelBgPadding: labelBgPadding, labelBgBorderRadius: labelBgBorderRadius, style: style, markerEnd: markerEnd, markerStart: markerStart, interactionWidth: interactionWidth }));
    });
}
const StraightEdge = createStraightEdge({ isInternal: false });
const StraightEdgeInternal = createStraightEdge({ isInternal: true });
StraightEdge.displayName = 'StraightEdge';
StraightEdgeInternal.displayName = 'StraightEdgeInternal';

function createBezierEdge(params) {
    // eslint-disable-next-line react/display-name
    return memo(({ id, sourceX, sourceY, targetX, targetY, sourcePosition = Position.Bottom, targetPosition = Position.Top, label, labelStyle, labelShowBg, labelBgStyle, labelBgPadding, labelBgBorderRadius, style, markerEnd, markerStart, pathOptions, interactionWidth, }) => {
        const [path, labelX, labelY] = getBezierPath({
            sourceX,
            sourceY,
            sourcePosition,
            targetX,
            targetY,
            targetPosition,
            curvature: pathOptions?.curvature,
        });
        const _id = params.isInternal ? undefined : id;
        return (jsx(BaseEdge, { id: _id, path: path, labelX: labelX, labelY: labelY, label: label, labelStyle: labelStyle, labelShowBg: labelShowBg, labelBgStyle: labelBgStyle, labelBgPadding: labelBgPadding, labelBgBorderRadius: labelBgBorderRadius, style: style, markerEnd: markerEnd, markerStart: markerStart, interactionWidth: interactionWidth }));
    });
}
const BezierEdge = createBezierEdge({ isInternal: false });
const BezierEdgeInternal = createBezierEdge({ isInternal: true });
BezierEdge.displayName = 'BezierEdge';
BezierEdgeInternal.displayName = 'BezierEdgeInternal';

const builtinEdgeTypes = {
    default: BezierEdgeInternal,
    straight: StraightEdgeInternal,
    step: StepEdgeInternal,
    smoothstep: SmoothStepEdgeInternal,
    simplebezier: SimpleBezierEdgeInternal,
};
const nullPosition = {
    sourceX: null,
    sourceY: null,
    targetX: null,
    targetY: null,
    sourcePosition: null,
    targetPosition: null,
};

const shiftX = (x, shift, position) => {
    if (position === Position.Left)
        return x - shift;
    if (position === Position.Right)
        return x + shift;
    return x;
};
const shiftY = (y, shift, position) => {
    if (position === Position.Top)
        return y - shift;
    if (position === Position.Bottom)
        return y + shift;
    return y;
};
const EdgeUpdaterClassName = 'react-flow__edgeupdater';
function EdgeAnchor({ position, centerX, centerY, radius = 10, onMouseDown, onMouseEnter, onMouseOut, type, }) {
    return (jsx("circle", { onMouseDown: onMouseDown, onMouseEnter: onMouseEnter, onMouseOut: onMouseOut, className: cc([EdgeUpdaterClassName, `${EdgeUpdaterClassName}-${type}`]), cx: shiftX(centerX, radius, position), cy: shiftY(centerY, radius, position), r: radius, stroke: "transparent", fill: "transparent" }));
}

function EdgeUpdateAnchors({ isUpdatable, edgeUpdaterRadius, edge, targetHandleId, sourceHandleId, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, onEdgeUpdate, onEdgeUpdateStart, onEdgeUpdateEnd, setUpdating, setUpdateHover, }) {
    const store = useStoreApi();
    const handleEdgeUpdater = (event, isSourceHandle) => {
        // avoid triggering edge updater if mouse btn is not left
        if (event.button !== 0) {
            return;
        }
        const { autoPanOnConnect, domNode, isValidConnection, connectionMode, connectionRadius, lib, onConnectStart, onConnectEnd, cancelConnection, nodes, rfId: flowId, panBy, updateConnection, } = store.getState();
        const nodeId = isSourceHandle ? edge.target : edge.source;
        const handleId = (isSourceHandle ? targetHandleId : sourceHandleId) || null;
        const handleType = isSourceHandle ? 'target' : 'source';
        const isTarget = isSourceHandle;
        setUpdating(true);
        onEdgeUpdateStart?.(event, edge, handleType);
        const _onEdgeUpdateEnd = (evt) => {
            setUpdating(false);
            onEdgeUpdateEnd?.(evt, edge, handleType);
        };
        const onConnectEdge = (connection) => onEdgeUpdate?.(edge, connection);
        XYHandle.onPointerDown(event.nativeEvent, {
            autoPanOnConnect,
            connectionMode,
            connectionRadius,
            domNode,
            handleId,
            nodeId,
            nodes,
            isTarget,
            edgeUpdaterType: handleType,
            lib,
            flowId,
            cancelConnection,
            panBy,
            isValidConnection,
            onConnect: onConnectEdge,
            onConnectStart,
            onConnectEnd,
            onEdgeUpdateEnd: _onEdgeUpdateEnd,
            updateConnection,
            getTransform: () => store.getState().transform,
        });
    };
    const onEdgeUpdaterSourceMouseDown = (event) => handleEdgeUpdater(event, true);
    const onEdgeUpdaterTargetMouseDown = (event) => handleEdgeUpdater(event, false);
    const onEdgeUpdaterMouseEnter = () => setUpdateHover(true);
    const onEdgeUpdaterMouseOut = () => setUpdateHover(false);
    return (jsxs(Fragment, { children: [(isUpdatable === 'source' || isUpdatable === true) && (jsx(EdgeAnchor, { position: sourcePosition, centerX: sourceX, centerY: sourceY, radius: edgeUpdaterRadius, onMouseDown: onEdgeUpdaterSourceMouseDown, onMouseEnter: onEdgeUpdaterMouseEnter, onMouseOut: onEdgeUpdaterMouseOut, type: "source" })), (isUpdatable === 'target' || isUpdatable === true) && (jsx(EdgeAnchor, { position: targetPosition, centerX: targetX, centerY: targetY, radius: edgeUpdaterRadius, onMouseDown: onEdgeUpdaterTargetMouseDown, onMouseEnter: onEdgeUpdaterMouseEnter, onMouseOut: onEdgeUpdaterMouseOut, type: "target" }))] }));
}

function EdgeWrapper({ id, edgesFocusable, edgesUpdatable, elementsSelectable, onClick, onDoubleClick, onContextMenu, onMouseEnter, onMouseMove, onMouseLeave, edgeUpdaterRadius, onEdgeUpdate, onEdgeUpdateStart, onEdgeUpdateEnd, rfId, edgeTypes, noPanClassName, onError, disableKeyboardA11y, }) {
    let edge = useStore((s) => s.edgeLookup.get(id));
    const defaultEdgeOptions = useStore((s) => s.defaultEdgeOptions);
    edge = defaultEdgeOptions ? { ...defaultEdgeOptions, ...edge } : edge;
    let edgeType = edge.type || 'default';
    let EdgeComponent = edgeTypes?.[edgeType] || builtinEdgeTypes[edgeType];
    if (EdgeComponent === undefined) {
        onError?.('011', errorMessages['error011'](edgeType));
        edgeType = 'default';
        EdgeComponent = builtinEdgeTypes.default;
    }
    const isFocusable = !!(edge.focusable || (edgesFocusable && typeof edge.focusable === 'undefined'));
    const isUpdatable = typeof onEdgeUpdate !== 'undefined' &&
        (edge.updatable || (edgesUpdatable && typeof edge.updatable === 'undefined'));
    const isSelectable = !!(edge.selectable || (elementsSelectable && typeof edge.selectable === 'undefined'));
    const edgeRef = useRef(null);
    const [updateHover, setUpdateHover] = useState(false);
    const [updating, setUpdating] = useState(false);
    const store = useStoreApi();
    const { zIndex, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = useStore(useCallback((store) => {
        const sourceNode = store.nodeLookup.get(edge.source);
        const targetNode = store.nodeLookup.get(edge.target);
        if (!sourceNode || !targetNode) {
            return {
                zIndex: edge.zIndex,
                ...nullPosition,
            };
        }
        const edgePosition = getEdgePosition({
            id,
            sourceNode,
            targetNode,
            sourceHandle: edge.sourceHandle || null,
            targetHandle: edge.targetHandle || null,
            connectionMode: store.connectionMode,
            onError,
        });
        const zIndex = getElevatedEdgeZIndex({
            selected: edge.selected,
            zIndex: edge.zIndex,
            sourceNode,
            targetNode,
            elevateOnSelect: store.elevateEdgesOnSelect,
        });
        return {
            zIndex,
            ...(edgePosition || nullPosition),
        };
    }, [edge.source, edge.target, edge.sourceHandle, edge.targetHandle, edge.selected, edge.zIndex]), shallow);
    const markerStartUrl = useMemo(() => (edge.markerStart ? `url('#${getMarkerId(edge.markerStart, rfId)}')` : undefined), [edge.markerStart, rfId]);
    const markerEndUrl = useMemo(() => (edge.markerEnd ? `url('#${getMarkerId(edge.markerEnd, rfId)}')` : undefined), [edge.markerEnd, rfId]);
    if (edge.hidden || sourceX === null || sourceY === null || targetX === null || targetY === null) {
        return null;
    }
    const onEdgeClick = (event) => {
        const { addSelectedEdges, unselectNodesAndEdges, multiSelectionActive } = store.getState();
        if (isSelectable) {
            store.setState({ nodesSelectionActive: false });
            if (edge.selected && multiSelectionActive) {
                unselectNodesAndEdges({ nodes: [], edges: [edge] });
                edgeRef.current?.blur();
            }
            else {
                addSelectedEdges([id]);
            }
        }
        if (onClick) {
            onClick(event, edge);
        }
    };
    const onEdgeDoubleClick = onDoubleClick
        ? (event) => {
            onDoubleClick(event, { ...edge });
        }
        : undefined;
    const onEdgeContextMenu = onContextMenu
        ? (event) => {
            onContextMenu(event, { ...edge });
        }
        : undefined;
    const onEdgeMouseEnter = onMouseEnter
        ? (event) => {
            onMouseEnter(event, { ...edge });
        }
        : undefined;
    const onEdgeMouseMove = onMouseMove
        ? (event) => {
            onMouseMove(event, { ...edge });
        }
        : undefined;
    const onEdgeMouseLeave = onMouseLeave
        ? (event) => {
            onMouseLeave(event, { ...edge });
        }
        : undefined;
    const onKeyDown = (event) => {
        if (!disableKeyboardA11y && elementSelectionKeys.includes(event.key) && isSelectable) {
            const { unselectNodesAndEdges, addSelectedEdges } = store.getState();
            const unselect = event.key === 'Escape';
            if (unselect) {
                edgeRef.current?.blur();
                unselectNodesAndEdges({ edges: [edge] });
            }
            else {
                addSelectedEdges([id]);
            }
        }
    };
    return (jsx("svg", { style: { zIndex }, children: jsxs("g", { className: cc([
                'react-flow__edge',
                `react-flow__edge-${edgeType}`,
                edge.className,
                noPanClassName,
                {
                    selected: edge.selected,
                    animated: edge.animated,
                    inactive: !isSelectable && !onClick,
                    updating: updateHover,
                    selectable: isSelectable,
                },
            ]), onClick: onEdgeClick, onDoubleClick: onEdgeDoubleClick, onContextMenu: onEdgeContextMenu, onMouseEnter: onEdgeMouseEnter, onMouseMove: onEdgeMouseMove, onMouseLeave: onEdgeMouseLeave, onKeyDown: isFocusable ? onKeyDown : undefined, tabIndex: isFocusable ? 0 : undefined, role: isFocusable ? 'button' : 'img', "data-id": id, "data-testid": `rf__edge-${id}`, "aria-label": edge.ariaLabel === null ? undefined : edge.ariaLabel || `Edge from ${edge.source} to ${edge.target}`, "aria-describedby": isFocusable ? `${ARIA_EDGE_DESC_KEY}-${rfId}` : undefined, ref: edgeRef, children: [!updating && (jsx(EdgeComponent, { id: id, source: edge.source, target: edge.target, type: edge.type, selected: edge.selected, animated: edge.animated, label: edge.label, labelStyle: edge.labelStyle, labelShowBg: edge.labelShowBg, labelBgStyle: edge.labelBgStyle, labelBgPadding: edge.labelBgPadding, labelBgBorderRadius: edge.labelBgBorderRadius, sourceX: sourceX, sourceY: sourceY, targetX: targetX, targetY: targetY, sourcePosition: sourcePosition, targetPosition: targetPosition, data: edge.data, style: edge.style, sourceHandleId: edge.sourceHandle, targetHandleId: edge.targetHandle, markerStart: markerStartUrl, markerEnd: markerEndUrl, pathOptions: 'pathOptions' in edge ? edge.pathOptions : undefined, interactionWidth: edge.interactionWidth })), isUpdatable && (jsx(EdgeUpdateAnchors, { edge: edge, isUpdatable: isUpdatable, edgeUpdaterRadius: edgeUpdaterRadius, onEdgeUpdate: onEdgeUpdate, onEdgeUpdateStart: onEdgeUpdateStart, onEdgeUpdateEnd: onEdgeUpdateEnd, sourceX: sourceX, sourceY: sourceY, targetX: targetX, targetY: targetY, sourcePosition: sourcePosition, targetPosition: targetPosition, setUpdateHover: setUpdateHover, setUpdating: setUpdating, sourceHandleId: edge.sourceHandle, targetHandleId: edge.targetHandle }))] }) }));
}

const selector$c = (s) => ({
    width: s.width,
    height: s.height,
    edgesFocusable: s.edgesFocusable,
    edgesUpdatable: s.edgesUpdatable,
    elementsSelectable: s.elementsSelectable,
    connectionMode: s.connectionMode,
    onError: s.onError,
});
function EdgeRendererComponent({ defaultMarkerColor, onlyRenderVisibleElements, rfId, edgeTypes, noPanClassName, onEdgeUpdate, onEdgeContextMenu, onEdgeMouseEnter, onEdgeMouseMove, onEdgeMouseLeave, onEdgeClick, edgeUpdaterRadius, onEdgeDoubleClick, onEdgeUpdateStart, onEdgeUpdateEnd, disableKeyboardA11y, }) {
    const { edgesFocusable, edgesUpdatable, elementsSelectable, onError } = useStore(selector$c, shallow);
    const edgeIds = useVisibleEdgeIds(onlyRenderVisibleElements);
    return (jsxs("div", { className: "react-flow__edges", children: [jsx(MarkerDefinitions$1, { defaultColor: defaultMarkerColor, rfId: rfId }), edgeIds.map((id) => {
                return (jsx(EdgeWrapper, { id: id, edgesFocusable: edgesFocusable, edgesUpdatable: edgesUpdatable, elementsSelectable: elementsSelectable, noPanClassName: noPanClassName, onEdgeUpdate: onEdgeUpdate, onContextMenu: onEdgeContextMenu, onMouseEnter: onEdgeMouseEnter, onMouseMove: onEdgeMouseMove, onMouseLeave: onEdgeMouseLeave, onClick: onEdgeClick, edgeUpdaterRadius: edgeUpdaterRadius, onDoubleClick: onEdgeDoubleClick, onEdgeUpdateStart: onEdgeUpdateStart, onEdgeUpdateEnd: onEdgeUpdateEnd, rfId: rfId, onError: onError, edgeTypes: edgeTypes, disableKeyboardA11y: disableKeyboardA11y }, id));
            })] }));
}
EdgeRendererComponent.displayName = 'EdgeRenderer';
const EdgeRenderer = memo(EdgeRendererComponent);

const selector$b = (s) => `translate(${s.transform[0]}px,${s.transform[1]}px) scale(${s.transform[2]})`;
function Viewport({ children }) {
    const transform = useStore(selector$b);
    return (jsx("div", { className: "react-flow__viewport xyflow__viewport react-flow__container", style: { transform }, children: children }));
}

/**
 * Hook for calling onInit handler.
 *
 * @internal
 */
function useOnInitHandler(onInit) {
    const rfInstance = useReactFlow();
    const isInitialized = useRef(false);
    useEffect(() => {
        if (!isInitialized.current && rfInstance.viewportInitialized && onInit) {
            setTimeout(() => onInit(rfInstance), 1);
            isInitialized.current = true;
        }
    }, [onInit, rfInstance.viewportInitialized]);
}

const selector$a = (state) => state.panZoom?.syncViewport;
/**
 * Hook for syncing the viewport with the panzoom instance.
 *
 * @internal
 * @param viewport
 */
function useViewportSync(viewport) {
    const syncViewport = useStore(selector$a);
    const store = useStoreApi();
    useEffect(() => {
        if (viewport) {
            syncViewport?.(viewport);
            store.setState({ transform: [viewport.x, viewport.y, viewport.zoom] });
        }
    }, [viewport, syncViewport]);
    return null;
}

const oppositePosition = {
    [Position.Left]: Position.Right,
    [Position.Right]: Position.Left,
    [Position.Top]: Position.Bottom,
    [Position.Bottom]: Position.Top,
};
const ConnectionLine = ({ nodeId, handleType, style, type = ConnectionLineType.Bezier, CustomComponent, connectionStatus, }) => {
    const { fromNode, handleId, toX, toY, connectionMode } = useStore(useCallback((s) => ({
        fromNode: s.nodeLookup.get(nodeId),
        handleId: s.connectionStartHandle?.handleId,
        toX: (s.connectionPosition.x - s.transform[0]) / s.transform[2],
        toY: (s.connectionPosition.y - s.transform[1]) / s.transform[2],
        connectionMode: s.connectionMode,
    }), [nodeId]), shallow);
    const fromHandleBounds = fromNode?.[internalsSymbol]?.handleBounds;
    let handleBounds = fromHandleBounds?.[handleType];
    if (connectionMode === ConnectionMode.Loose) {
        handleBounds = handleBounds ? handleBounds : fromHandleBounds?.[handleType === 'source' ? 'target' : 'source'];
    }
    if (!fromNode || !handleBounds) {
        return null;
    }
    const fromHandle = handleId ? handleBounds.find((d) => d.id === handleId) : handleBounds[0];
    const fromHandleX = fromHandle ? fromHandle.x + fromHandle.width / 2 : (fromNode.computed?.width ?? 0) / 2;
    const fromHandleY = fromHandle ? fromHandle.y + fromHandle.height / 2 : fromNode.computed?.height ?? 0;
    const fromX = (fromNode.computed?.positionAbsolute?.x ?? 0) + fromHandleX;
    const fromY = (fromNode.computed?.positionAbsolute?.y ?? 0) + fromHandleY;
    const fromPosition = fromHandle?.position;
    const toPosition = fromPosition ? oppositePosition[fromPosition] : null;
    if (!fromPosition || !toPosition) {
        return null;
    }
    if (CustomComponent) {
        return (jsx(CustomComponent, { connectionLineType: type, connectionLineStyle: style, fromNode: fromNode, fromHandle: fromHandle, fromX: fromX, fromY: fromY, toX: toX, toY: toY, fromPosition: fromPosition, toPosition: toPosition, connectionStatus: connectionStatus }));
    }
    let dAttr = '';
    const pathParams = {
        sourceX: fromX,
        sourceY: fromY,
        sourcePosition: fromPosition,
        targetX: toX,
        targetY: toY,
        targetPosition: toPosition,
    };
    if (type === ConnectionLineType.Bezier) {
        // we assume the destination position is opposite to the source position
        [dAttr] = getBezierPath(pathParams);
    }
    else if (type === ConnectionLineType.Step) {
        [dAttr] = getSmoothStepPath({
            ...pathParams,
            borderRadius: 0,
        });
    }
    else if (type === ConnectionLineType.SmoothStep) {
        [dAttr] = getSmoothStepPath(pathParams);
    }
    else if (type === ConnectionLineType.SimpleBezier) {
        [dAttr] = getSimpleBezierPath(pathParams);
    }
    else {
        dAttr = `M${fromX},${fromY} ${toX},${toY}`;
    }
    return jsx("path", { d: dAttr, fill: "none", className: "react-flow__connection-path", style: style });
};
ConnectionLine.displayName = 'ConnectionLine';
const selector$9 = (s) => ({
    nodeId: s.connectionStartHandle?.nodeId,
    handleType: s.connectionStartHandle?.type,
    nodesConnectable: s.nodesConnectable,
    connectionStatus: s.connectionStatus,
    width: s.width,
    height: s.height,
});
function ConnectionLineWrapper({ containerStyle, style, type, component }) {
    const { nodeId, handleType, nodesConnectable, width, height, connectionStatus } = useStore(selector$9, shallow);
    const isValid = !!(nodeId && handleType && width && nodesConnectable);
    if (!isValid) {
        return null;
    }
    return (jsx("svg", { style: containerStyle, width: width, height: height, className: "react-flow__connectionline react-flow__container", children: jsx("g", { className: cc(['react-flow__connection', connectionStatus]), children: jsx(ConnectionLine, { nodeId: nodeId, handleType: handleType, style: style, type: type, CustomComponent: component, connectionStatus: connectionStatus }) }) }));
}

const emptyTypes = {};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useNodeOrEdgeTypesWarning(nodeOrEdgeTypes = emptyTypes) {
    const updateCount = useRef(0);
    const store = useStoreApi();
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            if (updateCount.current > 1) {
                store.getState().onError?.('002', errorMessages['error002']());
            }
            updateCount.current += 1;
        }
    }, [nodeOrEdgeTypes]);
}

function GraphViewComponent({ nodeTypes, edgeTypes, onInit, onNodeClick, onEdgeClick, onNodeDoubleClick, onEdgeDoubleClick, onNodeMouseEnter, onNodeMouseMove, onNodeMouseLeave, onNodeContextMenu, onSelectionContextMenu, onSelectionStart, onSelectionEnd, connectionLineType, connectionLineStyle, connectionLineComponent, connectionLineContainerStyle, selectionKeyCode, selectionOnDrag, selectionMode, multiSelectionKeyCode, panActivationKeyCode, zoomActivationKeyCode, deleteKeyCode, onlyRenderVisibleElements, elementsSelectable, defaultViewport, translateExtent, minZoom, maxZoom, preventScrolling, defaultMarkerColor, zoomOnScroll, zoomOnPinch, panOnScroll, panOnScrollSpeed, panOnScrollMode, zoomOnDoubleClick, panOnDrag, onPaneClick, onPaneMouseEnter, onPaneMouseMove, onPaneMouseLeave, onPaneScroll, onPaneContextMenu, onEdgeUpdate, onEdgeContextMenu, onEdgeMouseEnter, onEdgeMouseMove, onEdgeMouseLeave, edgeUpdaterRadius, onEdgeUpdateStart, onEdgeUpdateEnd, noDragClassName, noWheelClassName, noPanClassName, disableKeyboardA11y, nodeOrigin, nodeExtent, rfId, viewport, onViewportChange, }) {
    useNodeOrEdgeTypesWarning(nodeTypes);
    useNodeOrEdgeTypesWarning(edgeTypes);
    useOnInitHandler(onInit);
    useViewportSync(viewport);
    return (jsx(FlowRenderer, { onPaneClick: onPaneClick, onPaneMouseEnter: onPaneMouseEnter, onPaneMouseMove: onPaneMouseMove, onPaneMouseLeave: onPaneMouseLeave, onPaneContextMenu: onPaneContextMenu, onPaneScroll: onPaneScroll, deleteKeyCode: deleteKeyCode, selectionKeyCode: selectionKeyCode, selectionOnDrag: selectionOnDrag, selectionMode: selectionMode, onSelectionStart: onSelectionStart, onSelectionEnd: onSelectionEnd, multiSelectionKeyCode: multiSelectionKeyCode, panActivationKeyCode: panActivationKeyCode, zoomActivationKeyCode: zoomActivationKeyCode, elementsSelectable: elementsSelectable, zoomOnScroll: zoomOnScroll, zoomOnPinch: zoomOnPinch, zoomOnDoubleClick: zoomOnDoubleClick, panOnScroll: panOnScroll, panOnScrollSpeed: panOnScrollSpeed, panOnScrollMode: panOnScrollMode, panOnDrag: panOnDrag, defaultViewport: defaultViewport, translateExtent: translateExtent, minZoom: minZoom, maxZoom: maxZoom, onSelectionContextMenu: onSelectionContextMenu, preventScrolling: preventScrolling, noDragClassName: noDragClassName, noWheelClassName: noWheelClassName, noPanClassName: noPanClassName, disableKeyboardA11y: disableKeyboardA11y, onViewportChange: onViewportChange, isControlledViewport: !!viewport, children: jsxs(Viewport, { children: [jsx(EdgeRenderer, { edgeTypes: edgeTypes, onEdgeClick: onEdgeClick, onEdgeDoubleClick: onEdgeDoubleClick, onEdgeUpdate: onEdgeUpdate, onlyRenderVisibleElements: onlyRenderVisibleElements, onEdgeContextMenu: onEdgeContextMenu, onEdgeMouseEnter: onEdgeMouseEnter, onEdgeMouseMove: onEdgeMouseMove, onEdgeMouseLeave: onEdgeMouseLeave, onEdgeUpdateStart: onEdgeUpdateStart, onEdgeUpdateEnd: onEdgeUpdateEnd, edgeUpdaterRadius: edgeUpdaterRadius, defaultMarkerColor: defaultMarkerColor, noPanClassName: noPanClassName, disableKeyboardA11y: disableKeyboardA11y, rfId: rfId }), jsx(ConnectionLineWrapper, { style: connectionLineStyle, type: connectionLineType, component: connectionLineComponent, containerStyle: connectionLineContainerStyle }), jsx("div", { className: "react-flow__edgelabel-renderer" }), jsx(NodeRenderer, { nodeTypes: nodeTypes, onNodeClick: onNodeClick, onNodeDoubleClick: onNodeDoubleClick, onNodeMouseEnter: onNodeMouseEnter, onNodeMouseMove: onNodeMouseMove, onNodeMouseLeave: onNodeMouseLeave, onNodeContextMenu: onNodeContextMenu, onlyRenderVisibleElements: onlyRenderVisibleElements, noPanClassName: noPanClassName, noDragClassName: noDragClassName, disableKeyboardA11y: disableKeyboardA11y, nodeOrigin: nodeOrigin, nodeExtent: nodeExtent, rfId: rfId }), jsx("div", { className: "react-flow__viewport-portal" })] }) }));
}
GraphViewComponent.displayName = 'GraphView';
const GraphView = memo(GraphViewComponent);

const getInitialState = ({ nodes, edges, defaultNodes, defaultEdges, width, height, fitView, } = {}) => {
    const nodeLookup = new Map();
    const connectionLookup = new Map();
    const edgeLookup = new Map();
    const storeEdges = defaultEdges ?? edges ?? [];
    const storeNodes = defaultNodes ?? nodes ?? [];
    updateConnectionLookup(connectionLookup, edgeLookup, storeEdges);
    const nextNodes = adoptUserProvidedNodes(storeNodes, nodeLookup, {
        nodeOrigin: [0, 0],
        elevateNodesOnSelect: false,
    });
    let transform = [0, 0, 1];
    if (fitView && width && height) {
        const nodesWithDimensions = nextNodes.filter((node) => (node.width || node.initialWidth) && (node.height || node.initialHeight));
        // @todo users nodeOrigin should be used here
        const bounds = getNodesBounds(nodesWithDimensions, { nodeOrigin: [0, 0] });
        const { x, y, zoom } = getViewportForBounds(bounds, width, height, 0.5, 2, 0.1);
        transform = [x, y, zoom];
    }
    return {
        rfId: '1',
        width: 0,
        height: 0,
        transform,
        nodes: nextNodes,
        nodeLookup,
        edges: storeEdges,
        edgeLookup,
        connectionLookup,
        onNodesChange: null,
        onEdgesChange: null,
        hasDefaultNodes: defaultNodes !== undefined,
        hasDefaultEdges: defaultEdges !== undefined,
        panZoom: null,
        minZoom: 0.5,
        maxZoom: 2,
        translateExtent: infiniteExtent,
        nodeExtent: infiniteExtent,
        nodesSelectionActive: false,
        userSelectionActive: false,
        userSelectionRect: null,
        connectionPosition: { x: 0, y: 0 },
        connectionStatus: null,
        connectionMode: ConnectionMode.Strict,
        domNode: null,
        paneDragging: false,
        noPanClassName: 'nopan',
        nodeOrigin: [0, 0],
        nodeDragThreshold: 1,
        snapGrid: [15, 15],
        snapToGrid: false,
        nodesDraggable: true,
        nodesConnectable: true,
        nodesFocusable: true,
        edgesFocusable: true,
        edgesUpdatable: true,
        elementsSelectable: true,
        elevateNodesOnSelect: true,
        elevateEdgesOnSelect: false,
        fitViewOnInit: false,
        fitViewDone: false,
        fitViewOnInitOptions: undefined,
        selectNodesOnDrag: true,
        multiSelectionActive: false,
        connectionStartHandle: null,
        connectionEndHandle: null,
        connectionClickStartHandle: null,
        connectOnClick: true,
        ariaLiveMessage: '',
        autoPanOnConnect: true,
        autoPanOnNodeDrag: true,
        connectionRadius: 20,
        onError: devWarn,
        isValidConnection: undefined,
        onSelectionChangeHandlers: [],
        lib: 'react',
        debug: false,
    };
};

const createRFStore = ({ nodes, edges, defaultNodes, defaultEdges, width, height, fitView: fitView$1, }) => createWithEqualityFn((set, get) => ({
    ...getInitialState({ nodes, edges, width, height, fitView: fitView$1, defaultNodes, defaultEdges }),
    setNodes: (nodes) => {
        const { nodeLookup, nodeOrigin, elevateNodesOnSelect } = get();
        // setNodes() is called exclusively in response to user actions:
        // - either when the `<ReactFlow nodes>` prop is updated in the controlled ReactFlow setup,
        // - or when the user calls something like `reactFlowInstance.setNodes()` in an uncontrolled ReactFlow setup.
        //
        // When this happens, we take the note objects passed by the user and extend them with fields
        // relevant for internal React Flow operations.
        const nodesWithInternalData = adoptUserProvidedNodes(nodes, nodeLookup, { nodeOrigin, elevateNodesOnSelect });
        set({ nodes: nodesWithInternalData });
    },
    setEdges: (edges) => {
        const { connectionLookup, edgeLookup } = get();
        updateConnectionLookup(connectionLookup, edgeLookup, edges);
        set({ edges });
    },
    setDefaultNodesAndEdges: (nodes, edges) => {
        if (nodes) {
            const { setNodes } = get();
            setNodes(nodes);
            set({ hasDefaultNodes: true });
        }
        if (edges) {
            const { setEdges } = get();
            setEdges(edges);
            set({ hasDefaultEdges: true });
        }
    },
    // Every node gets registerd at a ResizeObserver. Whenever a node
    // changes its dimensions, this function is called to measure the
    // new dimensions and update the nodes.
    updateNodeDimensions: (updates) => {
        const { onNodesChange, fitView, nodes, nodeLookup, fitViewOnInit, fitViewDone, fitViewOnInitOptions, domNode, nodeOrigin, debug, } = get();
        const changes = [];
        const updatedNodes = updateNodeDimensions(updates, nodes, nodeLookup, domNode, nodeOrigin, (id, dimensions) => {
            changes.push({
                id: id,
                type: 'dimensions',
                dimensions,
            });
        });
        if (!updatedNodes) {
            return;
        }
        const nextNodes = updateAbsolutePositions(updatedNodes, nodeLookup, nodeOrigin);
        // we call fitView once initially after all dimensions are set
        let nextFitViewDone = fitViewDone;
        if (!fitViewDone && fitViewOnInit) {
            nextFitViewDone = fitView(nextNodes, {
                ...fitViewOnInitOptions,
                nodes: fitViewOnInitOptions?.nodes || nextNodes,
            });
        }
        // here we are cirmumventing the onNodesChange handler
        // in order to be able to display nodes even if the user
        // has not provided an onNodesChange handler.
        // Nodes are only rendered if they have a width and height
        // attribute which they get from this handler.
        set({ nodes: nextNodes, fitViewDone: nextFitViewDone });
        if (changes?.length > 0) {
            if (debug) {
                console.log('React Flow: trigger node changes', changes);
            }
            onNodesChange?.(changes);
        }
    },
    updateNodePositions: (nodeDragItems, dragging = false) => {
        const changes = nodeDragItems.map((node) => {
            const change = {
                id: node.id,
                type: 'position',
                position: node.position,
                positionAbsolute: node.computed?.positionAbsolute,
                dragging,
            };
            return change;
        });
        get().triggerNodeChanges(changes);
    },
    triggerNodeChanges: (changes) => {
        const { onNodesChange, setNodes, nodes, hasDefaultNodes, debug } = get();
        if (changes?.length) {
            if (hasDefaultNodes) {
                const updatedNodes = applyNodeChanges(changes, nodes);
                setNodes(updatedNodes);
            }
            if (debug) {
                console.log('React Flow: trigger node changes', changes);
            }
            onNodesChange?.(changes);
        }
    },
    triggerEdgeChanges: (changes) => {
        const { onEdgesChange, setEdges, edges, hasDefaultEdges, debug } = get();
        if (changes?.length) {
            if (hasDefaultEdges) {
                const updatedEdges = applyEdgeChanges(changes, edges);
                setEdges(updatedEdges);
            }
            if (debug) {
                console.log('React Flow: trigger edge changes', changes);
            }
            onEdgesChange?.(changes);
        }
    },
    addSelectedNodes: (selectedNodeIds) => {
        const { multiSelectionActive, edges, nodes, triggerNodeChanges, triggerEdgeChanges } = get();
        if (multiSelectionActive) {
            const nodeChanges = selectedNodeIds.map((nodeId) => createSelectionChange(nodeId, true));
            triggerNodeChanges(nodeChanges);
            return;
        }
        triggerNodeChanges(getSelectionChanges(nodes, new Set([...selectedNodeIds]), true));
        triggerEdgeChanges(getSelectionChanges(edges));
    },
    addSelectedEdges: (selectedEdgeIds) => {
        const { multiSelectionActive, edges, nodes, triggerNodeChanges, triggerEdgeChanges } = get();
        if (multiSelectionActive) {
            const changedEdges = selectedEdgeIds.map((edgeId) => createSelectionChange(edgeId, true));
            triggerEdgeChanges(changedEdges);
            return;
        }
        triggerEdgeChanges(getSelectionChanges(edges, new Set([...selectedEdgeIds])));
        triggerNodeChanges(getSelectionChanges(nodes, new Set(), true));
    },
    unselectNodesAndEdges: ({ nodes, edges } = {}) => {
        const { edges: storeEdges, nodes: storeNodes, triggerNodeChanges, triggerEdgeChanges } = get();
        const nodesToUnselect = nodes ? nodes : storeNodes;
        const edgesToUnselect = edges ? edges : storeEdges;
        const nodeChanges = nodesToUnselect.map((n) => {
            n.selected = false;
            return createSelectionChange(n.id, false);
        });
        const edgeChanges = edgesToUnselect.map((edge) => createSelectionChange(edge.id, false));
        triggerNodeChanges(nodeChanges);
        triggerEdgeChanges(edgeChanges);
    },
    setMinZoom: (minZoom) => {
        const { panZoom, maxZoom } = get();
        panZoom?.setScaleExtent([minZoom, maxZoom]);
        set({ minZoom });
    },
    setMaxZoom: (maxZoom) => {
        const { panZoom, minZoom } = get();
        panZoom?.setScaleExtent([minZoom, maxZoom]);
        set({ maxZoom });
    },
    setTranslateExtent: (translateExtent) => {
        get().panZoom?.setTranslateExtent(translateExtent);
        set({ translateExtent });
    },
    resetSelectedElements: () => {
        const { edges, nodes, triggerNodeChanges, triggerEdgeChanges } = get();
        const nodeChanges = nodes.reduce((res, node) => (node.selected ? [...res, createSelectionChange(node.id, false)] : res), []);
        const edgeChanges = edges.reduce((res, edge) => (edge.selected ? [...res, createSelectionChange(edge.id, false)] : res), []);
        triggerNodeChanges(nodeChanges);
        triggerEdgeChanges(edgeChanges);
    },
    setNodeExtent: (nodeExtent) => {
        const { nodes } = get();
        set({
            nodeExtent,
            nodes: nodes.map((node) => {
                const positionAbsolute = clampPosition(node.position, nodeExtent);
                return {
                    ...node,
                    computed: {
                        ...node.computed,
                        positionAbsolute,
                    },
                };
            }),
        });
    },
    panBy: (delta) => {
        const { transform, width, height, panZoom, translateExtent } = get();
        return panBy({ delta, panZoom, transform, translateExtent, width, height });
    },
    fitView: (nodes, options) => {
        const { panZoom, width, height, minZoom, maxZoom, nodeOrigin } = get();
        if (!panZoom) {
            return false;
        }
        return fitView({
            nodes,
            width,
            height,
            panZoom,
            minZoom,
            maxZoom,
            nodeOrigin,
        }, options);
    },
    cancelConnection: () => set({
        connectionStatus: null,
        connectionStartHandle: null,
        connectionEndHandle: null,
    }),
    updateConnection: (params) => {
        const { connectionPosition } = get();
        const currentConnection = {
            ...params,
            connectionPosition: params.connectionPosition ?? connectionPosition,
        };
        set(currentConnection);
    },
    reset: () => set({ ...getInitialState() }),
}), Object.is);

function ReactFlowProvider({ children, initialNodes, initialEdges, defaultNodes, defaultEdges, initialWidth, initialHeight, fitView, }) {
    const storeRef = useRef(null);
    if (!storeRef.current) {
        storeRef.current = createRFStore({
            nodes: initialNodes,
            edges: initialEdges,
            defaultNodes,
            defaultEdges,
            width: initialWidth,
            height: initialHeight,
            fitView,
        });
    }
    return jsx(Provider$1, { value: storeRef.current, children: children });
}

function Wrapper({ children, nodes, edges, defaultNodes, defaultEdges, width, height, fitView, }) {
    const isWrapped = useContext(StoreContext);
    if (isWrapped) {
        // we need to wrap it with a fragment because it's not allowed for children to be a ReactNode
        // https://github.com/DefinitelyTyped/DefinitelyTyped/issues/18051
        return jsx(Fragment, { children: children });
    }
    return (jsx(ReactFlowProvider, { initialNodes: nodes, initialEdges: edges, defaultNodes: defaultNodes, defaultEdges: defaultEdges, initialWidth: width, initialHeight: height, fitView: fitView, children: children }));
}

const wrapperStyle = {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
    zIndex: 0,
};
function ReactFlow({ nodes, edges, defaultNodes, defaultEdges, className, nodeTypes, edgeTypes, onNodeClick, onEdgeClick, onInit, onMove, onMoveStart, onMoveEnd, onConnect, onConnectStart, onConnectEnd, onClickConnectStart, onClickConnectEnd, onNodeMouseEnter, onNodeMouseMove, onNodeMouseLeave, onNodeContextMenu, onNodeDoubleClick, onNodeDragStart, onNodeDrag, onNodeDragStop, onNodesDelete, onEdgesDelete, onDelete, onSelectionChange, onSelectionDragStart, onSelectionDrag, onSelectionDragStop, onSelectionContextMenu, onSelectionStart, onSelectionEnd, onBeforeDelete, connectionMode, connectionLineType = ConnectionLineType.Bezier, connectionLineStyle, connectionLineComponent, connectionLineContainerStyle, deleteKeyCode = 'Backspace', selectionKeyCode = 'Shift', selectionOnDrag = false, selectionMode = SelectionMode.Full, panActivationKeyCode = 'Space', multiSelectionKeyCode = isMacOs() ? 'Meta' : 'Control', zoomActivationKeyCode = isMacOs() ? 'Meta' : 'Control', snapToGrid, snapGrid, onlyRenderVisibleElements = false, selectNodesOnDrag, nodesDraggable, nodesConnectable, nodesFocusable, nodeOrigin = defaultNodeOrigin, edgesFocusable, edgesUpdatable, elementsSelectable = true, defaultViewport: defaultViewport$1 = defaultViewport, minZoom = 0.5, maxZoom = 2, translateExtent = infiniteExtent, preventScrolling = true, nodeExtent, defaultMarkerColor = '#b1b1b7', zoomOnScroll = true, zoomOnPinch = true, panOnScroll = false, panOnScrollSpeed = 0.5, panOnScrollMode = PanOnScrollMode.Free, zoomOnDoubleClick = true, panOnDrag = true, onPaneClick, onPaneMouseEnter, onPaneMouseMove, onPaneMouseLeave, onPaneScroll, onPaneContextMenu, children, onEdgeUpdate, onEdgeContextMenu, onEdgeDoubleClick, onEdgeMouseEnter, onEdgeMouseMove, onEdgeMouseLeave, onEdgeUpdateStart, onEdgeUpdateEnd, edgeUpdaterRadius = 10, onNodesChange, onEdgesChange, noDragClassName = 'nodrag', noWheelClassName = 'nowheel', noPanClassName = 'nopan', fitView, fitViewOptions, connectOnClick, attributionPosition, proOptions, defaultEdgeOptions, elevateNodesOnSelect, elevateEdgesOnSelect, disableKeyboardA11y = false, autoPanOnConnect, autoPanOnNodeDrag, connectionRadius, isValidConnection, onError, style, id, nodeDragThreshold, viewport, onViewportChange, width, height, colorMode = 'light', debug, ...rest }, ref) {
    const rfId = id || '1';
    const colorModeClassName = useColorModeClass(colorMode);
    return (jsx("div", { ...rest, style: { ...style, ...wrapperStyle }, ref: ref, className: cc(['react-flow', className, colorModeClassName]), "data-testid": "rf__wrapper", id: id, children: jsxs(Wrapper, { nodes: nodes, edges: edges, width: width, height: height, fitView: fitView, children: [jsx(GraphView, { onInit: onInit, onNodeClick: onNodeClick, onEdgeClick: onEdgeClick, onNodeMouseEnter: onNodeMouseEnter, onNodeMouseMove: onNodeMouseMove, onNodeMouseLeave: onNodeMouseLeave, onNodeContextMenu: onNodeContextMenu, onNodeDoubleClick: onNodeDoubleClick, nodeTypes: nodeTypes, edgeTypes: edgeTypes, connectionLineType: connectionLineType, connectionLineStyle: connectionLineStyle, connectionLineComponent: connectionLineComponent, connectionLineContainerStyle: connectionLineContainerStyle, selectionKeyCode: selectionKeyCode, selectionOnDrag: selectionOnDrag, selectionMode: selectionMode, deleteKeyCode: deleteKeyCode, multiSelectionKeyCode: multiSelectionKeyCode, panActivationKeyCode: panActivationKeyCode, zoomActivationKeyCode: zoomActivationKeyCode, onlyRenderVisibleElements: onlyRenderVisibleElements, defaultViewport: defaultViewport$1, translateExtent: translateExtent, minZoom: minZoom, maxZoom: maxZoom, preventScrolling: preventScrolling, zoomOnScroll: zoomOnScroll, zoomOnPinch: zoomOnPinch, zoomOnDoubleClick: zoomOnDoubleClick, panOnScroll: panOnScroll, panOnScrollSpeed: panOnScrollSpeed, panOnScrollMode: panOnScrollMode, panOnDrag: panOnDrag, onPaneClick: onPaneClick, onPaneMouseEnter: onPaneMouseEnter, onPaneMouseMove: onPaneMouseMove, onPaneMouseLeave: onPaneMouseLeave, onPaneScroll: onPaneScroll, onPaneContextMenu: onPaneContextMenu, onSelectionContextMenu: onSelectionContextMenu, onSelectionStart: onSelectionStart, onSelectionEnd: onSelectionEnd, onEdgeUpdate: onEdgeUpdate, onEdgeContextMenu: onEdgeContextMenu, onEdgeDoubleClick: onEdgeDoubleClick, onEdgeMouseEnter: onEdgeMouseEnter, onEdgeMouseMove: onEdgeMouseMove, onEdgeMouseLeave: onEdgeMouseLeave, onEdgeUpdateStart: onEdgeUpdateStart, onEdgeUpdateEnd: onEdgeUpdateEnd, edgeUpdaterRadius: edgeUpdaterRadius, defaultMarkerColor: defaultMarkerColor, noDragClassName: noDragClassName, noWheelClassName: noWheelClassName, noPanClassName: noPanClassName, rfId: rfId, disableKeyboardA11y: disableKeyboardA11y, nodeOrigin: nodeOrigin, nodeExtent: nodeExtent, viewport: viewport, onViewportChange: onViewportChange }), jsx(StoreUpdater, { nodes: nodes, edges: edges, defaultNodes: defaultNodes, defaultEdges: defaultEdges, onConnect: onConnect, onConnectStart: onConnectStart, onConnectEnd: onConnectEnd, onClickConnectStart: onClickConnectStart, onClickConnectEnd: onClickConnectEnd, nodesDraggable: nodesDraggable, nodesConnectable: nodesConnectable, nodesFocusable: nodesFocusable, edgesFocusable: edgesFocusable, edgesUpdatable: edgesUpdatable, elementsSelectable: elementsSelectable, elevateNodesOnSelect: elevateNodesOnSelect, elevateEdgesOnSelect: elevateEdgesOnSelect, minZoom: minZoom, maxZoom: maxZoom, nodeExtent: nodeExtent, onNodesChange: onNodesChange, onEdgesChange: onEdgesChange, snapToGrid: snapToGrid, snapGrid: snapGrid, connectionMode: connectionMode, translateExtent: translateExtent, connectOnClick: connectOnClick, defaultEdgeOptions: defaultEdgeOptions, fitView: fitView, fitViewOptions: fitViewOptions, onNodesDelete: onNodesDelete, onEdgesDelete: onEdgesDelete, onDelete: onDelete, onNodeDragStart: onNodeDragStart, onNodeDrag: onNodeDrag, onNodeDragStop: onNodeDragStop, onSelectionDrag: onSelectionDrag, onSelectionDragStart: onSelectionDragStart, onSelectionDragStop: onSelectionDragStop, onMove: onMove, onMoveStart: onMoveStart, onMoveEnd: onMoveEnd, noPanClassName: noPanClassName, nodeOrigin: nodeOrigin, rfId: rfId, autoPanOnConnect: autoPanOnConnect, autoPanOnNodeDrag: autoPanOnNodeDrag, onError: onError, connectionRadius: connectionRadius, isValidConnection: isValidConnection, selectNodesOnDrag: selectNodesOnDrag, nodeDragThreshold: nodeDragThreshold, onBeforeDelete: onBeforeDelete, debug: debug }), jsx(SelectionListener, { onSelectionChange: onSelectionChange }), children, jsx(Attribution, { proOptions: proOptions, position: attributionPosition }), jsx(A11yDescriptions, { rfId: rfId, disableKeyboardA11y: disableKeyboardA11y })] }) }));
}
var index = forwardRef(ReactFlow);

const selector$8 = (s) => s.domNode?.querySelector('.react-flow__edgelabel-renderer');
function EdgeLabelRenderer({ children }) {
    const edgeLabelRenderer = useStore(selector$8);
    if (!edgeLabelRenderer) {
        return null;
    }
    return createPortal(children, edgeLabelRenderer);
}

const selector$7 = (s) => s.domNode?.querySelector('.react-flow__viewport-portal');
function ViewportPortal({ children }) {
    const viewPortalDiv = useStore(selector$7);
    if (!viewPortalDiv) {
        return null;
    }
    return createPortal(children, viewPortalDiv);
}

/**
 * Hook for updating node internals.
 *
 * @public
 * @returns function for updating node internals
 */
function useUpdateNodeInternals() {
    const store = useStoreApi();
    return useCallback((id) => {
        const { domNode, updateNodeDimensions } = store.getState();
        const updateIds = Array.isArray(id) ? id : [id];
        const updates = new Map();
        updateIds.forEach((updateId) => {
            const nodeElement = domNode?.querySelector(`.react-flow__node[data-id="${updateId}"]`);
            if (nodeElement) {
                updates.set(updateId, { id: updateId, nodeElement, forceUpdate: true });
            }
        });
        requestAnimationFrame(() => updateNodeDimensions(updates));
    }, []);
}

const nodesSelector = (state) => state.nodes;
/**
 * Hook for getting the current nodes from the store.
 *
 * @public
 * @returns An array of nodes
 */
function useNodes() {
    const nodes = useStore(nodesSelector, shallow);
    return nodes;
}

const edgesSelector = (state) => state.edges;
/**
 * Hook for getting the current edges from the store.
 *
 * @public
 * @returns An array of edges
 */
function useEdges() {
    const edges = useStore(edgesSelector, shallow);
    return edges;
}

const viewportSelector = (state) => ({
    x: state.transform[0],
    y: state.transform[1],
    zoom: state.transform[2],
});
/**
 * Hook for getting the current viewport from the store.
 *
 * @public
 * @returns The current viewport
 */
function useViewport() {
    const viewport = useStore(viewportSelector, shallow);
    return viewport;
}

/**
 * Hook for managing the state of nodes - should only be used for prototyping / simple use cases.
 *
 * @public
 * @param initialNodes
 * @returns an array [nodes, setNodes, onNodesChange]
 */
function useNodesState(initialNodes) {
    const [nodes, setNodes] = useState(initialNodes);
    const onNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
    return [nodes, setNodes, onNodesChange];
}
/**
 * Hook for managing the state of edges - should only be used for prototyping / simple use cases.
 *
 * @public
 * @param initialEdges
 * @returns an array [edges, setEdges, onEdgesChange]
 */
function useEdgesState(initialEdges) {
    const [edges, setEdges] = useState(initialEdges);
    const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
    return [edges, setEdges, onEdgesChange];
}

/**
 * Hook for registering an onViewportChange handler.
 *
 * @public
 * @param params.onStart - gets called when the viewport starts changing
 * @param params.onChange - gets called when the viewport changes
 * @param params.onEnd - gets called when the viewport stops changing
 */
function useOnViewportChange({ onStart, onChange, onEnd }) {
    const store = useStoreApi();
    useEffect(() => {
        store.setState({ onViewportChangeStart: onStart });
    }, [onStart]);
    useEffect(() => {
        store.setState({ onViewportChange: onChange });
    }, [onChange]);
    useEffect(() => {
        store.setState({ onViewportChangeEnd: onEnd });
    }, [onEnd]);
}

/**
 * Hook for registering an onSelectionChange handler.
 *
 * @public
 * @param params.onChange - The handler to register
 */
function useOnSelectionChange({ onChange }) {
    const store = useStoreApi();
    useEffect(() => {
        const nextOnSelectionChangeHandlers = [...store.getState().onSelectionChangeHandlers, onChange];
        store.setState({ onSelectionChangeHandlers: nextOnSelectionChangeHandlers });
        return () => {
            const nextHandlers = store.getState().onSelectionChangeHandlers.filter((fn) => fn !== onChange);
            store.setState({ onSelectionChangeHandlers: nextHandlers });
        };
    }, [onChange]);
}

const selector$6 = (options) => (s) => {
    if (s.nodes.length === 0) {
        return false;
    }
    for (const node of s.nodes) {
        if (options.includeHiddenNodes || !node.hidden) {
            if (node[internalsSymbol]?.handleBounds === undefined) {
                return false;
            }
        }
    }
    return true;
};
const defaultOptions = {
    includeHiddenNodes: false,
};
/**
 * Hook which returns true when all nodes are initialized.
 *
 * @public
 * @param options.includeHiddenNodes - defaults to false
 * @returns boolean indicating whether all nodes are initialized
 */
function useNodesInitialized(options = defaultOptions) {
    const initialized = useStore(selector$6(options));
    return initialized;
}

/**
 * Hook to check if a <Handle /> is connected to another <Handle /> and get the connections.
 *
 * @public
 * @param param.type - handle type 'source' or 'target'
 * @param param.nodeId - node id - if not provided, the node id from the NodeIdContext is used
 * @param param.id - the handle id (this is only needed if the node has multiple handles of the same type)
 * @param param.onConnect - gets called when a connection is established
 * @param param.onDisconnect - gets called when a connection is removed
 * @returns an array with handle connections
 */
function useHandleConnections({ type, id = null, nodeId, onConnect, onDisconnect, }) {
    const _nodeId = useNodeId();
    const currentNodeId = nodeId ?? _nodeId;
    const prevConnections = useRef(null);
    const connections = useStore((state) => state.connectionLookup.get(`${currentNodeId}-${type}-${id}`), areConnectionMapsEqual);
    useEffect(() => {
        // @todo dicuss if onConnect/onDisconnect should be called when the component mounts/unmounts
        if (prevConnections.current && prevConnections.current !== connections) {
            const _connections = connections ?? new Map();
            handleConnectionChange(prevConnections.current, _connections, onDisconnect);
            handleConnectionChange(_connections, prevConnections.current, onConnect);
        }
        prevConnections.current = connections ?? new Map();
    }, [connections, onConnect, onDisconnect]);
    return useMemo(() => Array.from(connections?.values() ?? []), [connections]);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useNodesData(nodeIds) {
    const nodesData = useStore(useCallback((s) => {
        const data = [];
        const isArrayOfIds = Array.isArray(nodeIds);
        const _nodeIds = isArrayOfIds ? nodeIds : [nodeIds];
        for (const nodeId of _nodeIds) {
            const node = s.nodeLookup.get(nodeId);
            if (node) {
                data.push({
                    id: node.id,
                    type: node.type,
                    data: node.data,
                });
            }
        }
        return isArrayOfIds ? data : data[0] ?? null;
    }, [nodeIds]), shallowNodeData);
    return nodesData;
}

const selector$5 = (s) => ({
    startHandle: s.connectionStartHandle,
    endHandle: s.connectionEndHandle,
    status: s.connectionStatus,
    position: s.connectionStartHandle ? s.connectionPosition : null,
});
/**
 * Hook for accessing the ongoing connection.
 *
 * @public
 * @returns ongoing connection
 */
function useConnection() {
    const ongoingConnection = useStore(selector$5, shallow);
    return ongoingConnection;
}

function LinePattern({ dimensions, lineWidth, variant, className }) {
    return (jsx("path", { strokeWidth: lineWidth, d: `M${dimensions[0] / 2} 0 V${dimensions[1]} M0 ${dimensions[1] / 2} H${dimensions[0]}`, className: cc(['react-flow__background-pattern', variant, className]) }));
}
function DotPattern({ radius, className }) {
    return (jsx("circle", { cx: radius, cy: radius, r: radius, className: cc(['react-flow__background-pattern', 'dots', className]) }));
}

var BackgroundVariant;
(function (BackgroundVariant) {
    BackgroundVariant["Lines"] = "lines";
    BackgroundVariant["Dots"] = "dots";
    BackgroundVariant["Cross"] = "cross";
})(BackgroundVariant || (BackgroundVariant = {}));

const defaultSize = {
    [BackgroundVariant.Dots]: 1,
    [BackgroundVariant.Lines]: 1,
    [BackgroundVariant.Cross]: 6,
};
const selector$4 = (s) => ({ transform: s.transform, patternId: `pattern-${s.rfId}` });
function BackgroundComponent({ id, variant = BackgroundVariant.Dots, 
// only used for dots and cross
gap = 20, 
// only used for lines and cross
size, lineWidth = 1, offset = 2, color, bgColor, style, className, patternClassName, }) {
    const ref = useRef(null);
    const { transform, patternId } = useStore(selector$4, shallow);
    const patternSize = size || defaultSize[variant];
    const isDots = variant === BackgroundVariant.Dots;
    const isCross = variant === BackgroundVariant.Cross;
    const gapXY = Array.isArray(gap) ? gap : [gap, gap];
    const scaledGap = [gapXY[0] * transform[2] || 1, gapXY[1] * transform[2] || 1];
    const scaledSize = patternSize * transform[2];
    const patternDimensions = isCross ? [scaledSize, scaledSize] : scaledGap;
    const patternOffset = isDots
        ? [scaledSize / offset, scaledSize / offset]
        : [patternDimensions[0] / offset, patternDimensions[1] / offset];
    const _patternId = `${patternId}${id ? id : ''}`;
    return (jsxs("svg", { className: cc(['react-flow__background', className]), style: {
            ...style,
            ...containerStyle,
            '--xy-background-color-props': bgColor,
            '--xy-background-pattern-color-props': color,
        }, ref: ref, "data-testid": "rf__background", children: [jsx("pattern", { id: _patternId, x: transform[0] % scaledGap[0], y: transform[1] % scaledGap[1], width: scaledGap[0], height: scaledGap[1], patternUnits: "userSpaceOnUse", patternTransform: `translate(-${patternOffset[0]},-${patternOffset[1]})`, children: isDots ? (jsx(DotPattern, { radius: scaledSize / offset, className: patternClassName })) : (jsx(LinePattern, { dimensions: patternDimensions, lineWidth: lineWidth, variant: variant, className: patternClassName })) }), jsx("rect", { x: "0", y: "0", width: "100%", height: "100%", fill: `url(#${_patternId})` })] }));
}
BackgroundComponent.displayName = 'Background';
const Background = memo(BackgroundComponent);

function PlusIcon() {
    return (jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", children: jsx("path", { d: "M32 18.133H18.133V32h-4.266V18.133H0v-4.266h13.867V0h4.266v13.867H32z" }) }));
}

function MinusIcon() {
    return (jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 5", children: jsx("path", { d: "M0 0h32v4.2H0z" }) }));
}

function FitViewIcon() {
    return (jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 30", children: jsx("path", { d: "M3.692 4.63c0-.53.4-.938.939-.938h5.215V0H4.708C2.13 0 0 2.054 0 4.63v5.216h3.692V4.631zM27.354 0h-5.2v3.692h5.17c.53 0 .984.4.984.939v5.215H32V4.631A4.624 4.624 0 0027.354 0zm.954 24.83c0 .532-.4.94-.939.94h-5.215v3.768h5.215c2.577 0 4.631-2.13 4.631-4.707v-5.139h-3.692v5.139zm-23.677.94c-.531 0-.939-.4-.939-.94v-5.138H0v5.139c0 2.577 2.13 4.707 4.708 4.707h5.138V25.77H4.631z" }) }));
}

function LockIcon() {
    return (jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 25 32", children: jsx("path", { d: "M21.333 10.667H19.81V7.619C19.81 3.429 16.38 0 12.19 0 8 0 4.571 3.429 4.571 7.619v3.048H3.048A3.056 3.056 0 000 13.714v15.238A3.056 3.056 0 003.048 32h18.285a3.056 3.056 0 003.048-3.048V13.714a3.056 3.056 0 00-3.048-3.047zM12.19 24.533a3.056 3.056 0 01-3.047-3.047 3.056 3.056 0 013.047-3.048 3.056 3.056 0 013.048 3.048 3.056 3.056 0 01-3.048 3.047zm4.724-13.866H7.467V7.619c0-2.59 2.133-4.724 4.723-4.724 2.591 0 4.724 2.133 4.724 4.724v3.048z" }) }));
}

function UnlockIcon() {
    return (jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 25 32", children: jsx("path", { d: "M21.333 10.667H19.81V7.619C19.81 3.429 16.38 0 12.19 0c-4.114 1.828-1.37 2.133.305 2.438 1.676.305 4.42 2.59 4.42 5.181v3.048H3.047A3.056 3.056 0 000 13.714v15.238A3.056 3.056 0 003.048 32h18.285a3.056 3.056 0 003.048-3.048V13.714a3.056 3.056 0 00-3.048-3.047zM12.19 24.533a3.056 3.056 0 01-3.047-3.047 3.056 3.056 0 013.047-3.048 3.056 3.056 0 013.048 3.048 3.056 3.056 0 01-3.048 3.047z" }) }));
}

function ControlButton({ children, className, ...rest }) {
    return (jsx("button", { type: "button", className: cc(['react-flow__controls-button', className]), ...rest, children: children }));
}

const selector$3 = (s) => ({
    isInteractive: s.nodesDraggable || s.nodesConnectable || s.elementsSelectable,
    minZoomReached: s.transform[2] <= s.minZoom,
    maxZoomReached: s.transform[2] >= s.maxZoom,
});
function ControlsComponent({ style, showZoom = true, showFitView = true, showInteractive = true, fitViewOptions, onZoomIn, onZoomOut, onFitView, onInteractiveChange, className, children, position = 'bottom-left', 'aria-label': ariaLabel = 'React Flow controls', }) {
    const store = useStoreApi();
    const { isInteractive, minZoomReached, maxZoomReached } = useStore(selector$3, shallow);
    const { zoomIn, zoomOut, fitView } = useReactFlow();
    const onZoomInHandler = () => {
        zoomIn();
        onZoomIn?.();
    };
    const onZoomOutHandler = () => {
        zoomOut();
        onZoomOut?.();
    };
    const onFitViewHandler = () => {
        fitView(fitViewOptions);
        onFitView?.();
    };
    const onToggleInteractivity = () => {
        store.setState({
            nodesDraggable: !isInteractive,
            nodesConnectable: !isInteractive,
            elementsSelectable: !isInteractive,
        });
        onInteractiveChange?.(!isInteractive);
    };
    return (jsxs(Panel, { className: cc(['react-flow__controls', className]), position: position, style: style, "data-testid": "rf__controls", "aria-label": ariaLabel, children: [showZoom && (jsxs(Fragment, { children: [jsx(ControlButton, { onClick: onZoomInHandler, className: "react-flow__controls-zoomin", title: "zoom in", "aria-label": "zoom in", disabled: maxZoomReached, children: jsx(PlusIcon, {}) }), jsx(ControlButton, { onClick: onZoomOutHandler, className: "react-flow__controls-zoomout", title: "zoom out", "aria-label": "zoom out", disabled: minZoomReached, children: jsx(MinusIcon, {}) })] })), showFitView && (jsx(ControlButton, { className: "react-flow__controls-fitview", onClick: onFitViewHandler, title: "fit view", "aria-label": "fit view", children: jsx(FitViewIcon, {}) })), showInteractive && (jsx(ControlButton, { className: "react-flow__controls-interactive", onClick: onToggleInteractivity, title: "toggle interactivity", "aria-label": "toggle interactivity", children: isInteractive ? jsx(UnlockIcon, {}) : jsx(LockIcon, {}) })), children] }));
}
ControlsComponent.displayName = 'Controls';
const Controls = memo(ControlsComponent);

function MiniMapNodeComponent({ id, x, y, width, height, style, color, strokeColor, strokeWidth, className, borderRadius, shapeRendering, selected, onClick, }) {
    const { background, backgroundColor } = style || {};
    const fill = (color || background || backgroundColor);
    return (jsx("rect", { className: cc(['react-flow__minimap-node', { selected }, className]), x: x, y: y, rx: borderRadius, ry: borderRadius, width: width, height: height, style: {
            fill,
            stroke: strokeColor,
            strokeWidth,
        }, shapeRendering: shapeRendering, onClick: onClick ? (event) => onClick(event, id) : undefined }));
}
const MiniMapNode = memo(MiniMapNodeComponent);

const selector$2 = (s) => s.nodeOrigin;
const selectorNodeIds = (s) => s.nodes.map((node) => node.id);
const getAttrFunction = (func) => func instanceof Function ? func : () => func;
function MiniMapNodes({ nodeStrokeColor, nodeColor, nodeClassName = '', nodeBorderRadius = 5, nodeStrokeWidth, 
// We need to rename the prop to be `CapitalCase` so that JSX will render it as
// a component properly.
nodeComponent: NodeComponent = MiniMapNode, onClick, }) {
    const nodeIds = useStore(selectorNodeIds, shallow);
    const nodeOrigin = useStore(selector$2);
    const nodeColorFunc = getAttrFunction(nodeColor);
    const nodeStrokeColorFunc = getAttrFunction(nodeStrokeColor);
    const nodeClassNameFunc = getAttrFunction(nodeClassName);
    const shapeRendering = typeof window === 'undefined' || !!window.chrome ? 'crispEdges' : 'geometricPrecision';
    return (jsx(Fragment, { children: nodeIds.map((nodeId) => (
        // The split of responsibilities between MiniMapNodes and
        // NodeComponentWrapper may appear weird. However, it’s designed to
        // minimize the cost of updates when individual nodes change.
        //
        // For more details, see a similar commit in `NodeRenderer/index.tsx`.
        jsx(NodeComponentWrapper, { id: nodeId, nodeOrigin: nodeOrigin, nodeColorFunc: nodeColorFunc, nodeStrokeColorFunc: nodeStrokeColorFunc, nodeClassNameFunc: nodeClassNameFunc, nodeBorderRadius: nodeBorderRadius, nodeStrokeWidth: nodeStrokeWidth, NodeComponent: NodeComponent, onClick: onClick, shapeRendering: shapeRendering }, nodeId))) }));
}
function NodeComponentWrapperInner({ id, nodeOrigin, nodeColorFunc, nodeStrokeColorFunc, nodeClassNameFunc, nodeBorderRadius, nodeStrokeWidth, shapeRendering, NodeComponent, onClick, }) {
    const { node, x, y } = useStore((s) => {
        const node = s.nodeLookup.get(id);
        const { x, y } = getNodePositionWithOrigin(node, node?.origin || nodeOrigin).positionAbsolute;
        return {
            node,
            x,
            y,
        };
    }, shallow);
    if (!node || node.hidden || !nodeHasDimensions(node)) {
        return null;
    }
    const { width, height } = getNodeDimensions(node);
    return (jsx(NodeComponent, { x: x, y: y, width: width, height: height, style: node.style, selected: !!node.selected, className: nodeClassNameFunc(node), color: nodeColorFunc(node), borderRadius: nodeBorderRadius, strokeColor: nodeStrokeColorFunc(node), strokeWidth: nodeStrokeWidth, shapeRendering: shapeRendering, onClick: onClick, id: node.id }));
}
const NodeComponentWrapper = memo(NodeComponentWrapperInner);
var MiniMapNodes$1 = memo(MiniMapNodes);

const defaultWidth = 200;
const defaultHeight = 150;
const selector$1 = (s) => {
    const viewBB = {
        x: -s.transform[0] / s.transform[2],
        y: -s.transform[1] / s.transform[2],
        width: s.width / s.transform[2],
        height: s.height / s.transform[2],
    };
    return {
        viewBB,
        boundingRect: s.nodes.length > 0 ? getBoundsOfRects(getNodesBounds(s.nodes, { nodeOrigin: s.nodeOrigin }), viewBB) : viewBB,
        rfId: s.rfId,
        nodeOrigin: s.nodeOrigin,
        panZoom: s.panZoom,
        translateExtent: s.translateExtent,
        flowWidth: s.width,
        flowHeight: s.height,
    };
};
const ARIA_LABEL_KEY = 'react-flow__minimap-desc';
function MiniMapComponent({ style, className, nodeStrokeColor, nodeColor, nodeClassName = '', nodeBorderRadius = 5, nodeStrokeWidth, 
// We need to rename the prop to be `CapitalCase` so that JSX will render it as
// a component properly.
nodeComponent, bgColor, maskColor, maskStrokeColor, maskStrokeWidth, position = 'bottom-right', onClick, onNodeClick, pannable = false, zoomable = false, ariaLabel = 'React Flow mini map', inversePan, zoomStep = 10, offsetScale = 5, }) {
    const store = useStoreApi();
    const svg = useRef(null);
    const { boundingRect, viewBB, rfId, panZoom, translateExtent, flowWidth, flowHeight } = useStore(selector$1, shallow);
    const elementWidth = style?.width ?? defaultWidth;
    const elementHeight = style?.height ?? defaultHeight;
    const scaledWidth = boundingRect.width / elementWidth;
    const scaledHeight = boundingRect.height / elementHeight;
    const viewScale = Math.max(scaledWidth, scaledHeight);
    const viewWidth = viewScale * elementWidth;
    const viewHeight = viewScale * elementHeight;
    const offset = offsetScale * viewScale;
    const x = boundingRect.x - (viewWidth - boundingRect.width) / 2 - offset;
    const y = boundingRect.y - (viewHeight - boundingRect.height) / 2 - offset;
    const width = viewWidth + offset * 2;
    const height = viewHeight + offset * 2;
    const labelledBy = `${ARIA_LABEL_KEY}-${rfId}`;
    const viewScaleRef = useRef(0);
    const minimapInstance = useRef();
    viewScaleRef.current = viewScale;
    useEffect(() => {
        if (svg.current && panZoom) {
            minimapInstance.current = XYMinimap({
                domNode: svg.current,
                panZoom,
                getTransform: () => store.getState().transform,
                getViewScale: () => viewScaleRef.current,
            });
            return () => {
                minimapInstance.current?.destroy();
            };
        }
    }, [panZoom]);
    useEffect(() => {
        minimapInstance.current?.update({
            translateExtent,
            width: flowWidth,
            height: flowHeight,
            inversePan,
            pannable,
            zoomStep,
            zoomable,
        });
    }, [pannable, zoomable, inversePan, zoomStep, translateExtent, flowWidth, flowHeight]);
    const onSvgClick = onClick
        ? (event) => {
            const [x, y] = minimapInstance.current?.pointer(event) || [0, 0];
            onClick(event, { x, y });
        }
        : undefined;
    const onSvgNodeClick = onNodeClick
        ? useCallback((event, nodeId) => {
            const node = store.getState().nodeLookup.get(nodeId);
            onNodeClick(event, node);
        }, [])
        : undefined;
    return (jsx(Panel, { position: position, style: {
            ...style,
            '--xy-minimap-background-color-props': typeof bgColor === 'string' ? bgColor : undefined,
            '--xy-minimap-mask-background-color-props': typeof maskColor === 'string' ? maskColor : undefined,
            '--xy-minimap-mask-stroke-color-props': typeof maskStrokeColor === 'string' ? maskStrokeColor : undefined,
            '--xy-minimap-mask-stroke-width-props': typeof maskStrokeWidth === 'number' ? maskStrokeWidth * viewScale : undefined,
            '--xy-minimap-node-background-color-props': typeof nodeColor === 'string' ? nodeColor : undefined,
            '--xy-minimap-node-stroke-color-props': typeof nodeStrokeColor === 'string' ? nodeStrokeColor : undefined,
            '--xy-minimap-node-stroke-width-props': typeof nodeStrokeWidth === 'string' ? nodeStrokeWidth : undefined,
        }, className: cc(['react-flow__minimap', className]), "data-testid": "rf__minimap", children: jsxs("svg", { width: elementWidth, height: elementHeight, viewBox: `${x} ${y} ${width} ${height}`, className: "react-flow__minimap-svg", role: "img", "aria-labelledby": labelledBy, ref: svg, onClick: onSvgClick, children: [ariaLabel && jsx("title", { id: labelledBy, children: ariaLabel }), jsx(MiniMapNodes$1, { onClick: onSvgNodeClick, nodeColor: nodeColor, nodeStrokeColor: nodeStrokeColor, nodeBorderRadius: nodeBorderRadius, nodeClassName: nodeClassName, nodeStrokeWidth: nodeStrokeWidth, nodeComponent: nodeComponent }), jsx("path", { className: "react-flow__minimap-mask", d: `M${x - offset},${y - offset}h${width + offset * 2}v${height + offset * 2}h${-width - offset * 2}z
        M${viewBB.x},${viewBB.y}h${viewBB.width}v${viewBB.height}h${-viewBB.width}z`, fillRule: "evenodd", pointerEvents: "none" })] }) }));
}
MiniMapComponent.displayName = 'MiniMap';
const MiniMap = memo(MiniMapComponent);

function ResizeControl({ nodeId, position, variant = ResizeControlVariant.Handle, className, style = {}, children, color, minWidth = 10, minHeight = 10, maxWidth = Number.MAX_VALUE, maxHeight = Number.MAX_VALUE, keepAspectRatio = false, shouldResize, onResizeStart, onResize, onResizeEnd, }) {
    const contextNodeId = useNodeId();
    const id = typeof nodeId === 'string' ? nodeId : contextNodeId;
    const store = useStoreApi();
    const resizeControlRef = useRef(null);
    const defaultPosition = variant === ResizeControlVariant.Line ? 'right' : 'bottom-right';
    const controlPosition = position ?? defaultPosition;
    const resizer = useRef(null);
    useEffect(() => {
        if (!resizeControlRef.current || !id) {
            return;
        }
        if (!resizer.current) {
            resizer.current = XYResizer({
                domNode: resizeControlRef.current,
                nodeId: id,
                getStoreItems: () => {
                    const { nodeLookup, transform, snapGrid, snapToGrid, nodeOrigin } = store.getState();
                    return {
                        nodeLookup,
                        transform,
                        snapGrid,
                        snapToGrid,
                        nodeOrigin,
                    };
                },
                onChange: (change, childChanges) => {
                    const { triggerNodeChanges } = store.getState();
                    const changes = [];
                    if (change.isXPosChange || change.isYPosChange) {
                        const positionChange = {
                            id,
                            type: 'position',
                            position: {
                                x: change.x,
                                y: change.y,
                            },
                        };
                        changes.push(positionChange);
                    }
                    if (change.isWidthChange || change.isHeightChange) {
                        const dimensionChange = {
                            id,
                            type: 'dimensions',
                            resizing: true,
                            dimensions: {
                                width: change.width,
                                height: change.height,
                            },
                        };
                        changes.push(dimensionChange);
                    }
                    for (const childChange of childChanges) {
                        const positionChange = {
                            ...childChange,
                            type: 'position',
                        };
                        changes.push(positionChange);
                    }
                    triggerNodeChanges(changes);
                },
                onEnd: () => {
                    const dimensionChange = {
                        id: id,
                        type: 'dimensions',
                        resizing: false,
                    };
                    store.getState().triggerNodeChanges([dimensionChange]);
                },
            });
        }
        resizer.current.update({
            controlPosition,
            boundaries: {
                minWidth,
                minHeight,
                maxWidth,
                maxHeight,
            },
            keepAspectRatio,
            onResizeStart,
            onResize,
            onResizeEnd,
            shouldResize,
        });
        return () => {
            resizer.current?.destroy();
        };
    }, [
        controlPosition,
        minWidth,
        minHeight,
        maxWidth,
        maxHeight,
        keepAspectRatio,
        onResizeStart,
        onResize,
        onResizeEnd,
        shouldResize,
    ]);
    const positionClassNames = controlPosition.split('-');
    const colorStyleProp = variant === ResizeControlVariant.Line ? 'borderColor' : 'backgroundColor';
    const controlStyle = color ? { ...style, [colorStyleProp]: color } : style;
    return (jsx("div", { className: cc(['react-flow__resize-control', 'nodrag', ...positionClassNames, variant, className]), ref: resizeControlRef, style: controlStyle, children: children }));
}
const NodeResizeControl = memo(ResizeControl);

function NodeResizer({ nodeId, isVisible = true, handleClassName, handleStyle, lineClassName, lineStyle, color, minWidth = 10, minHeight = 10, maxWidth = Number.MAX_VALUE, maxHeight = Number.MAX_VALUE, keepAspectRatio = false, shouldResize, onResizeStart, onResize, onResizeEnd, }) {
    if (!isVisible) {
        return null;
    }
    return (jsxs(Fragment, { children: [XY_RESIZER_LINE_POSITIONS.map((position) => (jsx(NodeResizeControl, { className: lineClassName, style: lineStyle, nodeId: nodeId, position: position, variant: ResizeControlVariant.Line, color: color, minWidth: minWidth, minHeight: minHeight, maxWidth: maxWidth, maxHeight: maxHeight, onResizeStart: onResizeStart, keepAspectRatio: keepAspectRatio, shouldResize: shouldResize, onResize: onResize, onResizeEnd: onResizeEnd }, position))), XY_RESIZER_HANDLE_POSITIONS.map((position) => (jsx(NodeResizeControl, { className: handleClassName, style: handleStyle, nodeId: nodeId, position: position, color: color, minWidth: minWidth, minHeight: minHeight, maxWidth: maxWidth, maxHeight: maxHeight, onResizeStart: onResizeStart, keepAspectRatio: keepAspectRatio, shouldResize: shouldResize, onResize: onResize, onResizeEnd: onResizeEnd }, position)))] }));
}

const selector = (state) => state.domNode?.querySelector('.react-flow__renderer');
function NodeToolbarPortal({ children }) {
    const wrapperRef = useStore(selector);
    if (!wrapperRef) {
        return null;
    }
    return createPortal(children, wrapperRef);
}

const nodeEqualityFn = (a, b) => a?.computed?.positionAbsolute?.x !== b?.computed?.positionAbsolute?.x ||
    a?.computed?.positionAbsolute?.y !== b?.computed?.positionAbsolute?.y ||
    a?.computed?.width !== b?.computed?.width ||
    a?.computed?.height !== b?.computed?.height ||
    a?.selected !== b?.selected ||
    a?.[internalsSymbol]?.z !== b?.[internalsSymbol]?.z;
const nodesEqualityFn = (a, b) => {
    if (a.length !== b.length) {
        return false;
    }
    return !a.some((node, i) => nodeEqualityFn(node, b[i]));
};
const storeSelector = (state) => ({
    viewport: {
        x: state.transform[0],
        y: state.transform[1],
        zoom: state.transform[2],
    },
    nodeOrigin: state.nodeOrigin,
    selectedNodesCount: state.nodes.filter((node) => node.selected).length,
});
function NodeToolbar({ nodeId, children, className, style, isVisible, position = Position.Top, offset = 10, align = 'center', ...rest }) {
    const contextNodeId = useNodeId();
    const nodesSelector = useCallback((state) => {
        const nodeIds = Array.isArray(nodeId) ? nodeId : [nodeId || contextNodeId || ''];
        return nodeIds.reduce((acc, id) => {
            const node = state.nodeLookup.get(id);
            if (node) {
                acc.push(node);
            }
            return acc;
        }, []);
    }, [nodeId, contextNodeId]);
    const nodes = useStore(nodesSelector, nodesEqualityFn);
    const { viewport, nodeOrigin, selectedNodesCount } = useStore(storeSelector, shallow);
    // if isVisible is not set, we show the toolbar only if its node is selected and no other node is selected
    const isActive = typeof isVisible === 'boolean' ? isVisible : nodes.length === 1 && nodes[0].selected && selectedNodesCount === 1;
    if (!isActive || !nodes.length) {
        return null;
    }
    const nodeRect = getNodesBounds(nodes, { nodeOrigin });
    const zIndex = Math.max(...nodes.map((node) => (node[internalsSymbol]?.z || 1) + 1));
    const wrapperStyle = {
        position: 'absolute',
        transform: getNodeToolbarTransform(nodeRect, viewport, position, offset, align),
        zIndex,
        ...style,
    };
    return (jsx(NodeToolbarPortal, { children: jsx("div", { style: wrapperStyle, className: cc(['react-flow__node-toolbar', className]), ...rest, "data-id": nodes.reduce((acc, node) => `${acc}${node.id} `, '').trim(), children: children }) }));
}

export { Background, BackgroundVariant, BaseEdge, BezierEdge, ControlButton, Controls, EdgeLabelRenderer, EdgeText, Handle, MiniMap, NodeResizeControl, NodeResizer, NodeToolbar, Panel, index as ReactFlow, ReactFlowProvider, SimpleBezierEdge, SmoothStepEdge, StepEdge, StraightEdge, ViewportPortal, applyEdgeChanges, applyNodeChanges, getSimpleBezierPath, handleParentExpand, isEdge, isNode, useConnection, useEdges, useEdgesState, useHandleConnections, useKeyPress, useNodeId, useNodes, useNodesData, useNodesInitialized, useNodesState, useOnSelectionChange, useOnViewportChange, useReactFlow, useStore, useStoreApi, useUpdateNodeInternals, useViewport };
