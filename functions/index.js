'use strict';
//https://us-central1-context2-26e70.cloudfunctions.net/dialogflowFirebaseFulfillment
const {dialogflow, Permission, SimpleResponse, Suggestions, List} = require('actions-on-google');
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
        return conv.ask(new Suggestions(['New Cases', 'Recovered Persons', 'Cases in a City', 'Cases in my City', 'Hospitalized Persons', 'Total Deaths', 'Cases by Region', 'Cases by Sex', 'Total tests', "Last Date of Update", "Waiting for Lab", "Suspect Cases"]));
    }
    return conv.ask(new Suggestions(['Casos Novos', 'Pacientes Recuperados', 'Casos numa Cidade', 'Casos na minha Cidade', 'Pacientes Internados', 'Mortos', 'Casos por Região','Casos por Género', "Total de Testes", "Ultima Data de Atualização", "Laboratório", "Casos Suspeitos"]));

}

async function getFromDB() {
    let docRef = db.collection('Covid-Portugal').doc('Cases');
    try {
        let casesDoc = await docRef.get()
        if (Helper.synchronizeFrom(casesDoc.data().data[Object.keys(casesDoc.data().data).length - 1]) === "DB") {
            let localsDoc = await db.collection('Covid-Portugal').doc('Locals').get()
            return ({data: {data: casesDoc.data(), locals: localsDoc.data()}})
        } else {
            return await DataHandler.getFromAPI(db)
        }
    } catch (error) {
        return await DataHandler.getFromAPI(db)
    }
}


/*
var getFromDB = new Promise ((resolve, reject) =>{
    let docRef = db.collection('Covid-Portugal').doc('Cases');
    docRef.get()
        .then(casesDoc => {
            console.log("getfromdb doc ref")
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
*/

function returnConvAsk(conv){
    let rdm = Math.floor(Math.random() * 3)+1
    let key = "askMore"+rdm
    return conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, key)));
}

app.catch((conv, e) => {
    console.log("ERROR "+e);
    conv.close(Helper.parseResponseFromFile(languageFile,"convCloseError"));
});

app.intent('Default Welcome Intent', async (conv) => {
    let locale = conv.user.locale.split("-")[0]
    languageFile = Helper.setLocalFile(locale)
    //Tries to read from DB Firebase
    try{
        let response = await getFromDB()
        data = response.data.data;
        locals = response.data.locals
        todayIdx = Object.keys(data.data_dados).length-1
        yesterdayIdx = todayIdx-1;
        conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "welcome")));
        return displaySuggestions(conv,locale)
    }catch (error) {
        console.log("ERROR Fetch DB"+error)
        conv.close(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "errorFetchData")));
    }


   /*return getFromDB.then( (res)=>{
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
    });*/
});
async function fetchData(){
    console.log("DATA FOR EXPLICIT INVOCATION")
    try{
        let response = await getFromDB()
        data = response.data.data;
        locals = response.data.locals
        todayIdx = Object.keys(data.data_dados).length-1
        yesterdayIdx = todayIdx-1;
    }catch (error) {
        console.log(error)
        conv.close(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "errorFetchData")));
    }
}

app.intent('NewCases', async conv => {
    //for explicit invocations

    if (data === null || data === undefined){
        await fetchData()
    }

    let locale = conv.user.locale.split("-")[0]
    languageFile = Helper.setLocalFile(locale)
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "casesNew", {confirmados_novos: data.confirmados_novos[todayIdx], confirmados: data.confirmados[todayIdx]})));
    returnConvAsk(conv);
    return displaySuggestions(conv,locale)
});

app.intent('DeathCases', async conv => {
    //for explicit invocations
    if (data === null || data === undefined){
        await fetchData()
    }

    let locale = conv.user.locale.split("-")[0]
    languageFile = Helper.setLocalFile(locale)
    if(data.obitos[todayIdx] === data.obitos[yesterdayIdx]){
        conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "casesDeathsEqual", {deaths: data.obitos[todayIdx]})));
    }else{
        conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "casesDeaths", {deaths_today: data.obitos[todayIdx]-data.obitos[yesterdayIdx], deaths_yesterday: data.obitos[yesterdayIdx]})));
    }
    returnConvAsk(conv)
    return displaySuggestions(conv,locale)
});

