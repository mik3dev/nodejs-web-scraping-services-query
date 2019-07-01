const express = require('express')
const app = express()
var fs = require('fs')
const puppeteer = require('puppeteer');
const port = 3000

app.use(express.json())                         // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded


/**
 * Consulta de cuenta del servicio electrico - ENEL
 */
app.post('/servicio-electrico', async (req, res) => {
    const url = 'https://www.enel.cl/es/clientes/servicios-en-linea/pago-de-cuenta.html'

    if(req.body.cliente) {
        const browser = await puppeteer.launch({ headless:true })
        const page = await browser.newPage()
        page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36')

        await page.goto(url)
        await page.waitForSelector('input#client')

        await page.click('input#client')
        await page.keyboard.type(req.body.cliente)

        await page.click('input[type=submit].generalFormContactButton')

        await page.waitForSelector('section.paymentComponentGeneralFormContact[style=""]')

        const numberAccount = await page.$eval('span#numberAccountSpan', el => el.innerText)
        const address = await page.$eval('span#addressSpan', el => el.innerText)
        const dueDate = await page.$eval('span#dueDateSpan', el => el.innerText)
        const lastPaymentDate = await page.$eval('span#lastPaymentDateSpan', el => el.innerText)
        const cutAfterValue = await page.$eval('span#cutAfterValueSpan', el => el.innerText)
        const lastPaymentAmountValue = await page.$eval('span#lastPaymentAmountValueSpan', el => el.innerText)
        const stateSuplyValue = await page.$eval('span#stateSuplyValueSpan', el => el.innerText)
        
        browser.close()

        return res.json({
            numero_cuenta: numberAccount,
            direccion: address,
            fecha_vencimiento: dueDate,
            fecha_ultimo_pago: lastPaymentDate,
            fecha_corte: cutAfterValue,
            monto_ultimo_pago: lastPaymentAmountValue,
            estado_suministro: stateSuplyValue
        })
    }

    return res.json({
        error: 'Debes ingresar un numero de cliente.'
    })
})


/**
 * Consulta de cuenta del servicio de agua - AGUAS ANDINAS
 */
app.post('/servicio-agua', async(req, res) => {
    const url = 'https://www.aguasandinas.cl/web/aguasandinas/pagar-mi-cuenta'
    
    try {
        if(req.body.cliente){
            const clientWOValidatorNumber = req.body.cliente.split('-')[0]
    
            const browser = await puppeteer.launch({ headless:true })
            const page = await browser.newPage()
            page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36')
    
            await page.goto(url)
            await page.click('input[type=radio]#busqueda_n_cuenta')
            await page.click('input[type=text]#buscador_cuenta')
            await page.keyboard.type(clientWOValidatorNumber)
    
            await page.click('input[type=submit][value=Buscar].boton.primario.boton-left')
            
            await page.waitForSelector('input[type=submit][value="Seleccionar cuenta"].boton.primario.boton-left')
            await page.click('input[type=radio]#radio1')
            await page.click('input[type=submit][value="Seleccionar cuenta"].boton.primario.boton-left')
    
            await page.waitForSelector('table.sin_bordes')
            
            const numero_cuenta = await page.$eval('table.sin_bordes:first-child > tbody > tr > td', (el) => el.innerText )
            const address = await page.$eval('table.sin_bordes:first-child > tbody > tr:nth-child(2) > td:nth-child(2)', (el) => el.innerText )
            const titular = await page.$eval('table.sin_bordes:first-child > tbody > tr:nth-child(3) > td:nth-child(2)', (el) => el.innerText )
            const saldo_anterior = await page.$eval('div.fila > div.col-xs-12.col-md-6 table.sin_bordes  tr:nth-child(2) td:nth-child(2)', el => el.innerText )
            const saldo_total = await page.$eval('div.fila > div.col-xs-12.col-md-6 table.sin_bordes  tr:nth-child(3) td:nth-child(2)', el => el.innerText )
            const total_a_pagar = await page.$eval('table.sin_bordes:nth-child(3) tr > td:nth-child(2)', el => el.innerText )
            const fecha_ultimo_pago = await page.$eval('div.col-xs-12.col-md-6 table.sin_bordes.auto_width tr:nth-child(2) td:nth-child(2)', el => el.innerText )
            const monto_ultimo_pago = await page.$eval('div.col-xs-12.col-md-6 table.sin_bordes.auto_width tr:nth-child(3) td:nth-child(2)', el => el.innerText)
            const monto_subsidio = await page.$eval('div.col-xs-12.col-md-6 table.sin_bordes.auto_width tr:nth-child(4) td:nth-child(2)', el => el.innerText)
    
            return res.json({
                numero_cuenta,
                direccion: address,
                titular,
                saldo_anterior,
                saldo_total,
                total_a_pagar,
                fecha_ultimo_pago,
                monto_ultimo_pago,
                monto_subsidio
            })
        }
    } catch (error) {
        return res.json({
            error
        })
    }

    return res.json({
        error: 'Debes ingresar un numero de cliente.'
    })
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))