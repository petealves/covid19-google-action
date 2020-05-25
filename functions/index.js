'use strict';

const {dialogflow, Permission, SimpleResponse, Suggestions} = require('actions-on-google');
const functions = require('firebase-functions');
const app = dialogflow({debug: true});
const admin = require('firebase-admin');
const fs = require('fs')
const Helper = require("./Helpers")
const DataHandler = require("./DataHandler")


var cases;
var locals;

admin.initializeApp();
const db = admin.firestore();

let languageFile;

function displaySuggestions(conv, lang){
    if(lang === "en"){
        return conv.ask(new Suggestions(['New Cases', 'Recovered Persons', 'Cases in a City', 'Cases in my City', 'Hospitalized Persons', 'Total Deaths']));
    }
    return conv.ask(new Suggestions(['Casos Novos', 'Pacientes Recuperados', 'Casos numa Cidade', 'Casos na minha Cidade', 'Pacientes Internados', 'Mortos']));

}

var getFromDB = new Promise ((resolve, reject) =>{
    let docRef = db.collection('Covid-Portugal').doc('Cases');
    docRef.get()
        .then(casesDoc => {
            console.log(Helper.synchronizeFrom(casesDoc.data().data) === "DB")
            if(Helper.synchronizeFrom(casesDoc.data().data) === "DB"){
                return db.collection('Covid-Portugal').doc('Locals').get()
                    .then(localsDoc => {
                        return resolve({data:{cases: casesDoc.data(), locals: localsDoc.data()}})
                    })
            }else{
                return resolve(DataHandler.getFromAPI(db))
            }
        })
        .catch(err => {
            return reject(err);
        });
});


app.catch((conv, e) => {
    console.log("ERROR "+e);
    conv.close(Helper.parseResponseFromFile(languageFile,"convCloseError"));
});

app.intent('Default Welcome Intent', (conv) => {
    let locale = conv.user.locale.split("-")[0]
    languageFile = Helper.setLocalFile(locale)
    return getFromDB.then( (res)=>{
        console.log("Sixth data ready")
        cases = res.data.cases;
        locals = res.data.locals

        conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "welcome")));
        return displaySuggestions(conv,locale)
    }, (error) => {
        console.log("ERROR WELCOME INTENT:"+error)
        conv.close(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "errorFetchData")));
    });
});
app.intent('DeathCases', conv => {
    /*Every intent needs to set the localeFile because of explicit Invocations.
    For example, if user says "Talk to  Context Project and tell me today's cases",
    The agent will automatically return the newCases intent without going to the welcome intent. */
    let locale = conv.user.locale.split("-")[0]
    languageFile = Helper.setLocalFile(locale)
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "casesDeaths", {deaths: cases.obitos})));
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "askMore")));
    return displaySuggestions(conv,locale)
});

app.intent('HospitalizedCases', conv => {
    let locale = conv.user.locale.split("-")[0]
    languageFile = Helper.setLocalFile(locale)
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "casesHospital", {internados: cases.internados, internados_uci: cases.internados_uci})));
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "askMore")));
    return displaySuggestions(conv,locale)
});

app.intent('NewCases', conv => {
    let locale = conv.user.locale.split("-")[0]
    languageFile = Helper.setLocalFile(locale)
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "casesNew", {confirmados_novos: cases.confirmados_novos, confirmados: cases.confirmados})));
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "askMore")));
    return displaySuggestions(conv,locale)
});

app.intent('RecoveredCases', conv => {
    let locale = conv.user.locale.split("-")[0]
    languageFile = Helper.setLocalFile(locale)
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "casesRecovered", {recuperados: cases.recuperados})));
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "askMore")));
    return displaySuggestions(conv,locale)
});

app.intent('LocalCases', (conv, {local}) => {
    let locale = conv.user.locale.split("-")[0]
    languageFile = Helper.setLocalFile(locale)
    let nrCases = locals[local === "Lisbon" ? "LISBOA" : local.toUpperCase()]
    if(nrCases === undefined){
        conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "casesLocalError", {local: local})))
        return displaySuggestions(conv,locale)
    }
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "casesLocal", {casos_local: Math.floor(nrCases), local: local})))
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "askMore")));
    return displaySuggestions(conv,locale)
});

app.intent("CasesByUserLocation", conv => {
    let locale = conv.user.locale.split("-")[0]
    languageFile = Helper.setLocalFile(locale)
    conv.data.requestedPermission = "DEVICE_COARSE_LOCATION";
    return conv.ask(
        new Permission({
            context: Helper.parseResponseFromFile(languageFile, "contextPermission"),
            permissions: conv.data.requestedPermission
        })
    );
});

app.intent("GetLocation", (conv, params, permissionGranted) => {
    let locale = conv.user.locale.split("-")[0]
    Helper.setLocalFile(locale)
    if (permissionGranted) {
        const { requestedPermission } = conv.data;
        let city;
        if (requestedPermission === "DEVICE_COARSE_LOCATION") {
            const { location } = conv.device;
            city = location.city
            if (city) {
                let nrCases = locals[city === "Lisbon" ? "LISBOA" : city.toUpperCase()]
                if(nrCases === undefined){
                    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "casesLocalDeviceNull")))
                    return displaySuggestions(conv,locale)
                }
                conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "casesLocal", {casos_local: Math.floor(nrCases), local: city})))
                conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "askMore")));
                return displaySuggestions(conv,locale)
            }

            conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "casosLocalDeviceErrorLocalize")));
            return displaySuggestions(conv,locale)
        }
    } else {
        conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "permissionDenied")));
        return displaySuggestions(conv,locale)
    }
});

app.intent("CasesCitySuggestion", conv => {
    let locale = conv.user.locale.split("-")[0]
    languageFile = Helper.setLocalFile(locale)
    return conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "whatCity")))
})
app.intent("CasesCitySuggestion-final", (conv, option) => {
    let locale = conv.user.locale.split("-")[0]
    languageFile = Helper.setLocalFile(locale)
    conv.contexts.get("CasesCitySuggestion-followup")

    let local = option.local
    let nrCases = locals[local === "Lisbon" ? "LISBOA" : local.toUpperCase()]
    if(nrCases === undefined){
        conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "casesLocalError", {local: local})))
        return displaySuggestions(conv,locale)
    }
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "casesLocal", {casos_local: Math.floor(nrCases), local: local})))
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "askMore")));
    return displaySuggestions(conv,locale)
})

app.intent('SuspectCases', conv => {
    let locale = conv.user.locale.split("-")[0]
    languageFile = Helper.setLocalFile(locale)
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "casesSuspect", {suspeitos: cases.suspeitos})));
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "askMore")));
    return displaySuggestions(conv,locale)
});

app.intent('LabCases', conv => {
    let locale = conv.user.locale.split("-")[0]
    languageFile = Helper.setLocalFile(locale)
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "casesLab", {lab: cases.lab})));
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "askMore")));
    return displaySuggestions(conv,locale)
});

app.intent('NorthCases', conv => {
    let locale = conv.user.locale.split("-")[0]
    languageFile = Helper.setLocalFile(locale)
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "casesNorth", {north: cases.confirmados_arsnorte})));
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "askMore")));
    return displaySuggestions(conv,locale)
});


app.intent("Close", conv => {
    return conv.close(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "close")))
})

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
