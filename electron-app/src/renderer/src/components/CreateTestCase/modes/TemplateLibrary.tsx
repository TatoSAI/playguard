/**
 * TemplateLibrary Component
 * Provides pre-built YAML templates for common test scenarios
 */

import { FileText, ChevronRight, Globe, Smartphone } from 'lucide-react'

export interface TestTemplate {
  id: string
  name: string
  description: string
  category: 'basic' | 'game' | 'ui' | 'advanced' | 'web'
  template: string
}

export const TEMPLATES: TestTemplate[] = [
  {
    id: 'basic_tap',
    name: 'Basic Tap Test',
    description: 'Simple test with element tap and validation',
    category: 'basic',
    template: `testCase:
  name: "Basic Tap Test"
  description: "Verify tapping a button triggers expected behavior"
  tags: [smoke, basic]
  suite: "Default"

  steps:
    - id: step_1
      action: tap
      target:
        element: "/Canvas/MainMenu/PlayButton"
        fallback: {x: 540, y: 960}
      description: "Tap the Play button"
      validation:
        type: element_exists
        timeout: 3000
      expectedResult: "Play button is tapped successfully"

    - id: step_2
      action: wait
      duration: 2000
      description: "Wait for screen transition"
      expectedResult: "New screen loads"
`
  },
  {
    id: 'game_flow',
    name: 'Game Flow Test',
    description: 'Test game progression through multiple screens',
    category: 'game',
    template: `testCase:
  name: "Game Flow Test"
  description: "Verify player can navigate through main game flow"
  tags: [game, flow, critical]
  suite: "Default"

  steps:
    - id: step_1
      action: tap
      target:
        element: "/Canvas/MainMenu/PlayButton"
        fallback: {x: 540, y: 960}
      description: "Start game from main menu"
      validation:
        type: element_exists
        target: "/Canvas/GameplayUI"
        timeout: 5000
      expectedResult: "Game starts and gameplay UI appears"

    - id: step_2
      action: wait
      duration: 3000
      description: "Wait for game to initialize"
      expectedResult: "Game fully loaded"

    - id: step_3
      action: tap
      target:
        element: "/Canvas/GameplayUI/PauseButton"
        fallback: {x: 100, y: 100}
      description: "Pause the game"
      validation:
        type: element_exists
        target: "/Canvas/PauseMenu"
        timeout: 2000
      expectedResult: "Pause menu appears"

    - id: step_4
      action: tap
      target:
        element: "/Canvas/PauseMenu/ResumeButton"
        fallback: {x: 540, y: 960}
      description: "Resume game"
      validation:
        type: element_active
        target: "/Canvas/GameplayUI"
        timeout: 2000
      expectedResult: "Game resumes"

    - id: step_5
      action: tap
      target:
        element: "/Canvas/GameplayUI/AdsButton"
        fallback: {x: 960, y: 100}
      description: "Verify no ads button for premium users (negative test)"
      validation:
        type: element_exists
      expectedOutcome: fail
      continueOnFailure: true
      expectedResult: "Ads button not found (premium user)"
`
  },
  {
    id: 'input_form',
    name: 'Input Form Test',
    description: 'Test text input and form submission',
    category: 'ui',
    template: `testCase:
  name: "Input Form Test"
  description: "Verify user can enter text and submit form"
  tags: [ui, input, form]
  suite: "Default"

  steps:
    - id: step_1
      action: tap
      target:
        element: "/Canvas/LoginPanel/UsernameField"
        fallback: {x: 540, y: 700}
      description: "Focus username field"
      validation:
        type: element_active
        timeout: 2000
      expectedResult: "Username field is focused"

    - id: step_2
      action: input
      target:
        element: "/Canvas/LoginPanel/UsernameField"
        fallback: {x: 540, y: 700}
      value: "testuser"
      description: "Enter username"
      expectedResult: "Username entered successfully"

    - id: step_3
      action: tap
      target:
        element: "/Canvas/LoginPanel/PasswordField"
        fallback: {x: 540, y: 850}
      description: "Focus password field"
      validation:
        type: element_active
        timeout: 2000
      expectedResult: "Password field is focused"

    - id: step_4
      action: input
      target:
        element: "/Canvas/LoginPanel/PasswordField"
        fallback: {x: 540, y: 850}
      value: "password123"
      description: "Enter password"
      expectedResult: "Password entered successfully"

    - id: step_5
      action: tap
      target:
        element: "/Canvas/LoginPanel/ErrorMessage"
        fallback: {x: 540, y: 650}
      description: "Verify no error message is shown (negative test)"
      validation:
        type: element_exists
      expectedOutcome: fail
      continueOnFailure: true
      expectedResult: "No error message displayed"

    - id: step_6
      action: tap
      target:
        element: "/Canvas/LoginPanel/LoginButton"
        fallback: {x: 540, y: 1000}
      description: "Submit login form"
      validation:
        type: element_exists
        target: "/Canvas/MainMenu"
        timeout: 5000
      expectedResult: "Login successful, main menu appears"
`
  },
  {
    id: 'swipe_navigation',
    name: 'Swipe Navigation Test',
    description: 'Test swipe gestures for navigation',
    category: 'ui',
    template: `testCase:
  name: "Swipe Navigation Test"
  description: "Verify swipe gestures navigate between screens"
  tags: [ui, swipe, navigation]
  suite: "Default"

  steps:
    - id: step_1
      action: swipe
      target:
        fallback: {x: 800, y: 960}
      data:
        direction: "left"
        distance: 500
        duration: 300
      description: "Swipe left to next screen"
      validation:
        type: screenshot_match
        threshold: 0.8
        timeout: 2000
      expectedResult: "Screen transitions to next page"

    - id: step_2
      action: wait
      duration: 1000
      description: "Wait for animation to complete"
      expectedResult: "Animation finished"

    - id: step_3
      action: swipe
      target:
        fallback: {x: 800, y: 960}
      data:
        direction: "left"
        distance: 500
        duration: 300
      description: "Swipe left again"
      expectedResult: "Screen transitions to third page"

    - id: step_4
      action: swipe
      target:
        fallback: {x: 300, y: 960}
      data:
        direction: "right"
        distance: 500
        duration: 300
      description: "Swipe right to go back"
      expectedResult: "Screen returns to previous page"
`
  },
  {
    id: 'comprehensive_test',
    name: 'Comprehensive Test Suite',
    description: 'Full test with prerequisites, multiple validations, and cleanup',
    category: 'advanced',
    template: `testCase:
  name: "Comprehensive Test Suite"
  description: "Advanced test with prerequisites, multiple validations, and cleanup steps"
  tags: [advanced, comprehensive, critical]
  suite: "Default"

  prerequisites:
    - description: "User must be logged out"
      condition: "No active session"

  steps:
    - id: step_1
      action: tap
      target:
        element: "/Canvas/MainMenu/SettingsButton"
        fallback: {x: 100, y: 100}
      description: "Open settings"
      waitBefore: 1000
      validation:
        type: element_exists
        target: "/Canvas/SettingsPanel"
        timeout: 3000
      screenshot: true
      expectedResult: "Settings panel opens"

    - id: step_2
      action: tap
      target:
        element: "/Canvas/SettingsPanel/ProfileTab"
        fallback: {x: 200, y: 300}
      description: "Navigate to profile tab"
      validation:
        type: element_active
        target: "/Canvas/SettingsPanel/ProfileTab"
        timeout: 2000
      expectedResult: "Profile tab becomes active"

    - id: step_3
      action: tap
      target:
        element: "/Canvas/SettingsPanel/Profile/PremiumBadge"
        fallback: {x: 400, y: 500}
      description: "Verify premium badge does NOT exist (negative test)"
      validation:
        type: element_exists
        target: "/Canvas/SettingsPanel/Profile/PremiumBadge"
        timeout: 2000
      expectedOutcome: fail
      continueOnFailure: true
      expectedResult: "Premium badge not found (user is not premium)"

    - id: step_4
      action: tap
      target:
        element: "/Canvas/SettingsPanel/Profile/EditNameButton"
        fallback: {x: 540, y: 600}
      description: "Click edit name button"
      validation:
        type: element_exists
        target: "/Canvas/EditNameDialog"
        timeout: 2000
      expectedResult: "Edit name dialog appears"

    - id: step_5
      action: input
      target:
        element: "/Canvas/EditNameDialog/NameInput"
        fallback: {x: 540, y: 700}
      value: "NewPlayerName"
      description: "Enter new player name"
      waitAfter: 500
      expectedResult: "New name entered"

    - id: step_6
      action: tap
      target:
        element: "/Canvas/EditNameDialog/SaveButton"
        fallback: {x: 540, y: 900}
      description: "Save new name"
      validation:
        type: text_contains
        target: "/Canvas/SettingsPanel/Profile/PlayerName"
        expected: "NewPlayerName"
        timeout: 3000
      screenshot: true
      expectedResult: "Name updated successfully"

    - id: step_7
      action: tap
      target:
        element: "/Canvas/SettingsPanel/CloseButton"
        fallback: {x: 980, y: 100}
      description: "Close settings"
      validation:
        type: element_exists
        target: "/Canvas/MainMenu"
        timeout: 2000
      expectedResult: "Return to main menu"

  cleanup:
    - id: cleanup_1
      action: tap
      target:
        element: "/Canvas/MainMenu/SettingsButton"
        fallback: {x: 100, y: 100}
      description: "Reopen settings for cleanup"

    - id: cleanup_2
      action: tap
      target:
        element: "/Canvas/SettingsPanel/Profile/ResetButton"
        fallback: {x: 540, y: 1200}
      description: "Reset profile to original state"
`
  },
  {
    id: 'visual_validation',
    name: 'Visual Validation Test',
    description: 'Test using screenshot matching for visual validation',
    category: 'advanced',
    template: `testCase:
  name: "Visual Validation Test"
  description: "Verify UI appearance using screenshot matching"
  tags: [visual, screenshot, ui]
  suite: "Default"

  steps:
    - id: step_1
      action: tap
      target:
        element: "/Canvas/MainMenu/PlayButton"
        fallback: {x: 540, y: 960}
      description: "Start game"
      waitAfter: 2000
      screenshot: true
      expectedResult: "Game starts"

    - id: step_2
      action: wait
      duration: 3000
      description: "Wait for game to fully load"
      expectedResult: "Loading complete"

    - id: step_3
      action: assert
      description: "Verify game UI matches expected layout"
      validation:
        type: screenshot_match
        threshold: 0.85
        timeout: 2000
      screenshot: true
      expectedResult: "Game UI matches reference screenshot"

    - id: step_4
      action: tap
      target:
        element: "/Canvas/GameplayUI/InventoryButton"
        fallback: {x: 900, y: 200}
      description: "Open inventory"
      waitAfter: 1000
      screenshot: true
      expectedResult: "Inventory opens"

    - id: step_5
      action: assert
      description: "Verify inventory UI is correct"
      validation:
        type: screenshot_match
        threshold: 0.9
        timeout: 2000
      screenshot: true
      expectedResult: "Inventory UI matches reference"
`
  },

  // ── Web HTML5 templates ─────────────────────────────────────────────────────

  {
    id: 'web_basic_click',
    name: 'Basic Web Click',
    description: 'Navigate to URL and click a button with CSS selector',
    category: 'web',
    template: `testCase:
  name: "Basic Web Click"
  description: "Navigate to game and click the start button"
  platform: web
  tags: [web, smoke, basic]
  suite: "Default"

  steps:
    - id: step_1
      action: navigate
      url: "https://game.example.com"
      description: "Open game page"
      expectedResult: "Page loads"

    - id: step_2
      action: wait_for_element
      target:
        selector: ".game-container"
      timeout: 10000
      description: "Wait for game container"
      expectedResult: "Game container visible"

    - id: step_3
      action: click
      target:
        selector: "#start-button"
        fallback: {x: 540, y: 400}
      description: "Click start button"
      validation:
        type: element_visible
        selector: ".game-screen"
        timeout: 3000
      expectedResult: "Game starts"

    - id: step_4
      action: wait
      duration: 2000
      description: "Wait for game to initialize"
      expectedResult: "Game is running"
`
  },
  {
    id: 'web_game_flow',
    name: 'Web Game Flow',
    description: 'Full web game session: load, play, pause, resume',
    category: 'web',
    template: `testCase:
  name: "Web Game Flow"
  description: "Verify complete game session from load to game over"
  platform: web
  tags: [web, game, critical]
  suite: "Default"

  steps:
    - id: step_1
      action: navigate
      url: "https://game.example.com"
      description: "Open game"
      expectedResult: "Game page loads"

    - id: step_2
      action: wait_for_element
      target:
        selector: "#main-menu"
      timeout: 10000
      description: "Wait for main menu"
      expectedResult: "Main menu visible"

    - id: step_3
      action: click
      target:
        selector: "#play-btn"
      description: "Start game"
      validation:
        type: element_visible
        selector: "#game-canvas"
        timeout: 5000
      expectedResult: "Game canvas appears"

    - id: step_4
      action: wait
      duration: 3000
      description: "Let game run briefly"
      expectedResult: "Game is in progress"

    - id: step_5
      action: click
      target:
        selector: "#pause-btn"
      description: "Pause game"
      validation:
        type: element_visible
        selector: "#pause-menu"
        timeout: 2000
      expectedResult: "Pause menu appears"

    - id: step_6
      action: click
      target:
        selector: "#resume-btn"
      description: "Resume game"
      validation:
        type: element_not_visible
        selector: "#pause-menu"
        timeout: 2000
      expectedResult: "Game resumes"
`
  },
  {
    id: 'web_runstudio_sdk',
    name: 'PlayGuard SDK Test',
    description: 'Read game properties, trigger actions and query commands via HTML5 SDK',
    category: 'web',
    template: `testCase:
  name: "PlayGuard SDK Test"
  description: "Verify game state using PlayGuard HTML5 SDK"
  platform: web
  tags: [web, sdk]
  suite: "Default"

  # The browser opens automatically via the suite Game Link — no navigate step needed.
  # Replace property/action/command names with the ones your game registers.

  steps:
    - id: step_1
      action: sdk_property
      name: "coins"
      description: "Read initial coin count"
      validation:
        type: value_equals
        expected: "0"
      expectedResult: "Player starts with 0 coins"

    - id: step_2
      action: sdk_command
      name: "getUIElements"
      description: "Verify coinButton is registered as a UI element"
      validation:
        type: text_contains
        expected: "coinButton"
      expectedResult: "coinButton element is available"

    - id: step_3
      action: sdk_action
      name: "giveCoins"
      args: ["10"]
      description: "Give player 10 coins via SDK action"
      expectedResult: "Game adds 10 coins to internal state"

    - id: step_4
      action: sdk_property
      name: "coins"
      description: "Verify coin count increased to 10"
      validation:
        type: value_equals
        expected: "10"
      expectedResult: "Player now has 10 coins"

    - id: step_5
      action: sdk_command
      name: "getFullState"
      description: "Query full game state"
      validation:
        type: text_contains
        expected: "coins"
      expectedResult: "Full state includes coins field"
`
  },
  {
    id: 'web_form_input',
    name: 'Web Form / Login',
    description: 'Fill a web form using CSS selectors and assert result',
    category: 'web',
    template: `testCase:
  name: "Web Login Form"
  description: "Verify user can log in via web form"
  platform: web
  tags: [web, auth, smoke]
  suite: "Default"

  steps:
    - id: step_1
      action: navigate
      url: "https://game.example.com/login"
      description: "Open login page"
      expectedResult: "Login page visible"

    - id: step_2
      action: wait_for_element
      target:
        selector: "form#login-form"
      timeout: 5000
      description: "Wait for login form"
      expectedResult: "Form is ready"

    - id: step_3
      action: type
      target:
        selector: "input#username"
      value: "testuser"
      description: "Enter username"
      expectedResult: "Username entered"

    - id: step_4
      action: type
      target:
        selector: "input#password"
      value: "testpass123"
      description: "Enter password"
      expectedResult: "Password entered"

    - id: step_5
      action: click
      target:
        selector: "button[type='submit']"
      description: "Submit login form"
      validation:
        type: url_contains
        expected: "/dashboard"
        timeout: 5000
      expectedResult: "Redirected to dashboard"

    - id: step_6
      action: execute_js
      script: "return document.querySelector('.user-name')?.textContent"
      description: "Verify logged-in user name via JS"
      expectedResult: "Username displayed in header"
`
  }
]

