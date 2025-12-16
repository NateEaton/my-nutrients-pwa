# Cloudflare Workers AI Vision Model OCR Implementation Plan

## Plan Updates (Latest Revision)

**Key Changes from Original Plan**:
1. ✅ **Structured LLM Output**: LLM returns pre-parsed fields directly (no client-side regex parsing)
2. ✅ **Primary Model Changed**: Using Llama 3.2 11B Vision (23% cheaper, proven track record)
3. ✅ **Phase 0 Added**: Environment assessment + spike test for Go/No-Go decision
4. ✅ **Simplified VisionService**: Direct mapping eliminates need for servingSizeParser utility
5. ✅ **UX Enhancements**: Loading indicators and timeout handling for 2-5 second waits
6. ✅ **Confidence Calibration**: Added strategy to validate LLM confidence scores vs actual accuracy
7. ✅ **Hybrid Workflow Documented**: Worker code edits on NAS, deployments from MBP (OAuth requirement)

**Design Philosophy**:
- Leverage LLM's semantic understanding instead of brittle regex patterns
- Start with lower-cost proven model, upgrade if needed
- Validate approach early before committing to full implementation
- Simplify client code by having Worker do more work

---

## Executive Summary

**Add** Cloudflare Workers AI vision-capable language models as an **optional alternative** to OCR.space for nutrition label parsing. Preserve existing OCR functionality and let users choose via Settings.

**Key Benefits**:
- ✅ **Additive, not destructive** - Preserves existing heavily-tested OCR pipeline
- ✅ **User choice** - Settings toggle for AI vs traditional OCR
- ✅ **No vendor lock-in** - Multiple extraction methods available
- ✅ Free tier supports 285+ scans/day (vs typical 12/day usage)
- ✅ Integrated with existing Cloudflare Worker infrastructure
- ✅ Potentially better accuracy through vision-language understanding
- ✅ Some users prefer AI, others prefer traditional OCR - support both

**Implementation Strategy**:
- ✅ New `VisionService` module alongside existing `OCRService`
- ✅ Settings page toggle: "Use AI Vision" vs "Use Traditional OCR"
- ✅ Zero changes to existing OCR code
- ✅ LLM returns pre-structured data (no client-side parsing needed)
- ✅ A/B testing capability built-in

**Key Challenge**:
- ⚠️ No dedicated Donut model available - using vision LLMs instead
- ⚠️ Need to ensure both services maintain consistent output interface
- ⚠️ LLM response times may be 2-5 seconds (requires loading UX)

---

## Architecture Overview

### Current Architecture (Preserved)
```
User → OCR.space API → Raw Text + Spatial Overlay → 
Multi-Strategy Parser (5 strategies) → Structured Data → UI
```

### New Alternative Architecture (Added)
```
User → Cloudflare Worker (Vision LLM) → Structured JSON → 
Local Micro-Parser → Structured Data → UI
```

### Unified Architecture (Proposed)
```
User → SmartScanModal
         ↓
    Settings Check
    ↙            ↘
OCRService      VisionService (NEW)
    ↓                ↓
OCR.space API    Cloudflare Worker
    ↓                ↓
Complex Parsing  Direct Mapping (LLM pre-structures data)
    ↓                ↓
        NutritionParseResult (UNIFIED INTERFACE)
                ↓
            Add Item Modal
```

### Key Architectural Principles

1. **Service Abstraction**: Both services implement same output interface
2. **Zero Breaking Changes**: OCRService remains untouched
3. **Simplified Integration**: VisionService uses direct mapping (no parsing utilities)
4. **User Control**: Settings determine which service is active
5. **Fallback Ready**: If VisionService fails, can fall back to OCRService

---

## Service Architecture & Settings Integration

### New VisionService Module

Create parallel service that matches OCRService interface:

```typescript
// src/lib/services/VisionService.ts
export class VisionService {
  private workerUrl: string;
  
  constructor(workerUrl: string) {
    this.workerUrl = workerUrl;
  }
  
  // Same signature as OCRService.processImage()
  async processImage(file: File): Promise<NutritionParseResult> {
    // Implementation details in Phase 2
  }
}
```

### Settings Page Integration

Add new setting in `src/lib/stores/settingsStore.ts`:

```typescript
export interface CalciumSettings {
  // ... existing settings
  useAIVision: boolean; // NEW: Default false to preserve existing behavior
}

const defaultSettings: CalciumSettings = {
  // ... existing defaults
  useAIVision: false
};
```

Add toggle in Settings UI (`src/routes/settings/+page.svelte`):

```svelte
<div class="setting-row">
  <label>
    <input 
      type="checkbox" 
      bind:checked={$settings.useAIVision}
      on:change={saveSettings}
    />
    Use AI Vision for label scanning
  </label>
  <p class="setting-description">
    Experimental: Use Cloudflare AI instead of traditional OCR. 
    AI Vision may be more accurate but uses different technology.
  </p>
</div>
```

### SmartScanModal Integration

Update scan handler to choose service based on settings:

