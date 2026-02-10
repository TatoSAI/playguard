using UnityEngine;
using System.Collections;
using System.Collections.Generic;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace PlayGuard.Core
{
    /// <summary>
    /// Executes test cases by simulating input
    /// </summary>
    public class TestExecutor : MonoBehaviour
    {
        public bool IsPlaying { get; private set; }

        private bool shouldStop = false;
        private Coroutine currentTestCoroutine;

        public void Initialize()
        {
            Debug.Log("[PlayGuard] Test Executor initialized");
        }

        public void PlayTest(string testJson)
        {
            if (IsPlaying)
            {
                Debug.LogWarning("[PlayGuard] Test is already playing");
                return;
            }

            IsPlaying = true;
            shouldStop = false;

            Debug.Log($"[PlayGuard] Starting test playback");

            // Parse JSON and execute
            currentTestCoroutine = StartCoroutine(ExecuteTestCoroutine(testJson));
        }

        public void StopTest()
        {
            shouldStop = true;

            if (currentTestCoroutine != null)
            {
                StopCoroutine(currentTestCoroutine);
                currentTestCoroutine = null;
            }

            IsPlaying = false;
            Debug.Log("[PlayGuard] Test execution stopped");
        }

        private IEnumerator ExecuteTestCoroutine(string testJson)
        {
            // TODO: Proper JSON parsing
            // For now, just log
            Debug.Log($"[PlayGuard] Executing test: {testJson}");

            // Simulate test execution
            yield return new WaitForSeconds(1f);

            // In real implementation, parse JSON and execute steps
            // For now, mark as complete
            IsPlaying = false;

            Debug.Log("[PlayGuard] Test execution completed");
        }

        /// <summary>
        /// Simulate a tap at normalized coordinates (0-1)
        /// </summary>
        public void SimulateTap(float normalizedX, float normalizedY)
        {
            StartCoroutine(SimulateTapCoroutine(normalizedX, normalizedY));
        }

        private IEnumerator SimulateTapCoroutine(float normalizedX, float normalizedY)
        {
            // Convert normalized to screen coordinates
            Vector2 screenPosition = new Vector2(
                normalizedX * Screen.width,
                normalizedY * Screen.height
            );

            Debug.Log($"[PlayGuard] Simulating tap at ({screenPosition.x}, {screenPosition.y})");

            // Try to find UI element at position
            PointerEventData eventData = new PointerEventData(EventSystem.current)
            {
                position = screenPosition
            };

            List<RaycastResult> results = new List<RaycastResult>();
            EventSystem.current.RaycastAll(eventData, results);

            if (results.Count > 0)
            {
                GameObject hitObject = results[0].gameObject;
                Debug.Log($"[PlayGuard] Hit UI element: {hitObject.name}");

                // Try to click button
                Button button = hitObject.GetComponentInParent<Button>();
                if (button != null && button.interactable)
                {
                    Debug.Log($"[PlayGuard] Clicking button: {button.name}");
                    button.onClick.Invoke();
                }

                // Try to toggle
                Toggle toggle = hitObject.GetComponentInParent<Toggle>();
                if (toggle != null && toggle.interactable)
                {
                    Debug.Log($"[PlayGuard] Toggling: {toggle.name}");
                    toggle.isOn = !toggle.isOn;
                }
            }
            else
            {
                Debug.Log("[PlayGuard] No UI element found at tap position");
            }

            yield return null;
        }

        /// <summary>
        /// Simulate text input into an InputField
        /// </summary>
        public void SimulateTextInput(string elementName, string text)
        {
            GameObject obj = GameObject.Find(elementName);
            if (obj == null)
            {
                Debug.LogWarning($"[PlayGuard] GameObject '{elementName}' not found");
                return;
            }

            InputField inputField = obj.GetComponent<InputField>();
            if (inputField != null)
            {
                Debug.Log($"[PlayGuard] Setting text in InputField '{elementName}': {text}");
                inputField.text = text;
                inputField.onValueChanged.Invoke(text);
            }
            else
            {
                Debug.LogWarning($"[PlayGuard] InputField component not found on '{elementName}'");
            }
        }

        /// <summary>
        /// Simulate a swipe gesture
        /// </summary>
        public void SimulateSwipe(float fromX, float fromY, float toX, float toY, float duration)
        {
            StartCoroutine(SimulateSwipeCoroutine(fromX, fromY, toX, toY, duration));
        }

        private IEnumerator SimulateSwipeCoroutine(float fromX, float fromY, float toX, float toY, float duration)
        {
            Vector2 from = new Vector2(fromX * Screen.width, fromY * Screen.height);
            Vector2 to = new Vector2(toX * Screen.width, toY * Screen.height);

            Debug.Log($"[PlayGuard] Simulating swipe from ({from.x}, {from.y}) to ({to.x}, {to.y})");

            // TODO: Implement actual swipe simulation
            // This would require generating touch events or using Input simulation

            yield return new WaitForSeconds(duration);

            Debug.Log("[PlayGuard] Swipe simulation completed");
        }

        /// <summary>
        /// Wait for a specific duration
        /// </summary>
        public IEnumerator Wait(float seconds)
        {
            Debug.Log($"[PlayGuard] Waiting for {seconds} seconds");
            yield return new WaitForSeconds(seconds);
        }

        /// <summary>
        /// Assert that a GameObject exists
        /// </summary>
        public bool AssertGameObjectExists(string elementName)
        {
            GameObject obj = GameObject.Find(elementName);
            bool exists = obj != null;

            if (exists)
            {
                Debug.Log($"[PlayGuard] ✓ Assertion passed: '{elementName}' exists");
            }
            else
            {
                Debug.LogError($"[PlayGuard] ✗ Assertion failed: '{elementName}' not found");
            }

            return exists;
        }

        /// <summary>
        /// Assert that a GameObject is active
        /// </summary>
        public bool AssertGameObjectActive(string elementName)
        {
            GameObject obj = GameObject.Find(elementName);
            if (obj == null)
            {
                Debug.LogError($"[PlayGuard] ✗ Assertion failed: '{elementName}' not found");
                return false;
            }

            bool isActive = obj.activeSelf;
            if (isActive)
            {
                Debug.Log($"[PlayGuard] ✓ Assertion passed: '{elementName}' is active");
            }
            else
            {
                Debug.LogError($"[PlayGuard] ✗ Assertion failed: '{elementName}' is not active");
            }

            return isActive;
        }

        /// <summary>
        /// Assert that text matches expected value
        /// </summary>
        public bool AssertTextEquals(string elementName, string expectedText)
        {
            GameObject obj = GameObject.Find(elementName);
            if (obj == null)
            {
                Debug.LogError($"[PlayGuard] ✗ Assertion failed: '{elementName}' not found");
                return false;
            }

            Text textComponent = obj.GetComponent<Text>();
            if (textComponent == null)
            {
                Debug.LogError($"[PlayGuard] ✗ Assertion failed: Text component not found on '{elementName}'");
                return false;
            }

            bool matches = textComponent.text == expectedText;
            if (matches)
            {
                Debug.Log($"[PlayGuard] ✓ Assertion passed: Text equals '{expectedText}'");
            }
            else
            {
                Debug.LogError($"[PlayGuard] ✗ Assertion failed: Expected '{expectedText}', got '{textComponent.text}'");
            }

            return matches;
        }

        /// <summary>
        /// Find GameObject by name (recursive search)
        /// </summary>
        private GameObject FindGameObjectRecursive(string name)
        {
            GameObject[] allObjects = FindObjectsOfType<GameObject>();
            foreach (var obj in allObjects)
            {
                if (obj.name == name)
                    return obj;
            }
            return null;
        }
    }
}
