# Technology Stack

## Framework & Core
- **Angular 20.1.0** - Latest Angular framework
- **TypeScript 5.8.2** - Strict mode enabled with comprehensive compiler options
- **RxJS 7.8.0** - Reactive programming library
- **SCSS** - Sass preprocessor for styling

## Build System
- **Angular CLI 20.1.5** - Primary build and development tool
- **@angular/build** - Modern Angular build system

## Code Quality & Formatting
- **ESLint** - TypeScript and Angular-specific linting
- **Prettier** - Code formatting with Angular template support
- **EditorConfig** - Consistent editor settings

## Development Configuration
- **Strict TypeScript** - All strict compiler options enabled
- **Angular Strict Mode** - Template type checking and injection parameters
- **Component Suffix Enforcement** - Components must end with "Component"
- **Directive Suffix Enforcement** - Directives must end with "Directive"

## TypeScript Coding Standards

### Strict Typing Requirements
- **NO `any` type** - Explicitly forbidden, use proper types or generics
- **NO `unknown` type** - Use specific types or type guards when needed
- **Explicit return types** - All functions and methods must have explicit return types
- **Strict null checks** - Handle null/undefined cases explicitly
- **Type assertions** - Use type guards instead of type assertions when possible

### Type Safety Best Practices
- Use interfaces for object shapes and contracts
- Prefer `readonly` for immutable data structures
- Use union types instead of loose typing
- Implement proper error handling with typed errors
- Use generics for reusable components and services
- Leverage TypeScript utility types (Partial, Required, Pick, etc.)

### Code Quality Standards
- **Immutability** - Prefer `readonly` arrays and objects
- **Pure functions** - Avoid side effects in utility functions
- **Single responsibility** - Each class/function should have one clear purpose
- **Dependency injection** - Use Angular's DI system properly with typed services
- **Error boundaries** - Implement proper error handling and logging
- **Performance** - Use OnPush change detection strategy when appropriate

## Common Commands

### Development
```bash
npm start              # Start development server (ng serve)
npm run build          # Production build
npm run watch          # Development build with watch mode
```

### Code Quality
```bash
npm run lint           # Run ESLint on TypeScript and HTML files
npm run format         # Format code with Prettier
```

### Angular CLI
```bash
ng generate component <name>    # Generate new component
ng generate service <name>      # Generate new service
ng generate --help              # List all available schematics
```

## Build Budgets
- Initial bundle: 500kB warning, 1MB error
- Component styles: 4kB warning, 8kB error