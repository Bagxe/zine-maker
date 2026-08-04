import { deleteDB, openDB } from 'idb';
import type { ZineProject } from '@/types';
import { exportZineDigital, type GetAssetFn } from '@/composables/useZineExport';

const DB_NAME = 'zine-handoff';
const DB_VERSION = 1;
const STORE_NAME = 'pages';

export const ZINE_STUDIO_URL = 'https://bagxe.github.io/zine-studio/';

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(',');
  const mime = /data:(.*?);/.exec(meta)?.[1] || 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Render each project page individually (reading order, one PNG per page) and
 * hand the PNG blobs to Zine Studio via a shared same-origin IndexedDB
 * database. Zine Studio reads the `pages` store from `zine-handoff`.
 * Returns the number of pages written.
 */
export async function sendProjectToZineStudio(project: ZineProject, getAsset: GetAssetFn): Promise<number> {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is not available in this browser.');
  }
  if (!project.pages.length) {
    throw new Error('This project has no pages to send.');
  }

  // Per-page render (no imposition) at export resolution, in reading order.
  const { images } = await exportZineDigital(project, getAsset, { pixelRatio: 2 });

  // Start from a clean slate so stale pages from a previous handoff never linger.
  await deleteDB(DB_NAME);
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      database.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
    },
  });

  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (let i = 0; i < images.length; i++) {
      await store.add({
        name: `page-${String(i + 1).padStart(2, '0')}.png`,
        blob: dataUrlToBlob(images[i]),
        createdAt: Date.now(),
        source: 'zine-maker',
      });
    }
    await tx.done;
  } finally {
    db.close();
  }

  return images.length;
}