```typescript
// src/lib/components/SmartScanModal.svelte

import { OCRService } from '$lib/services/OCRService';
import { VisionService } from '$lib/services/VisionService';
import { settings } from '$lib/stores/settingsStore';

// Initialize both services
const ocrService = new OCRService(OCR_API_KEY);
const visionService = new VisionService(WORKER_URL);

async function handleScan() {
  try {
    // Choose service based on settings
    const service = $settings.useAIVision ? visionService : ocrService;
    
    const result = await service.processImage(imageFile);
    
    // Rest of logic unchanged
    servingQuantity = result.servingQuantity;
    servingMeasure = result.servingMeasure;
    calcium = result.calcium;
    // ...
  } catch (error) {
    // If vision fails and user wants fallback, could switch to OCR
    console.error('Scan failed:', error);
  }
}
```

### Interface Compatibility

Both services return the same interface:

```typescript
// src/lib/types/nutrition.ts
export interface NutritionParseResult {
  rawText: string;
  servingQuantity: number | null;
  servingMeasure: string | null;
  standardMeasureValue: number | null;
  standardMeasureUnit: string | null;
  calcium: number | null;
  confidence: 'low' | 'medium' | 'high';
  
  // Optional metadata
  source?: 'ocr' | 'vision'; // NEW: Track which service was used
  imageBlob?: Blob; // Already exists
}
```

---

## Model Selection

### Recommended: Llama 3.2 11B Vision (PRIMARY CHOICE)
- **Model ID**: `@cf/meta/llama-3.2-11b-vision-instruct`
- **Cost**: 4,410 neurons/M input, 61,493 neurons/M output
- **Strengths**: Lower cost, proven track record, excellent performance
- **Estimated per-scan**: ~30 neurons (~330 scans/day on free tier)
- **Why Primary**: More stable, well-tested, 23% cheaper than Llama 4 Scout

### Alternative: Llama 4 Scout 17B (UPGRADE OPTION)
- **Model ID**: `@cf/meta/llama-4-scout-17b-16e-instruct`
- **Cost**: 24,545 neurons/M input, 77,273 neurons/M output
- **Strengths**: Industry-leading multimodal understanding
- **Estimated per-scan**: ~40 neurons (~250 scans/day on free tier)
- **Use case**: If Phase 3 testing shows Llama 3.2 accuracy insufficient

### Fallback: Gemma 3 12B
- **Model ID**: `@cf/google/gemma-3-12b-it`
- **Cost**: 31,371 neurons/M input, 50,560 neurons/M output
- **Use case**: If Meta models underperform

---

## Prompt Engineering Strategy

### Structured Prompt Design

The vision LLM will receive a carefully crafted prompt that:

1. **Specifies the task**: Extract nutrition facts from label image
2. **Defines required fields**: Serving size, calcium (prioritized fields)
3. **Specifies output format**: JSON with exact schema
4. **Provides examples**: Few-shot learning for edge cases
5. **Handles variations**: Different label formats, units, etc.

### Example Prompt Template

```
You are a nutrition label parser. Analyze the image and extract nutrition facts.

REQUIRED FIELDS (extract if present):
- serving_quantity: The numeric portion of serving size (e.g., 1, 0.5, 2)
- serving_measure: The unit of serving (e.g., "cup", "tbsp", "piece", "bottle")
- serving_standard_value: Numeric value of standardized measure in parentheses (e.g., 240 from "240ml")
- serving_standard_unit: Unit of standardized measure (e.g., "ml", "g", "oz")
- calcium_mg: Calcium amount in milligrams only (extract from mg value or calculate from % DV)
- calcium_percent_dv: Calcium % Daily Value if shown

OPTIONAL FIELDS (extract if clearly visible):
- servings_per_container: Number of servings
- calories: Calories per serving

OUTPUT FORMAT:
Return ONLY valid JSON matching this schema:
{
  "serving_quantity": number or null,
  "serving_measure": "string" or null,
  "serving_standard_value": number or null,
  "serving_standard_unit": "string" or null,
  "calcium_mg": number or null,
  "calcium_percent_dv": number or null,
  "servings_per_container": number or null,
  "calories": number or null,
  "confidence": "high" | "medium" | "low"
}

EXAMPLES:
Label shows "1 cup (240ml)" →
{
  "serving_quantity": 1,
  "serving_measure": "cup",
  "serving_standard_value": 240,
  "serving_standard_unit": "ml"
}

Label shows "2 tbsp (30g)" →
{
  "serving_quantity": 2,
  "serving_measure": "tbsp",
  "serving_standard_value": 30,
  "serving_standard_unit": "g"
}

Label shows "1/2 cup" (no standard measure) →
{
  "serving_quantity": 0.5,
  "serving_measure": "cup",
  "serving_standard_value": null,
  "serving_standard_unit": null
}

RULES:
1. Parse serving size into separate quantity, measure, standard value, and standard unit
2. Convert fractions to decimals (1/2 → 0.5, 1/4 → 0.25)
3. For calcium, prioritize mg value over % DV calculation
4. If calcium shows only % DV, you may calculate mg (1300mg = 100% DV)
5. Return null for any field not clearly visible
6. Set confidence based on label clarity and completeness
7. Lowercase measure units for consistency

Return the JSON now:
```

### Prompt Optimization Considerations

**Value of Targeted Prompting**:
- ✅ **Highly valuable** - Specifying required fields focuses model attention
- ✅ Reduces hallucination by constraining output
- ✅ JSON schema enforcement improves parsing reliability
- ✅ Few-shot examples handle edge cases (% DV only, missing units, etc.)

