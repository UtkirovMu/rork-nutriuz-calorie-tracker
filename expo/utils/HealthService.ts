import { Platform } from 'react-native';
import AppleHealthKit, { HealthValue, HealthInputOptions } from 'react-native-health';
import {
  initialize,
  requestPermission,
  readRecords,
  getGrantedPermissions,
  getSdkStatus,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

// Yagona formatdagi ma'lumotlar qaytarish uchun interfeyslar
export interface HealthDataResult {
  value: number;
  startDate?: Date;
  endDate?: Date;
}

class HealthService {
  private isInitialized = false;

  async authorize(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      return new Promise((resolve) => {
        const permissions = {
          permissions: {
            read: [
              AppleHealthKit.Constants.Permissions.StepCount,
              AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
              AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
            ],
            write: [],
          },
        };

        AppleHealthKit.initHealthKit(permissions, (err) => {
          if (err) {
            console.log('[HealthKit] Error initializing:', err);
            resolve(false);
            return;
          }
          this.isInitialized = true;
          resolve(true);
        });
      });
    } else if (Platform.OS === 'android') {
      try {
        const status = await getSdkStatus();
        if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE) {
          console.log('[HealthConnect] SDK unavailable on this device');
          return false;
        }
        if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
          console.log('[HealthConnect] Health Connect app needs update');
          return false;
        }

        const isInit = await initialize();
        if (!isInit) return false;

        const requestedPermissions = await requestPermission([
          { accessType: 'read', recordType: 'Steps' },
          { accessType: 'read', recordType: 'Distance' },
          { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
        ]);

        const granted = await getGrantedPermissions();
        // Check if we have at least one permission granted
        this.isInitialized = granted.length > 0;
        return this.isInitialized;
      } catch (err) {
        console.log('[HealthConnect] Error initializing:', err);
        return false;
      }
    }
    return false;
  }

  async getDailySteps(): Promise<number> {
    if (!this.isInitialized) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (Platform.OS === 'ios') {
      return new Promise((resolve) => {
        const options: HealthInputOptions = { date: today.toISOString() };
        AppleHealthKit.getStepCount(options, (err, results: HealthValue) => {
          if (err) {
            resolve(0);
            return;
          }
          resolve(results.value);
        });
      });
    } else if (Platform.OS === 'android') {
      try {
        const records = await readRecords('Steps', {
          timeRangeFilter: {
            operator: 'after',
            startTime: today.toISOString(),
          },
        });
        const totalSteps = records.reduce((sum, record) => sum + record.count, 0);
        return totalSteps;
      } catch (e) {
        console.log('[HealthConnect] getDailySteps error', e);
        return 0;
      }
    }
    return 0;
  }

  async getDistance(): Promise<number> {
    if (!this.isInitialized) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (Platform.OS === 'ios') {
      return new Promise((resolve) => {
        const options: HealthInputOptions = { date: today.toISOString() };
        AppleHealthKit.getDistanceWalkingRunning(options, (err, results: HealthValue) => {
          if (err) resolve(0);
          else resolve(results.value / 1000); // Metrni kilometrga o'zgartirish
        });
      });
    } else if (Platform.OS === 'android') {
      try {
        const records = await readRecords('Distance', {
          timeRangeFilter: {
            operator: 'after',
            startTime: today.toISOString(),
          },
        });
        const totalDistance = records.reduce((sum, record) => sum + record.distance.inKilometers, 0);
        return totalDistance;
      } catch (e) {
        console.log('[HealthConnect] getDistance error', e);
        return 0;
      }
    }
    return 0;
  }

  async getCaloriesBurned(): Promise<{ active: number; basal: number }> {
    if (!this.isInitialized) return { active: 0, basal: 0 };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const options: HealthInputOptions = { startDate: today.toISOString() };

    let active = 0;
    let basal = 0;

    if (Platform.OS === 'ios') {
      active = await new Promise((resolve) => {
        AppleHealthKit.getActiveEnergyBurned(options, (err, results) => {
          if (err || !results || !results.length) resolve(0);
          else resolve(results.reduce((sum, r) => sum + r.value, 0));
        });
      });
      // Skip basal for now to prevent errors, return 0
      basal = 0;
    } else if (Platform.OS === 'android') {
      try {
        const activeRecords = await readRecords('ActiveCaloriesBurned', {
          timeRangeFilter: { operator: 'after', startTime: today.toISOString() },
        });
        active = activeRecords.reduce((sum, r) => sum + r.energy.inKilocalories, 0);
        basal = 0;
      } catch (e) {
        console.log('[HealthConnect] getCaloriesBurned error', e);
      }
    }
    return { active, basal };
  }
}

export const healthService = new HealthService();
