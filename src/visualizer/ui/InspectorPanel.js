// Inspector panel for displaying component details
import { escapeHtml } from '../utils/helpers.js'

export class InspectorPanel {
  constructor() {
    this.panel = null
    this.selectedNode = null
    this.layout = 'overlay' // Overlay panel for canvas view
  }

  createPanel() {
    const inspector = document.createElement('div')
    inspector.id = 'vri-inspector'
    this.panel = inspector
    this._applyLayoutStyles()
    this.panel.style.display = 'none'

    return inspector
  }

  setLayout(layout) {
    this.layout = layout
    this._applyLayoutStyles()
  }

  showInspector(node) {
    if (!this.panel) return

    this.selectedNode = node
    this.panel.style.display = 'block'

    // Debug: Log node data
    console.log('[VRI Inspector] Node data:', {
      componentName: node.componentName,
      enhancedPatterns: node.renderAnalysis.enhancedPatterns,
      bottleneckScore: node.renderAnalysis.bottleneckScore,
      renderFrequency: node.renderAnalysis.performanceInsights.renderFrequency
    })

    const unnecessaryPercent = node.getUnnecessaryPercent()
    const perf = node.renderAnalysis.performanceInsights
    const patterns = node.renderAnalysis.changePatterns
    const renderHistory = node.renderAnalysis.renderHistory
    const recentRenders = renderHistory.slice(-10).reverse()
    const detailedChanges = node.renderAnalysis.detailedChanges
    const eventTracking = node.renderAnalysis.eventTracking
    const reactivityTracking = node.renderAnalysis.reactivityTracking
    const sourceInfo = node.renderAnalysis.sourceInfo

    this.panel.innerHTML = this._generateHTML(node, {
      unnecessaryPercent,
      perf,
      patterns,
      recentRenders,
      detailedChanges,
      eventTracking,
      reactivityTracking,
      sourceInfo
    })
  }

  hideInspector() {
    if (this.panel) {
      this.panel.style.display = 'none'
    }
    this.selectedNode = null
  }

  selectNode(node) {
    if (node) {
      this.showInspector(node)
    } else {
      this.hideInspector()
    }
  }

  _generateHTML(node, data) {
    const {
      unnecessaryPercent,
      perf,
      patterns,
      recentRenders,
      detailedChanges,
      eventTracking,
      reactivityTracking,
      sourceInfo
    } = data

    return `
      <h3 style="margin: 0 0 15px 0; color: ${node.getColor()}; display: flex; justify-content: space-between; align-items: center;">
        ${escapeHtml(node.componentName)}
        <span style="font-size: 11px; color: #666;">UID: ${node.uid}</span>
      </h3>
      
      <!-- Main Stats -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
        <div style="background: rgba(66, 184, 131, 0.1); padding: 10px; border-radius: 5px;">
          <div style="color: #666; font-size: 10px;">Total Renders</div>
          <div style="font-size: 20px; font-weight: bold; color: #42b883;">${node.renderAnalysis.totalRenders}</div>
        </div>
        <div style="background: rgba(255, 152, 0, 0.1); padding: 10px; border-radius: 5px;">
          <div style="color: #666; font-size: 10px;">Unnecessary</div>
          <div style="font-size: 20px; font-weight: bold; color: #ff9800;">
            ${node.renderAnalysis.unnecessaryRenders} (${unnecessaryPercent.toFixed(0)}%)
          </div>
        </div>
      </div>
      
      ${this._renderPerformanceMetrics(node, perf)}
      ${this._renderChangePatterns(patterns)}
      ${this._renderChangeDetails(detailedChanges)}
      ${this._renderReactivityTracking(reactivityTracking)}
      ${this._renderEventTracking(eventTracking)}
      ${this._renderRecentRenders(recentRenders)}
      ${this._renderBottleneckDetection(node)}
      ${this._renderOptimizationSuggestions(node)}
      ${this._renderPerformanceTrends(perf, node)}
      ${this._renderComponentDetails(node, sourceInfo)}
      ${this._renderWarnings(node)}
      
      <button onclick="window.__VUE_RENDER_INSPECTOR__.clearNodeData('${node.uid}')" style="
        width: 100%;
        padding: 10px;
        background: #333;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 12px;
      ">🗑️ Clear Component Data</button>
    `
  }