**Testing Required**:
- Compare accuracy with/without field specification
- Test different prompt phrasings
- Validate JSON compliance rate
- Measure confidence score accuracy

---

## Structured LLM Output (No Client-Side Parsing)

### Design Decision: LLM Does the Parsing

**Previous Approach** (REJECTED): LLM returns `"serving_size": "1 cup (240ml)"` → client-side regex parsing

**New Approach** (ADOPTED): LLM returns pre-parsed structured fields directly

### Benefits of Structured Output

✅ **Leverages LLM Capabilities**: Model understands semantic meaning, not just patterns
✅ **Handles Edge Cases**: Fractions, ranges, variations ("1-2 tbsp", "about 1 cup")
✅ **Eliminates Regex Fragility**: No brittle pattern matching on client
✅ **Reduces Client Complexity**: Direct mapping from API response to app state
✅ **Improved Accuracy**: Model can interpret ambiguous serving sizes better

### Integration Point

Worker response maps **directly** to app fields:

```typescript
// In VisionService.ts - Direct mapping, no parsing needed
const response = await fetch(`${this.workerUrl}/ocr`, {
  method: 'POST',
  body: formData
});

const { data } = await response.json();

// Direct 1:1 mapping - no utility functions needed
return {
  servingQuantity: data.serving_quantity,
  servingMeasure: data.serving_measure,
  standardMeasureValue: data.serving_standard_value,
  standardMeasureUnit: data.serving_standard_unit,
  calcium: data.calcium_mg,
  confidence: data.confidence || 'medium',
  source: 'vision'
};
```

### Example Worker Response

```json
{
  "success": true,
  "data": {
    "serving_quantity": 1,
    "serving_measure": "cup",
    "serving_standard_value": 240,
    "serving_standard_unit": "ml",
    "calcium_mg": 380,
    "calcium_percent_dv": 30,
    "servings_per_container": 6,
    "calories": 120,
    "confidence": "high"
  },
  "model": "@cf/meta/llama-3.2-11b-vision-instruct",
  "neurons_used": 30
}
```

---

## Implementation Plan

### Phase 0: Environment Assessment & Spike Test (2-4 hours)

**Goal**: Validate approach with quick proof-of-concept and assess development environment

**Environment Assessment Results** ✅ **COMPLETED**:
- ✅ Worker has `package.json` with local wrangler dependency (v3.114.13)
- ✅ Uses `npm run deploy` pattern (same as `ocr/` folder uses `npm test`)
- ❌ **OAuth Issue**: Wrangler auth requires browser redirect to localhost
- **Conclusion**: Hybrid workflow required (edit on NAS, deploy from MBP)

**Documented Workflow**:
1. **Code Editing**: Claude Code edits files on NAS (full access)
2. **Deployment**: User runs `npm run deploy` on MBP (OAuth authentication works)
3. **Testing**: Can run from NAS after deployment

**Tasks - Spike Test**:
- [ ] Create minimal `/ocr-test` endpoint in existing Worker
- [ ] Test Llama 3.2 11B Vision with 5-10 existing test images
- [ ] Validate structured JSON output format
- [ ] Measure accuracy on serving size and calcium extraction
- [ ] Test response times (target < 3 seconds)
- [ ] Verify free tier neuron usage tracking

**Success Criteria**:
- [ ] Can deploy Worker changes from NAS (or documented MBP requirement)
- [ ] Model returns valid structured JSON ≥80% of time
- [ ] Calcium extraction accuracy ≥60% on test set
- [ ] Average response time ≤5 seconds
- [ ] Neuron usage ≤40 per scan

**Go/No-Go Decision**: If spike test shows <60% accuracy or >10s response times, reconsider approach

### Phase 1: Worker Endpoint Setup (2-4 hours)

**Goal**: Create `/ocr` endpoint in existing Cloudflare Worker

**Tasks**:
- [ ] Add vision AI binding to `wrangler.toml`
- [ ] Create new OCR handler function in `worker/src/ocr.ts`
- [ ] Accept multipart/form-data image upload
- [ ] Call Llama 4 Scout model with structured prompt
- [ ] Return JSON response
- [ ] Add error handling and rate limit logging
- [ ] Deploy and test with curl

**Files to Modify**:
- `worker/src/index.ts` - Add OCR route
- `worker/wrangler.toml` - Add AI binding
- `worker/src/ocr.ts` - New file

**Code Example**:
```typescript
// worker/src/ocr.ts
export async function handleOCR(request: Request, env: Env) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;
    
    if (!image) {
      return Response.json({ error: 'No image provided' }, { status: 400 });
    }
    
    // Convert image to array buffer
    const imageBuffer = await image.arrayBuffer();
    const imageArray = Array.from(new Uint8Array(imageBuffer));
    
    // Call vision model with structured output prompt
    const response = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: NUTRITION_LABEL_PROMPT // Structured prompt from above section
            },
            {
              type: 'image',
              image: imageArray
            }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.1 // Low temperature for factual extraction
    });
    
    // Parse JSON from model response
    const content = response.response;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      return Response.json({ error: 'Model did not return valid JSON' }, { status: 500 });
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return Response.json({
      success: true,
      data: parsed,
      model: '@cf/meta/llama-3.2-11b-vision-instruct',
      neurons_used: response.neurons_used || null
    });
    
  } catch (error) {
    console.error('OCR error:', error);
    return Response.json({ 
      error: 'OCR processing failed',
      details: error.message 
    }, { status: 500 });
  }
}
```

