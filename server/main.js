import SNMPHandler from './SNMPHandler.js';

async function main() {
    const snmpHandler = new SNMPHandler();
    const targetIP = '192.168.4.73';
    const targetList = [
        '192.168.4.73',
        '192.168.4.73'
    ];
    const outputFile = `snmp_walk_${targetIP}.txt`;
    const OIDS_TO_POLL = { 
        model: "1.3.6.1.2.1.1.1.0",
        serialNumber: "1.3.6.1.2.1.43.5.1.1.17.1",
        deviceName: "1.3.6.1.2.1.43.5.1.1.16.1",
        macAddress: "1.3.6.1.2.1.2.2.1.6.1",
        meter_mono: "1.3.6.1.4.1.2385.1.1.19.2.1.3.5.4.61",
        meter_color: "1.3.6.1.4.1.2385.1.1.19.2.1.3.5.4.63"
    };

    try {
        //await snmpHandler.performWalk(targetIP, '1.3.6.1.2.1', outputFile);
        // Poll every 10 seconds
        let result = {};
        setInterval(async () => {
            result = await snmpHandler.pollMultipleDevices(targetList, OIDS_TO_POLL);
            console.log('Poll Result:', result);
        }, 10000);
    } catch (error) {
        console.error('Failed to perform SNMP walk:', error.message);
    }
}

main();