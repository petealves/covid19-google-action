'use strict';

//https://us-central1-context2-26e70.cloudfunctions.net/dialogflowFirebaseFulfillment

const {dialogflow, Permission, SimpleResponse, Suggestions} = require('actions-on-google');
const functions = require('firebase-functions');
const app = dialogflow({debug: true});
const admin = require('firebase-admin');
const fs = require('fs')
const Helper = require("./Helpers")
const DataHandler = require("./DataHandler")


var data;
var locals;
var todayIdx;
var yesterdayIdx;

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
            //if(Helper.synchronizeFrom(casesDoc.data().data) === "DB"){
            if(Helper.synchronizeFrom(casesDoc.data().data[Object.keys(casesDoc.data().data).length-1]) === "DB"){
                return db.collection('Covid-Portugal').doc('Locals').get()
                    .then(localsDoc => {
                        return resolve({data:{data: casesDoc.data(), locals: localsDoc.data()}})
                    })
            }else{
                return resolve(DataHandler.getFromAPI(db))
            }
        })
        .catch(err => {
            console.log(err)
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
    //Tries to read from DB Firebase
   return getFromDB.then( (res)=>{
        data = res.data.data;
        locals = res.data.locals
        todayIdx = Object.keys(data.data_dados).length-1
        yesterdayIdx = todayIdx-1;
        conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "welcome")));
        return displaySuggestions(conv,locale)
    }, (error) => {
        console.log("ERROR WELCOME INTENT:"+error)
        return DataHandler.getFromAPI(db)
            .catch(err => {
                console.log("ERROR 2nd Fetch "+err)
                conv.close(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "errorFetchData")));
            })
            .then((res)=>{
                data = res.data.data;
                locals = res.data.locals
                todayIdx = Object.keys(data.data_dados).length-1
                yesterdayIdx = todayIdx-1;
                conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "welcome")));
                return displaySuggestions(conv,locale)
            });
    });
});
app.intent('DeathCases', conv => {
    /*Every intent needs to set the localeFile because of explicit Invocations.
    For example, if user says "Talk to  Context Project and tell me today's cases",
    The agent will automatically return the newCases intent without going to the welcome intent. */
    let locale = conv.user.locale.split("-")[0]
    languageFile = Helper.setLocalFile(locale)
    if(data.obitos[todayIdx] === data.obitos[yesterdayIdx]){
        conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "casesDeathsEqual", {deaths: data.obitos[todayIdx]})));
    }else{
        conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "casesDeaths", {deaths_today: data.obitos[todayIdx]-data.obitos[yesterdayIdx], deaths_diff: data.obitos[yesterdayIdx]})));
    }

    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "askMore")));
    return displaySuggestions(conv,locale)
});

app.intent('HospitalizedCases', conv => {
    let locale = conv.user.locale.split("-")[0]
    languageFile = Helper.setLocalFile(locale)

    if(data.internados[todayIdx] !== data.internados[yesterdayIdx] || data.internados_uci[todayIdx] !== data.internados_uci[yesterdayIdx]){
        var internados_measure;
        var icu_measure;
        if(data.internados[todayIdx] < data.internados[todayIdx]){
            internados_measure=Helper.parseResponseFromFile(languageFile, "measureLess")
        }else{
            internados_measure=Helper.parseResponseFromFile(languageFile, "measureMore")
        }
        if(data.internados_uci[todayIdx] < data.internados_uci[todayIdx]){
            icu_measure=Helper.parseResponseFromFile(languageFile, "measureLess")
        }else{
            icu_measure=Helper.parseResponseFromFile(languageFile, "measureMore")
        }
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile,
        "casesHospitalDiff",
        {internados: data.internados[todayIdx],
            internados_today: Math.abs(data.internados[todayIdx]-data.internados[yesterdayIdx]),
            internados_measure:  internados_measure,
            internados_uci: data.internados_uci[todayIdx],
            icu_today: Math.abs(data.internados_uci[todayIdx]-data.internados_uci[yesterdayIdx]),
            icu_measure: icu_measure}
            )));
    }
    else{
        conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile,
            "casesHospital",
            {internados: data.internados[todayIdx],
                internados_uci: data.internados_uci[todayIdx]}
        )));
    }
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "askMore")));
    return displaySuggestions(conv,locale)
});

