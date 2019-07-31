const rpiWifi = require('../')

rpiWifi.getNetwork('mySSID').then(({network}) => {
    console.log('mySSID network info=' + JSON.stringify(network))
})