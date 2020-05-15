
'use strict';
const https = require('https');
const {dialogflow} = require('actions-on-google');
const functions = require('firebase-functions');
const app = dialogflow({debug: true});

app.catch((conv, e) => {
    console.error(e);
    conv.close("Oops. Something went wrong.");
});

var cases;
var requestCases = new Promise((resolve, reject) =>{ https.get('https://covid19-api.vost.pt/Requests/get_last_update', (resp) => {
    let data = '';
    // A chunk of data has been recieved.
    resp.on('data', (chunk) => {
        data += chunk;
    });

    // The whole response has been received. Print out the result.
    resp.on('end', () => {
        cases = JSON.parse(data);
        resolve(JSON.parse(data).confirmados);
    });

}).on("error", (err) => {
    reject(err.message);
});
});

app.intent('Default Welcome Intent', (conv) => {
    requestCases.then( (res)=>{
        return conv.ask("Welcome, i can inform you about the current COVID 19 situation in Portugal. What would you like to know?" + res);
        //return conv.close("There are " + res + " COVID 19 cases in Portugal");
    }).catch( (error)=> {
        return conv.close("Error: " + error);
    });

});
app.intent('CasesLocation', (conv)=>{
    return conv.ask("There are 20 cases in ");
});
/*
app.intent('NewCasesToday', (conv)=>{
	return conv.ask("There are "+ cases.confirmados_novos +" new cases in Portugal today");
});*/


// Set the DialogflowApp object to handle the HTTPS POST request.
exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);




