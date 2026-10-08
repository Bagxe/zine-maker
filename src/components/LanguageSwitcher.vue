<template>
  <button
    class="header-button language-switcher"
    @click="toggleLocale"
    :title="t('header.language')"
    :aria-label="t('header.language')"
  >
    <Languages :size="16" />
    <span>{{ isArabic ? t('header.switchToEnglish') : t('header.switchToArabic') }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Languages } from 'lucide-vue-next';
import { setLocale } from '@/i18n';

const { t, locale } = useI18n();

const isArabic = computed(() => locale.value === 'ar');

function toggleLocale() {
  setLocale(isArabic.value ? 'en' : 'ar');
}
</script>

<style scoped>
/* Inherits .header-button styling from the page header; keep the label visible
   even on narrow headers where other button labels collapse to icons. */
@media (max-width: 1200px) {
  .language-switcher span { display: inline !important; }
}
</style>
