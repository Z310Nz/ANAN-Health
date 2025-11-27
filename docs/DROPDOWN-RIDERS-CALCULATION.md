# Dropdown Riders Premium Calculation

## 📝 Change Summary

**Updated:** Dropdown riders (อนุสัญญาที่เป็น Dropdown) are now **included in premium calculations** with their dropdown value used directly as the annual premium.

**Previous Behavior:**

- Dropdown riders were excluded from calculations (0 premium per year)
- Only input-type riders contributed to the total premium

**New Behavior:**

- Dropdown riders are included in calculations
- Their `dropdownValue` is used directly as the premium amount
- **No multiplier is applied** (unlike input-type riders which use divisor-based calculation)
- Premium is the same for every year of coverage

---

## 💡 How It Works

### Dropdown Riders Premium Calculation

For each selected dropdown rider:

```
Annual Premium = dropdownValue (direct value, no multiplier)
```

**Example:**

- Dropdown rider: "Health Happy"
- Selected dropdown value: 5,000 บาท
- Age 30: Premium = 5,000 บาท
- Age 35: Premium = 5,000 บาท
- Age 65: Premium = 5,000 บาท (same every year)

### Comparison with Input-Type Riders

| Rider Type                             | Calculation                       | Example                               |
| -------------------------------------- | --------------------------------- | ------------------------------------- |
| **Input-type** (e.g., HB)              | `(amount ÷ 1000) × interest rate` | `(100,000 ÷ 1000) × 5 = 500 บาท/year` |
| **Dropdown-type** (e.g., Health Happy) | `dropdownValue` directly          | `5,000 บาท/year` (constant)           |

---

## 🔧 Technical Implementation

### Modified Functions in `src/app/actions.ts`

#### 1. `generateBreakdown()` - Line 665

**Before:**

```typescript
const selectedRiders = (formData.riders || []).filter(
  (r) => r.selected && r.type !== "dropdown" // ❌ Filtered OUT dropdown
);
```

**After:**

```typescript
const selectedRiders = (formData.riders || []).filter((r) => r.selected); // ✅ Include all
```

**Effect:** Dropdown riders now included in batch-fetch rate map setup

#### 2. `calculateRidersPremiumDetailed()` - Line 573-597

**Before:**

```typescript
if (r.type === "dropdown") {
  details[r.name] = 0; // ❌ Set to 0, skip calculation
  continue;
}
```

**After:**

```typescript
if (r.type === "dropdown") {
  const dropdownAmount =
    typeof r.dropdownValue === "number"
      ? r.dropdownValue
      : Number(r.dropdownValue) || 0;

  riderPremium = dropdownAmount; // ✅ Use value directly
  details[r.name] = Math.round(riderPremium);
  total += riderPremium;
  continue;
}
```

**Effect:** Dropdown values now calculated and included in yearly breakdown

---

## 📊 Example Calculation

### Scenario:

- Main Policy: AIA 20 Pay Life, 1,000,000 บาท
- Age: 30, Until: 65 (36 years)
- Gender: Male
- Riders:
  - HB (Input-type): 100,000 บาท
  - Health Happy (Dropdown): 5,000 บาท selected

### Yearly Breakdown:

| Year | Age | Main Policy | HB (Input) | Health Happy (Dropdown) | **Total** |
| ---- | --- | ----------- | ---------- | ----------------------- | --------- |
| 1    | 30  | 5,000       | 500        | **5,000**               | 10,500    |
| 2    | 31  | 5,000       | 510        | **5,000**               | 10,510    |
| ...  | ... | ...         | ...        | **5,000**               | ...       |
| 36   | 65  | 5,000       | 550        | **5,000**               | 10,550    |

**Note:** Health Happy dropdown premium stays at 5,000 บาท every year (no variation by age)

---

## 🎯 User-Facing Changes

### Premium Calculator Form

**Dropdown Rider Selection:**

1. Check "Health Happy" checkbox to select
2. Choose dropdown value (e.g., 5,000 บาท)
3. Click "Calculate"
4. ✅ Health Happy premium now appears in yearly breakdown
5. ✅ Included in cumulative total

### Premium Summary Table

**Updated columns to show:**

- Main Policy base premium
- Input-type rider premiums (vary by age)
- **Dropdown rider premiums (constant 5,000 บาท)**

---

## 📋 Affected Dropdown Riders

The following riders now have premiums calculated and included:

- Infinite Care (new standard)
- Health Happy
- Health Happy Kids DD10K
- Health Happy Kids DD30K
- Health Saver
- H&S Extra (new standard)
- H&S (new standard)
- Infinite Care (new standard) DD 100K
- Infinite Care (new standard) DD 300K

---

## ✅ Verification

To verify the changes are working:

1. **Open Premium Calculator**
2. **Select a dropdown rider** (e.g., Health Happy)
3. **Choose a dropdown value** (e.g., 5,000 บาท)
4. **Select input-type rider** (e.g., HB with 100,000 บาท)
5. **Click Calculate**
6. **Check Summary:**
   - Total should include both riders
   - Dropdown rider premium should stay constant across years
   - Input-type rider premium should vary by age

### Expected Output Structure:

```typescript
{
  yearlyBreakdown: [
    {
      year: 30,
      base: 5000,
      riders: 5500, // HB (500) + Health Happy (5000)
      total: 10500,
      cumulativeTotal: 10500,
      riderDetails: {
        HB: 500,
        "Health Happy": 5000, // ✅ Now included!
      },
    },
    // ... more years
  ];
}
```

---

## 🔄 Data Flow

```
User selects dropdown rider + chooses value
    ↓
generateBreakdown() includes dropdown in selectedRiders
    ↓
fetchRiderInterestMap() queries dropdown riders
    ↓
Loop: for each age 30..65
    ↓
calculateRidersPremiumDetailed()
    ├─ Input rider: use (amount ÷ divisor) × interest
    └─ Dropdown rider: ✅ use dropdownValue directly
    ↓
yearlyBreakdown includes both rider types
    ↓
Display: Total = base + input riders + dropdown riders
```

---

## 📝 Debug Logging

Console messages for dropdown riders (check browser DevTools):

```
[rider-detail] computed dropdown-type rider {
  name: "Health Happy",
  segcode: "INFINITE_CARE",
  age: 30,
  dropdownAmount: 5000,
  premium: 5000,
}
```

---

## Summary

✅ **Dropdown riders now calculate premiums yearly**
✅ **Using their dropdown value directly (no multiplier)**
✅ **Constant premium amount across all coverage years**
✅ **Included in total premium and cumulative calculations**