### Phase 2: VisionService Implementation (3-5 hours)

**Goal**: Create new VisionService module alongside existing OCRService

**Tasks**:
- [ ] Create `src/lib/services/VisionService.ts` (new file with direct mapping)
- [ ] Implement `processImage()` matching OCRService signature
- [ ] Add `useAIVision` setting to settingsStore
- [ ] Add settings UI toggle in Settings page
- [ ] Update SmartScanModal to choose service based on setting
- [ ] Add processing indicator UI for 2-3 second wait times
- [ ] Add timeout handling (10 second timeout with retry option)
- [ ] **NO CHANGES to existing OCRService.ts**
- [ ] Add `source` field to track which service was used

**Files to Create**:
- `src/lib/services/VisionService.ts` - New vision service (simplified, no parsing utilities)

**Files to Modify**:
- `src/lib/stores/settingsStore.ts` - Add useAIVision setting
- `src/routes/settings/+page.svelte` - Add toggle UI
- `src/lib/components/SmartScanModal.svelte` - Service selection logic + loading UX

**Files NOT Modified**:
- `src/lib/services/OCRService.ts` - **Completely untouched**

**VisionService Implementation**:
```typescript
// src/lib/services/VisionService.ts
import type { NutritionParseResult } from '$lib/types/nutrition';
import { ImageResizer } from '$lib/utils/imageResize';

export class VisionService {
  private workerUrl: string;
  private timeout: number = 10000; // 10 second timeout

  constructor(workerUrl: string) {
    this.workerUrl = workerUrl;
  }

  async processImage(file: File): Promise<NutritionParseResult> {
    console.log('Vision: Starting AI vision processing...');

    try {
      // Reuse existing preprocessing
      let processedFile = await ImageResizer.preprocessForOCR(file);

      // Call Worker endpoint with timeout
      const formData = new FormData();
      formData.append('image', processedFile);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.workerUrl}/ocr`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Vision API failed: ${response.status}`);
      }

      const { data } = await response.json();

      // Direct mapping - no parsing utilities needed!
      // LLM returns pre-structured data
      return {
        rawText: `${data.serving_quantity || ''} ${data.serving_measure || ''}`.trim(),
        servingQuantity: data.serving_quantity,
        servingMeasure: data.serving_measure,
        standardMeasureValue: data.serving_standard_value,
        standardMeasureUnit: data.serving_standard_unit,
        calcium: data.calcium_mg,
        confidence: data.confidence || 'medium',
        source: 'vision'
      };

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Vision processing timed out after 10 seconds');
      }
      console.error('Vision processing failed:', error);
      throw error;
    }
  }
}
```

**Settings Integration**:
```typescript
// src/lib/stores/settingsStore.ts
export interface CalciumSettings {
  dailyGoal: number;
  theme: 'light' | 'dark' | 'system';
  // ... other existing settings
  useAIVision: boolean; // NEW
}

const defaultSettings: CalciumSettings = {
  dailyGoal: 1300,
  theme: 'system',
  // ... other defaults
  useAIVision: false // Default to existing OCR behavior
};
```

**SmartScanModal Service Selection with UX**:
```typescript
// src/lib/components/SmartScanModal.svelte
import { settings } from '$lib/stores/settingsStore';
import { OCRService } from '$lib/services/OCRService';
import { VisionService } from '$lib/services/VisionService';

const ocrService = new OCRService(import.meta.env.VITE_OCR_API_KEY);
const visionService = new VisionService(import.meta.env.VITE_WORKER_URL);

let isProcessing = false;
let processingMessage = '';

async function processScan() {
  try {
    isProcessing = true;

    // Choose service based on user preference
    const activeService = $settings.useAIVision ? visionService : ocrService;

    // Show appropriate loading message
    processingMessage = $settings.useAIVision
      ? 'AI is analyzing label...'
      : 'Processing image...';

    const result = await activeService.processImage(capturedImage);

    // Rest of logic unchanged - both services return same interface
    servingQuantity = result.servingQuantity;
    servingMeasure = result.servingMeasure;
    standardMeasureValue = result.standardMeasureValue;
    standardMeasureUnit = result.standardMeasureUnit;
    calcium = result.calcium;

    console.log(`Scan completed using: ${result.source}`);
  } catch (error) {
    // Handle timeout specifically
    if (error.message.includes('timed out')) {
      // Show retry option in UI
      showRetryOption = true;
    }
    handleError(error);
  } finally {
    isProcessing = false;
    processingMessage = '';
  }
}
```

**UI Loading Indicator** (add to SmartScanModal template):
```svelte
{#if isProcessing}
  <div class="processing-overlay">
    <div class="spinner"></div>
    <p>{processingMessage}</p>
    <p class="processing-time">This may take 2-5 seconds...</p>
  </div>
{/if}
```

### Phase 3: Testing & Validation (8-12 hours)