app.intent('HospitalizedCases', async conv => {
    //for explicit invocations
    if (data === null || data === undefined){
        await fetchData()
    }

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
    returnConvAsk(conv)
    return displaySuggestions(conv,locale)
});

app.intent('RecoveredCases', async conv => {
    //for explicit invocations
    if (data === null || data === undefined){
        await fetchData()
    }

    let locale = conv.user.locale.split("-")[0]
    languageFile = Helper.setLocalFile(locale)

    if(data.recuperados[todayIdx] === data.recuperados[yesterdayIdx]){
        conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "casesRecoveredEqual", {recuperados: data.recuperados[todayIdx]})));
    }else{
        conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "casesRecovered", {recuperados: data.recuperados[todayIdx], recuperados_hoje: data.recuperados[todayIdx]-data.recuperados[yesterdayIdx]})));
    }

    returnConvAsk(conv)
    return displaySuggestions(conv,locale)
});

app.intent('LocalCases', async (conv, {local}) => {
    //for explicit invocations
    if (data === null || data === undefined){
        await fetchData()
    }

    let locale = conv.user.locale.split("-")[0]
    languageFile = Helper.setLocalFile(locale)
    let nrCases = locals[local === "Lisbon" ? "LISBOA" : local.toUpperCase()]
    if(nrCases === undefined){
        conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "casesLocalError", {local: local})))
        return displaySuggestions(conv,locale)
    }
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "casesLocal", {casos_local: Math.floor(nrCases), local: local})))

    returnConvAsk(conv)
    return displaySuggestions(conv,locale)
});

app.intent("CasesByUserLocation", async  conv => {
    //for explicit invocations
    if (data === null || data === undefined){
        await fetchData()
    }

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

app.intent("GetLocation", async (conv, params, permissionGranted) => {
    //for explicit invocations
    if (data === null || data === undefined){
        await fetchData()
    }

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
                returnConvAsk(conv);
                return displaySuggestions(conv,locale)
            }

            conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "casosLocalDeviceErrorLocalize")));
            return displaySuggestions(conv,locale)
        }
    } else {
        conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "permissionDenied")));
        returnConvAsk(conv);
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

    returnConvAsk(conv)
    return displaySuggestions(conv,locale)
})

app.intent('SuspectCases', async conv => {
    //for explicit invocations
    if (data === null || data === undefined){
        await fetchData()
    }

    let locale = conv.user.locale.split("-")[0]
    languageFile = Helper.setLocalFile(locale)
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "casesSuspect", {suspeitos: data.suspeitos[todayIdx]})));

    returnConvAsk(conv)
    return displaySuggestions(conv,locale)
});

app.intent('LabCases', async conv => {
    //for explicit invocations
    if (data === null || data === undefined){
        await fetchData()
    }

    let locale = conv.user.locale.split("-")[0]
    languageFile = Helper.setLocalFile(locale)
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "casesLab", {lab: data.lab[todayIdx]})));

    returnConvAsk(conv)
    return displaySuggestions(conv,locale)
});

app.intent('TotalTests', async conv => {
    //for explicit invocations
    if (data === null || data === undefined){
        await fetchData()
    }

    let testesHoje = data.confirmados[todayIdx]+data.n_confirmados[todayIdx]
    let testesOntem = data.confirmados[yesterdayIdx]+data.n_confirmados[yesterdayIdx]
    let percent_positivo_hoje = parseFloat((data.confirmados_novos[todayIdx] * 100)/(testesHoje-testesOntem)).toFixed(2)
    let testesAnteOntem = data.confirmados[yesterdayIdx-1]+data.n_confirmados[yesterdayIdx-1]
    let percent_positivo_ontem = parseFloat((data.confirmados_novos[yesterdayIdx] * 100)/(testesOntem-testesAnteOntem)).toFixed(2)

    let locale = conv.user.locale.split("-")[0]
    languageFile = Helper.setLocalFile(locale)
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "testsPercentage", {testes_hoje: testesHoje,
    testes_ontem: testesOntem, percent_positivo_hoje: percent_positivo_hoje, percent_positivo_ontem: percent_positivo_ontem})));

    returnConvAsk(conv)
    return displaySuggestions(conv,locale)
})

