# Testing Strategy

## Test Structure

**File**: `tests/import-flow.test.ts`
**Framework**: Vitest (TypeScript)
**Run Command**: `npm run test:import`

## Test Categories

### End-to-End Parsing Tests
- **Compressed Roster**: 18 students glued format (`1Aaliyah Carteracarter@cs4all.nyc...`)
- **Speaker Matching**: `Student (Jalen Thompson)` → roster match
- **Participation Extraction**: Questions, answers, chat messages
- **Resource Detection**: YouTube URLs in chat
- **Metadata Filtering**: Skip teacher names, headers

### Regression Tests
- **Format Variations**: Comma-sep, pipe-sep, tabular rosters
- **Naming Inconsistencies**: Aliases, case variations
- **Edge Cases**: Missing roster, malformed transcript

## Test Data Sources

**Real Transcripts**:
- CS4All Zoom export (47 minutes, 18 students)
- Includes: PB&J activity, Nearpod poll, homework assignments
- Chat messages with YouTube links

**Roster Formats**:
- Compressed: No delimiters, numbered
- Standard: CSV-style with headers
- Mixed: Some students with aliases

## Validation Checks

**Student Matching**:
- All 18 students correctly identified
- No false matches on teacher names
- Confidence scores applied

**Participation Events**:
- Correct type classification (question/answer/chat)
- Full text preserved
- Student attribution accurate

**Action Items**:
- Homework extracted with due dates
- Overdue items flagged
- Source attribution (transcript)

**Resources**:
- URLs extracted and typed
- Related topics assigned
- Titles generated from context

## Test Execution

**Build First**: `tsc -p tsconfig.test.json`
**Run Tests**: `node --experimental-specifier-resolution=node .test-build/tests/import-flow.test.js`
**Expected**: All assertions pass, no errors

## Test Maintenance

**When Adding Features**:
1. Add test case to `import-flow.test.ts` first
2. Update parser logic in `src/data.ts`
3. Verify tests pass

**When Fixing Bugs**:
1. Add failing test case reproducing the bug
2. Fix parser logic
3. Verify test now passes

## Coverage Goals

- All roster format variations
- All transcript speaker patterns
- All participation event types
- All resource URL types
- Error conditions and edge cases