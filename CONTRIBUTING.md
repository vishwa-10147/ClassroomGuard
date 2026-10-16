# Contributing to ClassroomGuard

Thank you for helping improve ClassroomGuard. This guide covers the development workflow and the
checks a change must pass before it is merged.

## Getting started

1. Set up a development environment as described in
   [SETUP.md → Development setup](SETUP.md#5-development-setup). Use Python 3.12
   (`.python-version`) and Node.js 22 (`.nvmrc`).
2. Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the parts fit together.
3. Install the pre-commit hooks: `pip install pre-commit && pre-commit install`.

## Workflow

1. Branch from `main`: `feat/<topic>`, `fix/<topic>`, `docs/<topic>` or `chore/<topic>`.
2. Keep each pull request focused on one change.
3. Add or update tests for behaviour you change, and update the documentation in the same pull
   request.
4. Open a pull request to `main`. CI must be green before merging.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
fix(security): require sign-in for push-token registration

Explain what changed and why, wrapped at about 72 characters.
```

Common types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`. Common scopes: `web`,
`backend`, `ai`, `mobile`, `onprem`, `ops`, `security`.

## Checks to run before pushing

```bash
# Backend
ruff check backend/
mypy --config-file backend/pyproject.toml backend/app/ --ignore-missing-imports

# Backend tests: start the API with RATE_LIMIT_ENABLED=false and demo seed data first
cd backend && TEST_BASE_URL=http://localhost:8000 python -m pytest tests/ && cd ..

# AI rules
cd ai && python -m pytest tests/ && cd ..

# Web app
npm run lint
npx tsc --noEmit
npx jest src
npm run build

# End to end (against a running stack)
npx playwright test
```

These are the same steps CI runs in [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Coding conventions

- **Python:** formatted and linted with ruff (line length 100), typed for mypy. Async SQLAlchemy
  in request handlers. New routes declare a permission with `require_permission(...)`, and new
  permissions go into `backend/app/core/permissions.py`.
- **Database:** every schema change needs an Alembic migration in `backend/alembic/versions/`.
  Generate one from the repository root with
  `alembic -c backend/alembic.ini revision --autogenerate -m "..."`, and review it before committing.
- **TypeScript/React:** strict TypeScript, ESLint with zero warnings, Tailwind for styling.
  Shared UI goes in `src/components/`, and feature code in `src/features/<feature>/`.
- **API shape:** responses use camelCase field names (Pydantic aliases), as the web app expects.
- **AI:** keep detection thresholds and rules in configuration, not code. Retrain and re-evaluate
  with the scripts in `ai/` before replacing a model file, and record the new metrics in
  [ai/README.md](ai/README.md).

## Data and secrets

- Never commit `.env` files, model weights, camera URLs with credentials, or real student
  images or video. `.gitignore` covers the usual locations; check `git status` before committing.
- Use the demo seed data (`backend/seed_users.py`, `backend/seed_data.py`) for tests and
  screenshots.
- Report security problems privately as described in [SECURITY.md](SECURITY.md).

## Releases

1. Update [CHANGELOG.md](CHANGELOG.md) and the version in `package.json`.
2. Merge to `main` with CI green.
3. Tag the merge commit: `git tag -a vX.Y.Z -m "ClassroomGuard vX.Y.Z"` and push the tag.
4. Create a GitHub release from the tag with the changelog entry.

Installations update with `sudo ./scripts/update.sh vX.Y.Z`.
