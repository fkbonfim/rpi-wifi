const rpiWifi = require('../')

rpiWifi.scan('wlp5s0').then(networks => {
    console.log('Scanned Networks=' + JSON.stringify(networks))
}).catch(e => {
    console.log('Scan error!', e.message)
})