app.intent('NewCases', conv => {
    let locale = conv.user.locale.split("-")[0]
    languageFile = Helper.setLocalFile(locale)
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "casesNew", {confirmados_novos: data.confirmados_novos[todayIdx], confirmados: data.confirmados[todayIdx]})));
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "askMore")));
    return displaySuggestions(conv,locale)
});

app.intent('RecoveredCases', conv => {
    let locale = conv.user.locale.split("-")[0]
    languageFile = Helper.setLocalFile(locale)

    if(data.recuperados[todayIdx] === data.recuperados[yesterdayIdx]){
        conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "casesRecoveredEqual", {recuperados: data.recuperados[todayIdx]})));
    }else{
        conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "casesRecovered", {recuperados: data.recuperados[todayIdx], recuperados_hoje: data.recuperados[todayIdx]-data.recuperados[yesterdayIdx]})));
    }

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
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "casesSuspect", {suspeitos: data.suspeitos[todayIdx]})));
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "askMore")));
    return displaySuggestions(conv,locale)
});

app.intent('LabCases', conv => {
    let locale = conv.user.locale.split("-")[0]
    languageFile = Helper.setLocalFile(locale)
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "casesLab", {lab: data.lab[todayIdx]})));
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "askMore")));
    return displaySuggestions(conv,locale)
});

app.intent('NorthCases', conv => {
    casesRegion(conv, "north","confirmados_arsnorte", "casesNorth")
});
app.intent('CenterCases', conv => {
    casesRegion(conv, "center", "confirmados_arscentro", "casesCenter")
});
app.intent('LvtCases', conv => {
    casesRegion(conv, "lvt", "confirmados_arslvt", "casesLvt")
});
app.intent('AlentejoCases', conv => {
    casesRegion(conv, "alentejo","confirmados_arsalentejo", "casesAlentejo")
});

function casesRegion(conv, key, region,languageFileKey){
    let locale = conv.user.locale.split("-")[0]
    languageFile = Helper.setLocalFile(locale)
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, languageFileKey, {[key]: data[region][todayIdx]})));
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "askMore")));
    return displaySuggestions(conv,locale)
}



app.intent('TotalTests', conv => {
    let testesHoje = data.confirmados[todayIdx]+data.n_confirmados[todayIdx]
    let testesOntem = data.confirmados[yesterdayIdx]+data.n_confirmados[yesterdayIdx]
    let percent_positivo_hoje = parseFloat((data.confirmados_novos[todayIdx] * 100)/(testesHoje-testesOntem)).toFixed(2)
    let testesAnteOntem = data.confirmados[yesterdayIdx-1]+data.n_confirmados[yesterdayIdx-1]
    let percent_positivo_ontem = parseFloat((data.confirmados_novos[yesterdayIdx] * 100)/(testesOntem-testesAnteOntem)).toFixed(2)

    let locale = conv.user.locale.split("-")[0]
    languageFile = Helper.setLocalFile(locale)
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "testsPercentage", {testes_hoje: testesHoje,
    testes_ontem: testesOntem, percent_positivo_hoje: percent_positivo_hoje, percent_positivo_ontem: percent_positivo_ontem})));
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "askMore")));
    return displaySuggestions(conv,locale)
})

app.intent('CasesSex', conv => {
    var confirmados_m = 0;
    var confirmados_f = 0;
    let regex_m = /\b(\w*confirmados_[0-9]{1,2}_([0-9]{1,2}|plus)_m\w*)\b/g
    let regex_f = /\b(\w*confirmados_[0-9]{1,2}_([0-9]{1,2}|plus)_f\w*)\b/g
    let keys= Object.keys(data);
    for(let i=0; i<keys.length; i++){
        if(keys[i].match(regex_m)){
            confirmados_m += parseInt(data[keys[i].match(regex_m)][todayIdx])
        }else if(keys[i].match(regex_f)){
            confirmados_f += parseInt(data[keys[i].match(regex_f)][todayIdx])
        }
    }

    let locale = conv.user.locale.split("-")[0]
    languageFile = Helper.setLocalFile(locale)
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "testsSex", {casos_m: confirmados_m, casos_f: confirmados_f})));
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "askMore")));
    return displaySuggestions(conv,locale)
})


app.intent("Close", conv => {
    return conv.close(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "close")))
})

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
