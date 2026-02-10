using UnityEngine;
using System;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;

namespace PlayGuard.Core
{
    /// <summary>
    /// Handles communication with ADB (Android Debug Bridge)
    /// Receives commands from PlayGuard desktop app and sends responses back
    /// </summary>
    public class ADBBridge : MonoBehaviour
    {
        private TcpListener tcpListener;
        private TcpClient client;
        private NetworkStream stream;
        private Thread listenerThread;
        private bool isRunning;
        private int port;

        public bool IsConnected => client != null && client.Connected;

        public void Initialize(int listenPort)
        {
            port = listenPort;
            StartServer();
        }

        private void StartServer()
        {
            try
            {
                isRunning = true;
                listenerThread = new Thread(Listen);
                listenerThread.IsBackground = true;
                listenerThread.Start();

                Debug.Log($"[PlayGuard] ADB Bridge started on port {port}");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[PlayGuard] Failed to start ADB Bridge: {ex.Message}");
            }
        }

        private void Listen()
        {
            try
            {
                tcpListener = new TcpListener(IPAddress.Any, port);
                tcpListener.Start();

                Debug.Log($"[PlayGuard] Listening for ADB connections on port {port}...");

                while (isRunning)
                {
                    if (tcpListener.Pending())
                    {
                        client = tcpListener.AcceptTcpClient();
                        stream = client.GetStream();

                        Debug.Log("[PlayGuard] ADB client connected");

                        HandleClient();
                    }

                    Thread.Sleep(100);
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[PlayGuard] ADB Bridge error: {ex.Message}");
            }
        }

        private void HandleClient()
        {
            byte[] buffer = new byte[4096];

            try
            {
                while (isRunning && client != null && client.Connected)
                {
                    if (stream.DataAvailable)
                    {
                        int bytesRead = stream.Read(buffer, 0, buffer.Length);
                        string message = Encoding.UTF8.GetString(buffer, 0, bytesRead);

                        Debug.Log($"[PlayGuard] Received ADB command: {message}");

                        ProcessCommand(message);
                    }

                    Thread.Sleep(10);
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[PlayGuard] Client handling error: {ex.Message}");
            }
        }

        private void ProcessCommand(string command)
        {
            try
            {
                // Parse JSON command
                // Format: { "action": "start_recording", "params": {...} }

                if (command.Contains("start_recording"))
                {
                    UnityMainThreadDispatcher.Instance.Enqueue(() => {
                        PlayGuardManager.Instance.ADB_StartRecording();
                    });
                }
                else if (command.Contains("stop_recording"))
                {
                    UnityMainThreadDispatcher.Instance.Enqueue(() => {
                        PlayGuardManager.Instance.ADB_StopRecording();
                    });
                }
                else if (command.Contains("play_test"))
                {
                    // Extract test JSON from command
                    // TODO: Parse properly
                    UnityMainThreadDispatcher.Instance.Enqueue(() => {
                        PlayGuardManager.Instance.ADB_PlayTest(command);
                    });
                }
                else if (command.Contains("capture_screenshot"))
                {
                    UnityMainThreadDispatcher.Instance.Enqueue(() => {
                        PlayGuardManager.Instance.ADB_CaptureScreenshot();
                    });
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[PlayGuard] Command processing error: {ex.Message}");
            }
        }

        public void SendResponse(string response)
        {
            if (stream != null && stream.CanWrite)
            {
                try
                {
                    byte[] data = Encoding.UTF8.GetBytes(response + "\n");
                    stream.Write(data, 0, data.Length);
                    stream.Flush();

                    Debug.Log($"[PlayGuard] Sent response: {response}");
                }
                catch (Exception ex)
                {
                    Debug.LogError($"[PlayGuard] Failed to send response: {ex.Message}");
                }
            }
        }

        private void OnDestroy()
        {
            isRunning = false;

            if (stream != null)
            {
                stream.Close();
                stream = null;
            }

            if (client != null)
            {
                client.Close();
                client = null;
            }

            if (tcpListener != null)
            {
                tcpListener.Stop();
                tcpListener = null;
            }

            if (listenerThread != null && listenerThread.IsAlive)
            {
                listenerThread.Join(1000);
            }

            Debug.Log("[PlayGuard] ADB Bridge stopped");
        }
    }

    /// <summary>
    /// Helper class to execute actions on Unity main thread
    /// </summary>
    public class UnityMainThreadDispatcher : MonoBehaviour
    {
        private static UnityMainThreadDispatcher instance;
        public static UnityMainThreadDispatcher Instance
        {
            get
            {
                if (instance == null)
                {
                    GameObject go = new GameObject("UnityMainThreadDispatcher");
                    instance = go.AddComponent<UnityMainThreadDispatcher>();
                    DontDestroyOnLoad(go);
                }
                return instance;
            }
        }

        private System.Collections.Generic.Queue<Action> actionQueue = new System.Collections.Generic.Queue<Action>();

        public void Enqueue(Action action)
        {
            lock (actionQueue)
            {
                actionQueue.Enqueue(action);
            }
        }

        private void Update()
        {
            lock (actionQueue)
            {
                while (actionQueue.Count > 0)
                {
                    actionQueue.Dequeue()?.Invoke();
                }
            }
        }
    }
}
