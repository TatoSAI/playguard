// PERFORMANCE OPTIMIZED VERSION
// - Only active in Development builds (zero overhead in production)
// - Minimal main thread work (processes commands on-demand)
// - Auto-disables when not connected
// - Single script drop-in, no configuration needed

#if DEVELOPMENT_BUILD || UNITY_EDITOR

using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using UnityEngine;
using UnityEngine.UI;

namespace PlayGuard
{
    /// <summary>
    /// PlayGuard SDK - Automated testing for Unity games
    /// ZERO CONFIGURATION: Just add this script to any GameObject
    /// ZERO PERFORMANCE IMPACT: Only active in Development builds
    /// </summary>
    [DefaultExecutionOrder(-1000)] // Run early
    public class PlayGuardSDK : MonoBehaviour
    {
        private const int DEFAULT_PORT = 12345;
        private const int CONNECTION_TIMEOUT = 10000; // 10 seconds without connection = auto-disable

        private TcpListener tcpListener;
        private Thread listenerThread;
        private TcpClient currentClient;
        private bool isRunning = false;
        private bool hasActiveConnection = false;
        private float lastConnectionTime;

        // Minimized queue processing - only when needed
        private Queue<Action> mainThreadActions = new Queue<Action>();
        private bool hasQueuedActions = false;

        // ===== v2.0 EXTENSIBILITY SYSTEM =====
        // Registries for custom game-specific extensions
        private Dictionary<string, Func<string>> customProperties = new Dictionary<string, Func<string>>();
        private Dictionary<string, Action<string[]>> customActions = new Dictionary<string, Action<string[]>>();
        private Dictionary<string, Func<string, string>> customCommands = new Dictionary<string, Func<string, string>>();

        // Singleton instance for easy access
        private static PlayGuardSDK instance;
        public static PlayGuardSDK Instance => instance;

        void Awake()
        {
            // Singleton pattern
            if (instance != null && instance != this)
            {
                Destroy(gameObject);
                return;
            }
            instance = this;

            DontDestroyOnLoad(gameObject);
            StartServer();
            Debug.Log("[PlayGuard] SDK initialized (Development build only)");
        }

        // ===== PUBLIC API FOR EXTENSIBILITY =====

        /// <summary>
        /// Register a custom property that can be queried during tests
        /// Example: RegisterCustomProperty("playerScore", () => PlayerManager.Instance.GetScore().ToString())
        /// </summary>
        public void RegisterCustomProperty(string name, Func<string> getter)
        {
            if (string.IsNullOrEmpty(name))
                throw new ArgumentException("Property name cannot be null or empty");

            if (getter == null)
                throw new ArgumentNullException(nameof(getter));

            customProperties[name] = getter;
            Debug.Log($"[PlayGuard] Registered custom property: {name}");
        }

        /// <summary>
        /// Register a custom action that can be executed during tests
        /// Example: RegisterCustomAction("giveCoins", (args) => PlayerManager.Instance.AddCoins(int.Parse(args[0])))
        /// </summary>
        public void RegisterCustomAction(string name, Action<string[]> action)
        {
            if (string.IsNullOrEmpty(name))
                throw new ArgumentException("Action name cannot be null or empty");

            if (action == null)
                throw new ArgumentNullException(nameof(action));

            customActions[name] = action;
            Debug.Log($"[PlayGuard] Registered custom action: {name}");
        }

        /// <summary>
        /// Register a custom command for complex operations
        /// Example: RegisterCustomCommand("getGameState", (param) => JsonUtility.ToJson(GameManager.State))
        /// </summary>
        public void RegisterCustomCommand(string name, Func<string, string> handler)
        {
            if (string.IsNullOrEmpty(name))
                throw new ArgumentException("Command name cannot be null or empty");

            if (handler == null)
                throw new ArgumentNullException(nameof(handler));

            customCommands[name] = handler;
            Debug.Log($"[PlayGuard] Registered custom command: {name}");
        }

        /// <summary>
        /// Unregister a custom property
        /// </summary>
        public void UnregisterCustomProperty(string name)
        {
            if (customProperties.Remove(name))
                Debug.Log($"[PlayGuard] Unregistered custom property: {name}");
        }

