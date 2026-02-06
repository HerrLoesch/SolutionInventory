<template>
  <div>
    <v-card class="mb-4">
      <v-card-title>Solution Description</v-card-title>
      <v-card-text>
        <v-row dense>
          <v-col cols="12" md="6" v-if="metadata.productName">
            <strong>Software Product:</strong> {{ metadata.productName }}
          </v-col>
          <v-col cols="12" md="6" v-if="metadata.company">
            <strong>Company:</strong> {{ metadata.company }}
          </v-col>
          <v-col cols="12" md="6" v-if="metadata.department">
            <strong>Department:</strong> {{ metadata.department }}
          </v-col>
          <v-col cols="12" md="6" v-if="metadata.contactPerson">
            <strong>Contact Person:</strong> {{ metadata.contactPerson }}
          </v-col>
          <v-col cols="12" v-if="metadata.description">
            <strong>Description:</strong>
            <p>{{ metadata.description }}</p>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card class="mb-4">
      <v-card-title>Technology Radar</v-card-title>
      <v-card-text>
        <div class="radar-container">
          <svg :viewBox="`0 0 ${svgSize} ${svgSize}`" class="tech-radar">
            <!-- Background -->
            <rect width="100%" height="100%" fill="#f5f5f5" />

            <!-- Concentric circles (rings) -->
            <circle :cx="centerX" :cy="centerY" :r="radiusRetire" fill="none" stroke="#e0e0e0" stroke-width="1" />
            <circle :cx="centerX" :cy="centerY" :r="radiusHold" fill="none" stroke="#e0e0e0" stroke-width="1" />
            <circle :cx="centerX" :cy="centerY" :r="radiusAssess" fill="none" stroke="#e0e0e0" stroke-width="1" />
            <circle :cx="centerX" :cy="centerY" :r="radiusAdopt" fill="none" stroke="#e0e0e0" stroke-width="1" />

            <!-- Ring backgrounds with transparency -->
            <circle :cx="centerX" :cy="centerY" :r="radiusAdopt" fill="#4caf50" opacity="0.08" />
            <circle :cx="centerX" :cy="centerY" :r="radiusAssess" fill="#2196f3" opacity="0.08" />
            <circle :cx="centerX" :cy="centerY" :r="radiusHold" fill="#ff9800" opacity="0.08" />
            <circle :cx="centerX" :cy="centerY" :r="radiusRetire" fill="#f44336" opacity="0.08" />

            <!-- Ring labels -->
            <text x="50%" :y="centerY - radiusAdopt + 20" text-anchor="middle" class="ring-label">ADOPT</text>
            <text x="50%" :y="centerY - radiusAssess + 20" text-anchor="middle" class="ring-label">ASSESS</text>
            <text x="50%" :y="centerY - radiusHold + 20" text-anchor="middle" class="ring-label">HOLD</text>
            <text x="50%" :y="centerY - radiusRetire + 20" text-anchor="middle" class="ring-label">RETIRE</text>

            <!-- Radial lines for segments -->
            <line v-for="(angle, idx) in segmentAngles" :key="`line-${idx}`"
              :x1="centerX" :y1="centerY"
              :x2="centerX + radiusRetire * Math.cos(angle)"
              :y2="centerY + radiusRetire * Math.sin(angle)"
              stroke="#e0e0e0" stroke-width="1" />

            <!-- Technology blobs -->
            <g v-for="(tech, idx) in allTechnologies" :key="`tech-${idx}`">
              <circle
                :cx="tech.x"
                :cy="tech.y"
                :r="bubbleRadius"
                :fill="getStatusColor(tech.status)"
                opacity="0.8"
                class="tech-bubble"
                @mouseenter="hoveredTech = idx"
                @mouseleave="hoveredTech = null"
              />
              <text
                :x="tech.x"
                :y="tech.y"
                text-anchor="middle"
                dominant-baseline="middle"
                class="tech-label"
                :class="{ 'hovered': hoveredTech === idx }"
                @mouseenter="hoveredTech = idx"
                @mouseleave="hoveredTech = null"
              >
                {{ tech.name.substring(0, 4) }}
              </text>
            </g>
          </svg>

          <!-- Tooltip for hovered technology -->
          <div v-if="hoveredTech !== null" class="tech-tooltip">
            <strong>{{ allTechnologies[hoveredTech].name }}</strong>
            <div><strong>Status:</strong> {{ allTechnologies[hoveredTech].status }}</div>
            <div><strong>Category:</strong> {{ allTechnologies[hoveredTech].category }}</div>
            <div v-if="allTechnologies[hoveredTech].aspect"><strong>Aspect:</strong> {{ allTechnologies[hoveredTech].aspect }}</div>
            <div v-if="allTechnologies[hoveredTech].comments"><strong>Comments:</strong> {{ allTechnologies[hoveredTech].comments }}</div>
          </div>
        </div>

        <!-- Legend -->
        <v-row class="mt-6">
          <v-col cols="6" sm="3" v-for="status in statusList" :key="status">
            <div class="legend-item">
              <div class="legend-color" :style="{ backgroundColor: getStatusColorHex(status) }"></div>
              <span>{{ status }}</span>
            </div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import { computed, ref } from 'vue'

