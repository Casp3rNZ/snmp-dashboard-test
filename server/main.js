import SNMPHandler from './SNMPHandler.js';
import DataStorageHandler from './DataStorageHandler.js';
import WSHandler from './WSHandler.js';

async function main() {
    const snmpHandler = new SNMPHandler();
    const dataStorageHandler = new DataStorageHandler();
    const wsSvr = new WSHandler(8080);
    var machines = await dataStorageHandler.loadMachines();

    wsSvr.start();
    const OIDS_TO_POLL = { 
        ip_address: "1.3.6.1.4.1.2385.2.1.3.2.1.4.10301.11.1",
        model: "1.3.6.1.2.1.1.1.0",
        serialNumber: "1.3.6.1.2.1.43.5.1.1.17.1",
        deviceName: "1.3.6.1.2.1.43.5.1.1.16.1",
        macAddress: "1.3.6.1.2.1.2.2.1.6.1",
        meter_mono: "1.3.6.1.4.1.2385.1.1.19.2.1.3.5.4.61",
        meter_color: "1.3.6.1.4.1.2385.1.1.19.2.1.3.5.4.63"
    };
    //await snmpHandler.performWalk(192.168.4.73, '1.3.6.1.2.1', "snmp_walk_output.txt");

    async function pollAndStore() {
        try {
            console.log('Polling devices...');
            const targetList = machines.map(machine => machine.target);
            const results = await snmpHandler.pollMultipleDevices(targetList, OIDS_TO_POLL);
            console.log('Polling complete. Results:', results);

            // Save device data
            dataStorageHandler.saveDeviceData(results);
            wsSvr.broadcast(results);

            console.log('Polling and storage complete.');
        } catch (error) {
            console.error('MAIN - Failed to perform SNMP poll:', error);
        }
    }

    await pollAndStore();
    setInterval(pollAndStore, 1000);
    console.log('SNMP Dashboard server running...');
    console.log('- WebSocket server on port 8080');
    console.log('- Polling every 5 seconds');
}

main();