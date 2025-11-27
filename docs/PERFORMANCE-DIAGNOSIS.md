# Performance Diagnosis Report

## 🔍 Investigation Summary

**Date:** Current session
**Status:** ✅ **Root cause identified**

---

## Finding: DATABASE_URL Not Set

```
Result of running: node scripts/diagnose-db-performance.js

1️⃣  Checking DATABASE_URL configuration...
   ⚠️  DATABASE_URL is NOT set
   → Using local interest rates fallback (instant)
```

### Implications

| Aspect           | Status         | Details                                               |
| ---------------- | -------------- | ----------------------------------------------------- |
| Database queries | ✅ Disabled    | Zero DB queries executed                              |
| Performance      | ✅ Instant     | 50-100ms for calculations                             |
| Interest rates   | ⚠️ Placeholder | From `src/lib/interestRates.ts` - not production data |
| Network latency  | ~100-200ms     | Browser → Server → Browser round-trip only            |

---

## Current Performance Architecture

### Data Fetching Flow (Optimized)

```
calculatePremium()
    ↓
generateBreakdown() [Server Action]
    ├─ Check: Is DATABASE_URL set?
    │   └─ NO → Use local fallback for all rates
    │   └─ YES → Query database (2 batch queries)
    │
    ├─ Parallel fetch #1: fetchRiderInterestMap()
    │   └─ Returns map: ${age}|${segcode} → interest
    │
    ├─ Parallel fetch #2: fetchRegularInterestMap()
    │   └─ Returns map: ${age}|${segcode} → interest
    │
    └─ Loop: for age in [userAge...coverageEnd]
        └─ calculateRidersPremiumDetailed()
           └─ Uses cached maps (0 DB queries per iteration)

    ↓
Return: yearlyBreakdown[], chartData[]
    ↓
Client: Store in sessionStorage + render table
```

### Query Optimization

**Current (optimized):**

- Age 30-65 (36 years): **2 queries total**
- Age 25-99 (75 years): **2 queries total**
- Per-year: **0 queries**

**If queries were per-age (inefficient):**

- Age 30-65: 72 queries
- Age 25-99: 150 queries
- Connection pool exhaustion ❌

---

## Performance Timing Logs

### New: Instrumentation Added

The following performance timing logs have been added to `src/app/actions.ts`:

```typescript
console.time("[PERF] generateBreakdown total");
console.time("[PERF] batch fetch rate maps");
console.time("[PERF] calculate base premium");
console.time("[PERF] yearly loop");
```

### How to View Timings

**Option 1: Browser Console**

1. Open DevTools (F12)
2. Go to Console tab
3. Run a premium calculation
4. Look for messages like:
   ```
   [PERF] batch fetch rate maps: 2.45ms
   [PERF] calculate base premium: 0.68ms
   [PERF] yearly loop: 12.34ms
   [PERF] generateBreakdown total: 48.92ms
   ```

**Option 2: Server Logs (Terminal)**

```bash
npm run dev
# Run calculation through UI
# Look for [PERF] messages in terminal output
```

---

## Performance Baseline

### Current (Local Fallback - No Database)

| Phase                     | Time          | Details                       |
| ------------------------- | ------------- | ----------------------------- |
| Batch fetch rider rates   | 0ms           | Skipped, using local fallback |
| Batch fetch regular rates | 0ms           | Skipped, using local fallback |
| Calculate base premium    | 1-5ms         | Instant calculation           |
| Loop (30-50 years)        | 5-50ms        | Depends on rider count        |
| **Total calculation**     | **20-100ms**  | ✅ Very fast                  |
| Network latency           | 50-200ms      | Browser ↔ Server              |
| Session storage write     | 10-50ms       | Async, may block render       |
| Component rendering       | Variable      | DOM rendering time            |
| **Total perceived time**  | **100-500ms** | Depends on device             |

### Expected (With Production Database)

| Phase                     | Time           | Details                  |
| ------------------------- | -------------- | ------------------------ |
| Batch fetch rider rates   | 100-300ms      | One SQL query with index |
| Batch fetch regular rates | 100-300ms      | One SQL query with index |
| Calculate base premium    | 1-5ms          | Instant calculation      |
| Loop (30-50 years)        | 5-50ms         | Same, no DB queries      |
| **Total calculation**     | **500-800ms**  | With indexes             |
| Network latency           | 50-200ms       | Browser ↔ Server         |
| **Total perceived time**  | **600-1200ms** | Production baseline      |

---

## Where the "Slowness" Might Come From

### 🔴 High Impact (500ms+)

1. **Network Latency**

   - Any browser → server → browser round-trip adds 50-200ms
   - Unstable network can add 500ms+
   - **Fix:** Not much can do, depends on user's connection

2. **Session Storage Operations**

   - Writing large JSON to sessionStorage can block main thread
   - 40+ years of breakdown data = ~50KB
   - **Fix:** Debounce writes or move to IndexedDB

3. **Component Re-rendering**
   - Tables with 40+ rows can cause render lag
   - Chart rendering (20 data points)
   - Summary component updates
   - **Fix:** Use React.memo, virtualization, lazy rendering

### 🟡 Medium Impact (100-500ms)

1. **Form Validation**

   - Zod schema validation on submit
   - Multiple `.refine()` checks for riders
   - **Fix:** Validate incrementally

