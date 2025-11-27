# Supabase Data Fetching Performance Analysis

## 📊 Current Flow Overview

### When User Presses "Calculate Premium"

```
1. getPremiumSummary() called (src/app/actions.ts)
   ↓
2. generateBreakdown() executed
   ├─ Single DB client created (cached)
   ├─ Parallel batch fetching:
   │  ├─ fetchRiderInterestMap() → 1 SQL query (multi-row result)
   │  └─ fetchRegularInterestMap() → 1 SQL query (multi-row result)
   │
   └─ Loop through each year (e.g., 36 iterations for age 30-65)
      └─ For each age:
         ├─ calculateBasePremium() → Uses cached regularRateMap (NO new query)
         └─ calculateRidersPremiumDetailed() → Uses cached riderRateMap (NO new query)
```

### Query Count Analysis

**Optimal (Current Implementation):**

- `fetchRiderInterestMap()`: **1 query** (batch fetch all ages at once)
- `fetchRegularInterestMap()`: **1 query** (batch fetch all ages at once)
- Loop iterations: **0 additional queries** (uses cached maps)
- **Total: 2 database queries** (regardless of coverage period length)

**Previous Inefficient Approach (if per-age queries were used):**

- Would have made: `coveragePeriod × riders × 2` queries = 36+ queries
- Result: Connection pool exhaustion

## ⚠️ Potential Bottlenecks

### 1. **Database Connection Time** (If DB is slow)

- **Location:** `src/lib/db.ts` - `getSqlClient()` on first call
- **Issue:** SSL certificate validation + network latency on connection
- **Symptom:** First calculation takes 5+ seconds

### 2. **Supabase Query Execution Time**

- **Location:** `src/app/actions.ts` - SQL queries in batch fetch functions
- **Queries:**
  ```sql
  SELECT age, segcode, interest FROM rider
  WHERE age >= ${minAge} AND age <= ${maxAge}
  AND lower(gender) = ${gender.toLowerCase()}
  AND segcode IN (${segcodes})
  ```
- **Potential Issues:**
  - Missing indexes on (age, gender, segcode) columns
  - Large table scan without proper indexing
  - Network latency for query results

### 3. **Loop Processing Time** (Minor)

- **Location:** Lines 715-750 in `src/app/actions.ts`
- **Operations per iteration:**
  - Math calculations (round, add)
  - Array push
- **Time:** ~1-2ms per iteration (36 iterations = 36-72ms total)
- **Not a bottleneck** - this is minimal

## 🔍 Diagnostic Checklist

### What to Check

- [ ] **DATABASE_URL configured?**

  - Check: `echo $DATABASE_URL` in terminal
  - If empty → Falls back to local rates (instant)

- [ ] **Network Latency?**

  - Add timing logs to see where time is spent
  - Check browser DevTools → Network tab → API calls

- [ ] **Database Indexes?**

  - Query `information_schema.statistics` for missing indexes on:
    - `rider` table: (age, gender, segcode, interest)
    - `regular` table: (age, gender, segcode, interest)

- [ ] **Connection Pool Status?**

  - Check Supabase dashboard for connection count
  - Look for "too many connections" errors

- [ ] **Query Performance?**
  - Use Supabase's "Query" panel or PostgreSQL explain plan
  - Compare: Row count returned vs. table size

## 📈 Performance Metrics from Code

### Current Data Flow

```javascript
// For a 30-year-old with 35-year coverage (age 30-65):
//
// Batch fetches happen FIRST (2 queries):
await Promise.all([
  fetchRiderInterestMap(gender, 30, 65, ['HB', 'HB Extra', ...]),  // 1 query
  fetchRegularInterestMap(gender, 30, 65, ['20PLN']),              // 1 query
]);

// Then loop uses cached maps:
for (let i = 0; i < 36; i++) {  // 36 iterations
  // NO database queries here - uses riderRateMap and regularRateMap
  const ridersPremium = calculateRidersPremiumDetailed(..., riderRateMap);
  const basePremium = calculateBasePremium(..., regularRateMap);
}
```

### Expected Timeline

