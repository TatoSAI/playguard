/**
 * DependencyValidator - Validates test case dependencies and detects issues
 */

import {
  Prerequisite,
  TestDependencyPrerequisite,
  DependencyIssue,
  DependencyIssueFix,
  DependencyValidationResult,
  DependencyGraph,
  DependencyGraphNode,
  SuiteExecutionPlan
} from '../types/test-prerequisites'
import { TestCase, TestSuite } from '../types/models'

export class DependencyValidator {
  /**
   * Validate a single test case for dependency issues
   */
  validateTestCase(
    testCase: TestCase,
    allTestCases: TestCase[]
  ): DependencyValidationResult {
    const issues: DependencyIssue[] = []

    if (!testCase.prerequisites || testCase.prerequisites.length === 0) {
      return { valid: true, issues: [] }
    }

    // Check for missing prerequisite tests
    const missingTests = this.findMissingPrerequisiteTests(testCase, allTestCases)
    if (missingTests.length > 0) {
      issues.push(...missingTests)
    }

    // Check for disabled prerequisites
    const disabledPrereqs = this.findDisabledPrerequisites(testCase, allTestCases)
    if (disabledPrereqs.length > 0) {
      issues.push(...disabledPrereqs)
    }

    // Check for circular dependencies
    const circular = this.findCircularDependencies(testCase, allTestCases)
    if (circular) {
      issues.push(circular)
    }

    return {
      valid: issues.length === 0,
      issues
    }
  }

