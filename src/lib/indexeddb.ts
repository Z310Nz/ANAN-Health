// IndexedDB utility for browser-side caching of insurance rates
// This provides fast in-browser lookups without querying Supabase repeatedly

const DB_NAME = "ANAN_HealthDB";
const DB_VERSION = 1;
const STORE_NAME = "rates";

export interface RateRecord {
  key: string; // Format: ${age}|${gender}|${segcode}
  age: number;
  gender: string;
  segment: string;
  segcode: string;
  interest: number | null;
  type: "regular" | "rider"; // To distinguish between regular and rider rates
}

export interface CacheMetadata {
  lastUpdated: number;
  totalRecords: number;
  minAge: number;
  maxAge: number;
  loadedGenders: string[];
}

class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  async initialize(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error("[IDB] Failed to open database");
        reject(new Error("Failed to open IndexedDB"));
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log("[IDB] Database opened successfully");
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log("[IDB] Upgrading database schema");

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "key" });
          store.createIndex("age", "age", { unique: false });
          store.createIndex("gender", "gender", { unique: false });
          store.createIndex("segcode", "segcode", { unique: false });
          store.createIndex("type", "type", { unique: false });
          console.log("[IDB] Object store created with indexes");
        }
      };
    });

    return this.initPromise;
  }

  async addRates(records: RateRecord[]): Promise<number> {
    const db = await this.initialize();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      let count = 0;

      records.forEach((record) => {
        const request = store.put(record);
        request.onsuccess = () => {
          count++;
        };
        request.onerror = () => {
          console.error("[IDB] Failed to add record:", record);
        };
      });

      tx.oncomplete = () => {
        console.log(`[IDB] Added ${count} records to database`);
        resolve(count);
      };

      tx.onerror = () => {
        console.error("[IDB] Transaction failed");
        reject(new Error("Transaction failed"));
      };
    });
  }

  async getRate(key: string): Promise<RateRecord | undefined> {
    const db = await this.initialize();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error("Failed to get rate"));
      };
    });
  }

  async getRatesByType(
    age: number,
    gender: string,
    segcode: string,
    type: "regular" | "rider"
  ): Promise<RateRecord | undefined> {
    const key = `${age}|${gender.toLowerCase()}|${segcode}`;
    const db = await this.initialize();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(key);

      request.onsuccess = () => {
        const record = request.result;
        if (record && record.type === type) {
          resolve(record);
        } else {
          resolve(undefined);
        }
      };

      request.onerror = () => {
        reject(new Error("Failed to query rates"));
      };
    });
  }

  async getAllRates(type?: "regular" | "rider"): Promise<RateRecord[]> {
    const db = await this.initialize();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      let request;

      if (type) {
        const index = store.index("type");
        request = index.getAll(type);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error("Failed to get all rates"));
      };
    });
  }

  async clearAll(): Promise<void> {
    const db = await this.initialize();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.clear();

      request.onsuccess = () => {
        console.log("[IDB] All records cleared");
        resolve();
      };

      request.onerror = () => {
        reject(new Error("Failed to clear database"));
      };
    });
  }

  async getMetadata(): Promise<CacheMetadata> {
    const records = await this.getAllRates();

    if (records.length === 0) {
      return {
        lastUpdated: 0,
        totalRecords: 0,
        minAge: 0,
        maxAge: 0,
        loadedGenders: [],
      };
    }

    const ages = records.map((r) => r.age);
    const genderSet = new Set(records.map((r) => r.gender));
    const genders = Array.from(genderSet);

    return {
      lastUpdated: Date.now(),
      totalRecords: records.length,
      minAge: Math.min(...ages),
      maxAge: Math.max(...ages),
      loadedGenders: genders,
    };
  }

  async isCacheReady(): Promise<boolean> {
    try {
      const records = await this.getAllRates();
      return records.length > 0;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const idbManager = new IndexedDBManager();

// Helper function to build rate records for IndexedDB
export function buildIndexedDBRecords(
  riderResults: any[],
  regularResults: any[]
): RateRecord[] {
  const records: RateRecord[] = [];

  // Add rider rates
  riderResults.forEach((row) => {
    const key = `${row.age}|${row.gender.toLowerCase()}|${row.segcode}`;
    records.push({
      key,
      age: row.age,
      gender: row.gender.toLowerCase(),
      segment: row.segment || "",
      segcode: row.segcode,
      interest: row.interest || null,
      type: "rider",
    });
  });

  // Add regular rates
  regularResults.forEach((row) => {
    const key = `${row.age}|${row.gender.toLowerCase()}|${row.segcode}`;
    records.push({
      key,
      age: row.age,
      gender: row.gender.toLowerCase(),
      segment: row.segment || "",
      segcode: row.segcode,
      interest: row.interest || null,
      type: "regular",
    });
  });

  return records;
}
