// Utility helper functions for the visualizer

export function escapeHtml(str) {
  // Handle null, undefined, and numbers
  if (str == null) return ''

  // Convert to string
  const text = String(str)

  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