**Goal**: Validate VisionService accuracy and compare with OCRService

**Tasks**:
- [ ] Create test harness supporting both services
- [ ] Run both services on existing `ocr/ocr_dataset.json` images
- [ ] Compare VisionService vs OCRService results side-by-side
- [ ] Measure accuracy for serving size and calcium fields (both services)
- [ ] Identify patterns where each service excels
- [ ] Test edge cases (rotated labels, poor lighting, etc.)
- [ ] Validate free tier usage stays under limits
- [ ] Document accuracy comparison results
- [ ] Test settings toggle functionality

**Test Script Approach**:
```typescript
// ocr/test_vision_comparison.ts
import { OCRService } from '../src/lib/services/OCRService';
import { VisionService } from '../src/lib/services/VisionService';
import fs from 'fs';

const dataset = JSON.parse(fs.readFileSync('ocr_dataset.json', 'utf-8'));
const ocrService = new OCRService(process.env.VITE_OCR_API_KEY);
const visionService = new VisionService(process.env.VITE_WORKER_URL);

const results = {
  ocr: { correct: 0, total: 0, failures: [] },
  vision: { correct: 0, total: 0, failures: [] }
};

for (const upc in dataset.data) {
  const item = dataset.data[upc];
  const imagePath = `nutrition_labels/${upc}_nutrition.jpg`;
  const imageFile = await loadImageFile(imagePath);
  
  // Test both services
  const ocrResult = await ocrService.processImage(imageFile);
  const visionResult = await visionService.processImage(imageFile);
  
  // Compare with ground truth
  const ocrAccuracy = compareResults(ocrResult, item.groundTruth);
  const visionAccuracy = compareResults(visionResult, item.groundTruth);
  
  console.log(`UPC ${upc}:`);
  console.log(`  OCR:    ${ocrAccuracy.correct}/${ocrAccuracy.total} fields`);
  console.log(`  Vision: ${visionAccuracy.correct}/${visionAccuracy.total} fields`);
  
  results.ocr.correct += ocrAccuracy.correct;
  results.ocr.total += ocrAccuracy.total;
  results.vision.correct += visionAccuracy.correct;
  results.vision.total += visionAccuracy.total;
  
  if (ocrAccuracy.correct < ocrAccuracy.total) {
    results.ocr.failures.push({ upc, result: ocrResult });
  }
  if (visionAccuracy.correct < visionAccuracy.total) {
    results.vision.failures.push({ upc, result: visionResult });
  }
}

// Summary report
console.log('\n=== COMPARISON SUMMARY ===');
console.log(`OCR Service:    ${results.ocr.correct}/${results.ocr.total} (${pct(results.ocr)}%)`);
console.log(`Vision Service: ${results.vision.correct}/${results.vision.total} (${pct(results.vision)}%)`);
console.log(`Winner: ${results.vision.correct > results.ocr.correct ? 'Vision' : 'OCR'}`);

// Save detailed report
fs.writeFileSync('comparison_report.json', JSON.stringify(results, null, 2));
```

**Success Criteria**:
- [ ] VisionService accuracy ≥ 70% (acceptable)
- [ ] VisionService accuracy ≥ OCRService accuracy (ideal)
- [ ] Settings toggle works reliably
- [ ] Both services coexist without conflicts
- [ ] Error handling works for both services

### Phase 4: Prompt Optimization & Confidence Calibration (4-8 hours)

**Goal**: Maximize accuracy through prompt engineering and calibrate confidence scores

**Tasks**:
- [ ] Test different prompt phrasings
- [ ] Add few-shot examples for edge cases
- [ ] Experiment with temperature settings (0.1 vs 0.0)
- [ ] Test if JSON mode improves parsing reliability
- [ ] Add CoT (chain of thought) reasoning for ambiguous cases
- [ ] **Calibrate confidence scores against actual accuracy**
- [ ] Document final prompt template
- [ ] Consider Llama 4 Scout upgrade if accuracy insufficient

**Optimization Areas**:
1. **Field Prioritization**: Test if emphasizing calcium improves extraction
2. **Format Variations**: Handle "Calcium 180mg 15%" vs "Calcium 15% (180mg)"
3. **Unit Normalization**: Ensure consistent "mg" not "MG" or "milligrams"
4. **Confidence Calibration Strategy**:
   - Compare model-reported confidence vs actual accuracy on test set
   - LLM confidence scores often don't correlate with real accuracy
   - May need to override based on heuristics:
     - If all required fields extracted → "high"
     - If calcium present but serving size incomplete → "medium"
     - If calcium missing or clearly wrong → "low"
   - Document calibration findings for future improvements

### Phase 5: Deployment & Monitoring (2-4 hours)

**Goal**: Production rollout with monitoring

**Tasks**:
- [ ] Deploy Worker with OCR endpoint
- [ ] Update client with feature flag enabled
- [ ] Add usage analytics (neurons consumed per scan)
- [ ] Monitor error rates
- [ ] Set up alerts for free tier approaching limit
- [ ] Document usage for users (scans/day limit)
- [ ] Create fallback mechanism to OCR.space if needed

**Monitoring Dashboard**:
- Daily neuron usage
- Scans per day
- Error rate
- Average confidence score
- Most common failure modes

---

