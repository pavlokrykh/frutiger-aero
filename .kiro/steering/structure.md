# Project Structure

## Root Level Organization
```
├── src/                    # Source code
├── public/                 # Static assets (favicon, etc.)
├── node_modules/          # Dependencies
├── .angular/              # Angular CLI cache
├── .kiro/                 # Kiro configuration and steering
└── .vscode/               # VS Code settings
```

## Source Directory (`src/`)
```
src/
├── app/                   # Application code
│   ├── features/         # Feature modules (domain-specific)
│   ├── shared/           # Shared components, services, utilities
│   ├── app.component.*   # Root application component
│   ├── app.config.ts     # Application configuration
│   └── app.routes.ts     # Routing configuration
├── assets/               # Static assets
│   ├── images/          # Image files
│   └── styles/          # Global style files
├── index.html           # Main HTML template
├── main.ts              # Application bootstrap
└── styles.scss          # Global styles
```

## Naming Conventions

### Components
- **Files**: `feature-name.component.ts`, `feature-name.component.html`, `feature-name.component.scss`
- **Classes**: Must end with `Component` suffix (enforced by ESLint)
- **Selectors**: Use `app-` prefix (configured in angular.json)

### Services
- **Files**: `service-name.service.ts`
- **Classes**: Should end with `Service` suffix

### Directives
- **Files**: `directive-name.directive.ts`
- **Classes**: Must end with `Directive` suffix (enforced by ESLint)

## Code Organization Principles

### Feature-Based Structure
- Group related components, services, and modules in `src/app/features/`
- Each feature should be self-contained with its own routing

### Shared Resources
- Common components, pipes, and services go in `src/app/shared/`
- Reusable utilities and helpers

### Assets Management
- Images in `src/assets/images/`
- Global styles and mixins in `src/assets/styles/`
- Static files in `public/` directory

## Dependency Injection

### Modern Angular 20 Pattern
- **Always use `inject()` function** instead of constructor injection
- Import `inject` from `@angular/core`
- Declare injected services as `private readonly` properties
- Constructor injection is outdated in Angular 20

**Preferred:**
```typescript
import { Component, inject } from '@angular/core';
import { MyService } from './my.service';

@Component({...})
export class MyComponent {
  private readonly myService = inject(MyService);
}
```

**Avoid:**
```typescript
// Outdated constructor injection
constructor(private myService: MyService) {}
```

## File Naming
- Use kebab-case for all file names
- Include the file type in the name (e.g., `.component.ts`, `.service.ts`)
- Follow Angular CLI naming conventions

## TypeScript Code Organization

### Type Definitions
- Create dedicated `types/` or `models/` directories for interfaces and types
- Use barrel exports (`index.ts`) for clean imports
- Group related types in the same file
- Use descriptive names that reflect the domain

### Service Architecture
- Services should be stateless when possible
- Use dependency injection for all external dependencies
- Implement proper error handling with typed error responses
- Use RxJS operators for reactive programming patterns

### Component Best Practices
- Keep components focused on presentation logic
- Use OnPush change detection for performance
- Implement proper lifecycle hooks with explicit typing
- Use signals for reactive state management
- Separate business logic into services