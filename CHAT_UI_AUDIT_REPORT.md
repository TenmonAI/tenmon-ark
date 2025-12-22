# TENMON-ARK Chat UI "No Reply / Not Reflected" Investigation Report

**Date**: 2024-12-19  
**Investigator**: Senior Frontend+Backend Debugger  
**Method**: Fact-based evidence collection

---

## 1. Findings Summary (Root Causes)

### Critical Issue #1: Chat Router Not Mounted
**Problem**: `api/src/index.ts` does NOT mount `chatRouter`. Only `kanagiRoutes` and `tenmonRoutes` are mounted.

**Evidence**:
- `api/src/index.ts` line 14: `app.use("/api", kanagiRoutes);`
- `api/src/index.ts` line 17: `app.use("/api/tenmon", tenmonRoutes);`
- **Missing**: `app.use("/api", chatRouter);`

**Impact**: All requests to `/api/chat` return 404, causing frontend to be stuck in "sending" state.

### Issue #2: IME Enter Behavior
**Problem**: Current `onKeyDown` handler does not check IME composition state, causing Enter to send during Japanese IME composition.

**Evidence**:
- `web/src/App.tsx` line 195-199: No `isComposing` check
- `web/src/components/ChatInput.tsx` line 34-38: No IME composition handling

**Impact**: Users cannot properly type Japanese; Enter sends message during composition.

---

## 2. Evidence Table

### Frontend Endpoints

| File | Function | Endpoint | Request Body | Response Parsing |
|------|----------|----------|--------------|------------------|
| `web/src/App.tsx` | `sendMessage()` | `/api/chat` | `{ input: string, session_id: string }` | `data.response` |
| `web/src/api/chat.ts` | `postChat()` | `/api/chat` | `{ input: string, session_id: string }` | `data.response` |
| `web/src/hooks/useChat.ts` | `sendMessage()` | via `postChat()` | `{ message: string, sessionId: string, persona: string }` | `res.response` |
| `web/src/pages/KanagiPage.tsx` | `run()` | `/api/kanagi/reason` | `{ input: string, session_id: string }` | `json.trace` |

### Backend Routes (Actual)

| Mount Path | Router File | POST Path | Full Endpoint | Request Body | Response Body |
|------------|-------------|-----------|---------------|--------------|---------------|
| `/api` | `kanagi.ts` | `/kanagi/reason` | `/api/kanagi/reason` | `{ input: string, session_id?: string }` | `{ trace: {...}, ... }` |
| `/api/tenmon` | `tenmon.ts` | `/tenmon/respond` | `/api/tenmon/respond` | `{ input: string, source?: string, sessionId?: string }` | `{ output: string, meta?: {...} }` |
| **NOT MOUNTED** | `chat.ts` | `/chat` | **404** | `{ input?: string, message?: string }` | `{ response: string, timestamp: string }` |

### State Management (Frontend)

| File | State Variable | Set True | Set False | Error Handling |
|------|----------------|----------|-----------|----------------|
| `web/src/App.tsx` | `sending` | Line 108: `setSending(true)` | Line 132: `.finally(() => setSending(false))` | Line 128-131: catch sets error message |
| `web/src/hooks/useChat.ts` | `loading` | Line 36: `setLoading(true)` | Line 48: `finally(() => setLoading(false))` | Line 44-46: catch logs error only |

**Issue**: If backend returns 404, `finally` still executes, but response parsing fails silently.

---

## 3. Patch List

### Patch 1: Mount Chat Router in Backend

**File**: `api/src/index.ts`

**Change**:
```typescript
import chatRouter from "./routes/chat.js";

// ... existing code ...

app.use("/api", kanagiRoutes);
app.use("/api", chatRouter);  // ADD THIS LINE
app.use("/api/tenmon", tenmonRoutes);
```

### Patch 2: Fix IME Enter Behavior in App.tsx

**File**: `web/src/App.tsx`

**Change**:
```typescript
const [isComposing, setIsComposing] = useState(false);

// ... in JSX ...

<textarea
  // ... existing props ...
  onCompositionStart={() => setIsComposing(true)}
  onCompositionEnd={() => setIsComposing(false)}
  onKeyDown={(e) => {
    if (e.key === "Enter" && !e.shiftKey && !isComposing && !(e.nativeEvent as any).isComposing) {
      e.preventDefault();
      sendMessage();
    }
  }}
/>
```

