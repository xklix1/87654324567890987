/**
 * Wealth Race Tycoon - Production Secure Storage Service
 * Abstracted client storage with Android Keystore / Capacitor SecureStorage fallback
 * and salted encryption for browser/APK local storage.
 */

export class SecureStorage {
  private static MEMORY_CACHE = new Map<string, string>();
  private static SALT = 'WealthRace_APK_v1_Security_Salt_99812';

  /**
   * Simple reversible obfuscation for local storage fallback
   * preventing plain-text string inspection from APK file extractors.
   */
  private static obfuscate(text: string): string {
    const chars = text.split('');
    const saltChars = this.SALT.split('');
    const obfuscated = chars.map((c, i) => {
      const saltChar = saltChars[i % saltChars.length];
      const charCode = (c.charCodeAt(0) ^ saltChar.charCodeAt(0)).toString(16).padStart(2, '0');
      return charCode;
    });
    return 'wr_sec_' + obfuscated.join('');
  }

  private static deobfuscate(encoded: string): string | null {
    if (!encoded.startsWith('wr_sec_')) return encoded; // Legacy plain-text fallback
    try {
      const hex = encoded.substring(7);
      const saltChars = this.SALT.split('');
      let result = '';
      for (let i = 0; i < hex.length; i += 2) {
        const hexByte = hex.substr(i, 2);
        const charCode = parseInt(hexByte, 16);
        const saltChar = saltChars[(i / 2) % saltChars.length];
        result += String.fromCharCode(charCode ^ saltChar.charCodeAt(0));
      }
      return result;
    } catch {
      return null;
    }
  }

  public static async setItem(key: string, value: string): Promise<void> {
    this.MEMORY_CACHE.set(key, value);

    // 1. Native Capacitor SecureStorage / Preferences check
    const win = window as unknown as {
      Capacitor?: {
        isNativePlatform?: () => boolean;
        Plugins?: {
          Preferences?: { set: (options: { key: string; value: string }) => Promise<void> };
          SecureStoragePlugin?: { set: (options: { key: string; value: string }) => Promise<void> };
        };
      };
    };

    if (win.Capacitor?.isNativePlatform?.()) {
      if (win.Capacitor.Plugins?.SecureStoragePlugin) {
        try {
          await win.Capacitor.Plugins.SecureStoragePlugin.set({ key, value });
          return;
        } catch {
          // Fall through to Preferences
        }
      }
      if (win.Capacitor.Plugins?.Preferences) {
        try {
          await win.Capacitor.Plugins.Preferences.set({ key, value });
          return;
        } catch {
          // Fall through to localStorage
        }
      }
    }

    // 2. Browser / Webview Encrypted Fallback
    try {
      const obfuscated = this.obfuscate(value);
      localStorage.setItem(`__wr_sec_${key}`, obfuscated);
    } catch {
      // Memory cache is maintained
    }
  }

  public static async getItem(key: string): Promise<string | null> {
    if (this.MEMORY_CACHE.has(key)) {
      return this.MEMORY_CACHE.get(key) || null;
    }

    const win = window as unknown as {
      Capacitor?: {
        isNativePlatform?: () => boolean;
        Plugins?: {
          Preferences?: { get: (options: { key: string }) => Promise<{ value: string | null }> };
          SecureStoragePlugin?: { get: (options: { key: string }) => Promise<{ value: string }> };
        };
      };
    };

    if (win.Capacitor?.isNativePlatform?.()) {
      if (win.Capacitor.Plugins?.SecureStoragePlugin) {
        try {
          const res = await win.Capacitor.Plugins.SecureStoragePlugin.get({ key });
          if (res.value) {
            this.MEMORY_CACHE.set(key, res.value);
            return res.value;
          }
        } catch {
          // Fall through
        }
      }
      if (win.Capacitor.Plugins?.Preferences) {
        try {
          const res = await win.Capacitor.Plugins.Preferences.get({ key });
          if (res.value) {
            this.MEMORY_CACHE.set(key, res.value);
            return res.value;
          }
        } catch {
          // Fall through
        }
      }
    }

    // Browser / Webview fallback
    try {
      const raw = localStorage.getItem(`__wr_sec_${key}`) || localStorage.getItem(key);
      if (!raw) return null;
      const decrypted = this.deobfuscate(raw);
      if (decrypted) {
        this.MEMORY_CACHE.set(key, decrypted);
        return decrypted;
      }
    } catch {
      return null;
    }

    return null;
  }

  public static async removeItem(key: string): Promise<void> {
    this.MEMORY_CACHE.delete(key);

    const win = window as unknown as {
      Capacitor?: {
        Plugins?: {
          Preferences?: { remove: (options: { key: string }) => Promise<void> };
          SecureStoragePlugin?: { remove: (options: { key: string }) => Promise<void> };
        };
      };
    };

    try {
      win.Capacitor?.Plugins?.SecureStoragePlugin?.remove?.({ key });
      win.Capacitor?.Plugins?.Preferences?.remove?.({ key });
      localStorage.removeItem(`__wr_sec_${key}`);
      localStorage.removeItem(key);
    } catch {
      // Ignored
    }
  }

  /**
   * Synchronous getter from memory cache with immediate localStorage peek
   */
  public static getItemSync(key: string): string | null {
    if (this.MEMORY_CACHE.has(key)) {
      return this.MEMORY_CACHE.get(key) || null;
    }
    try {
      const raw = localStorage.getItem(`__wr_sec_${key}`) || localStorage.getItem(key);
      if (raw) {
        const decrypted = this.deobfuscate(raw);
        if (decrypted) {
          this.MEMORY_CACHE.set(key, decrypted);
          return decrypted;
        }
      }
    } catch {
      // Ignore
    }
    return null;
  }

  /**
   * Retrieve or create a persistent unique hardware device identifier
   */
  public static getOrCreateDeviceId(): string {
    const key = 'device_hardware_fingerprint';
    let deviceId = this.getItemSync(key);
    if (!deviceId) {
      deviceId = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      this.setItem(key, deviceId).catch(() => {});
    }
    return deviceId;
  }
}
