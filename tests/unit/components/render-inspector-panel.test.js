import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RenderInspectorPanel from '../../../src/components/RenderInspectorPanel.vue'

const createWrapper = props =>
  mount(RenderInspectorPanel, {
    props: {
      profiler: {},
      ...props
    },
    global: {
      stubs: {
        FloatingWindow: {
          template: '<div class="floating-window-stub"><slot /></div>',
          emits: ['close']
        },
        InspectorPanel: {
          template: '<div class="inspector-panel-stub" />',
          props: ['profiler']
        }
      }
    }
  })

describe('RenderInspectorPanel', () => {
  it('shows floating window by default', () => {
    const wrapper = createWrapper()

    expect(wrapper.find('.floating-window-stub').exists()).toBe(true)
    expect(wrapper.find('.vri-floating-circle').exists()).toBe(false)
  })

  it('respects panelOpenByDefault=false', async () => {
    const wrapper = createWrapper({ panelOpenByDefault: false })

    expect(wrapper.find('.floating-window-stub').exists()).toBe(false)
    expect(wrapper.find('.vri-floating-circle').exists()).toBe(true)

    await wrapper.find('button.vri-floating-circle').trigger('click')

    expect(wrapper.find('.floating-window-stub').exists()).toBe(true)
  })
})
