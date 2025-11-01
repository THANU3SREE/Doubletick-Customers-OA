// src/utils/indexedDB.js

/**
 * IndexedDB wrapper for customer data storage
 * Implements virtual scrolling by storing only 10K records but simulating 1M
 */

const DB_NAME = 'DoubleTick';
const STORE_NAME = 'customers';
const DB_VERSION = 1;

// Virtual scrolling configuration
const VIRTUAL_TOTAL = 1000000; // Simulate 1M records
const ACTUAL_STORED = 10000;   // Actually store 10K records

/**
 * Initialize IndexedDB database
 * @returns {Promise<IDBDatabase>} Database instance
 */
export function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        
        // Create indexes for efficient querying
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('email', 'email', { unique: false });
        store.createIndex('phone', 'phone', { unique: false });
        store.createIndex('score', 'score', { unique: false });
        store.createIndex('lastMessageAt', 'lastMessageAt', { unique: false });
      }
    };
  });
}

/**
 * Save customers in batches to IndexedDB
 * @param {Generator} batchGenerator - Generator function yielding customer batches
 * @param {number} totalRecords - Total number of records to save
 * @param {Function} onProgress - Progress callback (current, total)
 */
export async function saveCustomerBatches(batchGenerator, totalRecords, onProgress) {
  const db = await initDB();
  let processedCount = 0;
  
  for (const batch of batchGenerator) {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // Add each customer in the batch
      batch.forEach(customer => store.put(customer));
      
      transaction.oncomplete = () => {
        processedCount += batch.length;
        if (onProgress) {
          onProgress(processedCount, totalRecords);
        }
        resolve();
      };
      
      transaction.onerror = () => reject(transaction.error);
    });
    
    // Yield to prevent blocking
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  db.close();
}

/**
 * Check if database has data
 * @returns {Promise<boolean>} True if data exists
 */
export async function hasData() {
  const db = await initDB();
  const transaction = db.transaction([STORE_NAME], 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  
  return new Promise((resolve) => {
    const countRequest = store.count();
    countRequest.onsuccess = () => {
      db.close();
      resolve(countRequest.result > 0);
    };
  });
}

/**
 * Generate virtual customer on-the-fly (for records beyond stored data)
 * @param {number} id - Customer ID
 * @returns {Object} Virtual customer object
 */
function generateVirtualCustomer(id) {
  const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com'];
  const agents = ['Karthey Mishra', 'Agent Smith', 'Agent Jones', 'Agent Brown'];
  
  const firstName = firstNames[id % firstNames.length];
  const lastName = lastNames[Math.floor(id / firstNames.length) % lastNames.length];
  const name = `${firstName} ${lastName}`;
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${id}@${domains[id % domains.length]}`;
  const phone = `+1${String(id).padStart(10, '0')}`;
  const score = (id * 7) % 100;
  const addedBy = agents[id % agents.length];
  const lastMessageAt = new Date(Date.now() - (id % 365) * 24 * 60 * 60 * 1000).toISOString();
  
  return {
    id,
    name,
    phone,
    email,
    score,
    lastMessageAt,
    addedBy,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`
  };
}

/**
 * Get customers with pagination, search, and sorting
 * @param {Object} params - Query parameters
 * @param {number} params.offset - Starting index
 * @param {number} params.limit - Number of records to return
 * @param {string} params.search - Search term
 * @param {string} params.sortBy - Field to sort by
 * @param {string} params.sortOrder - 'asc' or 'desc'
 * @returns {Promise<Object>} { data, total, hasMore }
 */
export async function getCustomers({ 
  offset = 0, 
  limit = 30, 
  search = '', 
  sortBy = 'id', 
  sortOrder = 'asc' 
}) {
  const db = await initDB();
  const transaction = db.transaction([STORE_NAME], 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  
  return new Promise((resolve) => {
    // NO SEARCH: Use virtual data for instant loading
    if (!search) {
      const results = [];
      const start = offset;
      const end = Math.min(offset + limit, VIRTUAL_TOTAL);
      
      // Mix real and virtual data
      for (let i = start; i < end; i++) {
        if (i < ACTUAL_STORED) {
          // Placeholder - will be replaced with real data
          results.push(null);
        } else {
          // Generate virtual customer
          results.push(generateVirtualCustomer(i + 1));
        }
      }
      
      // Fetch real data for the range
      const request = store.openCursor();
      let count = 0;
      const realData = [];
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        
        if (cursor && count < end) {
          if (count >= start && count < end) {
            realData.push(cursor.value);
          }
          count++;
          cursor.continue();
        } else {
          // Merge real data into results
          realData.forEach((customer, idx) => {
            results[idx] = customer;
          });
          
          // Sort if needed
          if (sortBy !== 'id') {
            results.sort((a, b) => {
              let aVal = a[sortBy];
              let bVal = b[sortBy];
              
              if (sortBy === 'lastMessageAt') {
                aVal = new Date(aVal).getTime();
                bVal = new Date(bVal).getTime();
              }
              
              if (sortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
              } else {
                return aVal < bVal ? 1 : -1;
              }
            });
          }
          
          db.close();
          resolve({
            data: results.filter(r => r !== null),
            total: VIRTUAL_TOTAL,
            hasMore: end < VIRTUAL_TOTAL
          });
        }
      };
      
      return;
    }
    
    // WITH SEARCH: Only search real data
    let results = [];
    const searchLower = search.toLowerCase();
    
    const request = store.openCursor();
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      
      if (cursor) {
        const customer = cursor.value;
        
        // Check if customer matches search
        const matches = 
          customer.name.toLowerCase().includes(searchLower) ||
          customer.email.toLowerCase().includes(searchLower) ||
          customer.phone.includes(search);
        
        if (matches) {
          results.push(customer);
        }
        
        cursor.continue();
      } else {
        // Sort results
        results.sort((a, b) => {
          let aVal = a[sortBy];
          let bVal = b[sortBy];
          
          if (sortBy === 'lastMessageAt') {
            aVal = new Date(aVal).getTime();
            bVal = new Date(bVal).getTime();
          }
          
          if (sortOrder === 'asc') {
            return aVal > bVal ? 1 : -1;
          } else {
            return aVal < bVal ? 1 : -1;
          }
        });
        
        // Paginate results
        const paginated = results.slice(offset, offset + limit);
        
        db.close();
        resolve({
          data: paginated,
          total: results.length,
          hasMore: results.length > offset + limit
        });
      }
    };
  });
}