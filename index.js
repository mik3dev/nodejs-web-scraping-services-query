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
        const browser = await puppeteer.launch({ headless:true, timeout: 30000 })
        
        try {
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
            
            await page.waitFor(() => document.querySelector('div#form_contact-step-2-no').style.display === '' || document.querySelector('input[type=radio][id]'))

            const elements = await page.$$('input[type=radio][id]')
            let AmountDue = 0

            if(elements.length > 0) {
                await page.waitForSelector('input[type=radio]#invoice0', {visible: true})
                AmountDue = await page.$eval('input[type=radio]#invoice0', el => el.getAttribute('data-amount'))
            }

            console.log({
                now: new Date(),
                numberAccount,
                address,
                dueDate,
                lastPaymentDate,
                cutAfterValue,
                lastPaymentAmountValue,
                AmountDue,
            })

            browser.close()

            return res.json({
                numero_cuenta: numberAccount,
                direccion: address,
                fecha_vencimiento: new Date(dueDate.split('/')[2], dueDate.split('/')[1] - 1, dueDate.split('/')[0]),
                fecha_ultimo_pago: new Date(lastPaymentDate.split('/')[2], lastPaymentDate.split('/')[1] - 1, lastPaymentDate.split('/')[0]),
                fecha_corte: new Date(cutAfterValue.split('/')[2], cutAfterValue.split('/')[1] - 1, cutAfterValue.split('/')[0]),
                monto_ultimo_pago: parseFloat(lastPaymentAmountValue.replace('$','').replace('.','')),
                estado_suministro: stateSuplyValue,
                deuda_vigente: !!AmountDue ? parseFloat(AmountDue.replace('$', '').replace('.', '')) : 0,
            })
        } catch (error) {
            console.log(error)
            browser.close()
            return res.json({
                error
            })
        }
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
    
    if(req.body.cliente){
        const browser = await puppeteer.launch({ headless:true, timeout: 30000 })
        try {
            const clientWOValidatorNumber = req.body.cliente.split('-')[0]
    
            const page = await browser.newPage()
            page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36')
    
            await page.goto(url)
            await page.waitForSelector('input[type=radio]#busqueda_n_cuenta')

            await page.click('input[type=radio]#busqueda_n_cuenta')
            await page.click('input[type=text]#buscador_cuenta')
            await page.keyboard.type(clientWOValidatorNumber)
    
            await page.click('input[type=submit][value=Buscar].boton.primario.boton-left')
            
            await page.waitForSelector('input[type=submit][value="Seleccionar cuenta"].boton.primario.boton-left')
            await page.click('input[type=radio]#radio1')
            await page.click('input[type=submit][value="Seleccionar cuenta"].boton.primario.boton-left')
    
            await page.waitForSelector('table.sin_bordes')
            
            const numero_cuenta = await page.$eval('table.sin_bordes:first-child > tbody > tr > td:nth-child(2)', (el) => el.innerText )
            const address = await page.$eval('table.sin_bordes:first-child > tbody > tr:nth-child(2) > td:nth-child(2)', (el) => el.innerText )
            const titular = await page.$eval('table.sin_bordes:first-child > tbody > tr:nth-child(3) > td:nth-child(2)', (el) => el.innerText )
            const saldo_anterior = await page.$eval('div.fila > div.col-xs-12.col-md-6 table.sin_bordes  tr:nth-child(2) td:nth-child(2)', el => el.innerText )
            const saldo_total = await page.$eval('div.fila > div.col-xs-12.col-md-6 table.sin_bordes  tr:nth-child(3) td:nth-child(2)', el => el.innerText )
            const total_a_pagar = await page.$eval('table.sin_bordes:nth-child(3) tr > td:nth-child(2)', el => el.innerText )
            const fecha_ultimo_pago = await page.$eval('div.col-xs-12.col-md-6 table.sin_bordes.auto_width tr:nth-child(2) td:nth-child(2)', el => el.innerText )
            const monto_ultimo_pago = await page.$eval('div.col-xs-12.col-md-6 table.sin_bordes.auto_width tr:nth-child(3) td:nth-child(2)', el => el.innerText)
            const monto_subsidio = await page.$eval('div.col-xs-12.col-md-6 table.sin_bordes.auto_width tr:nth-child(4) td:nth-child(2)', el => el.innerText)
    
            browser.close()

            console.log({
                numero_cuenta,
                address,
                titular,
                saldo_anterior,
                saldo_total,
                total_a_pagar,
                fecha_ultimo_pago,
                monto_ultimo_pago,
                monto_subsidio,
            })

            return res.json({
                numero_cuenta,
                direccion: address,
                titular,
                saldo_anterior: !!saldo_anterior ? parseFloat(saldo_anterior.replace('$', '').replace('.', '')) : 0,
                saldo_total: !!saldo_total ? parseFloat(saldo_total.replace('$', '').replace('.', '')): 0,
                total_a_pagar: !!total_a_pagar ? parseFloat(total_a_pagar.replace('$', '').replace('.', '')): 0,
                fecha_ultimo_pago: new Date(fecha_ultimo_pago.split('/')[2], fecha_ultimo_pago.split('/')[1] - 1, fecha_ultimo_pago.split('/')[0]),
                monto_ultimo_pago: !!monto_ultimo_pago ? parseFloat(monto_ultimo_pago.replace('$', '').replace('.', '')): 0,
                monto_subsidio: !!monto_subsidio ? parseFloat(monto_subsidio.replace('$', '').replace('.', '')) : 0,
            })
        } catch (error) {
            console.log(error)
            browser.close()
            return res.json({
                error
            })
        }
    }

    return res.json({
        error: 'Debes ingresar un numero de cliente.'
    })
})

