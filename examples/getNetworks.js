const rpiWifi = require('../')

rpiWifi.getNetworks().then(({networks}) => {
    console.log('networks=' + JSON.stringify(networks))
})