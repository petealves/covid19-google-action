const https = require('https');
const fetch = require("node-fetch");
var cases;
var requestCases = new Promise( (resolve, reject) => {
    fetch('https://covid19-api.vost.pt/Requests/get_last_update')
        .then(response => response.json())
        .then(data => {
            cases = dummy
            return resolve(data);
        })
        .catch(error => {
            console.log(error);
            reject(error)
        });
})


requestCases.then( (res)=>{
    console.log("Total cases: "+res.confirmados)
    getDeaths();
    getInternados();
    getNovos();
    getInternadosUCI();
    getRecuperados();
}).catch( (error)=> {
    console.log(error)
});


/*
function filterCasesByLocal(local){

}*/

function getDeaths(){
    console.log(cases.obitos)
}

function getInternados(){
    console.log(cases.internados)
}

function getNovos(){
    console.log(cases.confirmados_novos)
}

function getInternadosUCI(){
    console.log(cases.internados_uci)
}

function getRecuperados(){
    console.log(cases.recuperados)
}


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
