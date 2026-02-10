# Changelog

All notable changes to PlayGuard Unity SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-02-10

### Added
- 🎉 Initial release of PlayGuard Unity SDK
- ✨ Core TCP server for communication with PlayGuard desktop app
- 🎮 UI Canvas hierarchy inspection
- 📱 GameObject discovery (active/inactive)
- 🔍 Element finding by name, type, or path
- 🖱️ Element interaction (tap, input, swipe)
- 📊 Property reading (position, text, state)
- ⏳ Wait for element functionality
- 🔌 **Extensibility System v2.0**:
  - `RegisterCustomProperty()` - Expose game state
  - `RegisterCustomAction()` - Custom test actions
  - `RegisterCustomCommand()` - Complex operations
- 🎯 Zero configuration setup
- ⚡ Zero performance impact (Development builds only)
- 📦 Unity Package Manager (UPM) support
- 📚 Complete documentation and examples

### Technical
- Namespace: `PlayGuard`
- Port: 12345 (TCP)
- Unity: 2021.3+
- Platform: Android (iOS coming soon)

### Package Structure
- Runtime/PlayGuardSDK.cs - Main SDK script
- Runtime/Core/ - Core components
- Runtime/Recording/ - Input recording
- Runtime/Playback/ - Test execution
- Samples~/BasicIntegration/ - Example integration

[Unreleased]: https://github.com/playguard/unity-sdk/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/playguard/unity-sdk/releases/tag/v0.1.0
