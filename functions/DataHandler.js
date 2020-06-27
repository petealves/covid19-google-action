
const fetch = require("node-fetch");
const csv=require('csvtojson')


module.exports ={
    getFromAPI(db){
    return new Promise((resolve, reject) => {
        //fetch('https://covid19-api.vost.pt/Requests/get_last_update')
        fetch('https://covid19-api.vost.pt/Requests/get_full_dataset')
            .then(response => response.json())
            .then(dataCases => {
                return db.collection('Covid-Portugal')
                    .doc("Cases")
                    .set(dataCases)
                    .then(() => {
                        return fetch('https://raw.githubusercontent.com/dssg-pt/covid19pt-data/master/data_concelhos.csv')
                            .then(response => response.text())
                            .then(data => {
                                return csv().fromString(data)
                                    .then((json)=>{
                                        locals = json[json.length-1]
                                        return db.collection("Covid-Portugal")
                                            .doc("Locals")
                                            .set(locals)
                                            .then(()=>{
                                                return resolve ({data:{data: dataCases, locals: locals}})
                                            })
                                    })
                            })
                            .catch(error => {
                                return reject(error)
                            });
                    })
                    .catch(error => {
                        return ('Error writing document: ' + error)
                    });
            })
            .catch(error => {
                console.log(error);
                return reject(error)
            });
    });

}

}