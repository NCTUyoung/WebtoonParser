<template>
  <div v-if="message" class="error-message">
    {{ message }}
  </div>
</template>

<script setup lang="ts">
defineProps({
  message: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
.error-message {
  color: #ed4014;
  font-size: 14px;
  margin-top: 10px;
  padding: 10px 14px;
  background-color: #ffece6;
  border-radius: 6px;
  border-left: 2px solid #ed4014;
  display: flex;
  align-items: center;
  gap: 8px;
}

.error-message::before {
  content: "⚠️";
  font-size: 14px;
}
</style> 