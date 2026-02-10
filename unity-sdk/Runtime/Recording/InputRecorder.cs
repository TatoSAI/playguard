using UnityEngine;
using System.Collections.Generic;
using System.Text;
using UnityEngine.EventSystems;

namespace PlayGuard.Core
{
    /// <summary>
    /// Records user input (taps, swipes, etc.) for test creation
    /// </summary>
    public class InputRecorder : MonoBehaviour
    {
        public bool IsRecording { get; private set; }
        public bool IsPaused { get; private set; }

        private List<RecordedAction> recordedActions;
        private float recordingStartTime;
        private Vector2 touchStartPosition;
        private float touchStartTime;
        private bool isTouchActive;

        [System.Serializable]
        private class RecordedAction
        {
            public string id;
            public string type;
            public string description;
            public float timestamp;
            public ActionTarget target;
            public string value;
            public ActionOptions options;
        }

        [System.Serializable]
        private class ActionTarget
        {
            public string method = "coordinates";
            public string value;
            public Coordinates fallback;
        }

        [System.Serializable]
        private class Coordinates
        {
            public float x;
            public float y;
        }

        [System.Serializable]
        private class ActionOptions
        {
            public float waitBefore;
            public float waitAfter;
            public bool screenshot;
        }

        public void Initialize()
        {
            recordedActions = new List<RecordedAction>();
            Debug.Log("[PlayGuard] Input Recorder initialized");
        }

        public void StartRecording()
        {
            IsRecording = true;
            IsPaused = false;
            recordedActions.Clear();
            recordingStartTime = Time.time;

            Debug.Log("[PlayGuard] Started recording input");
        }

        public string StopRecording()
        {
            IsRecording = false;
            Debug.Log($"[PlayGuard] Stopped recording - captured {recordedActions.Count} actions");

            return GenerateTestJSON();
        }

        public void PauseRecording()
        {
            IsPaused = true;
            Debug.Log("[PlayGuard] Paused recording");
        }

        public void ResumeRecording()
        {
            IsPaused = false;
            Debug.Log("[PlayGuard] Resumed recording");
        }

        private void Update()
        {
            if (!IsRecording || IsPaused)
                return;

            CaptureInput();
        }

        private void CaptureInput()
        {
            // Handle mouse input (for editor testing)
            #if UNITY_EDITOR || UNITY_STANDALONE
            if (Input.GetMouseButtonDown(0))
            {
                HandleTouchStart(Input.mousePosition);
            }
            else if (Input.GetMouseButtonUp(0))
            {
                HandleTouchEnd(Input.mousePosition);
            }
            #endif

            // Handle touch input (for mobile)
            #if UNITY_ANDROID || UNITY_IOS
            if (Input.touchCount > 0)
            {
                Touch touch = Input.GetTouch(0);

                if (touch.phase == TouchPhase.Began)
                {
                    HandleTouchStart(touch.position);
                }
                else if (touch.phase == TouchPhase.Ended)
                {
                    HandleTouchEnd(touch.position);
                }
            }
            #endif
        }

        private void HandleTouchStart(Vector2 position)
        {
            touchStartPosition = position;
            touchStartTime = Time.time;
            isTouchActive = true;
        }

        private void HandleTouchEnd(Vector2 position)
        {
            if (!isTouchActive)
                return;

            isTouchActive = false;

            float touchDuration = Time.time - touchStartTime;
            Vector2 delta = position - touchStartPosition;
            float distance = delta.magnitude;

            // Determine if it's a tap or swipe
            if (distance < 50f) // Tap threshold
            {
                RecordTap(touchStartPosition);
            }
            else // Swipe
            {
                RecordSwipe(touchStartPosition, position, touchDuration);
            }
        }

        private void RecordTap(Vector2 screenPosition)
        {
            // Convert to normalized coordinates (0-1)
            Vector2 normalized = new Vector2(
                screenPosition.x / Screen.width,
                screenPosition.y / Screen.height
            );

            // Try to detect UI element at position
            string targetName = DetectUIElement(screenPosition);

            var action = new RecordedAction
            {
                id = $"step_{recordedActions.Count + 1}",
                type = "tap",
                description = string.IsNullOrEmpty(targetName)
                    ? $"Tap at ({normalized.x:F2}, {normalized.y:F2})"
                    : $"Tap on {targetName}",
                timestamp = Time.time - recordingStartTime,
                target = new ActionTarget
                {
                    method = string.IsNullOrEmpty(targetName) ? "coordinates" : "gameObject",
                    value = targetName,
                    fallback = new Coordinates { x = normalized.x, y = normalized.y }
                },
                options = new ActionOptions
                {
                    screenshot = true,
                    waitBefore = 0.5f,
                    waitAfter = 0.5f
                }
            };

            recordedActions.Add(action);
            Debug.Log($"[PlayGuard] Recorded tap: {action.description}");
        }

