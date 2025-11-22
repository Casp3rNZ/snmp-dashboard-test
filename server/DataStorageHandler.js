import fs from 'fs';
import path from 'path';

class DataStorageHandler {
    constructor(dataDir, configDir) {
        this.dataDir = dataDir;
        this.configDir = configDir;
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
        const output = data.map(result => {
            console.log(result);
            return {
                timestamp: timestamp,
                data: result
            };
        });
            

        const filename = `device_data.json`;
        const filepath = path.join(this.dataDir, filename);
        
        try {
            fs.writeFileSync(filepath, JSON.stringify(output, null, 2));
            console.log(`Data saved to ${filename}`);
            return true;
        } catch (error) {
            console.error(`Failed to save data to ${filename}:`, error);
            return false;
        }
    }

    getDeviceData(deviceIP) {
        // Get data from JSON
        const filename = `device_data.json`;
        const filepath = path.join(this.dataDir, filename);
        
        try {
            if (fs.existsSync(filepath)) {
                const data = fs.readFileSync(filepath, 'utf8');
                return JSON.parse(data);
            }
            return null;
        } catch (error) {
            console.error(`Failed to read data for ${deviceIP}:`, error);
            return null;
        }
    }

    getAllDeviceData() {
        // Get all data
        try {
            const files = fs.readdirSync(this.dataDir);
            const deviceFiles = files.filter(file => file.startsWith('device_') && file.endsWith('.json'));
            
            const allData = {};
            deviceFiles.forEach(file => {
                const filepath = path.join(this.dataDir, file);
                const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
                allData[data.deviceIP] = data;
            });
            
            return allData;
        } catch (error) {
            console.error('Failed to read all devices:', error);
            return {};
        }
    }

    saveSummary(devices) {
        // Save summary data for dashboard
        const summary = {
            totalDevices: devices.length,
            lastUpdated: new Date().toISOString(),
            devices: devices.map(device => ({
                ip: device.deviceIP,
                status: device.data ? 'online' : 'offline',
                lastSeen: device.timestamp
            }))
        };
        const filepath = path.join(this.dataDir, 'summary.json');
        try {
            fs.writeFileSync(filepath, JSON.stringify(summary, null, 2));
            return true;
        } catch (error) {
            console.error('Failed to save summary:', error);
            return false;
        }
    }

    async loadMachines() {
        const machinesFile = path.join(this.configDir, 'machines.json');
        try {
            if (fs.existsSync(machinesFile)) {
                const data = fs.readFileSync(machinesFile, 'utf8');
                const machines = JSON.parse(data);
                console.log(`Loaded ${machines.length} machines from configuration.`);
                return machines;
            } else {
                console.warn('Machines configuration file not found.');
                return [];
            }
        } catch (error) {
            console.error('Failed to load machines configuration:', error);
            return [];
        }
    }

}

export default DataStorageHandler;