# rpi-wifi

Module to connect a Raspberry Pi to Wi-Fi

## Installation
	$ npm install git+https://github.com/vmartins/rpi-wifi.git --save

## Usage
    const rpiWifi = require('rpi-wifi')

## Methods

### getNetworks()
Get all networks saved on wpa_supplicant configuration file.
````javascript
rpiWifi.getNetworks().then(({networks}) => {
    console.log('networks=' + JSON.stringify(networks))
}).catch(e => {
    console.log('Error getting networks!', e.message)
})
````

### getNetwork(ssid)
Get information about specified network saved on wpa_supplicant configuration file.
````javascript
rpiWifi.getNetwork('mySSID').then(({network}) => {
    console.log('mySSID network info=' + JSON.stringify(network))
}).catch(e => {
    console.log('Error getting network!', e.message)
})
````

### setNetwork(ssid, password, options={})
Save a network on wpa_supplicant configuration file.
````javascript
rpiWifi.setNetwork('mySSID', 'myPassword').then(() => {
    console.log('mySSID saved!')
}).catch(e => {
    console.log('mySSID not saved!', e.message)
})
````

### unsetNetwork(ssid)
Remove the specified network on wpa_supplicant configuration file.
````javascript
rpiWifi.unsetNetwork('mySSID').then(() => {
    console.log('mySSID removed!')
}).catch(e => {
    console.log('mySSID not removed!', e.message)
})
````

### unsetNetworks()
Remove all networks on wpa_supplicant configuration file.
````javascript
rpiWifi.unsetNetworks().then(() => {
    console.log('All networks removed!')
}).catch(e => {
    console.log('Networks not removed!', e.message)
})
````

### scan(netInterface)
Get all the available wireless networks from specified interface (default: `wlan0`).
````javascript
rpiWifi.scan().then(networks => {
    console.log('Scanned Networks=' + JSON.stringify(networks))
}).catch(e => {
    console.log('Scan error!', e.message)
})
````

### status()
Get the current wireless connection status.
````javascript
rpiWifi.status().then(status => {
    console.log('status=' + JSON.stringify(status))
}).catch(e => {
    console.log('Error getting status!', e.message)
})
````

### wpaSupplicantConfigFile(filename)
Change default wpa_supplicant configuration file (default: `/etc/wpa_supplicant/wpa_supplicant.conf`).
````javascript
rpiWifi.wpaSupplicantConfigFile(`/etc/other_wpa_supplicant.conf`).getNetworks().then(({networks}) => {
    console.log('networks=' + JSON.stringify(networks))
})
````

### wpaSupplicantConfigDefaultHeaderSet(headers)
Change default headers of configuration wpa_supplicant file.
````javascript
let headers = [
    'ctrl_interface=/var/run/wpa_supplicant',
    'ctrl_interface_group=netdev'
]
rpiWifi.wpaSupplicantConfigDefaultHeaderSet(headers).setNetwork('mySSID', 'myPassword').then(() => {
    console.log('mySSID saved!')
}).catch(e => {
    console.log('mySSID not saved!', e.message)
})
````