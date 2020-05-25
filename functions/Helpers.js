const fs = require('fs')


module.exports ={
    synchronizeFrom(data){
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
