const rpiWifi = require('../')

rpiWifi.unsetNetworks().then(() => {
    console.log('All networks removed!')
}).catch(e => {
    console.log('Networks not removed!', e)
})