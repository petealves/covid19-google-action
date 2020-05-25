'use strict';
const fetch = require("node-fetch");
const csv=require('csvtojson')
const {dialogflow, Permission, SimpleResponse, Suggestions} = require('actions-on-google');
const functions = require('firebase-functions');
const app = dialogflow({debug: true});
const admin = require('firebase-admin');
const fs = require('fs')

var cases;
var locals;
admin.initializeApp();
const db = admin.firestore();

let languageFile;

function setLocalFile(locale){
    if(locale === "en"){
        let data = fs.readFileSync('./locales/en-US.json')
        languageFile= JSON.parse(data);
    }else if(locale === "pt"){
        let data = fs.readFileSync('./locales/pt-BR.json')
        languageFile= JSON.parse(data);
    }
}

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

function displaySuggestions(conv, lang){
    if(lang === "en"){
        return conv.ask(new Suggestions(['New Cases', 'Recovered Persons', 'Cases in a City', 'Cases in my City', 'Hospitalized Persons', 'Total Deaths']));
    }
    return conv.ask(new Suggestions(['Casos Novos', 'Pacientes Recuperados', 'Casos numa Cidade', 'Casos na minha Cidade', 'Pacientes Internados', 'Mortos']));

}

app.catch((conv, e) => {
    console.log("ERROR "+e);
    conv.close(parseResponseFromFile("convCloseError"));
});

app.intent('Default Welcome Intent', (conv) => {
    let locale = conv.user.locale.split("-")[0]
    setLocalFile(locale)
    return getFromDB.then( (res)=>{
        console.log("Sixth data ready")
        cases = res.data.cases;
        locals = res.data.locals

        conv.ask(new SimpleResponse(parseResponseFromFile("welcome")));
        return displaySuggestions(conv,locale)
    }, (error) => {
        console.log("ERROR WELCOME INTENT:"+error)
        conv.close(new SimpleResponse(parseResponseFromFile("errorFetchData")));
    });
});
app.intent('DeathCases', conv => {
    /*Every intent needs to set the localeFile because of explicit Invocations.
    For example, if user says "Talk to  Context Project and tell me today's cases",
    The agent will automatically return the newCases intent without going to the welcome intent. */
    let locale = conv.user.locale.split("-")[0]
    setLocalFile(locale)
    conv.ask(new SimpleResponse(parseResponseFromFile("casesDeaths", {deaths: cases.obitos})));
    conv.ask(new SimpleResponse(parseResponseFromFile("askMore")));
    return displaySuggestions(conv,locale)
});

app.intent('HospitalizedCases', conv => {
    let locale = conv.user.locale.split("-")[0]
    setLocalFile(locale)
    conv.ask(new SimpleResponse(parseResponseFromFile("casesHospital", {internados: cases.internados, internados_uci: cases.internados_uci})));
    conv.ask(new SimpleResponse(parseResponseFromFile("askMore")));
    return displaySuggestions(conv,locale)
});

app.intent('NewCases', conv => {
    let locale = conv.user.locale.split("-")[0]
    setLocalFile(locale)
    conv.ask(new SimpleResponse(parseResponseFromFile("casesNew", {confirmados_novos: cases.confirmados_novos, confirmados: cases.confirmados})));
    conv.ask(new SimpleResponse(parseResponseFromFile("askMore")));
    return displaySuggestions(conv,locale)
});

app.intent('RecoveredCases', conv => {
    let locale = conv.user.locale.split("-")[0]
    setLocalFile(locale)
    console.log("RECUP"+cases.recuperados)
    conv.ask(new SimpleResponse(parseResponseFromFile("casesRecovered", {recuperados: cases.recuperados})));
    conv.ask(new SimpleResponse(parseResponseFromFile("askMore")));
    return displaySuggestions(conv,locale)
});

app.intent('LocalCases', (conv, {local}) => {
    let locale = conv.user.locale.split("-")[0]
    setLocalFile(locale)
    let nrCases = locals[local === "Lisbon" ? "LISBOA" : local.toUpperCase()]
    if(nrCases === undefined){
        conv.ask(new SimpleResponse(parseResponseFromFile("casesLocalError", {local: local})))
        return displaySuggestions(conv,locale)
    }
    conv.ask(new SimpleResponse(parseResponseFromFile("casesLocal", {casos_local: Math.floor(nrCases), local: local})))
    conv.ask(new SimpleResponse(parseResponseFromFile("askMore")));
    return displaySuggestions(conv,locale)
});

app.intent("CasesByUserLocation", conv => {
    let locale = conv.user.locale.split("-")[0]
    setLocalFile(locale)
    conv.data.requestedPermission = "DEVICE_COARSE_LOCATION";
    return conv.ask(
        new Permission({
            context: parseResponseFromFile("contextPermission"),
            permissions: conv.data.requestedPermission
        })
    );
});


app.intent("GetLocation", (conv, params, permissionGranted) => {
    let locale = conv.user.locale.split("-")[0]
    setLocalFile(locale)
    if (permissionGranted) {
        const { requestedPermission } = conv.data;
        let city;
        if (requestedPermission === "DEVICE_COARSE_LOCATION") {
            const { location } = conv.device;
            city = location.city
            if (city) {
                let nrCases = locals[city === "Lisbon" ? "LISBOA" : city.toUpperCase()]
                if(nrCases === undefined){
                    conv.ask(new SimpleResponse(parseResponseFromFile("casesLocalDeviceNull")))
                    return displaySuggestions(conv,locale)
                }
                conv.ask(new SimpleResponse(parseResponseFromFile("casesLocal", {casos_local: Math.floor(nrCases), local: city})))
                conv.ask(new SimpleResponse(parseResponseFromFile("askMore")));
                return displaySuggestions(conv,locale)
            }

            conv.ask(new SimpleResponse(parseResponseFromFile("casosLocalDeviceErrorLocalize")));
            return displaySuggestions(conv,locale)
        }
    } else {
        conv.ask(new SimpleResponse(parseResponseFromFile("permissionDenied")));
        return displaySuggestions(conv,locale)
    }
});

app.intent("CasesCitySuggestion", conv => {
    let locale = conv.user.locale.split("-")[0]
    setLocalFile(locale)
    return conv.ask(new SimpleResponse(parseResponseFromFile("whatCity")))
})
app.intent("CasesCitySuggestion-final", (conv, option) => {
    let locale = conv.user.locale.split("-")[0]
    setLocalFile(locale)
    conv.contexts.get("CasesCitySuggestion-followup")

    let local = option.local
    let nrCases = locals[local === "Lisbon" ? "LISBOA" : local.toUpperCase()]
    if(nrCases === undefined){
        conv.ask(new SimpleResponse(parseResponseFromFile("casesLocalError", {local: local})))
        return displaySuggestions(conv,locale)
    }
    conv.ask(new SimpleResponse(parseResponseFromFile("casesLocal", {casos_local: Math.floor(nrCases), local: local})))
    conv.ask(new SimpleResponse(parseResponseFromFile("askMore")));
    return displaySuggestions(conv,locale)
})


app.intent("Close", conv => {
    return conv.close(new SimpleResponse(parseResponseFromFile("close")))
})

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
