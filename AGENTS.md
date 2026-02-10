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

## Code Style

- Use TypeScript for all new code
- Follow existing code patterns in the codebase
- Run `npm run typecheck` before committing
- Run `npm run test:unit` before committing

## Dependencies

- **Always use npm official registry** (`https://registry.npmjs.org/`)
- Do not use Taobao mirror or other third-party registries
- The `.npmrc` file enforces this - do not override it