export default {
  props: {
    categories: {
      type: Array,
      required: true
    }
  },
  setup(props) {
    const hoveredTech = ref(null)
    const svgSize = 800
    const centerX = svgSize / 2
    const centerY = svgSize / 2
    const radiusAdopt = 120
    const radiusAssess = 200
    const radiusHold = 280
    const radiusRetire = 360
    const bubbleRadius = 20

    const metadata = computed(() => {
      const metaCategory = props.categories.find(c => c.isMetadata)
      return metaCategory?.metadata || {}
    })

    const allTechnologies = computed(() => {
      const techs = []
      const regularCategories = props.categories.filter(c => !c.isMetadata)
      
      regularCategories.forEach((category, catIdx) => {
        if (!category.entries) return
        
        category.entries.forEach((entry) => {
          if (!entry.answers) return
          
          entry.answers.forEach((answer) => {
            if (answer.technology) {
              const status = answer.status || 'Hold'
              let radius
              
              switch(status) {
                case 'Adopt': radius = radiusAdopt; break
                case 'Assess': radius = radiusAssess; break
                case 'Hold': radius = radiusHold; break
                case 'Retire': radius = radiusRetire; break
                default: radius = radiusHold
              }

              const segmentIndex = catIdx % 8
              const angle = (segmentIndex / 8) * 2 * Math.PI - Math.PI / 2
              const randomOffset = (Math.random() - 0.5) * 40
              const finalRadius = Math.max(bubbleRadius + 10, radius + randomOffset)
              
              techs.push({
                name: answer.technology,
                status: status,
                category: category.title,
                aspect: entry.aspect,
                comments: answer.comments,
                x: centerX + finalRadius * Math.cos(angle),
                y: centerY + finalRadius * Math.sin(angle)
              })
            }
          })
        })
      })
      
      return techs
    })

    const segmentAngles = computed(() => {
      const angles = []
      for (let i = 0; i < 8; i++) {
        angles.push((i / 8) * 2 * Math.PI - Math.PI / 2)
      }
      return angles
    })

    const statusList = ['Adopt', 'Assess', 'Hold', 'Retire']

    function getStatusColor(status) {
      const colors = {
        'Adopt': '#4caf50',
        'Assess': '#2196f3',
        'Hold': '#ff9800',
        'Retire': '#f44336'
      }
      return colors[status] || '#9e9e9e'
    }

    function getStatusColorHex(status) {
      return getStatusColor(status)
    }

    return { 
      hoveredTech,
      metadata,
      allTechnologies,
      segmentAngles,
      statusList,
      svgSize,
      centerX,
      centerY,
      radiusAdopt,
      radiusAssess,
      radiusHold,
      radiusRetire,
      bubbleRadius,
      getStatusColor,
      getStatusColorHex
    }
  }
}
</script>

<style scoped>
.radar-container {
  position: relative;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}

.tech-radar {
  width: 100%;
  height: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.ring-label {
  font-size: 12px;
  font-weight: bold;
  fill: #666;
}

.tech-bubble {
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.tech-bubble:hover {
  opacity: 1 !important;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.tech-label {
  font-size: 10px;
  font-weight: bold;
  fill: white;
  pointer-events: none;
  user-select: none;
}

.tech-label.hovered {
  font-size: 12px;
}

.tech-tooltip {
  position: absolute;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 12px;
  font-size: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 10;
  max-width: 250px;
  top: 50px;
  right: 20px;
}

.tech-tooltip div {
  margin-top: 4px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.legend-color {
  width: 20px;
  height: 20px;
  border-radius: 3px;
  border: 1px solid #ddd;
}
</style>
