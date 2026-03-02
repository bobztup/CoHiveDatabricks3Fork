# Wisdom Hex SSR Compatibility Fix

## Issue

The Wisdom hex was crashing during deployment due to Server-Side Rendering (SSR) issues. The component was trying to access browser-only APIs (`navigator.mediaDevices`, `MediaRecorder`) during server-side rendering, which don't exist in a Node.js environment.

---

## Root Cause

The Wisdom hex includes features for:
- **Voice recording** - uses `navigator.mediaDevices.getUserMedia()` and `MediaRecorder` API
- **Photo capture** - uses `navigator.mediaDevices.getUserMedia()` with video stream
- **Video recording** - uses `navigator.mediaDevices.getUserMedia()` and `MediaRecorder` API

These APIs are only available in browser environments, not during SSR on the server.

**Error symptoms:**
- App crashes during build/deploy
- `navigator is not defined` errors
- `MediaRecorder is not defined` errors
- Component fails to render on server

---

## Solution

Added browser environment checks throughout the Wisdom hex implementation to ensure browser-only APIs are only accessed when running in a browser.

### 1. Global Browser Check Variables

Added at component level (lines 242-244):

```typescript
// Browser environment check (for SSR compatibility)
const isBrowser = typeof window !== 'undefined';
const hasMediaDevices = isBrowser && typeof navigator !== 'undefined' 
  && navigator.mediaDevices 
  && navigator.mediaDevices.getUserMedia;
```

**Benefits:**
- Checks once at component level
- Reusable throughout the component
- Prevents crashes during SSR
- Safe fallback when APIs aren't available

---

### 2. Voice Recording Protection

**Location:** Lines 1984-2006

**Changes:**
```typescript
// Voice recording
if (inputMethod === 'Voice') {
  return (
    <div key={idx} className="mb-2">
      <label>...</label>
      
      {/* Show warning if browser APIs not available */}
      {!hasMediaDevices && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
          ⚠️ Voice recording is not available in this environment. 
          Please use a modern browser with microphone support.
        </div>
      )}
      
      {/* Only show recording UI if browser APIs available */}
      {hasMediaDevices && (
        <div className="space-y-3">
          {/* Recording buttons and controls */}
        </div>
      )}
    </div>
  );
}
```

**Protection:**
- Checks `hasMediaDevices` before rendering recording controls
- Shows user-friendly warning if not available
- Prevents accessing `navigator.mediaDevices` on server

---

### 3. Photo Capture Protection

**Location:** Lines 2119-2127

**Changes:**
```typescript
// Photo upload
if (inputMethod === 'Photo') {
  return (
    <div key={idx} className="mb-2">
      <label>...</label>
      
      {/* Show warning if browser APIs not available */}
      {!hasMediaDevices && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
          ⚠️ Photo capture is not available in this environment. 
          Please use a modern browser with camera support.
        </div>
      )}
      
      {/* Only show photo controls if browser APIs available */}
      {!photoMethod && hasMediaDevices && (
        <div className="space-y-2">
          <button onClick={...}>Upload Photo</button>
          <button onClick={async () => {
            if (hasMediaDevices) {  // Extra check before API call
              const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
              // ... rest of camera logic
            }
          }}>Capture with Camera</button>
        </div>
      )}
    </div>
  );
}
```

**Protection:**
- Checks `hasMediaDevices` before rendering controls
- Double-check inside onClick handlers before API calls
- User-friendly warning message
- Prevents camera access on server

---

### 4. Video Recording Protection

**Location:** Lines 2341-2349

**Changes:**
```typescript
// Video upload
if (inputMethod === 'Video') {
  return (
    <div key={idx} className="mb-2">
      <label>...</label>
      
      {/* Show warning if browser APIs not available */}
      {!hasMediaDevices && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
          ⚠️ Video recording is not available in this environment. 
          Please use a modern browser with camera support.
        </div>
      )}
      
      {/* Only show video controls if browser APIs available */}
      {!videoMethod && hasMediaDevices && (
        <div className="space-y-2">
          <button onClick={...}>Upload Video</button>
          <button onClick={async () => {
            if (hasMediaDevices) {  // Extra check before API call
              const videoStream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
              });
              const recorder = new MediaRecorder(videoStream);
              // ... rest of recording logic
            }
          }}>Record Video</button>
        </div>
      )}
    </div>
  );
}
```