  _applyLayoutStyles() {
    if (!this.panel) return

    const isHidden = this.panel.style.display === 'none'
    
    // InspectorPanel is only used in overlay mode (canvas view)
    // Split view uses its own drawer, not this panel
    Object.assign(this.panel.style, {
      position: 'absolute',
      right: '20px',
      top: '60px',
      bottom: '20px',
      width: '350px',
      height: 'auto',
      background: 'rgba(30, 30, 30, 0.95)',
      border: '1px solid rgba(66, 184, 131, 0.3)',
      borderRadius: '8px',
      padding: '20px',
      overflowY: 'auto',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      transition: 'transform 0.3s ease, opacity 0.3s ease'
    })

    this.panel.style.display = isHidden ? 'none' : 'block'
  }

  _renderPerformanceMetrics(node, perf) {
    if (node.renderAnalysis.avgRenderTime <= 0) return ''

    return `
      <div style="margin-bottom: 15px;">
        <div style="color: #888; font-size: 12px; margin-bottom: 8px;">⚡ Performance Metrics</div>
        <div style="background: rgba(66, 184, 131, 0.05); padding: 10px; border-radius: 5px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #ccc; font-size: 11px;">Avg Render Time:</span>
            <span style="color: ${node.renderAnalysis.avgRenderTime > 16 ? '#ff5722' : '#42b883'}; font-size: 11px;">
              ${node.renderAnalysis.avgRenderTime.toFixed(2)}ms
            </span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #ccc; font-size: 11px;">Slowest Render:</span>
            <span style="color: #ff5722; font-size: 11px;">${perf.slowestRender.toFixed(1)}ms</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #ccc; font-size: 11px;">Fastest Render:</span>
            <span style="color: #42b883; font-size: 11px;">${perf.fastestRender === Infinity ? 'N/A' : `${perf.fastestRender.toFixed(1)}ms`}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #ccc; font-size: 11px;">Total Time:</span>
            <span style="color: #42b883; font-size: 11px;">${perf.totalRenderTime.toFixed(1)}ms</span>
          </div>
        </div>
      </div>
    `
  }

  _renderChangePatterns(patterns) {
    if (!Object.values(patterns).some(v => v > 0)) return ''

    return `
      <div style="margin-bottom: 15px;">
        <div style="color: #888; font-size: 12px; margin-bottom: 8px;">📊 Render Triggers</div>
        <div style="background: rgba(156, 39, 176, 0.05); padding: 10px; border-radius: 5px;">
          ${
            patterns.propsChanges > 0
              ? `
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
              <span style="color: #ccc;">Props Changes:</span>
              <span style="color: #9c27b0;">${patterns.propsChanges}</span>
            </div>
          `
              : ''
          }
          ${
            patterns.stateChanges > 0
              ? `
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
              <span style="color: #ccc;">State Changes:</span>
              <span style="color: #9c27b0;">${patterns.stateChanges}</span>
            </div>
          `
              : ''
          }
          ${
            patterns.parentRerenders > 0
              ? `
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
              <span style="color: #ccc;">Parent Re-renders:</span>
              <span style="color: #ff9800;">${patterns.parentRerenders}</span>
            </div>
          `
              : ''
          }
          ${
            patterns.referenceChanges > 0
              ? `
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
              <span style="color: #ccc;">Reference Changes:</span>
              <span style="color: #ff9800;">${patterns.referenceChanges}</span>
            </div>
          `
              : ''
          }
          ${
            patterns.eventTriggers > 0
              ? `
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
              <span style="color: #ccc;">Event Triggers:</span>
              <span style="color: #2196f3;">${patterns.eventTriggers}</span>
            </div>
          `
              : ''
          }
          ${
            patterns.reactivityTriggers > 0
              ? `
            <div style="display: flex; justify-content: space-between; font-size: 11px;">
              <span style="color: #ccc;">Reactivity Triggers:</span>
              <span style="color: #2196f3;">${patterns.reactivityTriggers}</span>
            </div>
          `
              : ''
          }
        </div>
      </div>
    `
  }