## Free Tier Usage Analysis

### Daily Capacity Calculation

**Free Tier**: 10,000 neurons/day

**Per-Scan Cost (Llama 4 Scout)**:
- Input: ~800 tokens (image + prompt) × 24.545 neurons/M tokens = 19.6 neurons
- Output: ~250 tokens (JSON) × 77.273 neurons/M tokens = 19.3 neurons
- **Total: ~39 neurons per scan**

**Daily Limits**:
- Maximum scans: 10,000 / 39 = **256 scans/day**
- Typical usage (12 scans/day): 468 neurons (**4.7% of free tier**)
- Heavy usage (50 scans/day): 1,950 neurons (**19.5% of free tier**)

### Cost After Free Tier

If exceeding 10,000 neurons/day:
- Cost: $0.011 per 1,000 neurons
- Per scan: $0.00043 (0.043 cents)
- 100 scans: $0.043 (4.3 cents)

**Comparison to OCR.space**:
- OCR.space free tier: 25,000 requests/month ≈ 833/day
- OCR.space paid: $0.001 per request (10 cents per 100 scans)
- **Cloudflare is 57% cheaper after free tier**

---

## Risk Assessment & Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Lower accuracy than OCR.space | Medium | High | Extensive testing phase; keep fallback |
| Serving size parsing fails | Medium | Medium | Comprehensive regex patterns; validation |
| Free tier limit exceeded | Low | Medium | Usage monitoring; alert at 80% |
| Model availability issues | Low | High | Multi-model fallback strategy |
| JSON parsing failures | Medium | Medium | Robust error handling; retry logic |

### Accuracy Concerns

**Current OCR.space Performance**:
- Based on test images, ~70-80% field extraction accuracy
- Spatial parsing helps with structured labels
- Struggles with curved labels, poor lighting

**Expected Vision LLM Performance**:
- Potentially better: Understands semantic context
- May handle variations better (rotated, curved labels)
- Confidence scores may be more accurate
- Unknown: Needs empirical testing

**Fallback Strategy**:
If accuracy drops below acceptable threshold:
1. Keep OCR.space as default
2. Use Cloudflare Vision as secondary validator
3. Prompt user to choose which result to use
4. Collect feedback for model improvement

---

## Success Criteria

### Minimum Viable Product (MVP)

- [ ] Worker endpoint processes images successfully
- [ ] VisionService module created and functional
- [ ] Settings toggle switches between services correctly
- [ ] Client receives structured JSON response from Worker
- [ ] Serving size parsing extracts all components
- [ ] Calcium extraction accuracy ≥ 70%
- [ ] Free tier usage stays under 50% for typical use
- [ ] Error handling provides useful feedback
- [ ] **OCRService remains completely unchanged and functional**
- [ ] Both services can coexist without conflicts

### Optimal Performance

- [ ] Calcium extraction accuracy ≥ 85% (VisionService)
- [ ] VisionService accuracy ≥ OCRService accuracy (at least comparable)
- [ ] Serving size parsing accuracy ≥ 90% (both services)
- [ ] Confidence scores correlate with accuracy
- [ ] Average response time < 3 seconds
- [ ] Free tier sufficient for 99% of users
- [ ] User satisfaction equal to or better than OCR
- [ ] A/B testing shows clear use cases for each service
- [ ] Documentation explains when to use each service

---

## Timeline Estimate

**Total: 22-38 hours**

- Phase 0: Environment Assessment & Spike Test - 2-4 hours ⚠️ **START HERE**
- Phase 1: Worker Setup - 2-4 hours
- Phase 2: Client Integration - 3-5 hours
- Phase 3: Testing - 8-12 hours
- Phase 4: Optimization - 4-8 hours
- Phase 5: Deployment - 2-4 hours

**Recommended Schedule**:
- **Day 1-2**: Phase 0 (Validation & Go/No-Go) ⚠️ **CRITICAL**
- Week 1: Phases 1-2 (Foundation) - Only proceed if Phase 0 successful
- Week 2: Phase 3 (Validation)
- Week 3: Phases 4-5 (Optimization & Launch)

---

## Alternative Approaches Considered

### 1. Hybrid: Vision LLM + OCR.space
- Use vision LLM for calcium only
- Use OCR.space for serving size
- **Rejected**: Adds complexity, still dependent on OCR.space

### 2. Local Model (TensorFlow.js)
- Run Donut or similar locally in browser
- **Rejected**: Large bundle size, no Donut available for web

### 3. Custom Fine-tuned Model
- Train custom model on nutrition labels
- **Rejected**: Requires training infrastructure, data labeling

### 4. Google Cloud Vision API
- Use Google's OCR instead
- **Rejected**: Similar dependency issue, higher cost

---

## Open Questions

1. **Prompt Engineering**: Should we use few-shot examples in the prompt? How many?
2. **Model Selection**: Should we A/B test multiple vision models?
3. **Confidence Calibration**: How do we validate the model's confidence scores?
4. **Error Handling**: What should happen if JSON parsing fails repeatedly?
5. **User Experience**: Should we show a progress indicator for the 2-3 second processing time?
6. **Caching**: Should we cache results by image hash to save neurons?
7. **Feedback Loop**: How do we collect user corrections to improve prompts?

---

