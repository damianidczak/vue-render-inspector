import { formatForConsole } from '../utils/serialization.js'
export class ConsoleReporter {
  constructor(options = {}) {
    this.enabled = options.enabled !== false
    this.verboseMode = options.verbose || false
    this.showTimestamp = options.showTimestamp !== false
    this.showDuration = options.showDuration !== false
    this.groupByComponent = options.groupByComponent || false
    this.colorize = options.colorize !== false
    this.warnThreshold = options.warnThreshold || 16
    this.errorThreshold = options.errorThreshold || 100
    this.activeGroups = new Set()
    this.lastReportTime = 0
    this.reportQueue = []
    this.minReportInterval = 16
    this.maxQueueSize = 100
    this.isProcessingQueue = false
  }
  updateOptions(options) {
    this.enabled = options.console !== false
    this.verboseMode = options.verbose || false
    this.showTimestamp = options.showTimestamp !== false
    this.showDuration = options.showDuration !== false
    this.groupByComponent = options.groupByComponent || false
    this.colorize = options.colorize !== false
    this.warnThreshold = options.warnThreshold || 16
    this.errorThreshold = options.errorThreshold || 100
  }
  report(record) {
    if (!this.enabled) return
    this.reportQueue.push(record)
    if (this.reportQueue.length > this.maxQueueSize) {
      this.reportQueue.shift()
    }
    if (!this.isProcessingQueue) {
      this.processQueue()
    }
  }
  processQueue() {
    if (this.reportQueue.length === 0) {
      this.isProcessingQueue = false
      return
    }
    const now = Date.now()
    const timeSinceLastReport = now - this.lastReportTime
    if (timeSinceLastReport < this.minReportInterval) {
      this.isProcessingQueue = true
      setTimeout(() => this.processQueue(), this.minReportInterval - timeSinceLastReport)
      return
    }
    const record = this.reportQueue.shift()
    const severity = this.getSeverity(record)
    if (this.groupByComponent) {
      this.reportGrouped(record, severity)
    } else {
      this.reportSingle(record, severity)
    }
    this.lastReportTime = now
    if (this.reportQueue.length > 0) {
      this.isProcessingQueue = true
      setTimeout(() => this.processQueue(), this.minReportInterval)
    } else {
      this.isProcessingQueue = false
    }
  }
  reportSingle(record, severity) {
    const styles = this.getStyles(severity)
    const prefix = this.getPrefix(severity)
    const timestamp = this.showTimestamp ? this.formatTimestamp(record.timestamp) : ''
    const parts = []
    const styleArgs = []
    parts.push(`%c${prefix}`)
    styleArgs.push(styles.prefix)
    parts.push(` %c${record.componentName}`)
    styleArgs.push(styles.component)
    parts.push(`%c rendered`)
    styleArgs.push(styles.normal)
    if (record.isUnnecessary) {
      parts.push(' %c⚠️ UNNECESSARY')
      styleArgs.push(styles.warning)
    }
    if (timestamp) {
      parts.push(` %c[${timestamp}]`)
      styleArgs.push(styles.timestamp)
    }
    const fullMessage = parts.join('')
    console.log(fullMessage, ...styleArgs)
    const isSlowRender = record.duration !== null && record.duration > this.warnThreshold
    const showDetails =
      this.verboseMode || record.isUnnecessary || isSlowRender || record.suggestions.length > 0
    if (showDetails) {
      console.log(`%c  Reason: %c${record.reason}`, styles.label, styles.normal)
      if (record.details) {
        console.log(`%c  Details: %c${record.details}`, styles.label, styles.normal)
      }
      if (record.triggerMechanism && record.triggerMechanism !== 'unknown') {
        console.log(
          `%c  Trigger: %c${record.triggerMechanism}${record.triggerSource && record.triggerSource !== 'unknown' ? ` (${record.triggerSource})` : ''}`,
          styles.label,
          styles.normal
        )
      }
      if (this.showDuration && record.duration !== null) {
        const durationStyle = this.getDurationStyle(record.duration)
        console.log(`%c  Duration: %c${record.duration.toFixed(2)}ms`, styles.label, durationStyle)
      }
      if (record.propsDiff && this.hasMeaningfulDiff(record.propsDiff)) {
        this.reportDiff('Props', record.propsDiff)
      }
      if (record.stateDiff && this.hasMeaningfulDiff(record.stateDiff)) {
        this.reportDiff('State', record.stateDiff)
      }
      if (record.eventTrigger) {
        console.log(
          `%c  Event Trigger: %c${record.eventTrigger.type} on ${record.eventTrigger.target}`,
          styles.label,
          styles.normal
        )
      }
      if (record.isUnnecessary) {
        if (record.reactivityTracking && record.reactivityTracking.length > 0) {
          console.log('%c  Reactivity Dependencies (onTrack):', 'color: #42b883; font-weight: bold')
          record.reactivityTracking.slice(-5).forEach(track => {
            console.log(`%c    • ${track.getDescription()}`, 'color: #42b883')
          })
        } else {
          console.log(
            '%c  Reactivity Dependencies: %cNot available - add onRenderTracked/onRenderTriggered to component',
            'color: #666; font-weight: bold',
            'color: #999; font-style: italic'
          )
        }
        if (record.reactivityTriggers && record.reactivityTriggers.length > 0) {
          console.log(
            '%c  Trigger Details: %cNo reactive triggers detected',
            'color: #666; font-weight: bold',
            'color: #999; font-style: italic'
          )
        } else {
          console.log(
            '%c  Trigger Details: %cNot available - add onRenderTriggered to component',
            'color: #666; font-weight: bold',
            'color: #999; font-style: italic'
          )
        }
        if (record.reactivityTriggers && record.reactivityTriggers.length > 0) {
          console.log('%c  Trigger Details (onTrigger):', 'color: #f87171; font-weight: bold')
          record.reactivityTriggers.slice(-3).forEach(trigger => {
            console.log(`%c    • ${trigger.getDescription()}`, 'color: #f87171')
          })
        } else {
          console.log(
            '%c  Trigger Details: %cNo reactive triggers detected',
            'color: #666; font-weight: bold',
            'color: #999; font-style: italic'
          )
        }
      }
      if (record.suggestions && record.suggestions.length > 0) {
        console.log('%c  💡 Suggestions:', 'color: #ffd700; font-weight: bold')
        record.suggestions.forEach(suggestion => {
          console.log(`%c    • ${suggestion}`, 'color: #ffd700')
        })
      }
      console.log('')
    }
  }
  reportGrouped(record, severity) {
    const groupKey = record.componentName
    if (!this.activeGroups.has(groupKey)) {
      const styles = this.getStyles(severity)
      console.groupCollapsed(`%c🎯 ${record.componentName}`, styles.component)
      this.activeGroups.add(groupKey)
    }
    this.reportSingle(record, severity)
  }
  reportDiff(label, diff) {
    const styles = this.getStyles('info')
    console.group(`%c  ${label} Changes:`, styles.label)
    if (Object.keys(diff.changed).length > 0) {
      for (const key in diff.changed) {
        const change = diff.changed[key]
        console.log(
          `%c    ${key}:%c ${formatForConsole(change.from)} %c→%c ${formatForConsole(change.to)}`,
          'font-weight: bold',
          'color: #f87171',
          'color: #666',
          'color: #4ade80'
        )
        if (change.deepEqual && !change.sameReference) {
          console.log(
            '%c      ⚠️ Reference changed but content is equal',
            'color: #fbbf24; font-size: 0.9em'
          )
        }
      }
    }
    if (Object.keys(diff.added).length > 0) {
      for (const key in diff.added) {
        console.log(
          `%c    + ${key}:%c ${formatForConsole(diff.added[key])}`,
          'color: #4ade80; font-weight: bold',
          'color: #4ade80'
        )
      }
    }
    if (Object.keys(diff.removed).length > 0) {
      for (const key in diff.removed) {
        console.log(
          `%c    - ${key}:%c ${formatForConsole(diff.removed[key])}`,
          'color: #f87171; font-weight: bold',
          'color: #f87171'
        )
      }
    }
    console.groupEnd()
  }
  reportSummary(summary) {
    if (!this.enabled) return
    console.group(
      '%c📊 Vue Render Inspector Summary',
      'color: #42b883; font-size: 14px; font-weight: bold'
    )
    console.log(`Total Components Tracked: ${summary.totalComponents}`)
    console.log(`Total Renders: ${summary.totalRenders}`)
    console.log(
      `%cUnnecessary Renders: ${summary.totalUnnecessary} (${summary.unnecessaryPercentage}%)`,
      summary.unnecessaryPercentage > 20 ? 'color: #f87171; font-weight: bold' : 'color: #666'
    )
    if (summary.activeStorms > 0) {
      console.log(
        `%c⚠️ Active Render Storms: ${summary.activeStorms}`,
        'color: #fbbf24; font-weight: bold'
      )
    }
    console.groupEnd()
  }
  reportTopOffenders(offenders) {
    if (!this.enabled || offenders.length === 0) return
    console.group(
      '%c🎯 Top Components with Unnecessary Renders',
      'color: #f87171; font-size: 14px; font-weight: bold'
    )
    offenders.forEach((stats, index) => {
      const percentage = stats.getUnnecessaryPercentage
        ? stats.getUnnecessaryPercentage().toFixed(1)
        : stats.unnecessaryPercentage || '0.0'
      console.log(
        `%c${index + 1}. ${stats.componentName}%c - ${stats.unnecessaryRenders}/${stats.totalRenders} renders (${percentage}%)`,
        'font-weight: bold',
        'font-weight: normal'
      )
    })
    console.groupEnd()
  }
  getSeverity(record) {
    if (record.componentName === 'SlowComponent' && record.duration !== null) {
      console.log(
        `[DEBUG] SlowComponent duration: ${record.duration}ms, errorThreshold: ${this.errorThreshold}ms, warnThreshold: ${this.warnThreshold}ms`
      )
    }
    if (record.isUnnecessary) return 'warning'
    if (record.duration !== null) {
      if (record.duration > this.errorThreshold) return 'error'
      if (record.duration > this.warnThreshold) return 'warning'
    }
    return 'info'
  }
  getStyles(severity) {
    if (!this.colorize) {
      return {
        prefix: '',
        component: 'font-weight: bold',
        normal: '',
        warning: '',
        label: 'font-weight: bold',
        timestamp: 'color: #666'
      }
    }
    const baseStyles = {
      info: {
        prefix: 'color: #42b883; font-weight: bold',
        component: 'color: #42b883; font-weight: bold',
        normal: 'color: inherit',
        warning: 'color: #fbbf24',
        label: 'color: #666; font-weight: bold',
        timestamp: 'color: #999; font-size: 0.9em'
      },
      warning: {
        prefix: 'color: #fbbf24; font-weight: bold',
        component: 'color: #fbbf24; font-weight: bold',
        normal: 'color: inherit',
        warning: 'color: #fbbf24; font-weight: bold',
        label: 'color: #666; font-weight: bold',
        timestamp: 'color: #999; font-size: 0.9em'
      },
      error: {
        prefix: 'color: #f87171; font-weight: bold',
        component: 'color: #f87171; font-weight: bold',
        normal: 'color: inherit',
        warning: 'color: #f87171; font-weight: bold',
        label: 'color: #666; font-weight: bold',
        timestamp: 'color: #999; font-size: 0.9em'
      }
    }
    return baseStyles[severity] || baseStyles.info
  }
  getPrefix(severity) {
    const prefixes = {
      info: '[VRI]',
      warning: '[VRI ⚠️]',
      error: '[VRI ❌]'
    }
    return prefixes[severity] || prefixes.info
  }
  getDurationStyle(duration) {
    if (duration > this.errorThreshold) {
      return 'color: #f87171; font-weight: bold'
    }
    if (duration > this.warnThreshold) {
      return 'color: #fbbf24; font-weight: bold'
    }
    return 'color: #4ade80'
  }
  formatTimestamp(timestamp) {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    })
  }
  hasMeaningfulDiff(diff) {
    if (!diff || typeof diff !== 'object') return false
    return (
      (diff.changed && Object.keys(diff.changed).length > 0) ||
      (diff.added && Object.keys(diff.added).length > 0) ||
      (diff.removed && Object.keys(diff.removed).length > 0)
    )
  }
  closeAllGroups() {
    this.activeGroups.forEach(() => console.groupEnd())
    this.activeGroups.clear()
  }
}
