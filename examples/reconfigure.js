const rpiWifi = require('../')

rpiWifi.reconfigure().then(() => {
    console.log('Reconfigured!')
}).catch(e => {
    console.log('Not reconfigured!', e)
})