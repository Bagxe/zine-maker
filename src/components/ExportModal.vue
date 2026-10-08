<template>
  <div class="modal-overlay" v-if="visible" @click.self="$emit('close')">
    <div class="modal-content">
      <button class="close-button" @click="$emit('close')">×</button>
      
      <div class="modal-header">
        <h3>{{ t('exportModal.title') }}</h3>
        <p>{{ t('exportModal.subtitle') }}</p>
      </div>

      <div class="export-tabs">
        <button 
          @click="activeTab = 'png'" 
          :class="{ active: activeTab === 'png' }"
          class="tab-button"
        >
          {{ t('exportModal.tabPng') }}
        </button>
        <button 
          @click="activeTab = 'pdf'" 
          :class="{ active: activeTab === 'pdf' }"
          class="tab-button"
        >
          {{ t('exportModal.tabPdf') }}
        </button>
        <button 
          @click="activeTab = 'digital'" 
          :class="{ active: activeTab === 'digital' }"
          class="tab-button"
        >
          {{ t('exportModal.tabDigital') }}
        </button>
      </div>

      <div class="preview-container">
        <div v-if="activeTab === 'png' && currentPng" class="png-wrapper">
          <div class="page-label" v-if="uiStore.exportImages.length >= 1">{{ sideLabel }}</div>
          <img :src="currentPng" alt="Zine Preview" class="png-image" />
        </div>
        <div v-else-if="activeTab === 'png'" class="no-preview">
          <p>{{ t('exportModal.noPng') }}</p>
          <p class="debug">{{ t('exportModal.noImages') }}</p>
        </div>
        <iframe 
          v-else-if="(activeTab === 'pdf' || activeTab === 'digital') && currentPdfSrc" 
          :src="currentPdfSrc" 
          class="pdf-preview"
        ></iframe>
        <div v-else class="no-preview">
          <p>{{ t('exportModal.noPdf') }}</p>
          <p class="debug">{{ t('exportModal.pdfDataLength', { n: currentPdfSrc ? currentPdfSrc.length : 0 }) }}</p>
        </div>
      </div>

      <div class="pager-row" v-if="activeTab==='png' && uiStore.exportImages.length > 1">
        <button class="pager-btn" @click="prevPage" :disabled="pageIndex===0">{{ t('exportModal.prev') }}</button>
        <span class="pager-indicator">{{ pageIndex + 1 }} / {{ uiStore.exportImages.length }}</span>
        <button class="pager-btn" @click="nextPage" :disabled="pageIndex===uiStore.exportImages.length-1">{{ t('exportModal.next') }}</button>
      </div>

      <div class="export-actions">
        <button @click="downloadPng" class="download-button png-button">
          <Download :size="16" />
          <span>{{ t('exportModal.downloadPng') }}</span>
        </button>
        <button @click="downloadPdf" class="download-button pdf-button">
          <FileText :size="16" />
          <span>{{ t('exportModal.printPdf') }}</span>
        </button>
        <button @click="downloadDigitalPdf" class="download-button digital-button" :disabled="!uiStore.exportDigitalPdfData">
          <Smartphone :size="16" />
          <span>{{ t('exportModal.digitalPdf') }}</span>
        </button>
        <button
          @click="sendToZineStudio"
          class="download-button studio-button"
          :disabled="!canHandoff || handoffStatus === 'sending'"
          :title="canHandoff ? t('exportModal.sendPagesTitle') : t('exportModal.noPagesTitle')"
        >
          <Send :size="16" />
          <span>{{ handoffStatus === 'sending' ? t('exportModal.sending') : t('exportModal.sendToStudio') }}</span>
        </button>
      </div>

      <div v-if="handoffStatus === 'done'" class="handoff-status handoff-status--success">
        <span>{{ t('exportModal.sentPages', { n: handoffPageCount }, handoffPageCount) }}</span>
        <a :href="zineStudioFromEditorUrl" class="handoff-link">{{ t('exportModal.openStudio') }}</a>
      </div>
      <div v-else-if="handoffStatus === 'error'" class="handoff-status handoff-status--error">
        <span>{{ t('exportModal.sendFailed', { suffix: handoffError ? `: ${handoffError}` : '.' }) }}</span>
      </div>

      <p class="studio-crosslink">
        {{ t('exportModal.studioCrosslink') }}
        <a :href="zineStudioUrl" target="_blank" rel="noopener noreferrer" class="handoff-link">{{ t('exportModal.studioCrosslinkLink') }}</a>
      </p>

      <div class="print-instructions">
        <h4>{{ t('exportModal.printInstructions') }}</h4>
        <ul>
          <li>{{ t('exportModal.instr1') }}</li>
          <li>{{ t('exportModal.instr2') }}</li>
          <li>{{ t('exportModal.instr3') }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Download, FileText, Smartphone, Send } from 'lucide-vue-next';
