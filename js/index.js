'use strict'
/* global window, document, $, navigator, StatusBar, localStorage, PushNotification */

/*
plan:
    - dodac widok ocen
    - lista przedmiotow
    - dodac widok poczegolnych przedmiotow
        - ocena koncowa
        - ocena czastkowa
        - pliki do pobrania
    - uzyc reducera

*/
const app = {
    // Application Constructor
    initialize: function () {
        this.bindEvents()
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function () {
        document.addEventListener('deviceready', this.onDeviceReady, false)
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...)'
    onDeviceReady: function () {

        // app.receivedEvent('deviceready')
        const connect = document.querySelector('#connect')
        const clear = document.querySelector('#clear')

        // const time
        const eventsList = []

        if (connect) {
            connect.addEventListener('click', function () {
                app.updateUserData(true)
            }, true)
        }

        if (clear) {
            clear.addEventListener('click', function () {
                $.get('https://edziekanat.zut.edu.pl/WU/Wyloguj.aspx', function () {
                    window.location.reload()
                })
            }, true)
        }


        app.setupStatusBar()

        navigator.splashscreen.hide()

        // app.setupPush()


    },
    setupStatusBar: function () {

        StatusBar.backgroundColorByHexString('#303F9F')

    },
    updateUserData: function (moveToSchedule) {
        const mainApp = document.querySelector('main-app')
        mainApp.set('lodingData', true)

        const userData = JSON.parse(localStorage.userData)

        const login = userData.login
        const password = userData.password

        if (!login || !password) {
            mainApp.toastMsg('Błędne dane')
            mainApp.set('lodingData', false)
            return
        }

        $.get('https://edziekanat.zut.edu.pl/WU/PodzGodzin.aspx', function (data) {
            let $result = $('<div>')

            $result.html(data)
            let $form = $result.find('form')
            $form.find('#ctl00_ctl00_ContentPlaceHolder_MiddleContentPlaceHolder_txtIdent').val(login)
            $form.find('#ctl00_ctl00_ContentPlaceHolder_MiddleContentPlaceHolder_txtHaslo').val(password)

            let action = 'https://edziekanat.zut.edu.pl/WU/' + $form.attr('action')
            let serialized = $form.serialize()

            serialized += '&ctl00%24ctl00%24ContentPlaceHolder%24MiddleContentPlaceHolder%24butLoguj=Zaloguj'

            const time = new Date()
            const ajax = $.ajax({
                type: 'POST',
                url: action,
                data: serialized,
            }).done(function (data, textStatus, request) {


                $result.html(data)
                const name = $result.find('#ctl00_ctl00_ContentPlaceHolder_wumasterWhoIsLoggedIn').text().replace(/ –.*/, '')
                // jesli name jest pusty to oznacza ze nie jestesmy na widoku planu czyli cos poszlo nie tak
                if (name === '') {
                    mainApp.toastMsg('Nie udało się zalogować')
                    mainApp.set('lodingData', false)

                    return
                }

                $form = $result.find('form')

                action = 'https://edziekanat.zut.edu.pl/WU/' + $form.attr('action')

                serialized = $form.serialize()
                serialized = serialized.replace('Tygodniowo', 'Semestralnie')
                serialized = serialized.replace('__EVENTTARGET=&', '__EVENTTARGET=ctl00%24ctl00%24ContentPlaceHolder%24RightContentPlaceHolder%24rbJak%242&')

                const ajax = $.ajax({
                    type: 'POST',
                    url: action,
                    data: serialized,
                }).done(function (data, textStatus, request) {
                    $result.html(data)
                    const $table = $result.find('#ctl00_ctl00_ContentPlaceHolder_RightContentPlaceHolder_dgDane')


                    //      Data zajęć,  Od,        Do,       Sala,  Przedmiot, Forma zajęć, Prowadzący,  Plan prowadzącego, Status sali
                    const keys = ['date', 'startTime', 'endTime', 'room', 'subject', 'formName', 'teacher', 'teacherSchedule', 'roomState']

                    const elements = []
                    let id = 1
                    $table.find('.gridDane').map(function (elemIndex) {
                        const elem = $(this)
                        const obj = {}
                        elements.push(obj)

                        elem.children().map(function (index) {

                            obj[keys[index]] = $(this).text()

                        })
                        const date = obj.date.split(' ')
                        obj.id = id++
                        obj.date = date[0]
                        obj.dayName = date[1]
                        const color = elem.children()[0].style.color
                        // console.log(color)
                        if (color === 'rgb(0, 0, 255)')
                            obj.status = 'e'
                        else if (color === 'rgb(255, 0, 0)')
                            obj.status = 'o'
                        else if (color === 'rgb(0, 255, 0)')
                            obj.status = 'r'
                        else
                            obj.status = ''

                    })
                    $('paper-card-repeater').prop('elements', elements)

                    mainApp.set('user.logged', true)
                    mainApp.set('user.name', name)
                    mainApp.set('user.lastCheck', new Date())

                    mainApp.set('lodingData', false)

                    if (moveToSchedule) {
                        mainApp.set('currentDate', new Date())
                        mainApp.set('route.path', '/main')

                    }

                    setTimeout(function () {
                        mainApp.toastMsg('Pobrano najnowszy plan')
                        mainApp.refreshLastUpdate()
                    }, 100)



                })

            }).fail(function (data) {
                // $('.result').append('<p>Niezalogowano</p>')
                mainApp.toastMsg('Niezalogowano')
                mainApp.set('lodingData', false)
            })


        }).fail(function () {
            mainApp.set('lodingData', false)
            mainApp.toastMsg('Błąd')
        })



    },
    // Update DOM on a Received Event
    receivedEvent: function (id) {
        console.log('Received Event: ' + id)
    },
    setupPush: function () {
        const push = PushNotification.init({
            'android': {
                'senderID': 'XXXXXX'
            }
        })

        push.on('registration', function (data) {
            console.log('registration event: ' + data.registrationId)

            const oldRegId = localStorage.getItem('registrationId')
            if (oldRegId !== data.registrationId) {
                // Save new registration ID
                localStorage.setItem('registrationId', data.registrationId)
                // Post registrationId to your app server as the value has changed
            }
        })
        push.on('error', function (e) {
            console.log('push error = ' + e.message)
        })

        push.on('notification', function (data) {
            console.log('notification event')
            navigator.notification.confirm(
                'Chcesz pobrać najnowszą wersje aplikacji?',
                function (buttonIndex) {
                    if (buttonIndex === 1) {
                        window.open(data.additionalData.url, '_system')
                    }
                },
                'Dostępna aktualizacja',
                ['Pobierz', 'Później']
            )
            // navigator.notification.alert(
            //    data.message,         // message
            //    null,                 // callback
            //    data.title,           // title
            //    'Ok'                  // buttonName
            // )

        })

        push.finish(function () {
            console.log('success')
        }, function () {
            console.log('error')
        })

    }
}
