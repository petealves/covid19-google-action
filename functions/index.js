
'use strict';
const https = require('https');
const fetch = require("node-fetch");
const csv=require('csvtojson')
const {dialogflow} = require('actions-on-google');
const functions = require('firebase-functions');
const app = dialogflow({debug: true});

app.catch((conv, e) => {
    console.log("ERROR "+e);
    conv.close("Oops. Something went wrong.");
});

var cases;
/*
var requestCases = new Promise((resolve, reject) =>{
    https.get('https://covid19-api.vost.pt/Requests/get_last_update', (resp) => {
        let data = '';
        // A chunk of data has been recieved.
        resp.on('data', (chunk) => {
            data += chunk;
        });

        // The whole response has been received. Print out the result.
        resp.on('end', () => {
            resolve(JSON.parse(data));
        });

    }).on("error", (err) => {
        reject(err.message);
    });
});*/
/*
var requestCases = new Promise( (resolve, reject) => {
    fetch('https://covid19-api.vost.pt/Requests/get_last_update')
        .then(response => response.json())
        .then(data => {
            return resolve(data);
        })
        .catch(error => {
            console.log(error);
            return reject(error)
        });
});*/

app.intent('Default Welcome Intent', (conv) => {
    cases = dummy
    return conv.ask("Welcome, i can inform you about the current COVID 19 situation in Portugal. What would you like to know?");
    /*return requestCases.then( (res)=>{
        cases = res;
        return conv.ask("Welcome, i can inform you about the current COVID 19 situation in Portugal. What would you like to know?");
    }, (error) => {
        conv.close("Error: " + error);
    });*/
});
app.intent('DeathCases', conv => {
    return conv.ask("There are already "+cases.obitos+" fatalities in Portugal.");
});

app.intent('HospitalizedCases', conv => {
    return conv.ask("There are "+cases.internados+" casual hospitalized persons and "+cases.internados_uci+" persons in ICU beds in Portugal.");
});

app.intent('NewCases', conv => {
    return conv.ask("Today there are "+ cases.confirmados_novos +" new cases with a total of "+ cases.confirmados +" cases in Portugal.");
});

app.intent('RecoveredCases', conv => {
    return conv.ask("There are "+ cases.recuperados +" patients recovered in Portugal.");
});

app.intent('LocalCases', (conv, {local}) => {
    return new Promise( (resolve, reject) => {
        fetch('https://raw.githubusercontent.com/dssg-pt/covid19pt-data/master/data_concelhos.csv')
            .then(response => response.text())
            .then(data => {
                return resolve(data);
            })
            .catch(error => {
                console.log(error);
                return reject(error)
            });
    }).then( (data) => {
        return csv().fromString(data)
            .then((json)=>{
                let nrCases = json[json.length-1][local === "Lisbon" ? "LISBOA" : local.toUpperCase()]
                if(nrCases === undefined){
                    return conv.ask("That Local doesn't exist or it was misspelled. Can you repeat please?")
                }
                return conv.ask("There are "+Math.floor(nrCases)+" cases in "+local)
            })
    })
    //return conv.ask("You said "+ local);
});
/*
app.intent('CasesLocation', (conv)=>{
    return conv.ask("There are 20 cases in ");
});

app.intent('NewCasesToday', (conv)=>{
	return conv.ask("There are "+ cases.confirmados_novos +" new cases in Portugal today");
});*/



// Set the DialogflowApp object to handle the HTTPS POST request.
exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);

let dummy = {
    "data": "14-05-2020",
    "data_dados": "14-05-2020 00:00",
    "confirmados": 28319,
    "confirmados_arsnorte": 16166,
    "confirmados_arscentro": 3569,
    "confirmados_arslvt": 7767,
    "confirmados_arsalentejo": 238,
    "confirmados_arsalgarve": 354,
    "confirmados_acores": 135,
    "confirmados_madeira": 90,
    "confirmados_estrangeiro": null,
    "confirmados_novos": 187,
    "recuperados": 3198,
    "obitos": 1184,
    "internados": 680,
    "internados_uci": 108,
    "lab": 2676,
    "suspeitos": 286285,
    "vigilancia": 26082,
    "n_confirmados": 255290,
    "cadeias_transmissao": null,
    "transmissao_importada": 770,
    "confirmados_0_9_f": 245,
    "confirmados_0_9_m": 246,
    "confirmados_10_19_f": 469,
    "confirmados_10_19_m": 411,
    "confirmados_20_29_f": 1931,
    "confirmados_20_29_m": 1519,
    "confirmados_30_39_f": 2348,
    "confirmados_30_39_m": 1753,
    "confirmados_40_49_f": 2853,
    "confirmados_40_49_m": 1905,
    "confirmados_50_59_f": 2897,
    "confirmados_50_59_m": 1895,
    "confirmados_60_69_f": 1706,
    "confirmados_60_69_m": 1469,
    "confirmados_70_79_f": 1272,
    "confirmados_70_79_m": 1116,
    "confirmados_80_plus_f": 2901,
    "confirmados_80_plus_m": 1383,
    "sintomas_tosse": 0.42,
    "sintomas_febre": 0.3,
    "sintomas_dificuldade_respiratoria": 0.12,
    "sintomas_cefaleia": 0.2,
    "sintomas_dores_musculares": 0.21,
    "sintomas_fraqueza_generalizada": 0.15,
    "confirmados_f": 16622,
    "confirmados_m": 11697,
    "obitos_arsnorte": 674,
    "obitos_arscentro": 221,
    "obitos_arslvt": 259,
    "obitos_arsalentejo": 1,
    "obitos_arsalgarve": 14,
    "obitos_acores": 15,
    "obitos_madeira": 0,
    "obitos_estrangeiro": null,
    "recuperados_arsnorte": null,
    "recuperados_arscentro": null,
    "recuperados_arslvt": null,
    "recuperados_arsalentejo": null,
    "recuperados_arsalgarve": null,
    "recuperados_acores": null,
    "recuperados_madeira": null,
    "recuperados_estrangeiro": null,
    "obitos_0_9_f": 0,
    "obitos_0_9_m": 0,
    "obitos_10_19_f": 0,
    "obitos_10_19_m": 0,
    "obitos_20_29_f": 0,
    "obitos_20_29_m": 1,
    "obitos_30_39_f": 0,
    "obitos_30_39_m": 0,
    "obitos_40_49_f": 6,
    "obitos_40_49_m": 7,
    "obitos_50_59_f": 11,
    "obitos_50_59_m": 28,
    "obitos_60_69_f": 37,
    "obitos_60_69_m": 67,
    "obitos_70_79_f": 99,
    "obitos_70_79_m": 136,
    "obitos_80_plus_f": 455,
    "obitos_80_plus_m": 337,
    "obitos_f": 608,
    "obitos_m": 576
}