**Protection:**
- Checks `hasMediaDevices` before rendering controls
- Double-check inside onClick handlers
- User-friendly warning message
- Prevents MediaRecorder access on server

---

## Benefits

### ✅ SSR Compatibility
- Component renders successfully on server
- No crashes during build/deploy
- No "navigator is not defined" errors
- No "MediaRecorder is not defined" errors

### ✅ Progressive Enhancement
- Works in all environments
- Gracefully degrades when APIs unavailable
- User-friendly error messages
- Still functional for text/file uploads

### ✅ Browser Support Detection
- Detects if browser supports media APIs
- Shows appropriate UI based on capabilities
- Prevents errors in older browsers
- Clear messaging to users

### ✅ Production Ready
- Safe for deployment
- No server-side errors
- Clean user experience
- Proper error handling

---

## Testing Checklist

- [x] Component renders during SSR (server-side)
- [x] Component renders in browser (client-side)
- [x] Voice recording works in modern browsers
- [x] Photo capture works in modern browsers
- [x] Video recording works in modern browsers
- [x] Warning messages appear when APIs unavailable
- [x] Text input still works (no media APIs needed)
- [x] File upload still works (no media APIs needed)
- [x] No console errors during SSR
- [x] No console errors in browser
- [x] Deploys successfully without crashes

---

## Browser Support

### ✅ Full Support (All Features)
- Chrome 60+
- Firefox 55+
- Safari 14.1+
- Edge 79+
- Opera 47+

### ⚠️ Partial Support (Text/File Only)
- Older browsers without MediaDevices API
- Browsers with microphone/camera disabled
- SSR environment (initial render)

### ℹ️ User Experience
- Modern browsers: All features available
- Older browsers: Text and file upload only, with friendly warnings
- SSR: Safe rendering, features activate on client

---

## Code Files Modified

- **`/components/ProcessWireframe.tsx`**
  - Lines 242-244: Added browser environment checks
  - Lines 1984-2006: Protected Voice recording section
  - Lines 2119-2127: Protected Photo capture section  
  - Lines 2341-2349: Protected Video recording section

---

## Environment Variables

No environment variables needed. The fix uses runtime detection:

```typescript
// Automatically detects environment
const isBrowser = typeof window !== 'undefined';
const hasMediaDevices = isBrowser 
  && typeof navigator !== 'undefined' 
  && navigator.mediaDevices 
  && navigator.mediaDevices.getUserMedia;
```

---

## Deployment Notes

### Before Fix
```
❌ BUILD ERROR: navigator is not defined
❌ DEPLOY FAILED
```

### After Fix
```
✅ BUILD SUCCESS
✅ SSR RENDER SUCCESS
✅ DEPLOY SUCCESS
✅ Client features activate on page load
```

---

## Related Documentation

- **Wisdom Hex:** `/docs/WISDOM_HEX_DOCUMENTATION.md`
- **Databricks Integration:** `/docs/DATABRICKS_KNOWLEDGE_BASE_INTEGRATION.md`
- **Guidelines:** `/guidelines/Guidelines.md`

---

## Future Improvements

1. **Loading States:** Add loading indicators during media initialization
2. **Permission Handling:** Improve UX for permission requests
3. **Error Recovery:** Add retry mechanisms for failed API calls
4. **Feature Detection:** More granular detection of specific API capabilities
5. **Polyfills:** Consider polyfills for older browser support

---

**Fixed:** February 11, 2026  
**Issue:** SSR crashes due to browser API access  
**Solution:** Browser environment checks + graceful degradation  
**Status:** ✅ Resolved - Deploy Ready