| Component                         | Time             | Notes                  |
| --------------------------------- | ---------------- | ---------------------- |
| DB Connection (1st time)          | 500ms - 3s       | SSL + network overhead |
| Batch query 1 (rider rates)       | 100-500ms        | Returns ~100-300 rows  |
| Batch query 2 (regular rates)     | 50-200ms         | Returns ~35 rows       |
| Loop calculations (36 iterations) | 50-100ms         | All in-memory          |
| **Total (with DB)**               | **700ms - 3.7s** | Mostly DB dependent    |
| **Total (local fallback)**        | **50-100ms**     | No DB calls            |

## 🔧 Recommendations to Speed Up

### Quick Wins (Low Effort)

1. **Add Console Timing Logs**

   ```typescript
   console.time('batchFetch');
   const [riderRateMap, regularRateMap] = await Promise.all([...]);
   console.timeEnd('batchFetch'); // Shows how long it took
   ```

2. **Check if DB is Actually Connected**

   - Look at actions.ts line ~900 for `getPremiumSummary()`
   - Check if `connectionString` is set
   - If not set → Falls back to local rates automatically

3. **Enable Query Logging in Supabase**
   - Supabase Dashboard → Logs → Queries
   - Identify slow queries (> 100ms)

### Medium Effort (Database Optimization)

1. **Add Indexes to Supabase Tables**

   ```sql
   -- For rider table
   CREATE INDEX idx_rider_age_gender_segcode
   ON rider(age, gender, segcode);

   -- For regular table
   CREATE INDEX idx_regular_age_gender_segcode
   ON regular(age, gender, segcode);
   ```

2. **Optimize Query Condition Order**

   - Current: `age >= ? AND age <= ? AND gender = ? AND segcode IN (?)`
   - Better: Move most selective condition first
   - Check query execution plan in Supabase

3. **Cache Results in Redis** (Advanced)
   - Cache the entire rate map for 1 hour
   - Avoid repeated queries for same gender/age range

### Advanced (High Effort)

1. **Use Materialized View**

   ```sql
   CREATE MATERIALIZED VIEW all_rates AS
   SELECT age, gender, 'rider' as type, segcode, interest FROM rider
   UNION ALL
   SELECT age, gender, 'regular' as type, segcode, interest FROM regular;
   ```

2. **Pre-generate Interest Tables**
   - Create application-specific cached tables
   - Update on scheduled basis (nightly)

## 📝 Troubleshooting Steps

### If calculation is slow:

1. **Check Connection String**

   ```bash
   echo "DATABASE_URL: $DATABASE_URL"
   ```

   - If empty, it's using local fallback (should be fast)
   - If set, check if connection is working

2. **Check Error Logs**

   - Open browser DevTools → Console
   - Look for errors like "DB client unavailable"
   - Check terminal where `npm run dev` is running

3. **Measure Each Step**
   Add timing to `src/app/actions.ts` around line 690:

   ```typescript
   console.time('batch-fetch');
   const [riderRateMap, regularRateMap] = await Promise.all([...]);
   console.timeEnd('batch-fetch');

   console.time('loop-calculation');
   for (let i = 0; i < totalSteps; i++) { ... }
   console.timeEnd('loop-calculation');
   ```

4. **Test Direct Connection**
   ```bash
   # In Node.js terminal
   const sql = require('postgres');
   const client = sql(process.env.DATABASE_URL, { ssl: 'require' });
   const result = await client`SELECT COUNT(*) FROM rider`;
   console.log(result);
   ```

## 🎯 Success Metrics

**Current Code Should Achieve:**

- ✅ No per-age database queries (only 2 batch queries)
- ✅ Connection pool never exhausted
- ✅ Instant calculation if DATABASE_URL is not set (local fallback)
- ✅ < 1 second calculation if DB connection is healthy
- ✅ Graceful fallback to local rates if DB is slow

If experiencing > 3 second delays, likely causes:

1. **DATABASE_URL not set** → No actual DB connection (uses local rates instantly)
2. **Database indexes missing** → Add indexes on rider/regular tables
3. **Network latency** → Check Supabase region, network conditions
4. **Connection timeout** → Check firewall, SSL certificate issues
