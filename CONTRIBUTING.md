# Contributing to PlayGuard

Thank you for your interest in contributing to PlayGuard! This document provides guidelines and instructions for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)

## 🤝 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have installed:
- **Node.js** 18 or later (tested with v24.13.0)
- **npm** or **pnpm**
- **Git**
- **Android SDK Platform Tools** (for ADB testing)
- **Unity** 2021.3 or later (for SDK contributions)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/playguard.git
   cd playguard
   ```

3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/TatoSAI/playguard.git
   ```

## 🔧 Development Setup

### Desktop App Setup

1. Navigate to electron-app directory:
   ```bash
   cd electron-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   # Windows
   ..\Launch-PlayGuard.cmd

   # Or directly
   npm run dev
   ```

4. The app should launch with hot reload enabled

### Unity SDK Setup

1. Clone the Unity SDK repository:
   ```bash
   git clone https://github.com/TatoSAI/playguard--unity-sdk.git
   ```

2. Open Unity and add the package:
   - Window → Package Manager
   - Add package from disk
   - Select `unity-sdk/package.json`

3. Test your changes with a development build

## 🔄 Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation only changes
- `refactor/` - Code refactoring
- `test/` - Adding tests
- `chore/` - Maintenance tasks

### 2. Make Your Changes

- Write clean, readable code
- Follow the coding standards (see below)
- Add tests for new features
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run TypeScript type checking
npm run type-check

# Run linter
npm run lint

# Build the app
npm run build
```

### 4. Commit Your Changes

See [Commit Messages](#commit-messages) section for guidelines.

```bash
git add .
git commit -m "feat: add new feature description"
```

### 5. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 6. Create a Pull Request

Go to GitHub and create a pull request from your branch to `main`.

## 💻 Coding Standards

### TypeScript/JavaScript

- Use **TypeScript** for all new code
- Follow **ESLint** rules (see `.eslintrc` in project root)
- Use **functional components** with hooks (React)
- Prefer **async/await** over promises
- Use **const** and **let**, never **var**
- Add **type annotations** for function parameters and return types

#### Good Example:
```typescript
interface User {
  id: string
  name: string
}

async function getUser(userId: string): Promise<User> {
  const response = await api.getUser(userId)
  return response.data
}
```

#### Bad Example:
```typescript
// ❌ No types
function getUser(userId) {
  return api.getUser(userId).then(res => res.data)
}
```

### C# (Unity SDK)

- Follow **Unity C# coding conventions**
- Use **PascalCase** for public members
- Use **camelCase** for private members
- Add **XML documentation** for public APIs
- Use **#if DEVELOPMENT_BUILD** for SDK-specific code

#### Good Example:
```csharp
namespace PlayGuard
{
    /// <summary>
    /// Main SDK component for test automation
    /// </summary>
    public class PlayGuardSDK : MonoBehaviour
    {
        private static PlayGuardSDK instance;

        /// <summary>
        /// Gets the singleton instance
        /// </summary>
        public static PlayGuardSDK Instance => instance;
    }
}
```

### React Components

- Use **functional components** with hooks
- One component per file
- Use **TypeScript interfaces** for props
- Extract reusable logic into custom hooks
- Keep components small and focused (< 200 lines)

#### Component Template:
```typescript
import React, { useState, useEffect } from 'react'

interface MyComponentProps {
  title: string
  onAction: () => void
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  const [state, setState] = useState(false)

  useEffect(() => {
    // Side effects here
  }, [])

  return (
    <div>
      <h1>{title}</h1>
      <button onClick={onAction}>Action</button>
    </div>
  )
}
```

### File Organization

```
src/
├── main/                 # Electron main process
│   ├── services/        # Backend services
│   │   ├── ADBManager.ts
│   │   └── UnityBridge.ts
│   └── index.ts         # IPC handlers
└── renderer/            # React app
    ├── src/
    │   ├── components/  # React components
    │   │   ├── TestRunner/
    │   │   │   ├── TestRunner.tsx
    │   │   │   └── TestRunner.css
    │   │   └── ...
    │   ├── hooks/       # Custom React hooks
    │   ├── types/       # TypeScript types
    │   └── utils/       # Utility functions
    └── index.html