  _renderChangeDetails(detailedChanges) {
    if (
      !detailedChanges.recentPropsDiff &&
      !detailedChanges.recentStateDiff &&
      detailedChanges.propsChangeHistory.length === 0 &&
      detailedChanges.stateChangeHistory.length === 0
    ) {
      return ''
    }

    return `
      <div style="margin-bottom: 15px;">
        <div style="color: #888; font-size: 12px; margin-bottom: 8px;">🔍 Change Details</div>
        <div style="background: rgba(66, 184, 131, 0.05); padding: 10px; border-radius: 5px; max-height: 200px; overflow-y: auto;">
          ${
            detailedChanges.recentPropsDiff
              ? `
            <div style="margin-bottom: 10px;">
              <div style="color: #42b883; font-size: 11px; font-weight: bold; margin-bottom: 5px;">Latest Props Changes:</div>
              ${this._formatDiff(detailedChanges.recentPropsDiff)}
            </div>
          `
              : detailedChanges.propsChangeHistory.length > 0
                ? `
            <div style="margin-bottom: 10px;">
              <div style="color: #42b883; font-size: 11px; font-weight: bold; margin-bottom: 5px;">Props Change History:</div>
              <div style="color: #666; font-size: 10px;">
                ${detailedChanges.propsChangeHistory.length} changes recorded
                ${detailedChanges.propsChangeHistory.filter(h => h.hasRealChange).length} with real changes
              </div>
            </div>
          `
                : ''
          }
          ${
            detailedChanges.recentStateDiff
              ? `
            <div>
              <div style="color: #9c27b0; font-size: 11px; font-weight: bold; margin-bottom: 5px;">Latest State Changes:</div>
              ${this._formatDiff(detailedChanges.recentStateDiff)}
            </div>
          `
              : detailedChanges.stateChangeHistory.length > 0
                ? `
            <div>
              <div style="color: #9c27b0; font-size: 11px; font-weight: bold; margin-bottom: 5px;">State Change History:</div>
              <div style="color: #666; font-size: 10px;">
                ${detailedChanges.stateChangeHistory.length} changes recorded
                ${detailedChanges.stateChangeHistory.filter(h => h.hasRealChange).length} with real changes
              </div>
            </div>
          `
                : ''
          }
          ${
            !detailedChanges.recentPropsDiff &&
            !detailedChanges.recentStateDiff &&
            detailedChanges.propsChangeHistory.length === 0 &&
            detailedChanges.stateChangeHistory.length === 0
              ? `
            <div style="color: #666; font-style: italic; font-size: 10px;">
              No props or state changes captured yet. Changes will appear here when components re-render with modified data.
            </div>
          `
              : ''
          }
        </div>
      </div>
    `
  }

  _renderReactivityTracking(reactivityTracking) {
    if (
      reactivityTracking.recentOnTrack.length === 0 &&
      reactivityTracking.recentOnTrigger.length === 0
    ) {
      return ''
    }

    return `
      <div style="margin-bottom: 15px;">
        <div style="color: #888; font-size: 12px; margin-bottom: 8px;">🔗 Reactivity Details</div>
        <div style="background: rgba(156, 39, 176, 0.05); padding: 10px; border-radius: 5px; max-height: 120px; overflow-y: auto;">
          ${
            reactivityTracking.recentOnTrack.length > 0
              ? `
            <div style="margin-bottom: 8px;">
              <strong style="color: #42b883; font-size: 10px;">Dependencies Tracked:</strong>
              ${reactivityTracking.recentOnTrack
                .map(
                  track =>
                    `<div style="color: #666; font-size: 9px; margin-left: 8px;">• ${track.key || track}</div>`
                )
                .join('')}
            </div>
          `
              : ''
          }
          ${
            reactivityTracking.recentOnTrigger.length > 0
              ? `
            <div>
              <strong style="color: #f87171; font-size: 10px;">Triggers:</strong>
              ${reactivityTracking.recentOnTrigger
                .map(
                  trigger =>
                    `<div style="color: #666; font-size: 9px; margin-left: 8px;">• ${trigger.key || trigger}</div>`
                )
                .join('')}
            </div>
          `
              : ''
          }
        </div>
      </div>
    `
  }