import { useUIStore } from '@/stores/ui';
import { useAssetStore } from '@/stores/assetStore';
import type { ZineProject } from '@/types';
import { sendProjectToZineStudio, ZINE_STUDIO_URL } from '@/utils/zineStudioHandoff';

const props = defineProps<{ visible: boolean; imageSrc: string; project?: ZineProject | null }>();

defineEmits<{
  (e: 'close'): void;
}>();

const { t } = useI18n();
const uiStore = useUIStore();
const assetStore = useAssetStore();
const activeTab = ref<'png' | 'pdf' | 'digital'>('png');
const pageIndex = ref(0);
const currentPng = computed(() => uiStore.exportImages.length ? uiStore.exportImages[pageIndex.value] : props.imageSrc);

const zineStudioUrl = ZINE_STUDIO_URL;
const zineStudioFromEditorUrl = `${ZINE_STUDIO_URL}?from=editor`;
const handoffStatus = ref<'idle' | 'sending' | 'done' | 'error'>('idle');
const handoffError = ref('');
const handoffPageCount = ref(0);
const canHandoff = computed(() => !!props.project && props.project.pages.length > 0);

watch(() => props.visible, (visible) => {
  if (visible) {
    handoffStatus.value = 'idle';
    handoffError.value = '';
  }
});

async function sendToZineStudio() {
  if (!canHandoff.value || handoffStatus.value === 'sending') return;
  handoffStatus.value = 'sending';
  handoffError.value = '';
  try {
    handoffPageCount.value = await sendProjectToZineStudio(
      props.project as ZineProject,
      (id) => assetStore.getAsset(id)
    );
    handoffStatus.value = 'done';
  } catch (error) {
    console.error('Zine Studio handoff failed:', error);
    handoffError.value = error instanceof Error ? error.message : String(error);
    handoffStatus.value = 'error';
  }
}

function nextPage() { if (pageIndex.value < uiStore.exportImages.length - 1) pageIndex.value++; }
function prevPage() { if (pageIndex.value > 0) pageIndex.value--; }

const sideLabel = computed(() => {
  if (uiStore.exportImages.length === 2) return pageIndex.value === 0 ? t('exportModal.sideFront') : t('exportModal.sideBack');
  return t('exportModal.sheet');
});

// Convert a PDF data URL to a blob URL for better iframe compatibility
function toPdfObjectUrl(data: string): string | null {
  if (!data) return null;
  if (data.startsWith('data:application/pdf')) {
    try {
      const base64 = data.split(',')[1];
      const binary = atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      return URL.createObjectURL(blob);
    } catch {
      return data;
    }
  }
  return data;
}

const pdfSrc = computed(() => toPdfObjectUrl(uiStore.exportPdfData));
const digitalPdfSrc = computed(() => toPdfObjectUrl(uiStore.exportDigitalPdfData));
const currentPdfSrc = computed(() => activeTab.value === 'digital' ? digitalPdfSrc.value : pdfSrc.value);

function downloadPng() {
  const link = document.createElement('a');
  link.href = currentPng.value || props.imageSrc;
  link.download = `zine-export-${pageIndex.value + 1}.png`;
  link.click();
}

function downloadPdf() {
  if (uiStore.exportPdfData) {
    const link = document.createElement('a');
    link.href = uiStore.exportPdfData;
    link.download = 'zine-print.pdf';
    link.click();
  }
}

function downloadDigitalPdf() {
  if (uiStore.exportDigitalPdfData) {
    const link = document.createElement('a');
    link.href = uiStore.exportDigitalPdfData;
    link.download = 'zine-digital.pdf';
    link.click();
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2100; /* Above mobile panels */
}
.modal-content {
  background: var(--panel);
  padding: 2rem;
  border-radius: 8px;
  width: 90%;
  max-width: 80vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  position: relative;
}
.close-button {
  position: absolute;
  top: 1rem; inset-inline-end: 1rem;
  background: none; border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #9ca3af;
}
.modal-header {
  text-align: center;
  margin-bottom: 1.5rem;
}
.modal-header h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
}