```

## 🧪 Testing Guidelines

### Unit Tests

- Write tests for all business logic
- Use **Jest** for testing
- Aim for 80%+ code coverage

```typescript
describe('TestCaseManager', () => {
  it('should create test case', () => {
    const manager = new TestCaseManager()
    const testCase = manager.create({ name: 'Test' })
    expect(testCase.name).toBe('Test')
  })
})
```

### Integration Tests

- Test end-to-end workflows
- Mock external dependencies (ADB, Unity SDK)
- Test IPC communication

### Manual Testing

Before submitting a PR, manually test:
1. App launches successfully
2. Device connection works
3. Test recording works
4. Test playback works
5. Reports are generated correctly

## 📝 Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation only
- **style**: Code style changes (formatting, no logic change)
- **refactor**: Code refactoring
- **test**: Adding tests
- **chore**: Maintenance tasks

### Examples

```bash
feat(recorder): add device action recording support

- Added DeviceActionsPanel component
- Integrated 20 device actions (back, home, rotation, etc.)
- Updated TestRecorder to capture device actions

Closes #123

---

fix(unity-bridge): handle connection timeout correctly

Previously, connection timeouts would crash the app. Now we show
a user-friendly error message and allow retry.

---

docs(readme): update installation instructions

Added troubleshooting section for common ADB issues.
```

### Commit Message Guidelines

- Use the imperative mood ("add" not "added")
- First line should be 50 characters or less
- Reference issues and PRs in the footer
- Add detailed description in the body if needed

## 🎯 Pull Request Process

### Before Submitting

1. **Update your branch** with latest changes:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run tests** and ensure they pass:
   ```bash
   npm run lint
   npm run type-check
   npm run build
   ```

3. **Update documentation** if needed:
   - Update README.md if you added features
   - Add/update inline code comments
   - Update CHANGELOG.md (if applicable)

### PR Template

When creating a pull request, include:

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested locally
- [ ] Added unit tests
- [ ] Updated manual test cases

## Screenshots (if applicable)
Add screenshots of UI changes

## Checklist
- [ ] My code follows the coding standards
- [ ] I have added tests
- [ ] I have updated the documentation
- [ ] All tests pass
```

### Review Process

1. **CI checks** must pass
2. **At least one approving review** required
3. **No merge conflicts** with main branch
4. Maintainers may request changes

### After Merge

1. Delete your feature branch:
   ```bash
   git branch -d feature/your-feature
   git push origin --delete feature/your-feature
   ```

2. Update your local main:
   ```bash
   git checkout main
   git pull upstream main
   ```

## 📁 Project Structure

### Desktop App (electron-app/)

```
electron-app/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── services/           # Backend services
│   │   │   ├── ADBManager.ts   # ADB device communication (500 lines)
│   │   │   ├── UnityBridge.ts  # Unity SDK TCP bridge (512 lines)
│   │   │   ├── TestRecorder.ts # Test recording logic (400 lines)
│   │   │   ├── TestRunner.ts   # Test execution engine (450 lines)
│   │   │   ├── FileManager.ts  # Test persistence (350 lines)
│   │   │   ├── SuiteManager.ts # Test suite CRUD (308 lines)
│   │   │   └── ...
│   │   └── index.ts            # IPC handlers
│   │
│   └── renderer/               # React frontend
│       ├── src/
│       │   ├── components/     # UI components
│       │   │   ├── DeviceManager/
│       │   │   ├── TestRecorder/
│       │   │   ├── TestRunner/
│       │   │   ├── TestSuites/
│       │   │   ├── ReportViewer/
│       │   │   └── Settings/
│       │   ├── hooks/          # React hooks
│       │   ├── types/          # TypeScript types
│       │   └── App.tsx         # Main app component
│       └── index.html
│
├── resources/                  # App icons and assets
├── package.json
└── electron.vite.config.ts
```

### Unity SDK (unity-sdk/)

```
unity-sdk/
├── Runtime/
│   ├── PlayGuardSDK.cs        # Main SDK (718 lines)
│   ├── Core/                   # Core functionality
│   │   ├── PlayGuardManager.cs
│   │   ├── CommandProcessor.cs
│   │   └── ...
│   ├── Recording/              # Input recording
│   └── Playback/               # Test execution
│
├── Samples~/                   # Example integration
│   └── BasicIntegration/
│
├── package.json                # UPM manifest
├── README.md
├── CHANGELOG.md
└── LICENSE.md
```

## 🤔 Questions?

- **General questions**: Open a [Discussion](https://github.com/TatoSAI/playguard/discussions)
- **Bug reports**: Open an [Issue](https://github.com/TatoSAI/playguard/issues)
- **Feature requests**: Open an [Issue](https://github.com/TatoSAI/playguard/issues)
- **Security issues**: Email security@playguard.dev

## 📜 License

By contributing to PlayGuard, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to PlayGuard! 🎮🛡️