        /// <summary>
        /// Unregister a custom action
        /// </summary>
        public void UnregisterCustomAction(string name)
        {
            if (customActions.Remove(name))
                Debug.Log($"[PlayGuard] Unregistered custom action: {name}");
        }

        /// <summary>
        /// Unregister a custom command
        /// </summary>
        public void UnregisterCustomCommand(string name)
        {
            if (customCommands.Remove(name))
                Debug.Log($"[PlayGuard] Unregistered custom command: {name}");
        }

        /// <summary>
        /// Get list of all registered custom properties
        /// </summary>
        public string[] GetCustomPropertyNames()
        {
            string[] names = new string[customProperties.Count];
            customProperties.Keys.CopyTo(names, 0);
            return names;
        }

        /// <summary>
        /// Get list of all registered custom actions
        /// </summary>
        public string[] GetCustomActionNames()
        {
            string[] names = new string[customActions.Count];
            customActions.Keys.CopyTo(names, 0);
            return names;
        }

        /// <summary>
        /// Get list of all registered custom commands
        /// </summary>
        public string[] GetCustomCommandNames()
        {
            string[] names = new string[customCommands.Count];
            customCommands.Keys.CopyTo(names, 0);
            return names;
        }

        void Update()
        {
            // OPTIMIZED: Only process queue if we have actions
            if (!hasQueuedActions) return;

            lock (mainThreadActions)
            {
                while (mainThreadActions.Count > 0)
                {
                    mainThreadActions.Dequeue()?.Invoke();
                }
                hasQueuedActions = false;
            }

            // Auto-disable if no connection for too long
            if (hasActiveConnection && Time.realtimeSinceStartup - lastConnectionTime > CONNECTION_TIMEOUT / 1000f)
            {
                Debug.Log("[PlayGuard] No activity timeout, standing by...");
                hasActiveConnection = false;
            }
        }

        void OnDestroy()
        {
            StopServer();
        }

        void OnApplicationQuit()
        {
            StopServer();
        }

        private void StartServer()
        {
            if (isRunning) return;

            try
            {
                listenerThread = new Thread(ListenForClients) { IsBackground = true };
                listenerThread.Start();
                isRunning = true;
                Debug.Log($"[PlayGuard] Listening on port {DEFAULT_PORT}");
            }
            catch (Exception e)
            {
                Debug.LogError($"[PlayGuard] Failed to start: {e.Message}");
            }
        }

        private void StopServer()
        {
            if (!isRunning) return;

            isRunning = false;
            currentClient?.Close();
            tcpListener?.Stop();

            if (listenerThread != null && listenerThread.IsAlive)
            {
                listenerThread.Abort();
            }
        }

        private void ListenForClients()
        {
            try
            {
                tcpListener = new TcpListener(IPAddress.Any, DEFAULT_PORT);
                tcpListener.Start();

                while (isRunning)
                {
                    // OPTIMIZED: Only check for pending connections every 500ms
                    if (tcpListener.Pending())
                    {
                        if (currentClient != null && currentClient.Connected)
                        {
                            currentClient.Close();
                        }

                        currentClient = tcpListener.AcceptTcpClient();
                        hasActiveConnection = true;
                        lastConnectionTime = Time.realtimeSinceStartup;
                        Debug.Log("[PlayGuard] Client connected");

                        Thread clientThread = new Thread(() => HandleClient(currentClient)) { IsBackground = true };
                        clientThread.Start();
                    }

                    Thread.Sleep(500);
                }
            }
            catch (Exception e)
            {
                Debug.LogError($"[PlayGuard] Listener error: {e.Message}");
            }
        }