interface Props {
  onSelectTemplate: (template: string) => void
  onClose: () => void
  platform?: 'android' | 'web'
}

const CATEGORY_META: Record<string, { label: string; icon: 'android' | 'web' | null }> = {
  basic:    { label: 'Basic Tests',   icon: 'android' },
  game:     { label: 'Game Testing',  icon: 'android' },
  ui:       { label: 'UI Testing',    icon: 'android' },
  advanced: { label: 'Advanced',      icon: 'android' },
  web:      { label: 'Web HTML5',     icon: 'web'     }
}

// Show web categories first when platform is web
const CATEGORY_ORDER_ANDROID = ['basic', 'game', 'ui', 'advanced', 'web']
const CATEGORY_ORDER_WEB     = ['web', 'basic', 'game', 'ui', 'advanced']

export function TemplateLibrary({ onSelectTemplate, onClose, platform = 'android' }: Props) {
  const groupedTemplates = TEMPLATES.reduce(
    (acc, template) => {
      if (!acc[template.category]) acc[template.category] = []
      acc[template.category].push(template)
      return acc
    },
    {} as Record<string, TestTemplate[]>
  )

  const categoryOrder = platform === 'web' ? CATEGORY_ORDER_WEB : CATEGORY_ORDER_ANDROID

  const handleSelectTemplate = (template: TestTemplate) => {
    onSelectTemplate(template.template)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg shadow-lg w-[700px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Template Library</h2>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
              platform === 'web'
                ? 'bg-blue-500/15 text-blue-400'
                : 'bg-muted text-muted-foreground'
            }`}>
              {platform === 'web' ? 'Web HTML5' : 'Android'}
            </span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <p className="text-sm text-muted-foreground mb-6">
            Choose a template to get started quickly. Templates matching your platform are shown first.
          </p>

          {categoryOrder.map((category) => {
            const templates = groupedTemplates[category]
            if (!templates) return null
            const meta = CATEGORY_META[category]
            const isCurrentPlatform =
              (platform === 'web' && category === 'web') ||
              (platform === 'android' && category !== 'web')

            return (
              <div key={category} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  {meta.icon === 'web'
                    ? <Globe className="w-3.5 h-3.5 text-blue-400" />
                    : <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />}
                  <h3 className={`text-xs font-semibold uppercase tracking-wide ${
                    isCurrentPlatform ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {meta.label}
                  </h3>
                  {isCurrentPlatform && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary font-medium">Recommended</span>
                  )}
                </div>
                <div className="space-y-2">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      className={`w-full flex items-center justify-between p-4 border rounded-lg transition-colors text-left group ${
                        isCurrentPlatform
                          ? 'border-border hover:border-primary hover:bg-primary/5'
                          : 'border-border/50 hover:border-border hover:bg-muted/30 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-foreground mb-1">
                          {template.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {template.description}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 ml-4" />
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
