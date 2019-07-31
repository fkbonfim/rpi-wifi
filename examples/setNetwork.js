const rpiWifi = require('../')

rpiWifi.setNetwork('mySSID', 'myPassword', { scan_ssid: 1 }).then(() => {
    console.log('mySSID saved!')
}).catch(e => {
    console.log('mySSID not saved! Error=' + e.message, e)
})