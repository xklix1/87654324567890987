import { DatabaseStore } from '../../db/store';
import { SystemVersionRecord } from '../../types';

export class VersionService {
  public static async getVersionInfo(): Promise<SystemVersionRecord> {
    return await DatabaseStore.getSystemVersion();
  }
}