  _renderEventTracking(eventTracking) {
    if (eventTracking.recentEvents.length === 0) return ''

    return `
      <div style="margin-bottom: 15px;">
        <div style="color: #888; font-size: 12px; margin-bottom: 8px;">🎯 Event History</div>
        <div style="background: rgba(255, 152, 0, 0.05); padding: 10px; border-radius: 5px; max-height: 100px; overflow-y: auto;">
          ${eventTracking.recentEvents
            .slice(-5)
            .reverse()
            .map(
              evt => `
            <div style="font-size: 10px; margin-bottom: 4px;">
              <span style="color: #ff9800;">${evt.event.type || 'unknown'}</span>
              <span style="color: #666;">→ ${evt.triggerMechanism || 'unknown'}</span>
              <span style="color: #888; font-size: 9px;">(${new Date(evt.timestamp).toLocaleTimeString()})</span>
            </div>
          `
            )
            .join('')}
          ${
            Object.keys(eventTracking.eventFrequency).length > 0
              ? `
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
              <strong style="color: #ccc; font-size: 10px;">Event Frequency:</strong>
              ${Object.entries(eventTracking.eventFrequency)
                .map(
                  ([event, count]) =>
                    `<div style="font-size: 9px; color: #666;">${event}: ${count}x</div>`
                )
                .join('')}
            </div>
          `
              : ''
          }
        </div>
      </div>
    `
  }