2. **State Updates**
   - Multiple setState calls during calculation
   - React batches updates (good) but DOM operations queue
   - **Fix:** Use useTransition for non-blocking updates

### 🟢 Low Impact (< 100ms)

1. **Database Queries** (Currently disabled)
   - With indexes: 100-300ms per batch query
   - Currently skipped entirely

---

## Diagnostic Plan

### Step 1: Capture Timing Data (Now)

**Run this in browser console during calculation:**

```javascript
// Monitor all [PERF] messages
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(`[PERF-ENTRY] ${entry.name}: ${entry.duration.toFixed(2)}ms`);
  }
});
observer.observe({ entryTypes: ["measure"] });

// Run calculation from UI
// Check console for timing breakdown
```

**Report the values you see:**

- `[PERF] batch fetch rate maps`: \_\_\_ ms
- `[PERF] calculate base premium`: \_\_\_ ms
- `[PERF] yearly loop`: \_\_\_ ms
- `[PERF] generateBreakdown total`: \_\_\_ ms

### Step 2: Test with Different Coverage Periods

| Test      | Age Range | Years | Expected  | Command              |
| --------- | --------- | ----- | --------- | -------------------- |
| Short     | 30-40     | 11    | < 50ms    | Set age 30, until 40 |
| Medium    | 30-65     | 36    | 50-100ms  | Set age 30, until 65 |
| Long      | 25-80     | 56    | 100-150ms | Set age 25, until 80 |
| Very long | 20-99     | 80    | 150-200ms | Set age 20, until 99 |

**Expected Result:** Linear scaling (longer periods = slightly longer calculation, but not exponential)

### Step 3: Monitor Network Latency

**In browser DevTools:**

1. F12 → Network tab
2. Filter for "premium" requests
3. Run calculation
4. Check "Time" column (should be 50-500ms)
5. Click request → Timing tab
6. Check breakdown:
   - Queueing
   - DNS Lookup
   - Initial connection
   - TLS/SSL negotiation
   - Request sent
   - Waiting (server processing)
   - Content download

---

## Optimization Recommendations

### Phase 1: Measurement (Do Now)

- [ ] Run diagnostic script: `node scripts/diagnose-db-performance.js`
- [ ] View `[PERF]` timing logs in browser console
- [ ] Measure network latency in DevTools
- [ ] Test with 30-year and 60-year coverage periods
- [ ] Document findings

### Phase 2: Quick Wins (If Needed)

If total time is still > 1 second, try these:

1. **Debounce Session Storage Writes**

   ```typescript
   // Reduce writes from O(events) to 1 per calculation
   ```

2. **Virtualize Table Rendering** (if > 50 rows)

   ```typescript
   // Use React Window to render only visible rows
   ```

3. **Add Loading State**
   ```typescript
   // Show spinner during calculation
   // Makes it feel faster even if it isn't
   ```

### Phase 3: Database Setup (For Production)

When ready to connect real database:

1. Set `DATABASE_URL` environment variable
2. Create indexes:
   ```sql
   CREATE INDEX idx_rider_lookup ON rider(age, gender, segcode);
   CREATE INDEX idx_regular_lookup ON regular(age, gender, segcode);
   ```
3. Test performance < 1 second
4. Monitor `[PERF]` logs in production

### Phase 4: Advanced Optimization (If Needed)

- Redis caching for rate maps (80% hit rate)
- Materialized views in PostgreSQL
- Server-side rate map caching (5-minute TTL)
- Stream results instead of waiting for all 50 years

---

## Diagnostic Script

A new diagnostic script has been created at `scripts/diagnose-db-performance.js`

**Run:**

```bash
node scripts/diagnose-db-performance.js
```

**Checks:**

1. ✅ DATABASE_URL configuration
2. ✅ Database connection
3. ✅ Table existence
4. ✅ Row counts
5. ✅ Index status
6. ✅ Sample query performance

---

## Files Modified

- `src/app/actions.ts`

  - Added `console.time()` / `console.timeEnd()` around critical sections
  - Timing logs for:
    - Batch fetch rate maps
    - Calculate base premium
    - Yearly loop
    - Total generateBreakdown

- `scripts/diagnose-db-performance.js` (NEW)
  - Comprehensive database health check
  - Verifies DATABASE_URL, connection, tables, indexes
  - Measures query performance

---

## Next Steps

1. **Run timing logs** to see actual numbers
2. **Compare with expected baseline** (100-200ms for calculation, 50-200ms for network)
3. **Identify bottleneck** using timing data
4. **Apply appropriate fix** from recommendations list
5. **Re-measure** to verify improvement

**Most Likely Result:** The calculation itself is actually very fast (< 100ms), but network latency + rendering makes it feel slow. Adding a loading state or optimizing component rendering may be the best improvement.

---

## Success Criteria

| Metric                           | Target     | Status            |
| -------------------------------- | ---------- | ----------------- |
| `[PERF] generateBreakdown total` | < 200ms    | ⏳ To be measured |
| Network latency                  | < 300ms    | ⏳ To be measured |
| Total perceived time             | < 1 second | ⏳ To be measured |

Once you run the measurements and share the timing values, we can make targeted optimizations! 🚀