app.intent('CasesSex', async conv => {
    //for explicit invocations
    if (data === null || data === undefined){
        await fetchData()
    }

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

    returnConvAsk(conv)
    return displaySuggestions(conv,locale)
})


app.intent("Close", conv => {
    return conv.close(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "close")))
})

app.intent('LastUpdateData', async conv => {
    //for explicit invocations
    if (data === null || data === undefined){
        await fetchData()
    }

    let locale = conv.user.locale.split("-")[0]
    languageFile = Helper.setLocalFile(locale)
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "lastUpdateData", {date: data.data_dados[todayIdx].split(" ")[0]})));

    returnConvAsk(conv)
    return displaySuggestions(conv,locale)
})

app.intent('CasesRegion', async conv => {
    //for explicit invocations
    if (data === null || data === undefined){
        await fetchData()
    }

    var zonesYesterday = [];
    zonesYesterday.push(["confirmados_arsnorte", data.confirmados_arsnorte[yesterdayIdx]]);
    zonesYesterday.push(["confirmados_arscentro", data.confirmados_arscentro[yesterdayIdx]]);
    zonesYesterday.push(["confirmados_arslvt", data.confirmados_arslvt[yesterdayIdx]]);
    zonesYesterday.push(["confirmados_arsalentejo", data.confirmados_arsalentejo[yesterdayIdx]]);
    zonesYesterday.push(["confirmados_arsalgarve", data.confirmados_arsalgarve[yesterdayIdx]]);
    zonesYesterday.push(["confirmados_arsacores", data.confirmados_acores[yesterdayIdx]]);
    zonesYesterday.push(["confirmados_arsmadeira", data.confirmados_madeira[yesterdayIdx]]);
    zonesYesterday.sort( (a,b) => {
        return b[1]- a[1]
    })

    var zonesToday = [];
    zonesToday.push(["confirmados_arsnorte", data.confirmados_arsnorte[todayIdx]]);
    zonesToday.push(["confirmados_arscentro", data.confirmados_arscentro[todayIdx]]);
    zonesToday.push(["confirmados_arslvt", data.confirmados_arslvt[todayIdx]]);
    zonesToday.push(["confirmados_arsalentejo", data.confirmados_arsalentejo[todayIdx]]);
    zonesToday.push(["confirmados_arsalgarve", data.confirmados_arsalgarve[todayIdx]]);
    zonesToday.push(["confirmados_acores", data.confirmados_acores[todayIdx]]);
    zonesToday.push(["confirmados_madeira", data.confirmados_madeira[todayIdx]]);
    zonesToday.sort( (a,b) => {
        return b[1]- a[1]
    })

    const zonesEnum={
        "confirmados_arsnorte": Helper.parseResponseFromFile(languageFile, "north"),
        "confirmados_arscentro": Helper.parseResponseFromFile(languageFile, "center"),
        "confirmados_arslvt": Helper.parseResponseFromFile(languageFile, "lvt"),
        "confirmados_arsalentejo": Helper.parseResponseFromFile(languageFile, "alentejo"),
        "confirmados_arsalgarve": Helper.parseResponseFromFile(languageFile, "algarve"),
        "confirmados_acores": Helper.parseResponseFromFile(languageFile, "acores"),
        "confirmados_madeira": Helper.parseResponseFromFile(languageFile, "madeira")
    }
    let confirmd=data.confirmados[todayIdx]
    var strToPrint = ""
    for(let i=0; i<zonesToday.length; i++){
        let zone = zonesEnum[zonesToday[i][0]]
        let cases = zonesToday[i][1]
        let percentYesterday = ((zonesYesterday[i][1]*100)/confirmd).toFixed(2)
        let percent = ((cases*100)/confirmd).toFixed(2)
        let difference = (parseFloat(percent)-parseFloat(percentYesterday)).toFixed(2)
        difference = difference<0 ? `-${difference}%`:`+${difference}%`
        strToPrint = strToPrint.concat(`${zone}: ${cases} (${percent}%, ${difference})\n`)
    }
    let locale = conv.user.locale.split("-")[0]
    languageFile = Helper.setLocalFile(locale)
    conv.ask(new SimpleResponse(Helper.parseResponseFromFile(languageFile, "casesRegion", {casesRegion: strToPrint})));

    returnConvAsk(conv)
    return displaySuggestions(conv,locale)
})

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
