const rpiWifi = require('../')

rpiWifi.unsetNetwork('mySSID').then(() => {
    console.log('mySSID removed!')
}).catch(e => {
    console.log('mySSID not removed!', e)
})