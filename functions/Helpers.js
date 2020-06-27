const fs = require('fs')


module.exports ={
    synchronizeFrom(data){
        let correctData = data.split('-')

        var lastSyncDate = new Date(correctData[2], correctData[1]-1, correctData[0], 14, 30);

        //We need to create a new date from lastSyncDate other than user "=" because if we use "=" it would keep the reference to lastSyncDate thus updating it also.
        var nextSyncDate = new Date(lastSyncDate)
        nextSyncDate.setDate(lastSyncDate.getDate() + 1)

        var currentDate = new Date()
        console.log(lastSyncDate.toString());
        console.log(nextSyncDate.toString());
        console.log(currentDate >= nextSyncDate)
        if(currentDate >= nextSyncDate){
            return "API"
        }else{
            return "DB"
        }
    },

    setLocalFile(locale) {
        let languageFile
        if(locale === "en"){
            let data = fs.readFileSync('./locales/en-US.json')
            languageFile= JSON.parse(data);
        }else if(locale === "pt"){
            let data = fs.readFileSync('./locales/pt-BR.json')
            languageFile= JSON.parse(data);
        }

        return languageFile
    },



    parseResponseFromFile(languageFile, key, variables){
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
}
