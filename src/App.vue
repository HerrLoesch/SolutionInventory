<template>
  <v-app>
    <v-app-bar color="primary" dark>
      <v-toolbar-title>Solution Inventory</v-toolbar-title>
    </v-app-bar>

    <v-main>
      <v-container class="pa-4">
        <Questionnaire />
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import Questionnaire from './components/Questionnaire.vue'

export default {
  components: { Questionnaire }
}
</script>

<style>
/* small global styles */
body { font-family: Roboto, Arial, sans-serif; }
</style>
