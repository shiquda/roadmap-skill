# Project Guidelines

## Git Commit Messages

**All commit messages must be written in English.**

### Format

Follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

### Examples

```
feat: add task priority sorting to kanban board

fix: resolve CI build failure by switching from Taobao registry to npm official registry

docs: update README with installation instructions

refactor(storage): simplify task update logic
```

## Build & Test Commands

```bash
# Development
npm run dev              # Start development mode with watch

# Building
npm run build            # Full build (Node + Web)
npm run build:web        # Build only web frontend

# Type checking
npm run typecheck        # Run TypeScript type checking without emitting

# Testing
npm run test             # Run tests in watch mode
npm run test:unit        # Run unit tests once
npm run test:integration # Run integration tests once

# Run a single test file
npx vitest run tests/unit/storage.test.ts

# Run tests matching a pattern
npx vitest run --reporter=verbose --testNamePattern="createProject"
```

## Code Style Guidelines

### TypeScript

- **Target**: ES2022 with NodeNext module resolution
- **Strict mode**: Enabled - all strict TypeScript options must pass
- **Unused code**: Not allowed (noUnusedLocals, noUnusedParameters)
- **Implicit returns**: Not allowed (noImplicitReturns)

### Imports & Modules

- Use ES modules (`"type": "module"` in package.json)
- Include `.js` extension in imports: `import { foo } from './bar.js'`
- Prefer named imports over default imports
- Group imports: built-ins → external → internal (separated by blank line)

Example:
```typescript
import { readFile } from 'fs/promises';
import { join } from 'path';

import { z } from 'zod';

import { Project } from '../models/index.js';
import { readJsonFile } from '../utils/file-helpers.js';
```

### Naming Conventions

- **Files**: kebab-case (e.g., `file-helpers.ts`, `project-tools.ts`)
- **Classes**: PascalCase (e.g., `ProjectStorage`, `TaskManager`)
- **Interfaces/Types**: PascalCase (e.g., `ProjectData`, `TaskStatus`)
- **Functions/Variables**: camelCase (e.g., `createProject`, `getFilePath`)
- **Constants**: UPPER_SNAKE_CASE for true constants only
- **Private class members**: Use `private` modifier (not `#` prefix)

### Types

- Always define explicit return types for public functions
- Use `interface` for object shapes that may be extended
- Use `type` for unions, intersections, and complex types
- Prefer `null` over `undefined` for optional values
- All dates are stored as ISO 8601 strings

Example:
```typescript
export interface Project {
  id: string;
  name: string;
  dueDate: string | null; // ISO 8601 date string or null
}

export type ProjectStatus = 'active' | 'completed' | 'archived';
```

### Error Handling

- Use explicit error checking instead of try-catch when possible
- Always check for `ENOENT` errors when reading files
- Log errors to `console.error` with descriptive messages
- Exit process with code 1 on fatal errors

Example:
```typescript
async readProject(projectId: string): Promise<ProjectData | null> {
  try {
    const filePath = this.getFilePath(projectId);
    return await readJsonFile<ProjectData>(filePath);
  } catch (error) {
    if (error instanceof Error && error.message.includes('ENOENT')) {
      return null;
    }
    throw error;
  }
}
```

### Comments & Documentation

- Use JSDoc for public methods and functions
- Keep comments concise and up-to-date
- Explain "why" not "what" (code should be self-documenting)

Example:
```typescript
/**
 * Create a new project with generated ID and timestamps
 * @param input - Project creation data (without ID/timestamps)
 * @returns The complete project data including generated fields
 */
async createProject(input: CreateProjectInput): Promise<ProjectData> {
  // Implementation...
}
```

### Testing

- Use Vitest with globals enabled
- Test file pattern: `tests/**/*.{test,spec}.{js,ts}`
- Use `describe`/`it` blocks for organizing tests
- Use `beforeEach`/`afterEach` for setup/teardown
- Tests should be independent and not rely on execution order

Example:
```typescript
describe('ProjectStorage', () => {
  let storage: ProjectStorage;

  beforeEach(() => {
    storage = new ProjectStorage();
  });

  describe('createProject', () => {
    it('should create a project with valid input', async () => {
      // Test code...
    });
  });
});
```

## Dependencies

- **Always use npm official registry** (`https://registry.npmjs.org/`)
- Do not use Taobao mirror or other third-party registries
- The `.npmrc` file enforces this - do not override it
- Node.js version requirement: `>=20.0.0`

## Pre-commit Checklist

Before committing, ensure:
1. `npm run typecheck` passes
2. `npm run test:unit` passes
3. Code follows existing patterns in the codebase
4. Commit message follows Conventional Commits format (in English)

## Release Workflow

This project uses GitHub Actions for automated npm publishing.

### How to Release

1. **Commit your changes** with a Conventional Commit message
2. **Bump version**: `npm version patch|minor|major` (creates git tag automatically)
3. **Push commits**: `git push`
4. **Push tags**: `git push origin vX.X.X` (triggers CI release)

### CI/CD Flow

- On tag push (`v*`), GitHub Actions automatically:
  1. Runs tests on Node.js 20.x and 22.x
  2. Builds the project
  3. Publishes to npm with provenance

**DO NOT run `npm publish` locally** - let CI handle it via `NPM_TOKEN` secret.
