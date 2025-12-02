import liff from "@line/liff";

/**
 * Share premium calculation results to LINE Timeline
 */
export async function shareToTimeline(message: string, imageUrl?: string) {
  try {
    if (!liff.isLoggedIn()) {
      console.warn("Not logged into LIFF, cannot share to timeline");
      return false;
    }

    await liff.shareTargetPicker([
      {
        type: "text",
        text: message,
      },
      ...(imageUrl
        ? [
            {
              type: "image",
              originalContentUrl: imageUrl,
              previewImageUrl: imageUrl,
            } as any,
          ]
        : []),
    ]);

    return true;
  } catch (error) {
    console.error("Failed to share to timeline:", error);
    return false;
  }
}

/**
 * Send message to current chat
 */
export async function sendToChat(message: string) {
  try {
    if (!liff.isLoggedIn()) {
      console.warn("Not logged into LIFF, cannot send message");
      return false;
    }

    await liff.sendMessages([
      {
        type: "text",
        text: message,
      },
    ]);

    return true;
  } catch (error) {
    console.error("Failed to send to chat:", error);
    return false;
  }
}

/**
 * Close LIFF app and return to chat
 */
export function closeLiff() {
  if (liff.isLoggedIn()) {
    liff.closeWindow();
  }
}

/**
 * Get LIFF context information
 */
export async function getLiffContext() {
  try {
    const context = liff.getContext();
    return context;
  } catch (error) {
    console.error("Failed to get LIFF context:", error);
    return null;
  }
}

/**
 * Format premium calculation result for sharing
 */
export function formatPremiumResultForShare(
  displayName: string,
  age: string,
  gender: string,
  coverageType: string,
  monthlyPremium: number,
  coveragePeriod: string
): string {
  return `📊 ผลคำนวณเบี้ยประกันภัย

👤 ชื่อ: ${displayName}
📅 อายุ: ${age} ปี
⚤ เพศ: ${gender}
📋 ประเภทคุ้มครอง: ${coverageType}
💰 เบี้ยรายเดือน: ฿${monthlyPremium.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}
📆 ระยะเวลาคุ้มครอง: ${coveragePeriod}

💡 *ข้อมูลนี้ใช้เพื่อการวางแผนเท่านั้น*

คำนวณจาก ANAN Health Calculator
https://nongfaa.com`;
}

/**
 * Check if running in LIFF environment
 */
export function isLiffEnvironment(): boolean {
  try {
    return (
      typeof window !== "undefined" && liff !== undefined && liff.isLoggedIn()
    );
  } catch {
    return false;
  }
}

/**
 * Request device permission (camera, location, etc.)
 */
export async function requestDevicePermission(
  permission: "camera" | "microphone" | "notification"
): Promise<boolean> {
  try {
    if (!liff.isLoggedIn()) {
      return false;
    }

    const hasPermission = await liff.permission.query({
      name: permission as any,
    });

    if (!hasPermission) {
      await liff.permission.request({
        name: permission as any,
      });
    }

    return true;
  } catch (error) {
    console.error(`Failed to request ${permission} permission:`, error);
    return false;
  }
}

/**
 * Get LIFF SDK version
 */
export function getLiffVersion(): string {
  try {
    return liff.getVersion();
  } catch {
    return "unknown";
  }
}