  /**
   * Validate a test suite for dependency issues
   */
  validateSuite(
    suite: TestSuite,
    allTestCases: TestCase[]
  ): DependencyValidationResult {
    const issues: DependencyIssue[] = []

    // Get test cases in this suite
    const suiteTestCases = allTestCases.filter((tc) => suite.testCaseIds.includes(tc.id))

    // Check each test case
    for (const testCase of suiteTestCases) {
      const testIssues = this.validateTestCase(testCase, allTestCases)
      issues.push(...testIssues.issues)
    }

    // Check for missing prerequisites in suite
    const missingInSuite = this.findMissingPrerequisitesInSuite(suite, suiteTestCases, allTestCases)
    if (missingInSuite.length > 0) {
      issues.push(...missingInSuite)
    }

    // Check execution order
    const orderIssues = this.validateExecutionOrder(suite, suiteTestCases, allTestCases)
    if (orderIssues.length > 0) {
      issues.push(...orderIssues)
    }

    // Generate correct execution order if there are order issues
    let executionOrder: string[] | undefined
    if (orderIssues.length > 0) {
      try {
        executionOrder = this.generateExecutionOrder(suiteTestCases, allTestCases)
      } catch (error) {
        // If we can't generate order (circular dependencies), executionOrder stays undefined
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      executionOrder
    }
  }

  /**
   * Find missing prerequisite test cases
   */
  private findMissingPrerequisiteTests(
    testCase: TestCase,
    allTestCases: TestCase[]
  ): DependencyIssue[] {
    const issues: DependencyIssue[] = []

    if (!testCase.prerequisites) return issues

    const testDeps = testCase.prerequisites.filter(
      (p) => p.type === 'test_dependency'
    ) as TestDependencyPrerequisite[]

    for (const dep of testDeps) {
      const exists = allTestCases.some((tc) => tc.id === dep.testCaseId)

      if (!exists) {
        issues.push({
          type: 'missing_prerequisite_test',
          severity: 'error',
          message: `Test case "${testCase.name}" depends on non-existent test "${dep.testCaseId}"`,
          affectedTestCaseIds: [testCase.id],
          suggestedFix: {
            type: 'remove_dependency',
            description: 'Remove this broken dependency',
            autoApplicable: true,
            data: { testCaseId: testCase.id, prerequisiteId: dep.id }
          }
        })
      }
    }

    return issues
  }

  /**
   * Find disabled prerequisites
   */
  private findDisabledPrerequisites(
    testCase: TestCase,
    allTestCases: TestCase[]
  ): DependencyIssue[] {
    const issues: DependencyIssue[] = []

    if (!testCase.prerequisites) return issues

    const disabledPrereqs = testCase.prerequisites.filter((p) => !p.enabled)

    if (disabledPrereqs.length > 0) {
      issues.push({
        type: 'disabled_prerequisite',
        severity: 'warning',
        message: `Test case "${testCase.name}" has ${disabledPrereqs.length} disabled prerequisite(s)`,
        affectedTestCaseIds: [testCase.id],
        suggestedFix: {
          type: 'enable_prerequisite',
          description: 'Enable disabled prerequisites',
          autoApplicable: true,
          data: {
            testCaseId: testCase.id,
            prerequisiteIds: disabledPrereqs.map((p) => p.id)
          }
        }
      })
    }

    return issues
  }

  /**
   * Find circular dependencies
   */
  private findCircularDependencies(
    testCase: TestCase,
    allTestCases: TestCase[]
  ): DependencyIssue | null {
    const visited = new Set<string>()
    const recursionStack = new Set<string>()

    const hasCycle = (currentId: string, path: string[]): string[] | null => {
      if (recursionStack.has(currentId)) {
        // Found a cycle - return the cycle path
        const cycleStart = path.indexOf(currentId)
        return path.slice(cycleStart).concat(currentId)
      }

      if (visited.has(currentId)) {
        return null
      }

      visited.add(currentId)
      recursionStack.add(currentId)
      path.push(currentId)

      const currentTest = allTestCases.find((tc) => tc.id === currentId)
      if (currentTest?.prerequisites) {
        const deps = currentTest.prerequisites.filter(
          (p) => p.type === 'test_dependency' && p.enabled
        ) as TestDependencyPrerequisite[]

        for (const dep of deps) {
          const cycle = hasCycle(dep.testCaseId, [...path])
          if (cycle) {
            return cycle
          }
        }
      }

      path.pop()
      recursionStack.delete(currentId)
      return null
    }

    const cycle = hasCycle(testCase.id, [])

    if (cycle) {
      const cycleNames = cycle
        .map((id) => allTestCases.find((tc) => tc.id === id)?.name || id)
        .join(' → ')

      return {
        type: 'circular_dependency',
        severity: 'error',
        message: `Circular dependency detected: ${cycleNames}`,
        affectedTestCaseIds: cycle,
        suggestedFix: {
          type: 'remove_dependency',
          description: 'Break the circular dependency by removing one link',
          autoApplicable: false,
          data: { cycle }
        }
      }
    }

    return null
  }

  /**
   * Find prerequisites that are missing from the suite
   */
  private findMissingPrerequisitesInSuite(
    suite: TestSuite,
    suiteTestCases: TestCase[],
    allTestCases: TestCase[]
  ): DependencyIssue[] {
    const issues: DependencyIssue[] = []
    const suiteTestIds = new Set(suite.testCaseIds)
    const missingTests = new Set<string>()

    for (const testCase of suiteTestCases) {
      if (!testCase.prerequisites) continue

      const testDeps = testCase.prerequisites.filter(
        (p) => p.type === 'test_dependency' && p.enabled
      ) as TestDependencyPrerequisite[]

      for (const dep of testDeps) {
        if (!suiteTestIds.has(dep.testCaseId)) {
          missingTests.add(dep.testCaseId)
        }
      }
    }

    if (missingTests.size > 0) {
      const missingNames = Array.from(missingTests)
        .map((id) => allTestCases.find((tc) => tc.id === id)?.name || id)
        .join(', ')

      issues.push({
        type: 'missing_in_suite',
        severity: 'error',
        message: `Suite "${suite.name}" is missing prerequisite test(s): ${missingNames}`,
        affectedTestCaseIds: Array.from(missingTests),
        suggestedFix: {
          type: 'add_to_suite',
          description: 'Add missing prerequisite tests to the suite',
          autoApplicable: true,
          data: {
            suiteId: suite.id,
            testCaseIds: Array.from(missingTests)
          }
        }
      })
    }

    return issues
  }

  /**
   * Validate execution order
   */
  private validateExecutionOrder(
    suite: TestSuite,
    suiteTestCases: TestCase[],
    allTestCases: TestCase[]
  ): DependencyIssue[] {
    const issues: DependencyIssue[] = []
    const testIndexMap = new Map(suite.testCaseIds.map((id, index) => [id, index]))

    for (const testCase of suiteTestCases) {
      if (!testCase.prerequisites) continue

      const testIndex = testIndexMap.get(testCase.id)
      if (testIndex === undefined) continue

      const testDeps = testCase.prerequisites.filter(
        (p) => p.type === 'test_dependency' && p.enabled
      ) as TestDependencyPrerequisite[]

      for (const dep of testDeps) {
        const depIndex = testIndexMap.get(dep.testCaseId)

        if (depIndex !== undefined && depIndex > testIndex) {
          const depTest = allTestCases.find((tc) => tc.id === dep.testCaseId)

          issues.push({
            type: 'wrong_execution_order',
            severity: 'error',
            message: `Test "${testCase.name}" depends on "${depTest?.name}" but is scheduled to run before it`,
            affectedTestCaseIds: [testCase.id, dep.testCaseId],
            suggestedFix: {
              type: 'reorder_suite',
              description: 'Reorder tests to respect dependencies',
              autoApplicable: true,
              data: { suiteId: suite.id }
            }
          })
        }
      }
    }

    return issues
  }

  /**
   * Generate correct execution order using topological sort
   */
  generateExecutionOrder(
    suiteTestCases: TestCase[],
    allTestCases: TestCase[]
  ): string[] {
    const graph = this.buildDependencyGraph(suiteTestCases, allTestCases)

    if (graph.hasCycles) {
      throw new Error('Cannot generate execution order: circular dependencies detected')
    }

    // Topological sort using Kahn's algorithm
    const inDegree = new Map<string, number>()
    const queue: string[] = []
    const result: string[] = []

    // Initialize in-degree count
    for (const testId of Object.keys(graph.nodes)) {
      inDegree.set(testId, graph.nodes[testId].prerequisites.length)

      if (graph.nodes[testId].prerequisites.length === 0) {
        queue.push(testId)
      }
    }

    // Process queue
    while (queue.length > 0) {
      const current = queue.shift()!
      result.push(current)

      // Reduce in-degree for dependents
      for (const dependent of graph.nodes[current].dependents) {
        const degree = inDegree.get(dependent)!
        inDegree.set(dependent, degree - 1)

        if (degree - 1 === 0) {
          queue.push(dependent)
        }
      }
    }

    if (result.length !== Object.keys(graph.nodes).length) {
      throw new Error('Cannot generate execution order: graph contains cycles')
    }

    return result
  }

  /**
   * Build dependency graph for visualization and analysis
   */
  buildDependencyGraph(
    suiteTestCases: TestCase[],
    allTestCases: TestCase[]
  ): DependencyGraph {
    const nodes: Record<string, DependencyGraphNode> = {}
    const edges: Array<{ from: string; to: string }> = []

    // Initialize nodes
    for (const testCase of suiteTestCases) {
      nodes[testCase.id] = {
        testCaseId: testCase.id,
        name: testCase.name,
        prerequisites: [],
        dependents: [],
        depth: 0
      }
    }

    // Build edges
    for (const testCase of suiteTestCases) {
      if (!testCase.prerequisites) continue

      const testDeps = testCase.prerequisites.filter(
        (p) => p.type === 'test_dependency' && p.enabled
      ) as TestDependencyPrerequisite[]

      for (const dep of testDeps) {
        if (nodes[dep.testCaseId]) {
          nodes[testCase.id].prerequisites.push(dep.testCaseId)
          nodes[dep.testCaseId].dependents.push(testCase.id)
          edges.push({ from: dep.testCaseId, to: testCase.id })
        }
      }
    }

    // Calculate depths and detect cycles
    const cycles = this.detectCycles(nodes)

    // Calculate depth for each node (for visualization)
    this.calculateDepths(nodes)

    return {
      nodes,
      edges,
      hasCycles: cycles.length > 0,
      cycles: cycles.length > 0 ? cycles : undefined
    }
  }

  /**
   * Detect all cycles in the dependency graph
   */
  private detectCycles(nodes: Record<string, DependencyGraphNode>): string[][] {
    const cycles: string[][] = []
    const visited = new Set<string>()
    const recursionStack = new Set<string>()

    const dfs = (nodeId: string, path: string[]): void => {
      if (recursionStack.has(nodeId)) {
        const cycleStart = path.indexOf(nodeId)
        cycles.push(path.slice(cycleStart).concat(nodeId))
        return
      }

      if (visited.has(nodeId)) return

      visited.add(nodeId)
      recursionStack.add(nodeId)
      path.push(nodeId)

      for (const prereq of nodes[nodeId].prerequisites) {
        if (nodes[prereq]) {
          dfs(prereq, [...path])
        }
      }

      path.pop()
      recursionStack.delete(nodeId)
    }

    for (const nodeId of Object.keys(nodes)) {
      if (!visited.has(nodeId)) {
        dfs(nodeId, [])
      }
    }

    return cycles
  }

  /**
   * Calculate depth for each node in the graph
   */
  private calculateDepths(nodes: Record<string, DependencyGraphNode>): void {
    const visited = new Set<string>()

    const calculateDepth = (nodeId: string): number => {
      if (visited.has(nodeId)) {
        return nodes[nodeId].depth
      }

      visited.add(nodeId)

      if (nodes[nodeId].prerequisites.length === 0) {
        nodes[nodeId].depth = 0
        return 0
      }

      const maxPrereqDepth = Math.max(
        ...nodes[nodeId].prerequisites
          .filter((id) => nodes[id])
          .map((id) => calculateDepth(id))
      )

      nodes[nodeId].depth = maxPrereqDepth + 1
      return maxPrereqDepth + 1
    }

    for (const nodeId of Object.keys(nodes)) {
      if (!visited.has(nodeId)) {
        calculateDepth(nodeId)
      }
    }
  }

  /**
   * Generate suite execution plan with dependency information
   */
  generateSuiteExecutionPlan(
    suite: TestSuite,
    allTestCases: TestCase[]
  ): SuiteExecutionPlan {
    const suiteTestCases = allTestCases.filter((tc) => suite.testCaseIds.includes(tc.id))
    const executionOrder = this.generateExecutionOrder(suiteTestCases, allTestCases)
    const dependencyGraph = this.buildDependencyGraph(suiteTestCases, allTestCases)

    // Calculate total prerequisites and estimated duration
    let totalPrerequisites = 0
    let estimatedDuration = 0

    for (const testCase of suiteTestCases) {
      if (testCase.prerequisites) {
        totalPrerequisites += testCase.prerequisites.length
      }
      // Estimate 5 seconds per test case (this can be improved with actual test durations)
      estimatedDuration += 5000
    }

    return {
      suiteId: suite.id,
      testCases: executionOrder,
      totalPrerequisites,
      estimatedDuration,
      dependencyGraph
    }
  }
}
