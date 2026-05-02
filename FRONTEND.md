# Frontend Conventions

## Component Structure

**App.tsx Organization**:
- Top-level routing and auth state
- View components: ImportFlow, SessionReview, StudentDashboard
- State management: React hooks only (useState, useEffect, useMemo)
- No Redux or external state libraries

**Component Patterns**:
- Functional components with hooks
- Props interfaces defined inline or in types.ts
- Event handlers: `handleEventName`
- State variables: descriptive names

## UI Patterns

**Color Scheme**:
- Primary: `#10b981` (education green)
- Surfaces: White backgrounds
- Text: Dark gray for readability
- Theme: Clean, professional, accessible

**Layout**:
- Responsive grid system
- Sidebar navigation
- Main content area
- Mobile-first responsive design

**Icons**:
- Library: `lucide-react`
- Usage: Semantic naming (CheckCircle2, UserRound, etc.)
- Consistent sizing and color

## State Management

**Local State**:
- `useState` for component state
- `useEffect` for side effects
- `useMemo` for computed values

**Data Flow**:
- Props down, events up
- Callback functions for parent communication
- Immutable updates for objects/arrays

## Form Handling

**Input Components**:
- Controlled inputs with `value` and `onChange`
- Validation feedback
- Error states clearly indicated

**File Uploads**:
- `readTranscriptFileText()` for file processing
- Async handling with loading states
- Error handling for invalid files

## Accessibility

**Semantic HTML**:
- Proper heading hierarchy (h1, h2, h3)
- ARIA labels where needed
- Keyboard navigation support

**Color Contrast**:
- WCAG AA compliance
- Sufficient contrast ratios
- Alternative text for images

## Performance

**Rendering Optimization**:
- `React.memo` for expensive components
- `useMemo` for computed values
- `useCallback` for event handlers

**Bundle Optimization**:
- Tree shaking enabled
- Code splitting for routes
- Lazy loading for heavy components

## Development Workflow

**Build Process**:
- `npm run dev`: Vite dev server
- `npm run build`: Production build
- `npm run test:import`: Test suite

**Code Quality**:
- TypeScript strict mode
- ESLint configuration
- Pre-commit hooks for quality checks

## Common Patterns

**Data Display**:
- Lists: `map()` with unique keys
- Conditional rendering: `&&` operator
- Loading states: Skeleton components

**Error Boundaries**:
- Wrap async operations
- Graceful error messages
- Recovery options

**Responsive Design**:
- Mobile-first CSS
- Flexbox/Grid layouts
- Breakpoint-specific styles