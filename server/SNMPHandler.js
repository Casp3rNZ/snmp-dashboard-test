import snmp from 'net-snmp';
import fs from 'fs';

class SNMPHandler {
    constructor() {
        this.session = null;
        this.sessions = [];
    }

    createSession(target, community = 'public') {
        try {
            const options = {
                port: 161,
                retries: 1,
                timeout: 2000,
                version: snmp.Version1
            };
            this.session = snmp.createSession(target, community, options);
            return this.session;
        } catch (error) {
            console.error('Error creating SNMP session:', error);
            return null;
        }
    }

    createSessions(targetOIDs, community = 'public') {
        try {
            const options = {
                port: 161,
                retries: 1,
                timeout: 2000,
                version: snmp.Version1
            };
            targetOIDs.forEach((oid, id) => {
                this.sessions[id] = snmp.createSession(oid, community, options);
            });
            return this.sessions;
        } catch (error) {
            console.error('Error creating SNMP sessions:', error);
            return [];
        }
    }

    performWalk(target, startOid = '1.3.6.1.2.1', outputFile) {
        return new Promise((resolve, reject) => {
            if (!this.session) {
                this.createSession(target);
            }
            const results = [];
            const logStream = fs.createWriteStream(outputFile, { flags: 'w' });
            logStream.write(`SNMP Walk Results for ${target}\n`);
            logStream.write(`Timestamp: ${new Date().toISOString()}\n`);
            logStream.write('='.repeat(50) + '\n\n');
            this.session.walk(
                startOid, 
                (varbinds) => {
                    for (let varbind of varbinds) {
                        if (snmp.isVarbindError(varbind)) {
                            const errorMsg = `ERROR: ${varbind.oid} - ${snmp.varbindError(varbind)}\n`;
                            console.error(errorMsg.trim());
                            logStream.write(errorMsg);
                        } else {
                            let result = {};
                            if (varbind.type == snmp.ObjectType.OctetString) {
                                result = {
                                    oid: varbind.oid,
                                    type: this.getTypeString(varbind.type),
                                    value: this.formatOctetString(varbind.value, varbind.oid)
                                };
                            }else {
                                result = {
                                    oid: varbind.oid,
                                    type: this.getTypeString(varbind.type),
                                    value: varbind.value.toString()
                                };
                            }
                            results.push(result);
                            const logEntry = `OID: ${result.oid}\nType: ${result.type}\nValue: ${result.value}\n\n`;
                            console.log(`${result.oid} = ${result.value} (${result.type})`);
                            logStream.write(logEntry);
                        }
                    }
                }, 
                (error) => {
                    logStream.end();
                    
                    if (error) {
                        console.error('SNMP Walk Error:', error.message);
                        reject(error);
                    } else {
                        console.log(`SNMP walk completed. Results saved to ${outputFile}`);
                        console.log(`Total OIDs retrieved: ${results.length}`);
                        resolve(results);
                    }
                    this.session.close();
                });
            });
        }

    async pollMultipleDevices(targets, oids) {
        // create sessions if not already created
        if (this.sessions.length === 0) {
            this.createSessions(targets);
        }

        const pollPromises = this.sessions.map(session => this.pollDevice(session.target, oids));
        let results = await Promise.all(pollPromises);
        return results;
    }

    pollDevice(target, oids) {
        return new Promise((resolve, reject) => {
            const oidList = Object.values(oids);
            console.log(`Attempting to poll device ${target}`);
            this.sessions.find(s => s.target === target).get(oidList, (error, varbinds) => {
                if (error) {
                    console.error('SNMPHandler - Get Error:', error.message);
                    resolve("OFFLINE");
                } else {
                    const result = {};
                    for (let i = 0; i < varbinds.length; i++) {
                        const varbind = varbinds[i];
                        const key = Object.keys(oids)[i];
                        if (snmp.isVarbindError(varbind)) {
                            console.error(`ERROR: ${varbind.oid} - ${snmp.varbindError(varbind)}`);
                            result[key] = null;
                        } else {
                            if (varbind.type == snmp.ObjectType.OctetString) {
                                result[key] = this.formatOctetString(varbind.value, varbind.oid);
                            } else {
                                result[key] = varbind.value.toString();
                            }
                        }
                    }
                    resolve(result);
                }
            });
        });
    }

    formatOctetString(buffer, oid) {
        // binary check
        if (this.isBinaryData(buffer, oid)) {
            return this.bufferToHex(buffer);
        }
        try {
            const str = buffer.toString('utf8');
            // ASCII check
            if (this.isPrintableString(str)) {
                return str;
            } else {
                // treat as binary
                return this.bufferToHex(buffer);
            }
        } catch (error) {
            // If conversion fails, treat as binary
            return this.bufferToHex(buffer);
        }
    }

    isBinaryData(buffer, oid) {
        // Check universal OIDs
        const binaryOidPatterns = [
            '1.3.6.1.2.1.2.2.1.6',     // Interface MAC addresses
            '1.3.6.1.2.1.3.1.1.2',     // ARP table MAC addresses
            '1.3.6.1.2.1.4.22.1.2'     // IP route table MAC addresses
        ];
        for (let pattern of binaryOidPatterns) {
            if (oid.startsWith(pattern)) {
                return true;
            }
        }
        // If buffer is 6 bytes, probably a MAC address
        if (buffer.length === 6) {
            return true;
        }
        return false;
    }

    isPrintableString(str) {
        // Check for ASCII characters
        // Allow space (32) through tilde (126), plus common whitespace chars
        for (let i = 0; i < str.length; i++) {
            const charCode = str.charCodeAt(i);
            if (charCode < 32 || charCode > 126) {
                if (charCode !== 9 && charCode !== 10 && charCode !== 13) {
                    return false;
                }
            }
        }
        return true;
    }

    bufferToHex(buffer) {
        let hexString = '';
        if (buffer.length === 6) {
            // Format as MAC address
            hexString = Array.from(buffer)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join(':');
        }else{
            // General hex representation
            hexString = '0x' + Array.from(buffer)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
        }
        return hexString;
    }

    getTypeString(type) {
        const typeMap = {
            [snmp.ObjectType.Boolean]: 'Boolean',
            [snmp.ObjectType.Integer]: 'Integer',
            [snmp.ObjectType.OctetString]: 'OctetString',
            [snmp.ObjectType.Null]: 'Null',
            [snmp.ObjectType.OID]: 'OID',
            [snmp.ObjectType.IpAddress]: 'IpAddress',
            [snmp.ObjectType.Counter]: 'Counter',
            [snmp.ObjectType.Gauge]: 'Gauge',
            [snmp.ObjectType.TimeTicks]: 'TimeTicks',
            [snmp.ObjectType.Opaque]: 'Opaque',
            [snmp.ObjectType.Counter64]: 'Counter64'
        };
        
        return typeMap[type] || 'Unknown';
    }
}
export default SNMPHandler;