const fs = require('fs')
const readline = require('readline')
const exec = require('child_process').exec

const wpaCli = '/sbin/wpa_cli'
const iwlist = '/sbin/iwlist'
const rpiWifi = {}

let wpaSupplicantConfigFilename = '/etc/wpa_supplicant/wpa_supplicant.conf'
let wpaSupplicantConfigDefaultHeaders = ['ctrl_interface=/var/run/wpa_supplicant']

const parseNetworkLine = (line) => {
    let key = line.substring(0, line.indexOf("="))
    key = key.replace(/^[\s|\t]+/, "").replace(/\s+$/, "")

    let value = line.substring(line.indexOf("=") + 1)
    value = value.replace(/^[\s|\t]+/, "").replace(/\s+$/, "")

    return { key, value }
}

const unquoteValue = (value) => {
    if (typeof(value) === 'string') {
        return value.replace(/['"]+/g, '')
    }
}

const getSidType = (sid) => {
    let type = 'ssid'
    if (/^[0-9a-f]{1,2}([\.:-])(?:[0-9a-f]{1,2}\1){4}[0-9a-f]{1,2}$/.test(sid)) { // mac address
        type = 'bssid'
    }

    return type
}

const createWpaSupplicantFile = (networks, headers) => new Promise((resolve, reject) => {
    let content = []
    
    if (headers.length === 0) {
        headers = wpaSupplicantConfigDefaultHeaders
    }

    // add headers
    content.push(...headers)

    // add empty line between headers and networks
    content.push("")

    // add networks
    networks.forEach(network => {
        content.push("network={")
        Object.entries(network).forEach(([key, value]) => {
            if (/\s|=|\//.test(value)) {  // has whitespace, equal or slash
                value = `"${value}"`      // add quote
            }
            content.push(`\t${key}=${value}`)
        })
        content.push("}")
    })

    // add empty line on end
    content.push("")

    fs.unlink(wpaSupplicantConfigFilename, error => {
        if (error && error.code !== 'ENOENT') {
            reject(error)
        } else {
            fs.writeFile(wpaSupplicantConfigFilename, content.join("\n"), error => {
                if (error) {
                    reject(error)
                } else {
                    rpiWifi.reconfigure().then(() => resolve()).catch(() => resolve())
                }
            })
        }
    })
})

/**
 * Set wpa_supplicant configuration file.
 */
rpiWifi.wpaSupplicantConfigFile = (filename) => {
    wpaSupplicantConfigFilename = filename
    return rpiWifi
}

/**
 * Append header to wpa_supplicant configuration file.
 */
rpiWifi.wpaSupplicantConfigDefaultHeaderAppend = (header) => {
    wpaSupplicantConfigDefaultHeaders.push(header)
    return rpiWifi
}

/**
 * Set header to wpa_supplicant configuration file.
 */
rpiWifi.wpaSupplicantConfigDefaultHeaderSet = (headers) => {
    wpaSupplicantConfigDefaultHeaders = headers
    return rpiWifi
}

/**
 * Get all networks saved
 */
rpiWifi.getNetworks = () => new Promise((resolve, reject) => {
    let headers = []
    let networks = []
    let currentNetwork = {}
    let insideNetwork = false

    if (!fs.existsSync(wpaSupplicantConfigFilename)) {
        return reject(new Error(`The wpa_supplicant configuration file (${wpaSupplicantConfigFilename}) does not exist!`))
    }

    let lineReader = readline.createInterface({
        input: fs.createReadStream(wpaSupplicantConfigFilename)
    })

    lineReader.on('line', line => {
        if (!insideNetwork) {
            if (line.includes('network={')) {
                currentNetwork = {}
                insideNetwork = true
            } else {
                if (line != "") {
                    headers.push(line)
                }
            }
        } else {
            if (line.includes('}')) {
                networks.push(currentNetwork)
                insideNetwork = false
            } else {
                let networkLine = parseNetworkLine(line)
                currentNetwork[networkLine.key] = unquoteValue(networkLine.value)
            }
        }
    })

    lineReader.on('close', function () {
        resolve({ networks, headers })
    })

    lineReader.on('SIGINT', function () {
        reject()
    })
})

/**
 * Get the index of the network in the list of saved networks
 */
rpiWifi.getNetworkIndex = (sid) => new Promise((resolve, reject) => {
    let type = getSidType(sid)
    rpiWifi.getNetworks().then(({networks, headers}) => {
        networks.forEach((network, index) => {
            if (network[type] && network[type] == sid) {
                resolve({index, networks, headers})
            }
        })

        resolve({index: null, networks, headers})
    }).catch(reject)
})

/**
 * Get a network in the list of saved networks
 */
rpiWifi.getNetwork = (sid) => new Promise((resolve, reject) => {
    rpiWifi.getNetworkIndex(sid).then(({index, networks, headers}) => {
        if (networks[index]) {
            resolve({ network: networks[index], networks, headers })
        } else {
            resolve({ network: null, networks, headers })
        }
    }).catch(reject)
})

/**
 * Set a network in the list of saved networks
 */
rpiWifi.setNetwork = (sid, password, options) => new Promise((resolve, reject) => {
    let network = {}
    let type = getSidType(sid)

    network[type] = sid

    if (password) {
        network['psk'] = password
    } else {
        network['proto'] = 'RSN'
        network['key_mgmt'] = 'NONE'
    }

    if (options && Object.prototype.toString.call(options) === '[object Object]') {
        Object.entries(options).forEach(([key, value]) => {
            network[key] = value
        })
    }

    rpiWifi.getNetworkIndex(sid).then(({index, networks, headers}) => {
        if (networks[index]) {
            networks[index] = network
        } else {
            networks.push(network)
        }

        createWpaSupplicantFile(networks, headers).then(resolve).catch(reject)
    }).catch(reject)
})

/**
 * Unset a network in the list of saved networks
 */
rpiWifi.unsetNetwork = (sid) => new Promise((resolve, reject) => {
    rpiWifi.getNetworkIndex(sid).then(({index, networks, headers}) => {
        if (networks[index]) {
            networks.splice(index, 1)
            createWpaSupplicantFile(networks, headers).then(resolve).catch(reject)
        } else {
            resolve()
        }
    }).catch(reject)
})

/**
 * Unset all networks
 */
rpiWifi.unsetNetworks = () => new Promise((resolve, reject) => {
    rpiWifi.getNetworkIndex().then(({headers}) => {
        createWpaSupplicantFile([], headers).then(resolve).catch(reject)
    }).catch(reject)
})

/**
 * Get current WPA/EAPOL/EAP status
 */
rpiWifi.status = (networkInterface) => new Promise((resolve, reject) => {
    let command = `${wpaCli} status`
    
    if (networkInterface) {
        command += ` -i ${networkInterface}`
    }
    
    exec(command, (error, stdout, stderr) => {
        if (stdout.includes("FAIL")) {
            reject(stdout)
        } else {
            let content = stdout.split("\n")
            let network = {}
        
            if (!content.length) {
                return null
            }
        
            content.forEach(item => {
                if (item.includes('bssid')) {
                    network.bssid = item.replace(/bssid=\s*/, '').toUpperCase()
                } else {
                    let values = item.split('=')
                    if (values[0] && values[1]) {
                        network[values[0]] = values[1]
                    }
                }
            })
        
            let status = {
                connected: network.wpa_state && network.wpa_state.includes('COMPLETED'),
                network: network
            }

            resolve(status)
        }
    })
})

/**
 * Force wpa_supplicant to re-read its configuration file
 */
rpiWifi.reconfigure = () => new Promise((resolve, reject) => {
    let command = `${wpaCli} reconfigure`
    exec(command, (error, stdout, stderr) => {
        if (stdout.includes("FAIL")) {
            reject(stdout)
        } else {
            resolve()
        }
    })
})

/**
 * Get the list of Access Points and Ad-Hoc
 */
rpiWifi.scan = (networkInterface) => new Promise((resolve, reject) => {
    networkInterface = networkInterface ? networkInterface : 'wlan0'
    let command = `${iwlist} ${networkInterface} scan`
    const parseCell = (cellContent) => {
        if (cellContent.length == 0) {
            return null
        }

        let network = {}
    
        cellContent.forEach(content => {
            if (content.includes('Address:')) {
                network.address = content.replace(/.*Address:\s*/, '')
            } else if (content.includes('Channel:')) {
                network.channel = content.replace(/.*Channel:\s*/, '')
            } else if (content.includes('Frequency:')) {
                network.frequency = content.match(/Frequency:\s*\d+(.\d+)*\sGHz/)[0].replace(/Frequency:\s*/,'')
            } else if (content.includes('Quality')) {
                network.quality = content.match(/=(\d+)/)[0].replace(/=/, '')
                network.max_quality = content.match(/\/(\d+)/)[0].replace(/\//, '')
                if (content.includes('Signal level')) {
                    network.signal_level = content.match(/Signal level=\s*([-]*\d+)/)[0].replace(/Signal level=\s*/,'')
                }
            } else if (content.includes('Encryption key:')) {
                network.encryption_key = content.replace(/.*Encryption key:\s*/, '')
            } else if (content.includes('ESSID:')) {
                network.essid = content.replace(/.*ESSID:/, '').replace(/"/g,'')
                if (network.essid.includes('\\x00')) { // ssid hidden
                    delete network.essid
                }
            }
    
            if (network.encryption_key === 'on') {
                if (content.includes('IEEE')) {
                     network.encryption_type = /\/\w+\d*/.test(content) ? content.match(/\/\w+\d*/)[0].replace(/\//, '') : 'WEP'
                 }
            }
        })
    
        return network
    }

    exec(command, (error, stdout, stderr) => {
        if (error) {
            reject(error)
        } else {
            let networks = []
            let cellContent = []
            let lines = stdout.split("\n")
            lines.splice(0, 1)
        
            lines.forEach(line => {
                if (/^[\s|\t]*Cell/.test(line)) {
                    let network = parseCell(cellContent)
                    if (network) {
                        network.connected = false
                        networks.push(network)
                    }
                    cellContent = []
                    cellContent.push(line)
                } else {
                    cellContent.push(line)
                }
            })

            // parse last cell
            let network = parseCell(cellContent)
            if (network) {
                network.connected = false
                networks.push(network)
            }
        
            rpiWifi.status().then(status => {
                networks = networks.map(network => {
                    network.connected = status.connected && network.address === status.network.address
                    return network
                })

                resolve(networks)
            }).catch(() => {
                resolve(networks)
            })
        }
    })
})

module.exports = rpiWifi