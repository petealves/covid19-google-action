const fetch = require("node-fetch");

var api = new Promise((resolve, reject) => {
        fetch('https://covid19-api.vost.pt/Requests/get_full_dataset')
            .then(response => response.json())
            .then(dataCases => {
                return resolve (dataCases)
            })
            .catch(error => {
                console.log(error);
                return reject(error)
            });
    })

return api.then(res =>  {
    var currentDate = new Date()
    let day = currentDate.getDate();
    let month = currentDate.getUTCMonth()+1
    month = month  <= 9 ? "0"+month : month;
    let year = currentDate.getFullYear();
    let dateToday = day+"-"+month+ "-" + year+" 00:00"

    console.log(dateToday);


    let idx = Object.keys(res.data_dados).length-1


    let totalTestesHoje = res.confirmados[idx]+res.n_confirmados[idx]
    let totalTestesOntem = res.confirmados[idx-1]+res.n_confirmados[idx-1]
    let percentagePositiveToday = parseFloat((res.confirmados_novos[idx] * 100)/(totalTestesHoje-totalTestesOntem)).toFixed(2)
    let totalTestesAnteOntem = res.confirmados[idx-2]+res.n_confirmados[idx-2]
    let percentagePositiveOntem = parseFloat((res.confirmados_novos[idx-1] * 100)/(totalTestesOntem-totalTestesAnteOntem)).toFixed(2)
    console.log(percentagePositiveToday)
    console.log(percentagePositiveOntem)


    var confirmados_m = 0;
    let regex = /\b(\w*confirmados_[0-9]{1,2}_([0-9]{1,2}|plus)_m\w*)\b/g
    let keys = Object.keys(res)
    for(let i=0; i<Object.keys(res).length; i++){
        console.log(keys[i])
    }
    for(key in res){
            if(key.match(regex)){
            confirmados_m += parseInt(res[key.match(regex)][idx])
        }
    }
    console.log(confirmados_m)


})

