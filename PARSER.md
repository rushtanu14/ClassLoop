# Parser Robustness Instructions

## Roster Format Handling

**Compressed/Glued Format** (most common pitfall):
- Input: `1Aaliyah Carteracarter@cs4all.nyc2Danny Reyesdreyes@cs4all.nyc...`
- Pattern: Number + Name + Email glued together without delimiters
- Solution: Use regex to split on number boundaries: `/(\d+)([A-Za-z\s]+)([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g`
- Test case: 18 students in compressed CS4All roster

**Standard Delimited Formats**:
- Comma-separated: `Name, email`
- Pipe-separated: `Name|email`
- Tabular: Multi-line with headers

**Metadata Filtering**:
- Skip lines starting with: `CLASS ROSTER —`, `#Student NameEmail`, `Mr. Agrawal | Period 4`
- Skip teacher names: `Ms. Rivera`, `Mr. Agrawal`, etc.
- Use pattern: `/^(class roster|student name|#|mr\.|ms\.|mrs\.)/i`

## Speaker Name Normalization

**Transcript Labels**:
- Input: `Student (Jalen Thompson)`, `Student (Priya Mehta)`
- Output: `jalen thompson`, `priya mehta`
- Pattern: Strip `Student (...)` wrapper, lowercase, normalize spaces

**Alias Handling**:
- Match `jalen thompson` to roster entry `Jalen Thompson`
- Case-insensitive comparison
- Handle common variations: `J. Thompson` → `jalen thompson`

**Confidence Scoring**:
- Exact match: 1.0
- Fuzzy match (partial name): 0.5
- No match: Flag as unmatched participant

## Resource URL Extraction

**YouTube Links**:
- Pattern: `https://www.youtube.com/watch?v=VIDEO_ID`
- Type: `"video"`
- Title: Extract from context or use "Video Resource"

**Other URLs**:
- Worksheets: Google Docs, PDFs
- Slides: Google Slides, PowerPoint
- Links: General web resources

**Context Classification**:
- Look for keywords: "video", "worksheet", "slides", "link"
- Related topic: Extract from surrounding text

## Participation Event Extraction

**Question Types**:
- `asked_question`: Teacher asks, student responds
- `answered_question`: Student provides answer
- `chat`: Student chat messages

**Text Extraction**:
- Remove timestamps: `[00:02:01]`
- Clean speaker labels
- Preserve full response text

## Error Handling

**Defensive Parsing**:
- Unmatched names don't break import
- Flag warnings for teacher review
- Continue processing with partial data

**Fallbacks**:
- If roster missing: Extract speakers from transcript
- If transcript malformed: Skip problematic lines
- Always produce valid Session object