  _renderRecentRenders(recentRenders) {
    if (recentRenders.length === 0) return ''

    return `
      <div style="margin-bottom: 15px;">
        <div style="color: #888; font-size: 12px; margin-bottom: 8px;">🕐 Recent Render Details</div>
        <div style="background: rgba(0, 0, 0, 0.2); border-radius: 5px; max-height: 200px; overflow-y: auto;">
          ${recentRenders
            .map(
              (render, index) => `
            <div style="padding: 8px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); font-size: 10px; ${index === 0 ? 'background: rgba(255, 255, 255, 0.05);' : ''}">
              <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                <span style="color: ${render.isUnnecessary ? '#ff9800' : '#42b883'};">
                  ${render.isUnnecessary ? '⚠️' : '✅'} ${render.reason || 'Unknown reason'}
                </span>
                <span style="color: #666;">${render.duration ? `${render.duration.toFixed(1)}ms` : 'N/A'}</span>
              </div>
              ${render.details ? `<div style="color: #ccc; font-size: 9px; margin-bottom: 3px;">${render.details}</div>` : ''}
              ${
                render.triggerMechanism
                  ? `
                <div style="color: #888; font-size: 9px;">
                  Trigger: ${render.triggerMechanism}${render.triggerSource ? ` (${render.triggerSource})` : ''}
                </div>
              `
                  : ''
              }
              ${
                render.suggestions && render.suggestions.length > 0
                  ? `
                <div style="color: #ff9800; font-size: 8px; margin-top: 3px;">
                  💡 ${render.suggestions[0]}
                </div>
              `
                  : ''
              }
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `
  }

  _renderBottleneckDetection(node) {
    if (
      !node.renderAnalysis.enhancedPatterns ||
      node.renderAnalysis.enhancedPatterns.length === 0
    ) {
      return ''
    }

    return `
      <div style="margin-bottom: 15px;">
        <div style="color: #888; font-size: 12px; margin-bottom: 8px;">
          🔥 Detected Performance Bottlenecks
          <span style="float: right; color: ${node.renderAnalysis.bottleneckScore > 20 ? '#f44336' : node.renderAnalysis.bottleneckScore > 10 ? '#ff9800' : '#ffc107'};">
            Score: ${node.renderAnalysis.bottleneckScore}
          </span>
        </div>
        <div style="background: rgba(244, 67, 54, 0.1); padding: 10px; border-radius: 5px; max-height: 250px; overflow-y: auto;">
          ${node.renderAnalysis.enhancedPatterns
            .map(
              pattern => `
            <div style="margin-bottom: 12px; padding: 8px; background: rgba(0, 0, 0, 0.2); border-radius: 4px;">
              <div style="font-size: 11px; font-weight: bold; color: #ff5722; margin-bottom: 4px;">
                ${escapeHtml(
                  pattern.type
                    .replace(/([A-Z])/g, ' $1')
                    .trim()
                    .replace(/^\w/, c => c.toUpperCase())
                )}
              </div>
              <div style="font-size: 10px; color: #ffab91; margin-bottom: 6px;">
                ${escapeHtml(pattern.reason)}
              </div>
              <div style="font-size: 10px; color: #ffd700; margin-bottom: 6px;">
                💡 ${escapeHtml(pattern.suggestion)}
              </div>
              ${
                pattern.example
                  ? `
                <details style="margin-top: 6px;">
                  <summary style="cursor: pointer; font-size: 9px; color: #888;">See Example</summary>
                  <div style="margin-top: 4px; font-size: 9px;">
                    ${
                      pattern.example.bad
                        ? `
                      <div style="margin-bottom: 4px;">
                        <span style="color: #f44336;">❌ Bad:</span>
                        <pre style="background: rgba(244, 67, 54, 0.1); padding: 8px; margin: 4px 0; overflow-x: auto; color: #fff; font-size: 9px; font-family: 'Monaco', 'Consolas', monospace; border-radius: 4px; white-space: pre-wrap;">${escapeHtml(pattern.example.bad.trim())}</pre>
                      </div>
                    `
                        : ''
                    }
                    ${
                      pattern.example.good
                        ? `
                      <div>
                        <span style="color: #4caf50;">✅ Good:</span>
                        <pre style="background: rgba(76, 175, 80, 0.1); padding: 8px; margin: 4px 0; overflow-x: auto; color: #fff; font-size: 9px; font-family: 'Monaco', 'Consolas', monospace; border-radius: 4px; white-space: pre-wrap;">${escapeHtml(pattern.example.good.trim())}</pre>
                      </div>
                    `
                        : ''
                    }
                  </div>
                </details>
              `
                  : ''
              }
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `
  }

  _renderOptimizationSuggestions(node) {
    if (node.renderAnalysis.optimizationSuggestions.size === 0) return ''

    return `
      <div style="margin-bottom: 15px;">
        <div style="color: #888; font-size: 12px; margin-bottom: 8px;">💡 General Suggestions</div>
        <div style="background: rgba(255, 215, 0, 0.1); padding: 10px; border-radius: 5px; max-height: 100px; overflow-y: auto;">
          ${Array.from(node.renderAnalysis.optimizationSuggestions)
            .map(
              s => `<div style="color: #ffd700; font-size: 10px; margin-bottom: 4px;">• ${s}</div>`
            )
            .join('')}
        </div>
      </div>
    `
  }

  _renderPerformanceTrends(perf, node) {
    if (perf.renderTimeTrend === 'stable' && node.renderAnalysis.performanceWarnings.length === 0) {
      return ''
    }

    return `
      <div style="margin-bottom: 15px;">
        <div style="color: #888; font-size: 12px; margin-bottom: 8px;">📈 Performance Analysis</div>
        <div style="background: rgba(244, 67, 54, 0.05); padding: 10px; border-radius: 5px;">
          ${
            perf.renderTimeTrend !== 'stable'
              ? `
            <div style="font-size: 11px; margin-bottom: 4px;">
              <span style="color: #f44336;">Render Time: ${perf.renderTimeTrend === 'increasing' ? '↗️ Increasing' : '↘️ Decreasing'}</span>
            </div>
          `
              : ''
          }
          ${
            perf.renderFrequency > 60
              ? `
            <div style="font-size: 11px; margin-bottom: 4px;">
              <span style="color: #ff5722;">⚡ High Frequency: ${perf.renderFrequency.toFixed(1)} renders/min</span>
            </div>
          `
              : ''
          }
          ${node.renderAnalysis.performanceWarnings
            .slice(-3)
            .map(
              warning => `
            <div style="font-size: 10px; margin-bottom: 4px; color: #ff9800;">
              ⚠️ ${warning.suggestion}
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `
  }

  _renderComponentDetails(node, sourceInfo) {
    return `
      <div style="margin-bottom: 15px;">
        <div style="color: #888; font-size: 12px; margin-bottom: 8px;">ℹ️ Component Details</div>
        <div style="background: rgba(96, 125, 139, 0.05); padding: 10px; border-radius: 5px; font-size: 10px;">
          ${
            node.parent
              ? `
            <div style="margin-bottom: 4px;">
              <span style="color: #ccc;">Parent:</span>
              <span style="color: #42b883;">${escapeHtml(node.parent.componentName)}</span>
            </div>
          `
              : ''
          }
          <div style="margin-bottom: 4px;">
            <span style="color: #ccc;">Component Path:</span>
            <span style="color: #607d8b;">${node.renderAnalysis.componentContext.componentPath.map(name => escapeHtml(name)).join(' → ')}</span>
          </div>
          <div style="margin-bottom: 4px;">
            <span style="color: #ccc;">Depth:</span>
            <span style="color: #607d8b;">${node.depth}</span>
          </div>
          ${
            node.children.length > 0
              ? `
            <div style="margin-bottom: 4px;">
              <span style="color: #ccc;">Children:</span>
              <span style="color: #607d8b;">${node.children.length} components</span>
            </div>
          `
              : ''
          }
          ${
            sourceInfo.filePath
              ? `
            <div style="margin-bottom: 4px;">
              <span style="color: #ccc;">Source:</span>
              <span style="color: #607d8b;">${sourceInfo.filePath}${sourceInfo.lineNumber ? `:${sourceInfo}`.lineNumber : ''}</span>
            </div>
          `
              : ''
          }
          ${
            sourceInfo.componentType !== 'unknown'
              ? `
            <div>
              <span style="color: #ccc;">Type:</span>
              <span style="color: #607d8b;">${sourceInfo.componentType}</span>
            </div>
          `
              : ''
          }
        </div>
      </div>
    `
  }

  _renderWarnings(node) {
    if (node.warnings.length === 0) return ''

    return `
      <div style="background: rgba(255, 87, 34, 0.1); padding: 10px; border-radius: 5px; margin-bottom: 15px;">
        ${node.warnings
          .map(
            w => `
          <div style="color: #ff9800; font-size: 11px;">
            ${w === 'storm' ? '⚡ Render storm detected - component re-rendering too frequently' : w}
          </div>
        `
          )
          .join('')}
      </div>
    `
  }

  _formatDiff(diff) {
    if (!diff)
      return '<div style="color: #666; font-style: italic; font-size: 10px;">No changes detected</div>'

    let html = ''
    let hasChanges = false

    // Handle different diff formats
    if (diff.changed && Object.keys(diff.changed).length > 0) {
      hasChanges = true
      html +=
        '<div style="margin-bottom: 6px;"><strong style="color: #ff9800; font-size: 10px;">Changed:</strong></div>'
      Object.entries(diff.changed).forEach(([key, change]) => {
        const fromVal = this._formatValue(change.from)
        const toVal = this._formatValue(change.to)
        const isSameRef = change.sameReference
          ? ' <span style="color: #ffc107; font-size: 8px;">(same ref)</span>'
          : ''
        const isDeepEqual = change.deepEqual
          ? ' <span style="color: #4caf50; font-size: 8px;">(same value)</span>'
          : ''
        html += `<div style="font-size: 9px; margin-left: 8px; margin-bottom: 3px;">
          <span style="color: #ccc;">${key}:</span>
          <span style="color: #888;">${fromVal}</span>
          <span style="color: #ff9800;"> → </span>
          <span style="color: #888;">${toVal}</span>
          ${isSameRef}${isDeepEqual}
        </div>`
      })
    }

    if (diff.added && Object.keys(diff.added).length > 0) {
      hasChanges = true
      html +=
        '<div style="margin-bottom: 6px; margin-top: 8px;"><strong style="color: #4caf50; font-size: 10px;">Added:</strong></div>'
      Object.entries(diff.added).forEach(([key, value]) => {
        html += `<div style="font-size: 9px; margin-left: 8px; margin-bottom: 3px;">
          <span style="color: #ccc;">${key}:</span>
          <span style="color: #4caf50;">${this._formatValue(value)}</span>
        </div>`
      })
    }

    if (diff.removed && Object.keys(diff.removed).length > 0) {
      hasChanges = true
      html +=
        '<div style="margin-bottom: 6px; margin-top: 8px;"><strong style="color: #f44336; font-size: 10px;">Removed:</strong></div>'
      Object.entries(diff.removed).forEach(([key, value]) => {
        html += `<div style="font-size: 9px; margin-left: 8px; margin-bottom: 3px;">
          <span style="color: #ccc;">${key}:</span>
          <span style="color: #f44336; text-decoration: line-through;">${this._formatValue(value)}</span>
        </div>`
      })
    }

    if (!hasChanges) {
      return '<div style="color: #666; font-style: italic; font-size: 10px;">No changes detected</div>'
    }

    return html
  }

  _formatValue(value) {
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'
    if (typeof value === 'function') return '[Function]'
    if (typeof value === 'string')
      return `"${value.length > 20 ? `${value.substring(0, 20)}...` : value}"`
    if (Array.isArray(value)) return `Array(${value.length})`
    if (typeof value === 'object') return `{${Object.keys(value).length} keys}`
    return String(value)
  }
}