/**
 * Consulta de cuenta de servicio de gas - MetroGas
 */
app.post('/servicio-gas', async(req, res) => {
    const url = 'http://www.metrogas.cl/'

    if(req.body.cliente){
        try {
            const browser = await puppeteer.launch({ headless:false, timeout: 60000 })
            const page = await browser.newPage()
            page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36')

            await page.goto(url)
            await page.waitForSelector('a[data-tab=payment2]')

            await page.click('a[data-tab=payment2]')
            await page.click('input#NumeroIC')
            await page.keyboard.type(req.body.cliente)
            await page.click('a#botonPago')
            
            await page.waitForSelector('a#btContinuar')
            const numero_cuenta = await page.$eval('div.datos > div:nth-child(2)', (el) => el.innerText)
            const direccion = await page.$eval('div.datos > div:nth-child(4)', (el) => el.innerText)
            const comuna = await page.$eval('div.datos > div:nth-child(6)', (el) => el.innerText)
            const ultimo_pago_string = await page.$eval('div.sub-container > h5', (el) => el.innerText)
            const fecha_ultimo_pago = ultimo_pago_string.split(' - ')[1]
            const saldo = await page.$eval('div.sub-container div.fila2 div.col-1', (el) => el.innerText)
            const fecha_vencimiento = await page.$eval('div.sub-container div.fila2 div.col-2', (el) => el.innerText)
            const monto = await page.$eval('div.sub-container div.fila2 div.col-3', (el) => el.innerText)
            const total_a_pagar = await page.$eval('div.sub-container div.total-pago div.col-2', (el) => el.innerText)

            browser.close()

            console.log({
                numero_cuenta,
                direccion,
                comuna,
                ultimo_pago_string,
                fecha_ultimo_pago,
                saldo,
                fecha_vencimiento,
                monto,
                total_a_pagar,
            })
            
            return res.json({
                numero_cuenta,
                direccion,
                comuna,
                fecha_ultimo_pago: new Date(fecha_ultimo_pago.split('-')[2], fecha_ultimo_pago.split('-')[1] - 1, fecha_ultimo_pago.split('-')[0]),
                saldo: !!saldo ? parseFloat(saldo.replace('$', '').replace('.', '')) : 0,
                fecha_vencimiento: new Date(fecha_vencimiento.split('-')[2], fecha_vencimiento.split('-')[1] - 1, fecha_vencimiento.split('-')[0]),
                monto: !!monto ? parseFloat(monto.replace('$', '').replace('.', '')) : 0,
                total_a_pagar: !!total_a_pagar ? parseFloat(total_a_pagar.replace('$', '').replace('.', '')) : 0,
            })
        } catch (error) {
            console.log(error)
            browser.close()
            return res.json({
                error
            })
        }
    }

    return res.json({
        error: 'Debes ingresar un numero de cliente.'
    })
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))