        private void HandleClient(TcpClient client)
        {
            NetworkStream stream = null;

            try
            {
                stream = client.GetStream();
                byte[] buffer = new byte[4096];

                while (isRunning && client.Connected)
                {
                    if (!stream.DataAvailable)
                    {
                        Thread.Sleep(50);
                        continue;
                    }

                    int bytesRead = stream.Read(buffer, 0, buffer.Length);
                    if (bytesRead == 0) break;

                    string message = Encoding.UTF8.GetString(buffer, 0, bytesRead).Trim();
                    lastConnectionTime = Time.realtimeSinceStartup;

                    // Process on main thread
                    string response = null;
                    ManualResetEvent responseReady = new ManualResetEvent(false);

                    QueueMainThreadAction(() =>
                    {
                        response = ProcessCommand(message);
                        responseReady.Set();
                    });

                    // Wait for response with timeout
                    if (responseReady.WaitOne(3000) && response != null)
                    {
                        byte[] responseBytes = Encoding.UTF8.GetBytes(response + "\n");
                        stream.Write(responseBytes, 0, responseBytes.Length);
                        stream.Flush();
                    }
                }
            }
            catch (Exception e)
            {
                Debug.LogWarning($"[PlayGuard] Client error: {e.Message}");
            }
            finally
            {
                stream?.Close();
                client?.Close();
                hasActiveConnection = false;
                Debug.Log("[PlayGuard] Client disconnected");
            }
        }

        private void QueueMainThreadAction(Action action)
        {
            lock (mainThreadActions)
            {
                mainThreadActions.Enqueue(action);
                hasQueuedActions = true;
            }
        }

        private string ProcessCommand(string message)
        {
            try
            {
                // Simple JSON parsing without external dependencies
                string command = ExtractCommand(message);

                switch (command)
                {
                    case "ping":
                        return CreateResponse(true, "\"pong\"");

                    case "getUIElements":
                        return GetUIElements();

                    case "getGameObjects":
                        bool includeInactive = message.Contains("\"includeInactive\":true");
                        return GetGameObjects(includeInactive);

                    case "findElement":
                        string name = ExtractParam(message, "name");
                        return FindElement(name);

                    case "tapElement":
                        string path = ExtractParam(message, "path");
                        return TapElement(path);

                    case "getElementProperty":
                        string ePath = ExtractParam(message, "path");
                        string property = ExtractParam(message, "property");
                        return GetElementProperty(ePath, property);

                    // ===== v2.0 CUSTOM EXTENSION COMMANDS =====

                    case "listCustomProperties":
                        return ListCustomProperties();

                    case "listCustomActions":
                        return ListCustomActions();

                    case "listCustomCommands":
                        return ListCustomCommands();

                    case "getCustomProperty":
                        string propName = ExtractParam(message, "name");
                        return GetCustomProperty(propName);

                    case "executeCustomAction":
                        string actionName = ExtractParam(message, "name");
                        string argsJson = ExtractParamArray(message, "args");
                        return ExecuteCustomAction(actionName, argsJson);

                    case "executeCustomCommand":
                        string cmdName = ExtractParam(message, "name");
                        string cmdParam = ExtractParam(message, "param");
                        return ExecuteCustomCommand(cmdName, cmdParam);

                    default:
                        return CreateResponse(false, null, $"Unknown command: {command}");
                }
            }
            catch (Exception e)
            {
                return CreateResponse(false, null, e.Message);
            }
        }

        // OPTIMIZED: Scan UI only when requested, not continuously
        private string GetUIElements()
        {
            List<string> elements = new List<string>();
            Canvas[] canvases = FindObjectsOfType<Canvas>();

            foreach (Canvas canvas in canvases)
            {
                if (!canvas.gameObject.activeInHierarchy) continue;
                ScanUIHierarchy(canvas.transform, "", elements);
            }

            return CreateResponse(true, $"{{\"elements\":[{string.Join(",", elements)}]}}");
        }

        private void ScanUIHierarchy(Transform transform, string path, List<string> elements)
        {
            string currentPath = string.IsNullOrEmpty(path) ? transform.name : $"{path}/{transform.name}";

            // Get component info efficiently
            string type = "Transform";
            string text = "";
            bool interactable = false;

            Graphic graphic = transform.GetComponent<Graphic>();
            if (graphic != null) type = graphic.GetType().Name;

            Text textComp = transform.GetComponent<Text>();
            if (textComp != null) text = textComp.text.Replace("\"", "\\\"");

            Button button = transform.GetComponent<Button>();
            if (button != null) interactable = button.interactable;

            Vector3 pos = transform.position;

            // Build JSON manually (faster than serialization)
            string element = $"{{" +
                $"\"name\":\"{transform.name}\"," +
                $"\"path\":\"{currentPath}\"," +
                $"\"type\":\"{type}\"," +
                $"\"active\":{(transform.gameObject.activeSelf ? "true" : "false")}," +
                $"\"position\":{{\"x\":{pos.x},\"y\":{pos.y},\"z\":{pos.z}}}," +
                $"\"text\":\"{text}\"," +
                $"\"interactable\":{(interactable ? "true" : "false")}" +
                $"}}";

            elements.Add(element);

            // Recurse children
            for (int i = 0; i < transform.childCount; i++)
            {
                ScanUIHierarchy(transform.GetChild(i), currentPath, elements);
            }
        }