## Why the Additive Approach is Superior

### Preserves Investment

**Massive Development Investment Already Made**:
- OCRService has 5 sophisticated parsing strategies
- Extensive testing and refinement
- Known accuracy baseline
- Edge case handling developed over time
- User trust in existing functionality

**Risk Mitigation**:
- Zero risk of breaking existing functionality
- Users who prefer traditional OCR can keep using it
- A/B testing reveals actual performance differences
- Easy rollback if VisionService underperforms

### User Choice & Trust

**Different User Preferences**:
- Some users concerned about "AI" technology
- Some users want cutting-edge features
- Enterprise users may have AI policy restrictions
- Privacy-conscious users may prefer traditional OCR
- Tech enthusiasts may prefer vision models

**Transparency**:
- Clear setting: "Use AI Vision" vs "Use Traditional OCR"
- Users understand what technology they're using
- Can switch based on results with specific labels
- Builds trust through choice and transparency

### Technical Benefits

**Parallel Development**:
- Can develop/test VisionService without touching OCR code
- No merge conflicts or regression risks
- Independent optimization of each service
- Gradual migration path if Vision proves superior

**Comparison Data**:
- Side-by-side accuracy metrics
- Real usage patterns for each service
- Identify which labels work better with which technology
- Data-driven decisions about future direction

**Fallback Strategy**:
```typescript
// Future enhancement: automatic fallback
async function smartScan(image: File) {
  const preferredService = $settings.useAIVision ? visionService : ocrService;
  
  try {
    const result = await preferredService.processImage(image);
    
    // If confidence is low, optionally try the other service
    if (result.confidence === 'low') {
      console.log('Low confidence, trying alternate service...');
      const fallbackService = $settings.useAIVision ? ocrService : visionService;
      const fallbackResult = await fallbackService.processImage(image);
      
      // Use whichever has higher confidence
      return fallbackResult.confidence > result.confidence ? fallbackResult : result;
    }
    
    return result;
  } catch (error) {
    // If preferred service fails, try fallback
    console.warn('Preferred service failed, using fallback');
    const fallbackService = $settings.useAIVision ? ocrService : visionService;
    return await fallbackService.processImage(image);
  }
}
```

---

## Next Steps

1. ✅ **Review & Approval**: Plan reviewed and approved
2. ✅ **Phase 0 - Environment Assessment**: COMPLETED
   - Worker has isolated package.json with wrangler v3.114.13
   - OAuth limitation requires MBP for deployment
   - Hybrid workflow documented (edit on NAS, deploy from MBP)
3. **Phase 0 - Spike Test**: Ready to begin - Quick proof-of-concept with 5-10 test images
   - Create minimal `/ocr-test` endpoint in Worker
   - Test Llama 3.2 11B Vision with structured output prompt
   - Measure accuracy and response times
4. **Go/No-Go Decision**: Based on spike test results
   - ✅ Go: If accuracy ≥60%, response time ≤5s, proceed to Phase 1
   - ❌ No-Go: If accuracy <60% or major issues, reconsider approach
5. **Full Implementation**: If approved, proceed with Phases 1-5

---

## Claude Code Handoff Instructions

This document is **ready for Claude Code** with the following considerations:

### What Claude Code Needs to Know

**Project Context**:
- Working codebase with functional OCR scanning
- Existing `OCRService` must remain untouched
- Settings system already in place
- Cloudflare Worker infrastructure already deployed

**Implementation Scope**:
- Create NEW files (VisionService, servingSizeParser utility)
- Modify EXISTING files (settings store, settings UI, SmartScanModal)
- DO NOT modify OCRService.ts
- Follow existing code patterns and conventions

**Key Files Referenced**:
```
src/lib/services/OCRService.ts          [READ ONLY - for interface reference]
src/lib/services/VisionService.ts       [CREATE NEW - simplified, no parsing utilities]
src/lib/stores/settingsStore.ts         [MODIFY - add useAIVision]
src/routes/settings/+page.svelte        [MODIFY - add toggle UI]
src/lib/components/SmartScanModal.svelte [MODIFY - add service selection + loading UX]
worker/src/index.ts                     [MODIFY - add OCR route]
worker/src/ocr.ts                       [CREATE NEW]
worker/wrangler.toml                    [MODIFY - add AI binding]
```

**Critical Constraints**:
1. ✅ **Additive only** - No changes to OCRService
2. ✅ **Interface compatibility** - Both services return `NutritionParseResult`
3. ✅ **User control** - Settings toggle must work
4. ✅ **Default behavior** - Default to OCR (useAIVision: false)
5. ✅ **Error handling** - Graceful degradation if Vision fails

### Worker Development Workflow (IMPORTANT)

**Environment**: Hybrid NAS + MBP workflow required

**Reason**: Cloudflare wrangler authentication requires browser OAuth redirect to localhost, which doesn't work over SSH.

**Pattern**:
1. **Claude Code** (on NAS): Edit worker source files in `worker/src/`
2. **User** (on MBP): Deploy with `cd ~/Ca-pwa-svelte/worker && npm run deploy`
3. **Testing**: Can run from anywhere after deployment

**Iteration Cycle**:
- Edit code → User deploys from MBP → Test → Repeat
- Deployment is fast once authenticated (~10-20 seconds)

