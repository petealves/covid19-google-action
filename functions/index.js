'use strict';
const fetch = require("node-fetch");
const csv=require('csvtojson')
const {dialogflow, Permission, SimpleResponse} = require('actions-on-google');
const functions = require('firebase-functions');
const app = dialogflow({debug: true});
const admin = require('firebase-admin');
const fs = require('fs')

var cases;
var locals;
admin.initializeApp();
const db = admin.firestore();

let languageFile;


function synchronizeFrom(data){
    let correctData = data.split('-')

    var lastSyncDate = new Date(correctData[2], correctData[1]-1, correctData[0], 16);

    var nextSyncDate = new Date(lastSyncDate)
    nextSyncDate.setDate(nextSyncDate.getDate() + 1)

    var currentDate = new Date()

    if(currentDate >= nextSyncDate){
        return "API"
    }else{
        return "DB"
    }

}

function getFromAPI(){

    return new Promise((resolve, reject) => {
        fetch('https://covid19-api.vost.pt/Requests/get_last_update')
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
                                                return resolve ({data:{cases: dataCases, locals: locals}})
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

var getFromDB = new Promise ((resolve, reject) =>{
    let docRef = db.collection('Covid-Portugal').doc('Cases');
    docRef.get()
        .then(casesDoc => {
            if(synchronizeFrom(casesDoc.data().data) === "DB"){
                return db.collection('Covid-Portugal').doc('Locals').get()
                    .then(localsDoc => {
                        return resolve({data:{cases: casesDoc.data(), locals: localsDoc.data()}})
                    })
            }else{
                return resolve(getFromAPI())
            }
        })
        .catch(err => {
            return reject(err);
        });
});

function parseResponseFromFile(key, variables){
    let response = languageFile[key]
    if(variables){
        for (let vrbKey in variables) {
            response = response.replace(
                "{" + vrbKey + "}",
                variables[vrbKey]
            );
        }
    }
    return response;
}

app.catch((conv, e) => {
    console.log("ERROR "+e);
    conv.close(parseResponseFromFile("convCloseError"));
});

app.intent('Default Welcome Intent', (conv) => {

    if(conv.user.locale.split("-")[0] === "en"){
        let data = fs.readFileSync('./locales/en-US.json')
        languageFile= JSON.parse(data);
    }else if(conv.user.locale.split("-")[0] === "pt"){
        let data = fs.readFileSync('./locales/pt-BR.json')
        languageFile= JSON.parse(data);
    }else {
        return conv.close("Language "+ conv.user.locale +" not supported.")
    }

    return getFromDB.then( (res)=>{
        console.log("Sixth data ready")
        cases = res.data.cases;
        locals = res.data.locals

        return conv.ask(new SimpleResponse(parseResponseFromFile("welcome")));
    }, (error) => {
        console.log("ERROR WELCOME INTENT:"+error)
        conv.close(new SimpleResponse(parseResponseFromFile("errorFetchData")));
    });
});
app.intent('DeathCases', conv => {
    conv.ask(new SimpleResponse(parseResponseFromFile("casesDeaths", {deaths: cases.obitos})));
    return conv.ask(new SimpleResponse(parseResponseFromFile("askMore")));
});

app.intent('HospitalizedCases', conv => {
    conv.ask(new SimpleResponse(parseResponseFromFile("casesHospital", {internados: cases.internados, internados_uci: cases.internados_uci})));
    return conv.ask(new SimpleResponse(parseResponseFromFile("askMore")));
});

app.intent('NewCases', conv => {
    conv.ask(new SimpleResponse(parseResponseFromFile("casesNew", {confirmados_novos: cases.confirmados_novos, confirmados: cases.confirmados})));
    return conv.ask(new SimpleResponse(parseResponseFromFile("askMore")));
});

app.intent('RecoveredCases', conv => {
    conv.ask(new SimpleResponse(parseResponseFromFile("casesRecovered", {recuperados: cases.recuperados})));
    return conv.ask(new SimpleResponse(parseResponseFromFile("askMore")));
});

app.intent('LocalCases', (conv, {local}) => {
    let nrCases = locals[local === "Lisbon" ? "LISBOA" : local.toUpperCase()]
    if(nrCases === undefined){
        return conv.ask(new SimpleResponse(parseResponseFromFile("casesLocalError", {local: local})))
    }
    conv.ask(new SimpleResponse(parseResponseFromFile("casesLocal", {casos_local: Math.floor(nrCases), local: local})))
    return conv.ask(new SimpleResponse(parseResponseFromFile("askMore")));
});

app.intent("CasesByUserLocation", conv => {
    conv.data.requestedPermission = "DEVICE_COARSE_LOCATION";
    return conv.ask(
        new Permission({
            context: parseResponseFromFile("contextPermission"),
            permissions: conv.data.requestedPermission
        })
    );
});


app.intent("GetLocation", (conv, params, permissionGranted) => {
    if (permissionGranted) {
        const { requestedPermission } = conv.data;
        let city;
        if (requestedPermission === "DEVICE_COARSE_LOCATION") {
            const { location } = conv.device;
            city = location.city
            if (city) {
                let nrCases = locals[city === "Lisbon" ? "LISBOA" : city.toUpperCase()]
                if(nrCases === undefined){
                    return conv.ask(new SimpleResponse(parseResponseFromFile("casesLocalDeviceNull")))
                }
                conv.ask(new SimpleResponse(parseResponseFromFile("casesLocal", {casos_local: Math.floor(nrCases), local: city})))
                return conv.ask(new SimpleResponse(parseResponseFromFile("askMore")));
            }

            return conv.ask(new SimpleResponse(parseResponseFromFile("casosLocalDeviceErrorLocalize")));
        }
    } else {
        return conv.ask(new SimpleResponse(parseResponseFromFile("permissionDenied")));
    }
});


app.intent("Close", conv => {
    return conv.close(new SimpleResponse(parseResponseFromFile("close")))
})

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