        private string GetGameObjects(bool includeInactive)
        {
            List<string> objects = new List<string>();
            GameObject[] allObjects = includeInactive
                ? Resources.FindObjectsOfTypeAll<GameObject>()
                : FindObjectsOfType<GameObject>();

            int count = 0;
            foreach (GameObject obj in allObjects)
            {
                if (obj.hideFlags != HideFlags.None) continue;
                if (count++ > 1000) break; // Limit for performance

                Vector3 pos = obj.transform.position;
                string objJson = $"{{" +
                    $"\"name\":\"{obj.name}\"," +
                    $"\"path\":\"{GetGameObjectPath(obj.transform)}\"," +
                    $"\"active\":{(obj.activeInHierarchy ? "true" : "false")}," +
                    $"\"tag\":\"{obj.tag}\"," +
                    $"\"layer\":\"{LayerMask.LayerToName(obj.layer)}\"," +
                    $"\"position\":{{\"x\":{pos.x},\"y\":{pos.y},\"z\":{pos.z}}}" +
                    $"}}";

                objects.Add(objJson);
            }

            return CreateResponse(true, $"{{\"objects\":[{string.Join(",", objects)}]}}");
        }

        private string FindElement(string name)
        {
            GameObject obj = GameObject.Find(name);
            if (obj == null)
                return CreateResponse(false, null, "Element not found");

            Vector3 pos = obj.transform.position;
            string data = $"{{" +
                $"\"name\":\"{obj.name}\"," +
                $"\"path\":\"{GetGameObjectPath(obj.transform)}\"," +
                $"\"position\":{{\"x\":{pos.x},\"y\":{pos.y},\"z\":{pos.z}}}" +
                $"}}";

            return CreateResponse(true, data);
        }

        private string TapElement(string path)
        {
            GameObject obj = GameObject.Find(path);
            if (obj == null)
                return CreateResponse(false, null, "Element not found");

            Button button = obj.GetComponent<Button>();
            if (button != null && button.interactable)
            {
                button.onClick.Invoke();
                return CreateResponse(true, "\"Button clicked\"");
            }

            return CreateResponse(false, null, "Element is not interactable");
        }

        private string GetElementProperty(string path, string property)
        {
            GameObject obj = GameObject.Find(path);
            if (obj == null)
                return CreateResponse(false, null, "Element not found");

            string value = "null";

            switch (property.ToLower())
            {
                case "position":
                    Vector3 pos = obj.transform.position;
                    value = $"{{\"x\":{pos.x},\"y\":{pos.y},\"z\":{pos.z}}}";
                    break;
                case "active":
                    value = obj.activeInHierarchy ? "true" : "false";
                    break;
                case "text":
                    Text text = obj.GetComponent<Text>();
                    value = text != null ? $"\"{text.text}\"" : "\"\"";
                    break;
                default:
                    return CreateResponse(false, null, "Unknown property");
            }

            string data = $"{{\"property\":\"{property}\",\"value\":{value}}}";
            return CreateResponse(true, data);
        }

        private string GetGameObjectPath(Transform transform)
        {
            string path = transform.name;
            while (transform.parent != null)
            {
                transform = transform.parent;
                path = transform.name + "/" + path;
            }
            return path;
        }

        // ===== v2.0 CUSTOM EXTENSION HANDLERS =====

        private string ListCustomProperties()
        {
            List<string> props = new List<string>();
            foreach (var key in customProperties.Keys)
            {
                props.Add($"\"{key}\"");
            }
            string data = $"{{\"properties\":[{string.Join(",", props)}]}}";
            return CreateResponse(true, data);
        }

        private string ListCustomActions()
        {
            List<string> actions = new List<string>();
            foreach (var key in customActions.Keys)
            {
                actions.Add($"\"{key}\"");
            }
            string data = $"{{\"actions\":[{string.Join(",", actions)}]}}";
            return CreateResponse(true, data);
        }