### Patch 3: Fix IME Enter Behavior in ChatInput.tsx

**File**: `web/src/components/ChatInput.tsx`

**Change**:
```typescript
const [isComposing, setIsComposing] = useState(false);

// ... in JSX ...

<input
  // ... existing props ...
  onCompositionStart={() => setIsComposing(true)}
  onCompositionEnd={() => setIsComposing(false)}
  onKeyDown={(e) => {
    if (e.key === "Enter" && !e.shiftKey && !isComposing && !(e.nativeEvent as any).isComposing) {
      e.preventDefault();
      submit();
    }
  }}
/>
```

---

## 4. How to Test Locally

### Backend Test
```bash
cd api
npm run build
npm start

# In another terminal:
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"input":"テスト","session_id":"test-1"}'

# Expected: {"response":"...","timestamp":"..."}
```

### Frontend Test
```bash
cd web
npm run dev

# Open http://localhost:5173
# 1. Type Japanese with IME: "こんにちは" + Enter (should NOT send during composition)
# 2. After composition ends, press Enter again (should send)
# 3. Type English: "hello" + Enter (should send immediately)
# 4. Type "test" + Shift+Enter (should create newline, not send)
```

---

## 5. How to Deploy to VPS

```bash
# On local machine:
git add api/src/index.ts web/src/App.tsx web/src/components/ChatInput.tsx
git commit -m "fix: mount chat router and fix IME enter behavior"
git push origin main

# On VPS (SSH):
cd /opt/tenmon-ark/api
git pull origin main
npm run build
sudo systemctl restart tenmon-ark-api

# Check logs:
sudo journalctl -u tenmon-ark-api -n 50 --no-pager

# Verify endpoint:
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"input":"test"}'
```

---

## 6. Verification Checklist

- [ ] Backend: `/api/chat` returns 200 (not 404)
- [ ] Backend: Response contains `{ response: string, timestamp: string }`
- [ ] Frontend: Message appears in chat after sending
- [ ] Frontend: "sending" state resets after response
- [ ] IME: Enter during composition does NOT send
- [ ] IME: Enter after composition DOES send
- [ ] Shift+Enter creates newline (does not send)
- [ ] Button stays enabled when input has content

---

**Status**: ✅ IMPLEMENTED

---

## 7. Implementation Summary

### Files Changed

1. **`api/src/index.ts`**
   - Added: `import chatRouter from "./routes/chat.js";`
   - Added: `app.use("/api", chatRouter);`
   - Result: `/api/chat` endpoint now accessible

2. **`web/src/App.tsx`**
   - Added: `const [isComposing, setIsComposing] = useState<boolean>(false);`
   - Added: `onCompositionStart` and `onCompositionEnd` handlers
   - Modified: `onKeyDown` to check `isComposing` state
   - Result: IME-safe Enter behavior implemented

3. **`web/src/components/ChatInput.tsx`**
   - Added: `const [isComposing, setIsComposing] = useState(false);`
   - Added: `onCompositionStart` and `onCompositionEnd` handlers
   - Modified: `onKeyDown` to check `isComposing` state
   - Result: IME-safe Enter behavior implemented

### Build Status
- ✅ Backend TypeScript build: SUCCESS
- ✅ Frontend Vite build: SUCCESS
- ✅ Linter errors: NONE

### Testing Instructions

1. **Backend Test**:
   ```bash
   curl -X POST http://localhost:3000/api/chat \
     -H "Content-Type: application/json" \
     -d '{"input":"テスト","session_id":"test-1"}'
   ```
   Expected: `{"response":"...","timestamp":"..."}`

2. **Frontend IME Test**:
   - Type Japanese: "こんにちは" + Enter (should NOT send during composition)
   - After composition ends, press Enter again (should send)
   - Type English: "hello" + Enter (should send immediately)
   - Type "test" + Shift+Enter (should create newline, not send)

### Deployment Status
Ready for VPS deployment. Follow section 5 instructions.

