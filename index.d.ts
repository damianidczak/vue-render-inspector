/**
 * Vue Render Inspector - TypeScript Definitions
 * Provides full type safety for TypeScript users
 */

import { Plugin, ComponentInternalInstance, App } from 'vue';

// ==================== Options Types ====================

export interface VueRenderInspectorOptions {
    /** Enable/disable inspector (default: !production) */
    enabled?: boolean;

    /** Log to console (default: true) */
    console?: boolean;

    /** Show detailed logs (default: false) */
    verbose?: boolean;

    /** Colorize console output (default: true) */
    colorize?: boolean;

    /** Show timestamp in logs (default: true) */
    showTimestamp?: boolean;

    /** Show render duration (default: true) */
    showDuration?: boolean;

    /** Group logs by component (default: false) */
    groupByComponent?: boolean;

    /** Warn if render > N ms (default: 16) */
    warnThreshold?: number;

    /** Error if render > N ms (default: 100) */
    errorThreshold?: number;

    /** Detect unnecessary renders (default: true) */
    detectUnnecessary?: boolean;

    /** Strict mode for detection (default: false) */
    strictMode?: boolean;

    /** Track inline function changes (default: true) */
    trackFunctions?: boolean;

    /** Track dependency graph (default: false) */
    trackDependencies?: boolean;

    /** Component name patterns to include (default: []) */
    include?: (RegExp | string)[];

    /** Component name patterns to exclude (default: []) */
    exclude?: (RegExp | string)[];

    /** Maximum render records to store (default: 1000) */
    maxRecords?: number;

    /** Maximum snapshots per component (default: 50) */
    maxHistorySize?: number;

    /** Time window for storm detection in ms (default: 1000) */
    stormWindow?: number;

    /** Renders in window to trigger storm (default: 5) */
    stormThreshold?: number;

    /** Show welcome message (default: true) */
    showWelcome?: boolean;

    /** Open floating panel on load (default: true) */
    panelOpenByDefault?: boolean;
}

export interface UseRenderInspectorOptions extends VueRenderInspectorOptions {
    /** Callback for unnecessary renders */
    onUnnecessaryRender?: (info: UnnecessaryRenderInfo) => void;

    /** Callback for slow renders */
    onSlowRender?: (info: SlowRenderInfo) => void;

    /** Callback for render storms */
    onRenderStorm?: (info: RenderStormInfo) => void;

    /** Create isolated profiler (default: false) */
    isolated?: boolean;
}

// ==================== Info Types ====================

export interface UnnecessaryRenderInfo {
    reason: string;
    details: string;
    suggestions: string[];
    diff: {
        props: DiffResult | null;
        state: DiffResult | null;
    };
}

export interface SlowRenderInfo {
    duration: number;
    threshold: number;
    reason: string;
}

export interface RenderStormInfo {
    renderCount: number;
    unnecessaryCount: number;
}

export interface DiffResult {
    changed: Record<string, ChangeInfo>;
    added: Record<string, any>;
    removed: Record<string, any>;
}

export interface ChangeInfo {
    from: any;
    to: any;
    sameReference: boolean;
    deepEqual: boolean;
}

// ==================== Core Classes ====================

export class ComponentSnapshot {
    timestamp: number;
    uid: number;
    componentName: string;
    props: Record<string, any>;
    state: Record<string, any>;
    metadata: {
        isMounted: boolean;
        isUnmounted: boolean;
        type: any;
    };

    constructor(instance: ComponentInternalInstance, timestamp?: number);
    getComponentName(instance: ComponentInternalInstance): string;
    toLightweight(): object;
}

export class RenderRecord {
    id: string;
    timestamp: number;
    uid: number;
    componentName: string;
    reason: string;
    details: string;
    isUnnecessary: boolean;
    duration: number | null;
    propsDiff: DiffResult | null;
    stateDiff: DiffResult | null;
    suggestions: string[];

    constructor(data: Partial<RenderRecord>);
    toJSON(): object;
}

export class ComponentStats {
    componentName: string;
    uid: number;
    totalRenders: number;
    unnecessaryRenders: number;
    lastRender: number | null;
    firstRender: number | null;

    constructor(componentName: string, uid: number);
    recordRender(record: RenderRecord): void;
    getUnnecessaryPercentage(): number;
    getAvgRenderTime(): number;
    toJSON(): object;
}