.export-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.tab-button {
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 0.9rem;
  color: #6b7280;
  transition: all 0.2s ease;
}

.tab-button:hover {
  color: #374151;
}

.tab-button.active {
  color: var(--ink);
  border-bottom-color: var(--border);
}

.preview-container {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem;
  /* overflow: scroll; */
  height: 60vh; /* fixed viewport area so image can scale to fit */
}
.png-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.png-image {
  display: block;
  width: 30%;
  height: 30%;
  object-fit: contain;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.page-label {
  position: absolute;
  top: 8px;
  inset-inline-start: 8px;
  background: rgba(0,0,0,.65);
  color: #fff;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  letter-spacing: .02em;
}
.pdf-preview {
  width: 75%;
  height: 75%;
  min-height: 400px;
  border: none;
  border-radius: 4px;
}

.no-preview {
  color: #6b7280;
  text-align: center;
}

.debug {
  font-size: 0.7rem;
  color: #9ca3af;
  margin-top: 0.5rem;
}

.export-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  padding-top: 1.5rem;
}

.pager-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: .75rem;
  margin-top: .75rem;
}
.pager-btn { border: 1px solid var(--border-soft); background: var(--surface); color: var(--ui-ink); padding: .4rem .7rem; border-radius: 6px; cursor: pointer; }
.pager-btn:disabled { opacity: .5; cursor: not-allowed; }
.pager-indicator { color: var(--ui-ink); font-size: .9rem; }

.download-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s ease;
}

.png-button {
  background: #10b981;
  color: white;
}

.png-button:hover {
  background: #059669;
}

.pdf-button {
  background: #dc2626;
  color: white;
}

.pdf-button:hover {
  background: #b91c1c;
}

.digital-button {
  background: #2563eb;
  color: white;
}

.digital-button:hover {
  background: #1d4ed8;
}

.digital-button:disabled {
  background: #93c5fd;
  cursor: not-allowed;
}

.studio-button {
  background: #7c3aed;
  color: white;
}

.studio-button:hover {
  background: #6d28d9;
}

.studio-button:disabled {
  background: #c4b5fd;
  cursor: not-allowed;
}

.handoff-status {
  margin-top: 1rem;
  padding: 0.6rem 0.9rem;
  border-radius: 6px;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.handoff-status--success {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #065f46;
}

.handoff-status--error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}

.handoff-link {
  color: #6d28d9;
  font-weight: 600;
  text-decoration: none;
}

.handoff-link:hover {
  text-decoration: underline;
}

.studio-crosslink {
  margin: 0.75rem 0 0 0;
  text-align: center;
  font-size: 0.8rem;
  color: #6b7280;
}

.print-instructions {
  margin-top: 1.5rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.print-instructions h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.8rem;
  color: #374151;
}

.print-instructions ul {
  margin: 0;
  padding-inline-start: 1.2rem;
  font-size: 0.7rem;
  color: #6b7280;
  line-height: 1.4;
}

.print-instructions li {
  margin-bottom: 0.25rem;
}

/* Mobile responsive export modal */
@media (max-width: 768px) {
  .modal-content {
    width: 95vw;
    max-width: 95vw;
    max-height: 95vh;
    padding: 1.5rem;
  }
  
  .preview-container {
    height: 50vh;
  }
  
  .png-image {
    width: 50%;
    height: 50%;
  }
  
  .pdf-preview {
    width: 90%;
    height: 90%;
    min-height: 300px;
  }
  
  .export-actions {
    flex-direction: column;
    gap: 0.8rem;
  }
  
  .download-button {
    width: 100%;
    padding: 0.8rem 1rem;
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .modal-content {
    width: 98vw;
    padding: 1rem;
    border-radius: 6px;
  }
  
  .modal-header h3 {
    font-size: 1.1rem;
  }
  
  .preview-container {
    height: 45vh;
  }
  
  .png-image {
    width: 70%;
    height: 70%;
  }
  
  .print-instructions {
    margin-top: 1rem;
    padding: 0.8rem;
  }
  
  .print-instructions h4 {
    font-size: 0.75rem;
  }
  
  .print-instructions ul {
    font-size: 0.65rem;
  }
}
</style>