        private void RecordSwipe(Vector2 startPos, Vector2 endPos, float duration)
        {
            // Convert to normalized coordinates
            Vector2 normalizedStart = new Vector2(
                startPos.x / Screen.width,
                startPos.y / Screen.height
            );
            Vector2 normalizedEnd = new Vector2(
                endPos.x / Screen.width,
                endPos.y / Screen.height
            );

            var action = new RecordedAction
            {
                id = $"step_{recordedActions.Count + 1}",
                type = "swipe",
                description = $"Swipe from ({normalizedStart.x:F2}, {normalizedStart.y:F2}) to ({normalizedEnd.x:F2}, {normalizedEnd.y:F2})",
                timestamp = Time.time - recordingStartTime
            };

            recordedActions.Add(action);
            Debug.Log($"[PlayGuard] Recorded swipe: {action.description}");
        }

        private string DetectUIElement(Vector2 screenPosition)
        {
            // Raycast to detect UI elements
            PointerEventData eventData = new PointerEventData(EventSystem.current)
            {
                position = screenPosition
            };

            List<RaycastResult> results = new List<RaycastResult>();
            EventSystem.current.RaycastAll(eventData, results);

            if (results.Count > 0)
            {
                GameObject hitObject = results[0].gameObject;

                // Try to find a meaningful name
                // Look for parent with Button, Toggle, etc.
                Transform current = hitObject.transform;
                while (current != null)
                {
                    if (current.GetComponent<UnityEngine.UI.Button>() != null ||
                        current.GetComponent<UnityEngine.UI.Toggle>() != null ||
                        current.GetComponent<UnityEngine.UI.InputField>() != null)
                    {
                        return current.name;
                    }
                    current = current.parent;
                }

                return hitObject.name;
            }

            return null;
        }

        private string GenerateTestJSON()
        {
            StringBuilder json = new StringBuilder();
            json.AppendLine("{");
            json.AppendLine($"  \"id\": \"test_{System.DateTime.Now.Ticks}\",");
            json.AppendLine($"  \"name\": \"Recorded Test\",");
            json.AppendLine($"  \"description\": \"Test recorded on {System.DateTime.Now}\",");
            json.AppendLine($"  \"version\": \"1.0\",");
            json.AppendLine($"  \"tags\": [\"recorded\"],");
            json.AppendLine($"  \"createdAt\": \"{System.DateTime.UtcNow:o}\",");
            json.AppendLine($"  \"updatedAt\": \"{System.DateTime.UtcNow:o}\",");
            json.AppendLine($"  \"steps\": [");

            for (int i = 0; i < recordedActions.Count; i++)
            {
                var action = recordedActions[i];
                json.AppendLine("    {");
                json.AppendLine($"      \"id\": \"{action.id}\",");
                json.AppendLine($"      \"type\": \"{action.type}\",");
                json.AppendLine($"      \"description\": \"{action.description}\",");

                if (action.target != null)
                {
                    json.AppendLine($"      \"target\": {{");
                    json.AppendLine($"        \"method\": \"{action.target.method}\",");
                    if (!string.IsNullOrEmpty(action.target.value))
                    {
                        json.AppendLine($"        \"value\": \"{action.target.value}\",");
                    }
                    if (action.target.fallback != null)
                    {
                        json.AppendLine($"        \"fallback\": {{");
                        json.AppendLine($"          \"x\": {action.target.fallback.x:F4},");
                        json.AppendLine($"          \"y\": {action.target.fallback.y:F4}");
                        json.AppendLine($"        }}");
                    }
                    json.AppendLine($"      }},");
                }

                if (action.options != null)
                {
                    json.AppendLine($"      \"options\": {{");
                    json.AppendLine($"        \"waitBefore\": {action.options.waitBefore:F1},");
                    json.AppendLine($"        \"waitAfter\": {action.options.waitAfter:F1},");
                    json.AppendLine($"        \"screenshot\": {action.options.screenshot.ToString().ToLower()}");
                    json.AppendLine($"      }}");
                }

                if (i < recordedActions.Count - 1)
                    json.AppendLine("    },");
                else
                    json.AppendLine("    }");
            }

            json.AppendLine("  ]");
            json.AppendLine("}");

            return json.ToString();
        }

        public void AddManualWait(float duration)
        {
            var action = new RecordedAction
            {
                id = $"step_{recordedActions.Count + 1}",
                type = "wait",
                description = $"Wait {duration} seconds",
                timestamp = Time.time - recordingStartTime
            };

            recordedActions.Add(action);
            Debug.Log($"[PlayGuard] Added manual wait: {duration}s");
        }

        public void AddManualAssertion(string elementName)
        {
            var action = new RecordedAction
            {
                id = $"step_{recordedActions.Count + 1}",
                type = "assert",
                description = $"Assert {elementName} exists",
                timestamp = Time.time - recordingStartTime,
                target = new ActionTarget
                {
                    method = "gameObject",
                    value = elementName
                }
            };

            recordedActions.Add(action);
            Debug.Log($"[PlayGuard] Added assertion: {elementName}");
        }
    }
}