        private string ListCustomCommands()
        {
            List<string> commands = new List<string>();
            foreach (var key in customCommands.Keys)
            {
                commands.Add($"\"{key}\"");
            }
            string data = $"{{\"commands\":[{string.Join(",", commands)}]}}";
            return CreateResponse(true, data);
        }

        private string GetCustomProperty(string name)
        {
            if (string.IsNullOrEmpty(name))
                return CreateResponse(false, null, "Property name is required");

            if (!customProperties.ContainsKey(name))
                return CreateResponse(false, null, $"Custom property not found: {name}");

            try
            {
                string value = customProperties[name]();
                // Escape special characters in value
                value = value.Replace("\"", "\\\"").Replace("\n", "\\n").Replace("\r", "\\r");
                string data = $"{{\"name\":\"{name}\",\"value\":\"{value}\"}}";
                return CreateResponse(true, data);
            }
            catch (Exception e)
            {
                return CreateResponse(false, null, $"Error getting property '{name}': {e.Message}");
            }
        }

        private string ExecuteCustomAction(string name, string argsJson)
        {
            if (string.IsNullOrEmpty(name))
                return CreateResponse(false, null, "Action name is required");

            if (!customActions.ContainsKey(name))
                return CreateResponse(false, null, $"Custom action not found: {name}");

            try
            {
                // Parse args array from JSON
                string[] args = ParseArgsArray(argsJson);
                customActions[name](args);
                return CreateResponse(true, $"\"Action '{name}' executed successfully\"");
            }
            catch (Exception e)
            {
                return CreateResponse(false, null, $"Error executing action '{name}': {e.Message}");
            }
        }

        private string ExecuteCustomCommand(string name, string param)
        {
            if (string.IsNullOrEmpty(name))
                return CreateResponse(false, null, "Command name is required");

            if (!customCommands.ContainsKey(name))
                return CreateResponse(false, null, $"Custom command not found: {name}");

            try
            {
                string result = customCommands[name](param ?? "");
                return CreateResponse(true, result);
            }
            catch (Exception e)
            {
                return CreateResponse(false, null, $"Error executing command '{name}': {e.Message}");
            }
        }

        // Simple JSON helpers (no allocations for deserialization)
        private string ExtractCommand(string json)
        {
            int start = json.IndexOf("\"command\"") + 11;
            int end = json.IndexOf("\"", start);
            return json.Substring(start, end - start);
        }

        private string ExtractParam(string json, string paramName)
        {
            string search = $"\"{paramName}\":\"";
            int start = json.IndexOf(search);
            if (start == -1) return "";
            start += search.Length;
            int end = json.IndexOf("\"", start);
            return json.Substring(start, end - start);
        }

        private string ExtractParamArray(string json, string paramName)
        {
            string search = $"\"{paramName}\":";
            int start = json.IndexOf(search);
            if (start == -1) return "[]";
            start += search.Length;
            int arrayStart = json.IndexOf("[", start);
            if (arrayStart == -1) return "[]";
            int arrayEnd = json.IndexOf("]", arrayStart);
            return json.Substring(arrayStart, arrayEnd - arrayStart + 1);
        }

        private string[] ParseArgsArray(string argsJson)
        {
            if (string.IsNullOrEmpty(argsJson) || argsJson == "[]")
                return new string[0];

            // Remove brackets and split by comma
            argsJson = argsJson.Trim('[', ']', ' ');
            if (string.IsNullOrEmpty(argsJson))
                return new string[0];

            string[] parts = argsJson.Split(',');
            List<string> args = new List<string>();

            foreach (string part in parts)
            {
                string trimmed = part.Trim(' ', '\"');
                args.Add(trimmed);
            }

            return args.ToArray();
        }

        private string CreateResponse(bool success, string data = null, string error = null)
        {
            return $"{{\"success\":{(success ? "true" : "false")}," +
                   $"\"data\":{(data ?? "null")}," +
                   $"\"error\":{(error != null ? $"\"{error}\"" : "null")}" +
                   $"}}";
        }
    }
}

#endif // DEVELOPMENT_BUILD || UNITY_EDITOR
