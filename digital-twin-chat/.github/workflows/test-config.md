# CI/CD Testing Configuration

This document describes the automated testing configuration in the CI/CD pipeline.

## Test Stages

### 1. Backend Testing

**Location**: `test-backend` job in `.github/workflows/ci-cd.yml`

**Tests Run**:
- **Linting**: Uses `flake8` to check Python code quality
  - Critical errors (E9, F63, F7, F82) fail the build
  - Complexity and style warnings are reported but don't fail
- **Unit Tests**: Runs `test_basic.py` and `test_chat_endpoints.py`
  - Tests core functionality and API endpoints
  - Must pass for pipeline to continue
- **Property Tests**: Runs `test_integration.py`
  - Property-based tests using Hypothesis
  - Warnings allowed but failures are reported

**Requirements Validated**: 8.1

### 2. Frontend Testing

**Location**: `test-frontend` job in `.github/workflows/ci-cd.yml`

**Tests Run**:
- **Linting**: Uses ESLint to check TypeScript/React code
  - Configured via `eslint.config.mjs`
  - Must pass for pipeline to continue
- **Type Checking**: Uses TypeScript compiler (`tsc --noEmit`)
  - Validates all type definitions
  - Catches type errors before deployment

**Requirements Validated**: 8.1

## Test Execution

### Pipeline Behavior

1. **Parallel Execution**: Backend and frontend tests run in parallel for speed
2. **Fail Fast**: If any test fails, the pipeline stops before building
3. **Build Stage**: Only runs if all tests pass
4. **Artifacts**: Test results are available in GitHub Actions logs

### Local Testing

To run the same tests locally before pushing:

**Backend**:
```bash
cd digital-twin-chat/backend

# Install dependencies
pip install -r requirements.txt

# Run linting
pip install flake8
flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics

# Run unit tests
pytest test_basic.py test_chat_endpoints.py -v

# Run property tests
pytest test_integration.py -v
```

**Frontend**:
```bash
cd digital-twin-chat/frontend

# Install dependencies
npm ci

# Run linting
npm run lint

# Run type checking
npx tsc --noEmit
```

## Test Requirements

### Backend Test Files

- `test_basic.py`: Basic functionality tests
- `test_chat_endpoints.py`: API endpoint tests
- `test_integration.py`: Integration and property-based tests

### Frontend Test Files

- ESLint configuration: `eslint.config.mjs`
- TypeScript configuration: `tsconfig.json`

## Failure Handling

### Test Failures

- **Critical Linting Errors**: Pipeline fails immediately
- **Unit Test Failures**: Pipeline fails, no deployment occurs
- **Type Check Failures**: Pipeline fails, no deployment occurs
- **Property Test Warnings**: Logged but don't fail the pipeline

### Notifications

Test failures are visible in:
- GitHub Actions UI
- Pull request checks
- Commit status badges

## Configuration Files

- **Backend**: `pytest.ini` - pytest configuration
- **Frontend**: `eslint.config.mjs` - ESLint rules
- **Frontend**: `tsconfig.json` - TypeScript compiler options

## Best Practices

1. **Run tests locally** before pushing to catch issues early
2. **Fix linting errors** immediately - they indicate code quality issues
3. **Review property test failures** carefully - they may reveal edge cases
4. **Keep tests fast** - slow tests delay deployments
5. **Add tests for new features** - maintain test coverage

## Continuous Improvement

- Monitor test execution time and optimize slow tests
- Add new test categories as needed (e.g., security tests, performance tests)
- Update test configurations as the codebase evolves
- Review and update test coverage regularly
