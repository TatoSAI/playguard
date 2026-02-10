using UnityEngine;
using System;

namespace PlayGuard.Core
{
    /// <summary>
    /// Captures screenshots for test documentation and visual regression
    /// </summary>
    public class ScreenshotCapture : MonoBehaviour
    {
        public void Initialize()
        {
            Debug.Log("[PlayGuard] Screenshot Capture initialized");
        }

        public byte[] Capture()
        {
            try
            {
                // Capture screenshot
                Texture2D screenshot = ScreenCapture.CaptureScreenshotAsTexture();

                // Convert to PNG bytes
                byte[] bytes = screenshot.EncodeToPNG();

                // Clean up
                Destroy(screenshot);

                Debug.Log($"[PlayGuard] Screenshot captured ({bytes.Length} bytes)");
                return bytes;
            }
            catch (Exception ex)
            {
                Debug.LogError($"[PlayGuard] Failed to capture screenshot: {ex.Message}");
                return null;
            }
        }
    }
}
