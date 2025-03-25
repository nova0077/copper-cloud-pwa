// IndexedDB functions
function openDatabase(database) {
  return idb.openDB(database, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('items')) {
        db.createObjectStore('items', { keyPath: 'id' });
      }
    }
  });
}

async function saveItemToIndexedDB(item, database) {
  const db = await openDatabase(database);
  const tx = db.transaction('items', 'readwrite');
  const store = tx.objectStore('items');
  await store.put(item);
  await tx.done;
}

async function getItemsFromIndexedDB(database) {
  const db = await openDatabase(database);
  const tx = db.transaction('items', 'readonly');
  const store = tx.objectStore('items');
  const items = await store.getAll();
  await tx.done;
  return items;
}

async function removeItemFromIndexedDB(id, database) {
  const db = await openDatabase(database);
  const tx = db.transaction('items', 'readwrite');
  const store = tx.objectStore('items');
  await store.delete(id);
  await tx.done;
}