export class ComponentProfiler {
    constructor(options?: VueRenderInspectorOptions);

    profileComponent(instance: ComponentInternalInstance): void;
    getSummary(): Summary;
    getTopOffenders(limit?: number): ComponentStats[];
    getSlowestComponents(limit?: number): ComponentStats[];
    printSummary(): void;
    clear(): void;
    destroy(): void;
}

export interface Summary {
    totalComponents: number;
    totalRenders: number;
    totalUnnecessary: number;
    unnecessaryPercentage: string;
    recordsStored: number;
    activeStorms: number;
}

// ==================== Composable ====================

export interface RenderInspectorAPI {
    /** Measure function performance */
    measure<T extends (...args: any[]) => any>(
        label: string,
        fn: T
    ): T;

    /** Get component statistics */
    getStats(): ComponentStats | null;

    /** Get render history */
    getHistory(limit?: number): RenderRecord[];

    /** Check if in render storm */
    isRenderStorm(): boolean;

    /** Print statistics */
    printStats(): void;

    /** Access to profiler instance */
    profiler: ComponentProfiler | null;

    /** Component UID */
    uid: number | null;
}

export function useRenderInspector(
    options?: UseRenderInspectorOptions
): RenderInspectorAPI;

// ==================== Plugin ====================

export const VueRenderInspector: Plugin<VueRenderInspectorOptions>;

export function getProfiler(): ComponentProfiler | null;

export function setupRenderInspector(
    app: App,
    options?: VueRenderInspectorOptions
): App;

// ==================== Utilities ====================

export function shallowEqual(obj1: any, obj2: any): boolean;

export function computeDiff(prev: any, next: any): DiffResult;

export function isDeepEqual(obj1: any, obj2: any): boolean;

export function hasDifferentReferenceButSameContent(
    prev: any,
    next: any
): boolean;

export function safeSerialize(value: any, maxDepth?: number): any;

export function captureProps(props: Record<string, any>): Record<string, any>;

export function captureState(instance: ComponentInternalInstance): Record<string, any>;

export function formatForConsole(value: any): string;

// ==================== Performance Utilities ====================

export class RenderTimer {
    constructor();
    start(componentId: string): string;
    end(measurementId: string): number | null;
    clear(): void;
}

export class RenderFrequencyTracker {
    constructor(options?: {
        windowSize?: number;
        stormThreshold?: number;
    });

    recordRender(componentId: string, timestamp?: number): void;
    getRenderCount(componentId: string, windowSize?: number): number;
    isRenderStorm(componentId: string): boolean;
    getActiveStorms(): Array<{
        componentId: string;
        count: number;
        severity: string;
    }>;
    clear(componentId?: string): void;
}

export class MovingAverage {
    constructor(windowSize?: number);
    add(value: number): void;
    get(): number;
    reset(): void;
}

export function measurePerformance<T extends (...args: any[]) => any>(
    label: string,
    fn: T
): T;

// ==================== Reporters ====================

export interface ConsoleReporterOptions {
    enabled?: boolean;
    verbose?: boolean;
    showTimestamp?: boolean;
    showDuration?: boolean;
    groupByComponent?: boolean;
    colorize?: boolean;
    warnThreshold?: number;
    errorThreshold?: number;
}

export class ConsoleReporter {
    constructor(options?: ConsoleReporterOptions);
    report(record: RenderRecord): void;
    reportSummary(summary: Summary): void;
    reportTopOffenders(offenders: ComponentStats[]): void;
    closeAllGroups(): void;
}

// ==================== Global API ====================

declare global {
    interface Window {
        __VUE_RENDER_INSPECTOR__: {
            summary(): Summary;
            top(limit?: number): ComponentStats[];
            slow(limit?: number): ComponentStats[];
            clear(): void;
            help(): void;
        };
    }
}

// ==================== Vue Augmentation ====================

declare module '@vue/runtime-core' {
    interface ComponentCustomProperties {
        $renderInspector: {
            getSummary(): Summary;
            getTopOffenders(limit?: number): ComponentStats[];
            getSlowestComponents(limit?: number): ComponentStats[];
            printSummary(): void;
            clear(): void;
            enabled: boolean;
            profiler: ComponentProfiler;
        };
    }
}

// ==================== Constants ====================

export const VERSION: string;

// Default export
export default VueRenderInspector;
