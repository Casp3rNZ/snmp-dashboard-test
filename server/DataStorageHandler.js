import fs from 'fs';
import path from 'path';

class DataStorageHandler {
    constructor() {
        this.dataDir = "./server/data";
        this.configDir = "./server/config";
        this.machinesFile = "machines.json";
        this.fileName = 'device_data.json';
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
        if (!fs.existsSync(this.configDir)) {
            fs.mkdirSync(this.configDir, { recursive: true });
        }
    }

    saveDeviceData(data) {
        // Save to JSON
        const timestamp = new Date().toISOString();
        const filepath = path.join(this.dataDir, this.fileName);
        let existingDeviceData = [];

        // Load existing data if available
        if (fs.existsSync(filepath)) {
            try {
            const fileData = fs.readFileSync(filepath, 'utf8');
            existingDeviceData = JSON.parse(fileData);
            } catch (error) {
                console.error(`DataStorageHandler - Failed to read existing data:`, error);
                existingDeviceData = [];
            }
        }

        let existingIPs = [];

        const updatedDeviceData = data.map((device) => {
            const existingDevice = existingDeviceData.find(d => d.ip_address === device.ip_address);
            if (existingDevice) {
                existingIPs.push(existingDevice.ip_address);
                return {
                    ...device,
                    birth_data: existingDevice.birth_data,
                    lastUpdated: timestamp
                }
            } else {
                return {
                    ...device,
                    birth_data: device,
                    lastUpdated: timestamp,
                };
            }
        });

        console.log('DataStorageHandler - Updated device data:', updatedDeviceData);
        try {
            fs.writeFileSync(filepath, JSON.stringify(updatedDeviceData, null, 2));
            console.log(`DataStorageHandler - Device data saved to ${filepath}`);
            return true;
        } catch (error) {
            console.error(`DataStorageHandler - Failed to save device data:`, error);
            return false;
        }

    }

    getDeviceData(deviceIP) {
        // Get data from JSON
        const filepath = path.join(this.dataDir, this.fileName);
        
        try {
            if (fs.existsSync(filepath)) {
                const data = fs.readFileSync(filepath, 'utf8');
                return JSON.parse(data);
            }
            return null;
        } catch (error) {
            console.error(`DataStorageHandler - Failed to read data for ${deviceIP}:`, error);
            return null;
        }
    }

    getAllDeviceData() {
        // Get all data
        try {
            const filepath = path.join(this.dataDir, this.fileName);
            if (!fs.existsSync(filepath)) {
                return [];
            }
            const data = fs.readFileSync(filepath, 'utf8');
            const allData = JSON.parse(data);

            return allData;

        } catch (error) {
            console.error('DataStorageHandler - Failed to read all devices:', error);
            return {};
        }
    }

    async loadMachines() {
        const machinesFile = path.join(this.configDir, this.machinesFile);
        try {
            if (fs.existsSync(machinesFile)) {
                const data = fs.readFileSync(machinesFile, 'utf8');
                const machines = JSON.parse(data);
                console.log(`Loaded ${machines.length} machines from configuration.`);
                return machines;
            } else {
                console.warn('DataStorageHandler - Machines configuration file not found.');
                return [];
            }
        } catch (error) {
            console.error('DataStorageHandler - Failed to load machines configuration:', error);
            return [];
        }
    }

}

export default DataStorageHandler;