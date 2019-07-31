const rpiWifi = require('../')

rpiWifi.status().then(status => {
    console.log('status=' + JSON.stringify(status))
}).catch(e => {
    console.log('Error getting status!', e)
})