---

### Implementation Order for Claude Code

**Phase 0: Environment & Spike Test** (Do First - CRITICAL)
```bash
# Claude Code: Create spike test endpoint
cd worker
# Create minimal /ocr-test endpoint for spike test
# Test Llama 3.2 11B with structured output prompt
# Prepare test harness

# User: Deploy from MBP
cd ~/Ca-pwa-svelte/worker && npm run deploy

# Claude Code or User: Run 5-10 test images and measure accuracy
# Make Go/No-Go decision
```

**Phase 1: Worker Foundation** (Do Second - if Phase 0 successful)
```bash
# Claude Code: Edit worker code on NAS
cd worker
# Add AI binding to wrangler.toml
# Create src/ocr.ts with vision model integration
# Update src/index.ts to route /ocr requests

# User: Deploy from MBP
cd ~/Ca-pwa-svelte/worker && npm run deploy

# Test with curl before client integration
```

**Phase 2: Client Services** (Do Third)
```bash
cd src/lib
# Create services/VisionService.ts (NEW - simplified, direct mapping)
# NO parsing utilities needed - LLM returns structured data
```

**Phase 3: Settings Integration** (Do Fourth)
```bash
# Update stores/settingsStore.ts - add useAIVision field
# Update routes/settings/+page.svelte - add toggle UI
# Test settings persistence
```

**Phase 4: SmartScanModal Integration** (Do Fifth)
```bash
# Update components/SmartScanModal.svelte
# Add service selection logic
# Add loading indicator UI for 2-5 second waits
# Add timeout handling with retry option
# Test both services work
```

**Phase 5: Testing** (Do Sixth)
```bash
cd ocr
# Create test_vision_comparison.ts
# Run comparative tests
# Document results
```

### Environment Variables Needed

```bash
# .env file
VITE_OCR_API_KEY=<existing_ocr_space_key>
VITE_WORKER_URL=<existing_worker_url>

# No new env vars needed - reuse existing Worker URL
```

### Testing Checklist for Claude Code

After each phase, verify:
- [x] Phase 0: Worker deployment workflow documented (requires MBP for OAuth)
- [ ] Phase 0: Model returns structured JSON with all expected fields
- [ ] Phase 0: Accuracy ≥60% on test images (Go/No-Go decision)
- [ ] Phase 1: Worker responds to POST /ocr with test image
- [ ] Phase 2: VisionService instantiates without errors
- [ ] Phase 2: Direct mapping from API response to app fields works
- [ ] Phase 3: Settings toggle appears in UI
- [ ] Phase 3: Settings persist after toggle
- [ ] Phase 4: OCR mode works (useAIVision: false)
- [ ] Phase 4: Vision mode works (useAIVision: true)
- [ ] Phase 4: Loading indicator displays during processing
- [ ] Phase 5: Comparison test runs successfully

### Common Pitfalls to Avoid

1. **Don't modify OCRService** - Create parallel service instead
2. **Don't break existing scanning** - Default must be useAIVision: false
3. **Don't assume Worker URL** - Use existing VITE_WORKER_URL
4. **Don't skip image preprocessing** - Reuse ImageResizer.preprocessForOCR
5. **Don't forget error handling** - Vision model may be slow or fail
6. **Don't skip Phase 0** - Spike test is critical for Go/No-Go decision
7. **Don't create parsing utilities** - LLM returns pre-structured data
8. **Don't ignore timeout UX** - Add loading indicator for 2-5 second waits
9. **Don't trust LLM confidence scores** - Validate against actual accuracy in Phase 4

### Questions Claude Code Should Ask

If uncertain about:
- Existing file structure or patterns → Ask to see related code
- Settings store implementation → Ask for current structure
- SmartScanModal integration point → Ask for current scan handler
- Image preprocessing details → Ask to see ImageResizer usage
- Testing approach → Ask for existing test patterns

---

## Appendix: Example API Responses

### Cloudflare Worker Response (Updated)
```json
{
  "success": true,
  "data": {
    "serving_quantity": 1,
    "serving_measure": "cup",
    "serving_standard_value": 240,
    "serving_standard_unit": "ml",
    "calcium_mg": 380,
    "calcium_percent_dv": 30,
    "servings_per_container": 6,
    "calories": 120,
    "confidence": "high"
  },
  "model": "@cf/meta/llama-3.2-11b-vision-instruct",
  "neurons_used": 30
}
```

### OCR.space Response (Current)
```json
{
  "ParsedResults": [{
    "ParsedText": "Nutrition Facts\nServing size 1 cup (240 mL)\n...",
    "TextOverlay": {
      "Lines": [
        {
          "Words": [
            { "WordText": "Calcium", "Left": 50, "Top": 300, "Height": 20, "Width": 60 },
            { "WordText": "380mg", "Left": 120, "Top": 300, "Height": 20, "Width": 45 }
          ]
        }
      ]
    }
  }]
}
```

### Mapped Result (Internal Format)
```typescript
interface NutritionParseResult {
  servingQuantity: 1,
  servingMeasure: "cup",
  standardMeasureValue: 240,
  standardMeasureUnit: "ml",
  calcium: 380,
  confidence: "high",
  rawText: "1 cup (240ml)" // For debugging
}
```
