using UnityEngine;
using System;

namespace PlayGuard.Core
{
    /// <summary>
    /// Main manager for PlayGuard SDK. Handles initialization and coordination between components.
    /// </summary>
    public class PlayGuardManager : MonoBehaviour
    {
        private static PlayGuardManager instance;
        public static PlayGuardManager Instance
        {
            get
            {
                if (instance == null)
                {
                    GameObject go = new GameObject("PlayGuard Manager");
                    instance = go.AddComponent<PlayGuardManager>();
                    DontDestroyOnLoad(go);
                }
                return instance;
            }
        }

        [Header("Configuration")]
        [SerializeField] private bool enableInEditor = true;
        [SerializeField] private bool enableInDevelopmentBuilds = true;
        [SerializeField] private int adbPort = 5555;

        [Header("Recording")]
        [SerializeField] private bool recordOnStart = false;

        [Header("Debug")]
        [SerializeField] private bool enableDebugLogs = true;

        private ADBBridge adbBridge;
        private InputRecorder inputRecorder;
        private TestExecutor testExecutor;
        private ScreenshotCapture screenshotCapture;

        public bool IsInitialized { get; private set; }
        public bool IsRecording => inputRecorder != null && inputRecorder.IsRecording;
        public bool IsPlaying => testExecutor != null && testExecutor.IsPlaying;

        private void Awake()
        {
            if (instance != null && instance != this)
            {
                Destroy(gameObject);
                return;
            }

            instance = this;
            DontDestroyOnLoad(gameObject);

            Initialize();
        }

        private void Initialize()
        {
            // Check if SDK should be enabled
            if (!ShouldEnable())
            {
                LogDebug("PlayGuard SDK disabled in this build configuration");
                return;
            }

            LogDebug("Initializing PlayGuard SDK...");

            try
            {
                // Initialize ADB Bridge
                adbBridge = gameObject.AddComponent<ADBBridge>();
                adbBridge.Initialize(adbPort);

                // Initialize Input Recorder
                inputRecorder = gameObject.AddComponent<InputRecorder>();
                inputRecorder.Initialize();

                // Initialize Test Executor
                testExecutor = gameObject.AddComponent<TestExecutor>();
                testExecutor.Initialize();

                // Initialize Screenshot Capture
                screenshotCapture = gameObject.AddComponent<ScreenshotCapture>();
                screenshotCapture.Initialize();

                IsInitialized = true;

                LogDebug("PlayGuard SDK initialized successfully");

                // Auto-start recording if enabled
                if (recordOnStart)
                {
                    StartRecording();
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[PlayGuard] Failed to initialize: {ex.Message}");
                IsInitialized = false;
            }
        }

        private bool ShouldEnable()
        {
#if UNITY_EDITOR
            return enableInEditor;
#elif DEVELOPMENT_BUILD
            return enableInDevelopmentBuilds;
#else
            return false; // Never enable in production builds
#endif
        }

        #region Recording

        /// <summary>
        /// Start recording user input for test creation
        /// </summary>
        public void StartRecording()
        {
            if (!IsInitialized)
            {
                Debug.LogWarning("[PlayGuard] Cannot start recording - SDK not initialized");
                return;
            }

            if (IsRecording)
            {
                Debug.LogWarning("[PlayGuard] Already recording");
                return;
            }

            LogDebug("Starting test recording...");
            inputRecorder.StartRecording();
        }

        /// <summary>
        /// Stop recording and save test case
        /// </summary>
        public string StopRecording()
        {
            if (!IsRecording)
            {
                Debug.LogWarning("[PlayGuard] Not currently recording");
                return null;
            }

            LogDebug("Stopping test recording...");
            string testJson = inputRecorder.StopRecording();

            LogDebug($"Test recorded: {testJson?.Length ?? 0} characters");
            return testJson;
        }

        /// <summary>
        /// Pause recording temporarily
        /// </summary>
        public void PauseRecording()
        {
            if (IsRecording)
            {
                inputRecorder.PauseRecording();
                LogDebug("Recording paused");
            }
        }

        /// <summary>
        /// Resume recording after pause
        /// </summary>
        public void ResumeRecording()
        {
            if (inputRecorder != null && inputRecorder.IsPaused)
            {
                inputRecorder.ResumeRecording();
                LogDebug("Recording resumed");
            }
        }

        #endregion

        #region Playback

        /// <summary>
        /// Execute a test case from JSON
        /// </summary>
        public void PlayTest(string testJson)
        {
            if (!IsInitialized)
            {
                Debug.LogWarning("[PlayGuard] Cannot play test - SDK not initialized");
                return;
            }

            if (IsPlaying)
            {
                Debug.LogWarning("[PlayGuard] Already playing a test");
                return;
            }

            LogDebug("Starting test playback...");
            testExecutor.PlayTest(testJson);
        }

        /// <summary>
        /// Stop current test execution
        /// </summary>
        public void StopTest()
        {
            if (!IsPlaying)
            {
                Debug.LogWarning("[PlayGuard] No test currently playing");
                return;
            }

            LogDebug("Stopping test playback...");
            testExecutor.StopTest();
        }

        #endregion

        #region Screenshot

        /// <summary>
        /// Capture a screenshot
        /// </summary>
        public byte[] CaptureScreenshot()
        {
            if (!IsInitialized)
            {
                Debug.LogWarning("[PlayGuard] Cannot capture screenshot - SDK not initialized");
                return null;
            }

            return screenshotCapture.Capture();
        }

        #endregion

        #region Utility

        private void LogDebug(string message)
        {
            if (enableDebugLogs)
            {
                Debug.Log($"[PlayGuard] {message}");
            }
        }

        private void OnDestroy()
        {
            if (instance == this)
            {
                instance = null;
            }
        }

        #endregion

        #region Public API for External Tools

        /// <summary>
        /// Called by ADB commands to start recording
        /// </summary>
        public void ADB_StartRecording()
        {
            StartRecording();
            SendADBResponse("recording_started", true);
        }

        /// <summary>
        /// Called by ADB commands to stop recording
        /// </summary>
        public void ADB_StopRecording()
        {
            string json = StopRecording();
            SendADBResponse("recording_stopped", true, json);
        }

        /// <summary>
        /// Called by ADB commands to execute test
        /// </summary>
        public void ADB_PlayTest(string testJson)
        {
            PlayTest(testJson);
            SendADBResponse("test_started", true);
        }

        /// <summary>
        /// Called by ADB commands to capture screenshot
        /// </summary>
        public void ADB_CaptureScreenshot()
        {
            byte[] screenshot = CaptureScreenshot();
            SendADBResponse("screenshot_captured", screenshot != null,
                screenshot != null ? Convert.ToBase64String(screenshot) : null);
        }

        private void SendADBResponse(string action, bool success, string data = null)
        {
            if (adbBridge != null)
            {
                string response = $"{{\"action\":\"{action}\",\"success\":{success.ToString().ToLower()},\"data\":\"{data}\"}}";
                adbBridge.SendResponse(response);
            }
        }

        #endregion
    }
}
